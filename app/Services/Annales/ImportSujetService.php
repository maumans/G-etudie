<?php

namespace App\Services\Annales;

use App\Enums\Filiere;
use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\StatutImport;
use App\Enums\TypeSujet;
use App\Jobs\TraiterImportSujet;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Examen;
use App\Models\ImportSujet;
use App\Models\Matiere;
use App\Models\Question;
use App\Models\Serie;
use App\Models\Sujet;
use App\Models\SujetPartie;
use App\Models\User;
use App\Support\BlocsContenu;
use App\Support\TexteEnBlocs;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * L'import assisté d'un sujet (PLAN M17) — **le critère du lot 4** : un sujet
 * scanné devient un sujet structuré publiable sans saisie manuelle de
 * l'énoncé.
 *
 *  1. `demarrer` garde le document (disque privé) et met l'import en file ;
 *  2. `traiter` (job TraiterImportSujet) fait lire le document par
 *     l'extracteur, vérifie la proposition et crée l'annale **en brouillon**,
 *     chaque question marquée « réponse à vérifier » ;
 *  3. le rédacteur vérifie, puis l'annale suit le circuit (SujetService).
 *
 * L'énoncé n'est jamais perdu : une réponse proposée incohérente fait passer
 * la question en question ouverte, avec un avertissement.
 */
class ImportSujetService
{
    public function __construct(
        private SujetService $sujets,
        private ExtracteurSujet $extracteur,
    ) {}

    /**
     * @param  array{examen: Examen, serie: Serie|null, matiere: Matiere, filiere: Filiere, session: int, type: TypeSujet}  $cible
     */
    public function demarrer(User $auteur, UploadedFile $fichier, array $cible): ImportSujet
    {
        if (! $auteur->can(Permission::ImporterAnnales->value)) {
            throw new AuthorizationException('Vous ne pouvez pas importer d\'annale.');
        }

        if ($this->notions($cible['examen'], $cible['matiere']) === []) {
            throw ValidationException::withMessages([
                'matiere_id' => "Le programme de {$cible['matiere']->nom} pour cet examen n'a encore aucune notion : saisissez-le d'abord (Référentiel › Programme).",
            ]);
        }

        $uuid = (string) Str::uuid7();
        $type = (string) $fichier->getMimeType();
        $extension = config('annales.types')[$type] ?? 'bin';
        $chemin = $fichier->storeAs(config('annales.dossier'), "{$uuid}.{$extension}", ['disk' => config('annales.disque')]);

        if ($chemin === false) {
            throw ValidationException::withMessages(['document' => 'Le document n\'a pas pu être enregistré.']);
        }

        $import = ImportSujet::create([
            'uuid' => $uuid,
            'auteur_id' => $auteur->id,
            'examen_id' => $cible['examen']->id,
            'serie_id' => $cible['serie']?->id,
            'matiere_id' => $cible['matiere']->id,
            'filiere' => $cible['filiere'],
            'session' => $cible['session'],
            'type' => $cible['type'],
            'document_chemin' => $chemin,
            'document_nom' => mb_substr($fichier->getClientOriginalName() ?: "sujet.{$extension}", 0, 255),
            'document_type' => $type,
            'document_octets' => (int) $fichier->getSize(),
            'statut' => StatutImport::EnAttente,
            'extracteur' => (string) config('annales.extracteur'),
        ]);

        TraiterImportSujet::dispatch($import)->afterCommit();

        return $import;
    }

    /** Un import en échec repart en file (même document). */
    public function relancer(ImportSujet $import, User $acteur): ImportSujet
    {
        if ($acteur->id !== $import->auteur_id && ! $acteur->can(Permission::AdministrerContenu->value)) {
            throw new AuthorizationException('Seul l\'auteur de l\'import le relance.');
        }

        if ($import->statut !== StatutImport::Echec) {
            throw ValidationException::withMessages(['statut' => 'Seul un import en échec se relance.']);
        }

        $import->forceFill([
            'statut' => StatutImport::EnAttente,
            'erreur' => null,
            'extracteur' => (string) config('annales.extracteur'),
        ])->save();

        TraiterImportSujet::dispatch($import)->afterCommit();

        return $import;
    }

    /**
     * Lit le document et crée l'annale en brouillon. Ne lève jamais : un
     * échec est noté sur l'import, avec sa raison.
     */
    public function traiter(ImportSujet $import): ImportSujet
    {
        $pris = ImportSujet::query()
            ->whereKey($import->id)
            ->where('statut', StatutImport::EnAttente->value)
            ->update(['statut' => StatutImport::EnCours->value, 'commence_le' => now(), 'updated_at' => now()]);

        // Déjà pris par un autre travailleur (ou déjà traité) : rien à faire.
        if ($pris === 0) {
            return $import->refresh();
        }

        $import->refresh()->load(['examen', 'serie', 'matiere', 'auteur']);

        try {
            $contenu = Storage::disk(config('annales.disque'))->get($import->document_chemin)
                ?? throw new ExtractionImpossible('Le document téléversé est introuvable.');
            $notions = $this->notions($import->examen, $import->matiere);
            $resultat = $this->extracteur->extraire($import, $contenu, $notions);
            [$sujet, $avertissements] = $this->construire($import, $resultat, $notions);

            $import->forceFill([
                'statut' => StatutImport::Pret,
                'sujet_id' => $sujet->id,
                'modele' => $resultat->modele,
                'jetons_entree' => $resultat->jetonsEntree,
                'jetons_sortie' => $resultat->jetonsSortie,
                'avertissements' => $avertissements,
                'termine_le' => now(),
            ])->save();
        } catch (ExtractionImpossible $e) {
            $this->echec($import, $e->getMessage());
        } catch (Throwable $e) {
            Log::error('Import de sujet en échec', ['import' => $import->uuid, 'exception' => $e]);
            $this->echec($import, 'Erreur inattendue pendant la lecture : relancez, ou prévenez l\'administrateur si elle revient.');
        }

        return $import;
    }

    /**
     * La proposition devient une annale en brouillon : parties, consignes,
     * questions (réponses à vérifier). Tout ou rien.
     *
     * @param  array<int, string>  $notions
     * @return array{0: Sujet, 1: list<string>}
     */
    public function construire(ImportSujet $import, ResultatExtraction $resultat, array $notions): array
    {
        $proposition = $resultat->proposition;
        $avertissements = array_values(array_filter(array_map(
            fn (mixed $a) => is_string($a) ? mb_substr(trim($a), 0, 300) : '',
            is_array($proposition['avertissements'] ?? null) ? $proposition['avertissements'] : [],
        )));
        $parties = is_array($proposition['parties'] ?? null) ? array_values($proposition['parties']) : [];
        $nombre = array_sum(array_map(fn (mixed $p) => is_array($p) && is_array($p['questions'] ?? null) ? count($p['questions']) : 0, $parties));

        if ($nombre === 0) {
            throw new ExtractionImpossible(trim('Aucune question n\'a été trouvée dans ce document. '.implode(' ', $avertissements)));
        }

        $parDefaut = (int) array_key_first($notions);

        return DB::transaction(function () use ($import, $resultat, $proposition, $parties, $notions, $parDefaut, $avertissements) {
            $titre = is_string($proposition['titre'] ?? null) && trim($proposition['titre']) !== ''
                ? trim($proposition['titre'])
                : "{$import->matiere->nom} — {$import->examen->code->value} {$import->session}";
            $duree = $proposition['duree_minutes'] ?? null;

            $sujet = $this->sujets->creer($import->auteur, [
                'examen' => $import->examen,
                'serie' => $import->serie,
                'matiere' => $import->matiere,
                'filiere' => $import->filiere,
                'session' => $import->session,
                'type' => $import->type,
                'titre' => $titre,
            ], [
                'chemin' => $import->document_chemin,
                'nom' => $import->document_nom,
                'type' => $import->document_type,
                'octets' => $import->document_octets,
            ], $resultat->estExemple);

            $sujet->forceFill([
                'duree_minutes' => is_int($duree) && $duree > 0 && $duree <= 600 ? $duree : null,
                'coefficient' => is_string($proposition['coefficient'] ?? null) ? mb_substr(trim($proposition['coefficient']), 0, 10) ?: null : null,
            ])->save();

            foreach ($parties as $rangPartie => $p) {
                $p = is_array($p) ? $p : [];
                $consigne = TexteEnBlocs::convertir(is_string($p['consigne'] ?? null) ? $p['consigne'] : '');

                $partie = SujetPartie::create([
                    'uuid' => (string) Str::uuid7(),
                    'sujet_id' => $sujet->id,
                    'ordre' => $rangPartie + 1,
                    'titre' => mb_substr(is_string($p['titre'] ?? null) && trim($p['titre']) !== '' ? trim($p['titre']) : 'Partie '.($rangPartie + 1), 0, 160),
                    'bareme' => is_int($p['bareme'] ?? null) || is_float($p['bareme'] ?? null) ? max(0, min(999, (float) $p['bareme'])) : null,
                    'consigne' => BlocsContenu::erreur($consigne) === null ? $consigne : BlocsContenu::vide(),
                ]);

                foreach (array_values(is_array($p['questions'] ?? null) ? $p['questions'] : []) as $rang => $q) {
                    $q = is_array($q) ? $q : [];
                    $libelle = $partie->titre.', question '.($rang + 1);
                    $convertie = PropositionEnQuestion::convertir($q);

                    $notionId = is_int($q['notion_id'] ?? null) && isset($notions[$q['notion_id']]) ? $q['notion_id'] : $parDefaut;

                    if ($notionId !== ($q['notion_id'] ?? null)) {
                        $avertissements[] = "{$libelle} : notion à choisir (aucune ne correspondait).";
                    }

                    if ($convertie['avertissement'] !== null) {
                        $avertissements[] = "{$libelle} : {$convertie['avertissement']}.";
                    }

                    Question::create([
                        'uuid' => (string) Str::uuid7(),
                        'notion_id' => $notionId,
                        'sujet_partie_id' => $partie->id,
                        'ordre_sujet' => $rang + 1,
                        'auteur_id' => $import->auteur_id,
                        'type' => $convertie['type'],
                        'extrait' => Question::titreDe($convertie['enonce']),
                        'enonce' => $convertie['enonce'],
                        'donnees' => $convertie['donnees'],
                        'reponse_attendue' => $convertie['attendue'],
                        'indices' => [],
                        'corrige' => $convertie['corrige'],
                        'reponse_a_verifier' => true,
                        'difficulte' => $convertie['difficulte'],
                        'source' => 'annale',
                        'statut' => StatutContenu::Brouillon,
                        'revision' => 0,
                        'est_exemple' => $resultat->estExemple,
                    ]);
                }
            }

            return [$sujet, array_slice($avertissements, 0, 40)];
        });
    }

    /**
     * Le programme de la matière dans la classe d'examen : identifiant →
     * « Chapitre › Notion ». C'est tout ce que l'extracteur reçoit de la base.
     *
     * @return array<int, string>
     */
    public function notions(Examen $examen, Matiere $matiere): array
    {
        $classe = Classe::query()->where('examen_id', $examen->id)->first();

        if ($classe === null) {
            return [];
        }

        $notions = [];
        $chapitres = Chapitre::query()
            ->with(['notions' => fn ($q) => $q->orderBy('ordre')])
            ->where('matiere_id', $matiere->id)
            ->where('classe_id', $classe->id)
            ->orderBy('ordre')
            ->get();

        // Une boucle, pas flatMap : les identifiants sont des clés entières.
        foreach ($chapitres as $chapitre) {
            foreach ($chapitre->notions as $notion) {
                $notions[$notion->id] = "{$chapitre->titre} › {$notion->titre}";
            }
        }

        return $notions;
    }

    private function echec(ImportSujet $import, string $raison): void
    {
        $import->forceFill([
            'statut' => StatutImport::Echec,
            'erreur' => mb_substr($raison, 0, 1000),
            'termine_le' => now(),
        ])->save();
    }
}
