<?php

namespace App\Services\Annales;

use Anthropic\Beta\Messages\BetaMessage;
use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\BadRequestException;
use Anthropic\Core\Exceptions\RateLimitException;
use Anthropic\Lib\Streaming\MessageAccumulator;
use App\Models\ImportSujet;
use Illuminate\Support\Facades\Log;

/**
 * L'API Claude en vision lit le document (PLAN § 8 : « IA : API Claude,
 * derrière un service et une file ») : PDF ou photo en base64, sortie
 * structurée selon SCHEMA, réponse diffusée en flux (un sujet entier avec
 * ses corrigés peut dépasser ce qu'une requête simple rend avant le délai).
 *
 * Garde-fous (PLAN § 2.4) : l'énoncé est **transcrit**, jamais inventé ; la
 * réponse et le corrigé sont des **propositions** que le rédacteur vérifie
 * une à une (`reponse_a_verifier`) ; rien de personnel n'est envoyé (un
 * sujet d'examen et le programme de la matière, c'est tout).
 *
 * Repli côté serveur (`fallbacks: default`) : si le modèle décline par
 * prudence (faux positif d'un filtre), un modèle de repli relit la même
 * requête au lieu de rendre un import en échec.
 */
class ExtracteurClaude implements ExtracteurSujet
{
    public const TYPES = ['qcm_une', 'qcm_plusieurs', 'vrai_faux', 'numerique', 'courte', 'ouverte'];

    private const PROMPT = <<<'TXT'
        Tu transcris des sujets d'examens guinéens (CEE, BEPC, Baccalauréat unique) pour une plateforme de révision. Une équipe d'enseignants relit tout ce que tu proposes avant qu'un élève ne le voie.

        Règles, sans exception :
        1. L'énoncé est une TRANSCRIPTION FIDÈLE du document : mêmes mots, mêmes nombres, même ordre. Tu n'inventes, ne reformules et ne complètes aucun énoncé. Un passage illisible s'écrit « [illisible] » et tu le signales dans `avertissements`.
        2. Les formules s'écrivent en LaTeX : `$…$` dans une phrase, `$$…$$` seule sur sa ligne pour une formule centrée. Une ligne vide sépare deux paragraphes ; « - » commence un élément de liste.
        3. Découpe le sujet en parties (« Exercice 1 », « Problème »…) telles qu'imprimées, avec leur barème si le document l'indique (sinon null), et la consigne commune de la partie (texte d'introduction, données) dans `consigne`.
        4. Chaque question numérotée (1., 2.a…) devient une question. Choisis son type :
           - `qcm_une` / `qcm_plusieurs` : seulement si le document propose des choix ; `options` les recopie, `bonnes_options` donne les rangs (à partir de 0) que tu proposes comme justes ;
           - `vrai_faux` : seulement si le document demande vrai ou faux ; `vrai` donne ta proposition ;
           - `numerique` : la réponse est un seul nombre ; `valeur` (écrite avec un point décimal), `unite` (ou null), `tolerance` (0 si la valeur est exacte) ;
           - `courte` : un mot ou une courte expression ; `acceptees` donne 1 à 5 formes justes ;
           - `ouverte` : tout le reste (démonstration, rédaction, construction, calcul détaillé) ; `bareme` donne 1 à 6 critères de réussite, chacun de 1 à 5 points.
           En cas de doute, `ouverte`.
        5. `corrige` : un corrigé pas à pas (1 à 6 étapes, chacune un titre court et un texte). C'est une PROPOSITION : un enseignant la vérifie. Sois exact et sobre, au niveau de l'élève.
        6. `notion_id` : l'identifiant de la notion du programme qui correspond le mieux, pris dans la liste fournie ; null si aucune ne convient.
        7. `difficulte` : de 1 (facile) à 5 (difficile), pour un élève de la classe d'examen.
        8. `duree_minutes` et `coefficient` : seulement s'ils sont imprimés sur le document, sinon null. `titre` : la matière, l'examen et la session tels qu'imprimés.
        9. Si le document n'est pas un sujet d'examen, ou s'il est illisible, rends `parties` vide et explique-le dans `avertissements`.
        TXT;

    public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction
    {
        $cle = config('services.anthropic.cle');

        if (! is_string($cle) || $cle === '') {
            throw new ExtractionImpossible('La lecture automatique n\'est pas configurée (clé de l\'API Claude absente).');
        }

        $modele = (string) config('annales.modele');
        $source = ['type' => 'base64', 'mediaType' => $import->document_type, 'data' => base64_encode($contenu)];

        try {
            $client = new Client(apiKey: $cle);
            $accumulateur = MessageAccumulator::forBetaMessages();

            $flux = $client->beta->messages->createStream(
                model: $modele,
                maxTokens: 64000,
                system: self::PROMPT,
                messages: [[
                    'role' => 'user',
                    'content' => [
                        $import->document_type === 'application/pdf'
                            ? ['type' => 'document', 'source' => $source]
                            : ['type' => 'image', 'source' => $source],
                        ['type' => 'text', 'text' => $this->consigne($import, $notions)],
                    ],
                ]],
                outputConfig: [
                    'effort' => self::effort(),
                    'format' => ['type' => 'json_schema', 'schema' => self::schema()],
                ],
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );

            foreach ($flux as $evenement) {
                $accumulateur->accumulate($evenement);
            }

            /** @var BetaMessage $message */
            $message = $accumulateur->message();
        } catch (AuthenticationException) {
            throw new ExtractionImpossible('La clé de l\'API Claude est refusée.');
        } catch (RateLimitException) {
            throw new ExtractionImpossible('Trop de lectures en même temps : relancez dans quelques minutes.');
        } catch (BadRequestException $e) {
            Log::warning('Import de sujet refusé par l\'API', ['import' => $import->uuid, 'message' => $e->getMessage()]);

            throw new ExtractionImpossible('Le document n\'a pas pu être lu (format ou taille refusés).');
        } catch (APIStatusException|APIConnectionException $e) {
            Log::warning('Import de sujet : API injoignable', ['import' => $import->uuid, 'message' => $e->getMessage()]);

            throw new ExtractionImpossible('Le service de lecture ne répond pas : relancez plus tard.');
        }

        if ($message->stopReason === 'refusal') {
            throw new ExtractionImpossible('La lecture automatique a refusé ce document. Saisissez-le à la main ou essayez une autre copie.');
        }

        if ($message->stopReason === 'max_tokens') {
            throw new ExtractionImpossible('Le sujet est trop long pour une seule lecture : découpez le document (une partie par fichier).');
        }

        $texte = '';

        foreach ($message->content as $bloc) {
            if ($bloc instanceof BetaTextBlock) {
                $texte .= $bloc->text;
            }
        }

        $proposition = json_decode($texte, true);

        if (! is_array($proposition)) {
            throw new ExtractionImpossible('La lecture n\'a pas rendu de structure exploitable : relancez.');
        }

        return new ResultatExtraction(
            proposition: $proposition,
            modele: $message->model,
            jetonsEntree: $message->usage->inputTokens,
            jetonsSortie: $message->usage->outputTokens,
        );
    }

    /** @return 'low'|'medium'|'high'|'xhigh'|'max' */
    private static function effort(): string
    {
        $effort = config('annales.effort');

        return match ($effort) {
            'low', 'medium', 'xhigh', 'max' => $effort,
            default => 'high',
        };
    }

    /**
     * @param  array<int, string>  $notions
     */
    private function consigne(ImportSujet $import, array $notions): string
    {
        $programme = $notions === []
            ? '(aucune notion saisie : mets null)'
            : implode("\n", array_map(fn (int $id, string $libelle) => "{$id} : {$libelle}", array_keys($notions), $notions));

        $examen = $import->examen->nom.($import->serie ? ', série '.$import->serie->code->value : '');

        return <<<TXT
            Document : sujet de {$import->matiere->nom}, {$examen}, session {$import->session}.

            Programme de la matière (identifiant : chapitre › notion) :
            {$programme}

            Transcris ce sujet selon les règles.
            TXT;
    }

    /**
     * Le schéma de la proposition (sortie structurée de l'API, et contrat de
     * ExtracteurSimule).
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        $texte = ['type' => 'string'];
        $texteOuNul = ['anyOf' => [['type' => 'string'], ['type' => 'null']]];
        $objet = fn (array $proprietes) => [
            'type' => 'object',
            'properties' => $proprietes,
            'required' => array_keys($proprietes),
            'additionalProperties' => false,
        ];

        $question = $objet([
            'enonce' => $texte,
            'type' => ['type' => 'string', 'enum' => self::TYPES],
            'options' => ['type' => 'array', 'items' => $texte],
            'bonnes_options' => ['type' => 'array', 'items' => ['type' => 'integer']],
            'vrai' => ['anyOf' => [['type' => 'boolean'], ['type' => 'null']]],
            'valeur' => $texteOuNul,
            'unite' => $texteOuNul,
            'tolerance' => $texteOuNul,
            'acceptees' => ['type' => 'array', 'items' => $texte],
            'bareme' => ['type' => 'array', 'items' => $objet(['critere' => $texte, 'points' => ['type' => 'integer']])],
            'corrige' => ['type' => 'array', 'items' => $objet(['titre' => $texte, 'texte' => $texte])],
            'notion_id' => ['anyOf' => [['type' => 'integer'], ['type' => 'null']]],
            'difficulte' => ['type' => 'integer'],
        ]);

        return $objet([
            'titre' => $texte,
            'duree_minutes' => ['anyOf' => [['type' => 'integer'], ['type' => 'null']]],
            'coefficient' => $texteOuNul,
            'avertissements' => ['type' => 'array', 'items' => $texte],
            'parties' => ['type' => 'array', 'items' => $objet([
                'titre' => $texte,
                'bareme' => ['anyOf' => [['type' => 'number'], ['type' => 'null']]],
                'consigne' => $texte,
                'questions' => ['type' => 'array', 'items' => $question],
            ])],
        ]);
    }
}
