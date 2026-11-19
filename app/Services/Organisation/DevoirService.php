<?php

namespace App\Services\Organisation;

use App\Models\Devoir;
use App\Models\Groupe;
use App\Models\MembreGroupe;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Support\CatalogueEleve;
use App\Support\Perimetre;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Les devoirs (lot 11, PLAN M14, décision 6) : une série de **questions
 * publiées** du catalogue du groupe (l'enseignant ne rédige pas de
 * question : rien n'est publié sans relecture), avec une échéance.
 *
 * **Le rendu est une séance** : « Commencer » crée (une seule fois) la
 * séance du devoir de l'élève, jouée par l'écran de séance ; les réponses
 * passent par `tentative.enregistrer`, la fin par `seance.terminer` — les
 * mêmes services qu'une séance du jour (HORS_LIGNE.md A.6). Ouvrir un
 * devoir demande le réseau ; une fois commencé, il se finit hors ligne.
 * Un rendu après l'échéance est accepté, marqué « en retard ».
 */
class DevoirService
{
    public const QUESTIONS_MAX = 30;

    /**
     * @param  list<string>  $questions  UUID des questions, dans l'ordre voulu
     */
    public function creer(User $enseignant, Groupe $groupe, string $titre, ?string $consigne, CarbonImmutable $echeance, array $questions, bool $defi = false): Devoir
    {
        if (! Perimetre::peutGererGroupe($enseignant, $groupe) || $groupe->archive_le !== null) {
            throw new GesteRefuse('Ce groupe n\'accepte plus de devoir.', 'groupe');
        }

        $questions = array_values(array_unique($questions));

        if ($questions === [] || count($questions) > self::QUESTIONS_MAX) {
            throw new GesteRefuse('Choisissez de 1 à '.self::QUESTIONS_MAX.' questions.', 'questions');
        }

        if ($echeance->isPast()) {
            throw new GesteRefuse('L\'échéance est déjà passée.', 'echeance');
        }

        $ids = $this->questionsDuGroupe($groupe)->whereIn('uuid', $questions)->pluck('id', 'uuid');

        if ($ids->count() !== count($questions)) {
            throw new GesteRefuse('Une question choisie n\'est plus publiée pour ce groupe.', 'questions');
        }

        return DB::transaction(function () use ($enseignant, $groupe, $titre, $consigne, $echeance, $questions, $ids, $defi) {
            $devoir = Devoir::create([
                'groupe_id' => $groupe->id,
                'auteur_id' => $enseignant->id,
                'titre' => $titre,
                'consigne' => $consigne,
                'defi' => $defi,
                'echeance_le' => $echeance,
                'publie_le' => CarbonImmutable::now(),
            ]);

            foreach ($questions as $rang => $uuid) {
                $devoir->questions()->attach($ids[$uuid], ['ordre' => $rang + 1]);
            }

            return $devoir;
        });
    }

    /** Repousser l'échéance (ou l'avancer, tant qu'elle n'est pas passée). */
    public function changerEcheance(Devoir $devoir, CarbonImmutable $echeance): void
    {
        if ($echeance->isPast()) {
            throw new GesteRefuse('L\'échéance est déjà passée.', 'echeance');
        }

        $devoir->update(['echeance_le' => $echeance]);
    }

    /**
     * Les questions qu'un devoir de ce groupe peut contenir : celles que voit
     * un élève du groupe (CatalogueEleve, profil type du groupe).
     *
     * @return Builder<Question>
     */
    public function questionsDuGroupe(Groupe $groupe): Builder
    {
        return CatalogueEleve::questions($groupe->profilType());
    }

    /**
     * L'élève commence (ou reprend) son devoir : sa séance, créée une fois.
     */
    public function commencer(User $eleve, Devoir $devoir): Seance
    {
        $groupe = $devoir->groupe;

        if (! Perimetre::estMembre($eleve, $groupe) || $groupe->archive_le !== null) {
            throw new GesteRefuse('Ce devoir n\'est plus ouvert pour toi.');
        }

        return DB::transaction(function () use ($eleve, $devoir) {
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $existante = Seance::query()->where('devoir_id', $devoir->id)->where('user_id', $eleve->id)->first();

            if ($existante !== null) {
                return $existante;
            }

            $profil = CatalogueEleve::profil($eleve) ?? throw new GesteRefuse('Choisis d\'abord ton examen.');
            $visibles = CatalogueEleve::questions($profil)->whereIn('id', $devoir->questions()->pluck('questions.id'))->pluck('id')->all();
            $ordre = $devoir->questions()->pluck('questions.id')->filter(fn (int $id) => in_array($id, $visibles, true))->values()->all();

            if ($ordre === []) {
                throw new GesteRefuse('Les questions de ce devoir ne sont plus publiées. Préviens ton enseignant.');
            }

            return Seance::create([
                'uuid' => (string) Str::uuid7(),
                'user_id' => $eleve->id,
                'jour' => CarbonImmutable::today()->toDateString(),
                'devoir_id' => $devoir->id,
                'questions' => $ordre,
                'duree_minutes' => min(120, max(5, count($ordre) * 2)),
                'genere_le' => CarbonImmutable::now(),
            ]);
        });
    }

    /**
     * Lot 12 (PLAN M13, décision du 2026-11-18) : le classement d'un défi du
     * groupe. N'y paraissent, **par leur pseudo**, que les élèves présents
     * qui l'ont accepté (`membres_groupes.classement_accepte`) et ont rendu
     * le défi ; les autres sont comptés sans être nommés. Meilleur score
     * d'abord, puis le premier rendu. `null` : ce devoir n'est pas un défi.
     *
     * @return array{classes: list<array{rang: int, pseudo: string, score: int, est_moi: bool}>, autres_rendus: int, rendus: int, j_accepte: bool|null}|null
     */
    public function classement(Devoir $devoir, ?User $lecteur = null): ?array
    {
        if (! $devoir->defi) {
            return null;
        }

        $membres = MembreGroupe::query()->actifs()->where('groupe_id', $devoir->groupe_id)->with('eleve')->get();
        $etats = $this->etats($devoir, $membres->map(fn (MembreGroupe $m) => $m->eleve));
        $rendus = $membres->filter(fn (MembreGroupe $m) => $etats[$m->eleve_id]['etat'] === 'rendu' && $etats[$m->eleve_id]['score'] !== null);
        $classes = $rendus->filter(fn (MembreGroupe $m) => $m->classement_accepte)
            ->sortBy([
                fn (MembreGroupe $a, MembreGroupe $b) => $etats[$b->eleve_id]['score'] <=> $etats[$a->eleve_id]['score'],
                fn (MembreGroupe $a, MembreGroupe $b) => $etats[$a->eleve_id]['rendu_le'] <=> $etats[$b->eleve_id]['rendu_le'],
                fn (MembreGroupe $a, MembreGroupe $b) => $a->eleve_id <=> $b->eleve_id,
            ])
            ->values();

        return [
            'classes' => array_values($classes->map(fn (MembreGroupe $m, int $i) => [
                'rang' => $i + 1,
                'pseudo' => $m->eleve->pseudo,
                'score' => (int) $etats[$m->eleve_id]['score'],
                'est_moi' => $m->eleve_id === $lecteur?->id,
            ])->all()),
            'autres_rendus' => $rendus->count() - $classes->count(),
            'rendus' => $rendus->count(),
            'j_accepte' => $lecteur === null ? null : $membres->firstWhere('eleve_id', $lecteur->id)?->classement_accepte,
        ];
    }

    /** L'élève accepte (ou refuse) de paraître, par son pseudo, au classement des défis du groupe. */
    public function accepterClassement(User $eleve, Groupe $groupe, bool $accepte): void
    {
        $membre = MembreGroupe::query()->actifs()->where('groupe_id', $groupe->id)->where('eleve_id', $eleve->id)->first()
            ?? throw new GesteRefuse('Tu ne fais plus partie de ce groupe.');

        $membre->update(['classement_accepte' => $accepte]);
    }

    /**
     * Où en est chaque élève (présent) d'un devoir.
     *
     * @param  Collection<int, User>  $eleves
     * @return array<int, array{etat: 'a_faire'|'en_cours'|'rendu', en_retard: bool, reponses: int, score: int|null, rendu_le: string|null}>
     */
    public function etats(Devoir $devoir, Collection $eleves): array
    {
        $seances = Seance::query()->where('devoir_id', $devoir->id)->whereIn('user_id', $eleves->map(fn (User $eleve) => $eleve->id)->all())->get()->keyBy('user_id');
        $tentatives = Tentative::query()
            ->whereIn('seance_id', $seances->modelKeys())
            ->get(['seance_id', 'question_id', 'score', 'saisi_le'])
            ->groupBy('seance_id');
        $total = $devoir->questions()->count();
        $etats = [];

        foreach ($eleves as $eleve) {
            $seance = $seances->get($eleve->id);
            // La dernière réponse à chaque question compte.
            $reponses = $seance === null ? collect() : ($tentatives->get($seance->id) ?? collect())
                ->sortBy('saisi_le')
                ->keyBy('question_id');
            $notees = $reponses->whereNotNull('score');
            $etat = match (true) {
                $seance === null => 'a_faire',
                $seance->termine_le === null => 'en_cours',
                default => 'rendu',
            };

            $etats[$eleve->id] = [
                'etat' => $etat,
                'en_retard' => $etat === 'rendu'
                    ? $seance->termine_le->greaterThan($devoir->echeance_le)
                    : $devoir->echeance_le->isPast(),
                'reponses' => min($total, $reponses->count()),
                'score' => $notees->isEmpty() ? null : (int) round($notees->avg('score')),
                'rendu_le' => $etat === 'rendu' ? $seance->termine_le->toIso8601ZuluString() : null,
            ];
        }

        return $etats;
    }
}
