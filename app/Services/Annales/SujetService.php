<?php

namespace App\Services\Annales;

use App\Enums\Filiere;
use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Serie;
use App\Models\Sujet;
use App\Models\SujetPartie;
use App\Models\User;
use App\Services\ContenuService;
use App\Support\BlocsContenu;
use App\Support\Perimetre;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Le circuit d'une annale (PLAN M6, M17) : le sujet et ses questions sont
 * relus **ensemble**. Envoyer le sujet en relecture y envoie ses questions en
 * brouillon ; le relecteur publie ou renvoie le tout en un geste. Chaque
 * transition passe par ContenuService (verrous, « jamais relu par son
 * auteur »), dans une seule transaction : tout passe, ou rien.
 *
 * Les questions déjà publiées restent publiées pendant qu'on retouche le
 * sujet ; une question se retouche seule par « Modifier » sur sa fiche.
 */
class SujetService
{
    public function __construct(private ContenuService $contenu) {}

    /**
     * Un sujet en brouillon, sans partie (création à la main ou par l'import).
     *
     * @param  array{examen: Examen, serie: Serie|null, matiere: Matiere, filiere: Filiere, session: int, type: TypeSujet, titre: string}  $cible
     * @param  array{chemin: string, nom: string, type: string, octets: int}|null  $document
     */
    public function creer(User $auteur, array $cible, ?array $document = null, bool $estExemple = false): Sujet
    {
        $this->exiger($auteur->can(Permission::RedigerContenu->value), 'Vous ne pouvez pas rédiger d\'annale.');

        return Sujet::create([
            'uuid' => (string) Str::uuid7(),
            'examen_id' => $cible['examen']->id,
            'serie_id' => $cible['serie']?->id,
            'matiere_id' => $cible['matiere']->id,
            'filiere' => $cible['filiere'],
            'session' => $cible['session'],
            'type' => $cible['type'],
            'titre' => mb_substr($cible['titre'], 0, 160),
            'document_chemin' => $document['chemin'] ?? null,
            'document_nom' => $document['nom'] ?? null,
            'document_type' => $document['type'] ?? null,
            'document_octets' => $document['octets'] ?? null,
            'auteur_id' => $auteur->id,
            'statut' => StatutContenu::Brouillon,
            'revision' => 0,
            'est_exemple' => $estExemple,
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $consigne  document de blocs
     */
    public function ajouterPartie(Sujet $sujet, User $acteur, string $titre, ?float $bareme = null, ?array $consigne = null): SujetPartie
    {
        return $this->surBrouillon($sujet, $acteur, fn (Sujet $sujet) => SujetPartie::create([
            'uuid' => (string) Str::uuid7(),
            'sujet_id' => $sujet->id,
            'ordre' => ((int) $sujet->parties()->max('ordre')) + 1,
            'titre' => mb_substr(trim($titre) ?: 'Partie', 0, 160),
            'bareme' => $bareme,
            'consigne' => $this->consigneValide($consigne ?? BlocsContenu::vide()),
        ]));
    }

    /**
     * @param  array<string, mixed>  $consigne
     */
    public function enregistrerPartie(SujetPartie $partie, User $acteur, string $titre, ?float $bareme, array $consigne): SujetPartie
    {
        return $this->surBrouillon($partie->sujet, $acteur, function () use ($partie, $titre, $bareme, $consigne) {
            $partie->forceFill([
                'titre' => mb_substr(trim($titre), 0, 160),
                'bareme' => $bareme,
                'consigne' => $this->consigneValide($consigne),
            ])->save();

            return $partie;
        });
    }

    /** Une partie vide se supprime ; une partie qui a des questions, non. */
    public function supprimerPartie(SujetPartie $partie, User $acteur): void
    {
        $this->surBrouillon($partie->sujet, $acteur, function () use ($partie) {
            if ($partie->questions()->exists()) {
                throw ValidationException::withMessages(['partie' => 'Retirez d\'abord les questions de cette partie.']);
            }

            $partie->delete();
        });
    }

    /**
     * Une question de plus dans une partie (saisie à la main, réponse à écrire).
     */
    public function ajouterQuestion(SujetPartie $partie, User $acteur, Notion $notion, TypeQuestion $type): Question
    {
        return $this->surBrouillon($partie->sujet, $acteur, function (Sujet $sujet) use ($partie, $acteur, $notion, $type) {
            $question = $this->contenu->creerQuestion($acteur, $notion, $type, $sujet->est_exemple);
            $question->forceFill([
                'sujet_partie_id' => $partie->id,
                'ordre_sujet' => ((int) $partie->questions()->max('ordre_sujet')) + 1,
                'source' => 'annale',
            ])->save();

            return $question;
        });
    }

    /**
     * Retire une question jamais publiée (elle disparaît). Une question déjà
     * vue par des élèves reste : on l'archive depuis sa fiche.
     */
    public function retirerQuestion(Question $question, User $acteur): void
    {
        $partie = $this->partieDe($question);

        $this->surBrouillon($partie->sujet, $acteur, function () use ($question) {
            if ($question->version_publiee_id !== null || $question->statut !== StatutContenu::Brouillon) {
                throw ValidationException::withMessages(['question' => 'Une question déjà publiée ne se retire pas : archivez-la depuis sa fiche.']);
            }

            $question->versions()->delete();
            $question->delete();
        });
    }

    /** Monte (-1) ou descend (+1) une question dans sa partie. */
    public function deplacerQuestion(Question $question, User $acteur, int $sens): void
    {
        $partie = $this->partieDe($question);

        $this->surBrouillon($partie->sujet, $acteur, function () use ($partie, $question, $sens) {
            $liste = $partie->questions()->get()->values();
            $rang = $liste->search(fn (Question $q) => $q->id === $question->id);
            $cible = $rang === false ? null : $rang + ($sens < 0 ? -1 : 1);

            if ($cible === null || $cible < 0 || $cible >= $liste->count()) {
                return;
            }

            $ordre = $liste->all();
            [$ordre[$rang], $ordre[$cible]] = [$ordre[$cible], $ordre[$rang]];

            foreach ($ordre as $position => $q) {
                $q->forceFill(['ordre_sujet' => $position + 1])->save();
            }
        });
    }

    /**
     * Le rédacteur a relu la réponse et le corrigé proposés par l'IA.
     */
    public function verifierReponse(Question $question, User $acteur): Question
    {
        $this->exiger(Perimetre::peutRediger($acteur, $question), 'Vous ne pouvez pas modifier cette question.');

        if ($question->statut !== StatutContenu::Brouillon) {
            throw ValidationException::withMessages(['question' => 'Seul un brouillon se vérifie.']);
        }

        $question->forceFill(['reponse_a_verifier' => false])->save();

        return $question;
    }

    public function soumettre(Sujet $sujet, User $acteur): Sujet
    {
        return DB::transaction(function () use ($sujet, $acteur) {
            $erreur = $sujet->statut === StatutContenu::Brouillon ? $sujet->erreurAvantRelecture() : null;

            if ($erreur !== null) {
                throw ValidationException::withMessages(['blocs' => $erreur]);
            }

            foreach ($this->questions($sujet, StatutContenu::Brouillon) as $question) {
                $this->contenu->soumettre($question, $acteur);
            }

            return $this->contenu->soumettre($sujet, $acteur);
        });
    }

    public function reprendre(Sujet $sujet, User $acteur): Sujet
    {
        return DB::transaction(function () use ($sujet, $acteur) {
            $sujet = $this->contenu->reprendre($sujet, $acteur);

            foreach ($this->questions($sujet, StatutContenu::EnRelecture) as $question) {
                $this->contenu->reprendre($question, $acteur);
            }

            return $sujet;
        });
    }

    public function publier(Sujet $sujet, User $relecteur, ?string $commentaire = null): Sujet
    {
        return DB::transaction(function () use ($sujet, $relecteur, $commentaire) {
            foreach ($this->questions($sujet, StatutContenu::EnRelecture) as $question) {
                $this->contenu->publier($question, $relecteur, $commentaire);
            }

            return $this->contenu->publier($sujet, $relecteur, $commentaire);
        });
    }

    public function renvoyer(Sujet $sujet, User $relecteur, string $commentaire): Sujet
    {
        return DB::transaction(function () use ($sujet, $relecteur, $commentaire) {
            $sujet = $this->contenu->renvoyer($sujet, $relecteur, $commentaire);

            foreach ($this->questions($sujet, StatutContenu::EnRelecture) as $question) {
                $this->contenu->renvoyer($question, $relecteur, $commentaire);
            }

            return $sujet;
        });
    }

    /**
     * @return list<Question>
     */
    private function questions(Sujet $sujet, StatutContenu $statut): array
    {
        return array_values(Question::query()
            ->whereIn('sujet_partie_id', $sujet->parties()->select('id'))
            ->where('statut', $statut->value)
            ->orderBy('id')
            ->get()
            ->all());
    }

    private function partieDe(Question $question): SujetPartie
    {
        return SujetPartie::query()->with('sujet')->whereKey($question->sujet_partie_id)->first()
            ?? throw ValidationException::withMessages(['question' => 'Cette question n\'appartient à aucune annale.']);
    }

    /**
     * Une retouche de la structure : sujet en brouillon et rédacteur rattaché,
     * revérifiés sous verrou ; la révision avance (l'autre onglet le saura).
     *
     * @template T
     *
     * @param  callable(Sujet): T  $etape
     * @return T
     */
    private function surBrouillon(Sujet $sujet, User $acteur, callable $etape): mixed
    {
        return DB::transaction(function () use ($sujet, $acteur, $etape) {
            /** @var Sujet $frais */
            $frais = Sujet::query()->whereKey($sujet->id)->lockForUpdate()->firstOrFail();

            $this->exiger(Perimetre::peutRediger($acteur, $frais), 'Vous ne pouvez pas modifier cette annale.');

            if ($frais->statut !== StatutContenu::Brouillon) {
                throw ValidationException::withMessages(['statut' => 'Seul un brouillon se modifie. Ouvrez d\'abord une modification.']);
            }

            $resultat = $etape($frais);
            $frais->forceFill(['revision' => $frais->revision + 1])->save();

            return $resultat;
        });
    }

    /**
     * @param  array<string, mixed>  $consigne
     * @return array<string, mixed>
     */
    private function consigneValide(array $consigne): array
    {
        $erreur = BlocsContenu::erreur($consigne)
            ?? (BlocsContenu::questionsCitees($consigne) !== [] ? 'Une consigne ne contient pas de mini-question.' : null);

        if ($erreur !== null) {
            throw ValidationException::withMessages(['consigne' => $erreur]);
        }

        return $consigne;
    }

    private function exiger(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new AuthorizationException($message);
        }
    }
}
