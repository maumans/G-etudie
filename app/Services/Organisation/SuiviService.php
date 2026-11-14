<?php

namespace App\Services\Organisation;

use App\Models\Devoir;
use App\Models\Etablissement;
use App\Models\ExamenBlanc;
use App\Models\Groupe;
use App\Models\LicenceEtablissement;
use App\Models\SerieJour;
use App\Models\User;
use App\Services\AbonnementService;
use App\Services\MaitriseService;
use App\Services\MotivationService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Ce que voient le parent, l'enseignant et le gestionnaire (lot 11) — en
 * lecture seule. Les chiffres viennent des autorités existantes : la jauge
 * et la maîtrise de MaitriseService, la série de MotivationService, l'état
 * des devoirs de DevoirService. **Qui** est vu n'est jamais décidé ici :
 * le contrôleur passe un élève ou un groupe que Perimetre a autorisé.
 *
 * Données minimales (PLAN § 10, décision 5) : prénom et pseudo de l'élève,
 * jamais son numéro.
 */
class SuiviService
{
    public const JOURS_ACTIVITE = 7;

    public function __construct(
        private MaitriseService $maitrise,
        private MotivationService $motivation,
        private DevoirService $devoirs,
        private AbonnementService $abonnements,
        private EtablissementService $etablissements,
    ) {}

    /**
     * La fiche d'un enfant pour son parent (PLAN M15) : temps de révision,
     * jauge, derniers examens blancs.
     *
     * @return array<string, mixed>
     */
    public function enfant(User $eleve, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $profil = CatalogueEleve::profil($eleve);
        $jours = SerieJour::query()
            ->where('user_id', $eleve->id)
            ->where('jour', '>=', $maintenant->startOfDay()->subDays(13)->toDateString())
            ->get()
            ->keyBy(fn (SerieJour $jour) => $jour->jour->toDateString());
        $semaine = [];

        for ($rang = 6; $rang >= 0; $rang--) {
            $date = $maintenant->startOfDay()->subDays($rang);
            $ligne = $jours->get($date->toDateString());
            $semaine[] = [
                'date' => $date->toDateString(),
                'minutes' => $ligne === null ? 0 : (int) round($ligne->secondes / 60),
                'reponses' => $ligne->reponses ?? 0,
                'objectif' => $ligne !== null && $ligne->objectif_atteint,
            ];
        }

        $precedente = $jours->filter(fn (SerieJour $jour) => $jour->jour->lessThan($maintenant->startOfDay()->subDays(6)))->sum('secondes');

        return [
            'eleve' => $this->identite($eleve),
            'examen' => $profil?->libelleExamen(),
            'objectif_minutes' => $profil?->objectif_minutes,
            'jauge' => $profil === null ? null : $this->maitrise->jauge($profil),
            'matieres' => $profil === null ? [] : array_values($this->maitrise->parMatiere($profil)->map(fn (array $m) => [
                'cle' => $m['cle'],
                'nom' => $m['nom'],
                'maitrise' => $m['maitrise'],
                'notions' => $m['notions'],
                'maitrisees' => $m['maitrisees'],
            ])->all()),
            'semaine' => $semaine,
            'minutes_semaine' => array_sum(array_column($semaine, 'minutes')),
            'minutes_semaine_precedente' => (int) round($precedente / 60),
            'serie' => $this->motivation->serie($eleve->id, $maintenant)['jours'],
            'examens_blancs' => ExamenBlanc::query()
                ->with('sujet.matiere')
                ->where('user_id', $eleve->id)
                ->orderByDesc('termine_le')
                ->orderByDesc('id')
                ->limit(5)
                ->get()
                ->map(fn (ExamenBlanc $examen) => [
                    'uuid' => $examen->uuid,
                    'titre' => $examen->sujet->titre,
                    'session' => $examen->sujet->libelleSession(),
                    'matiere' => ['cle' => $examen->sujet->matiere->teinte->value, 'nom' => $examen->sujet->matiere->nom],
                    'note' => (float) $examen->note_sur_20,
                    'termine_le' => $examen->termine_le->toIso8601ZuluString(),
                    'est_exemple' => $examen->sujet->est_exemple,
                ])->values()->all(),
            'abonnement' => $this->abonnements->etat($eleve),
        ];
    }

    /**
     * Le suivi d'un groupe pour son enseignant (PLAN M14 « qui a fait quoi,
     * notions faibles de la classe »). Seuls les élèves présents comptent.
     *
     * @return array<string, mixed>
     */
    public function groupe(Groupe $groupe, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $groupe->loadMissing(['examen', 'serie', 'etablissement']);
        $eleves = $groupe->eleves()->orderBy('prenom')->orderBy('users.id')->get();
        $ids = array_values(array_map('intval', $eleves->modelKeys()));
        $type = $groupe->profilType();
        $jauges = $this->maitrise->jaugesDuGroupe($type, $ids);
        $actifs = $this->actifsDepuis($ids, $maintenant->startOfDay()->subDays(self::JOURS_ACTIVITE - 1));
        $derniere = SerieJour::query()->whereIn('user_id', $ids)->selectRaw('user_id, max(jour) as jour')->groupBy('user_id')->pluck('jour', 'user_id');
        $devoirs = $groupe->devoirs()->withCount('questions')->orderByDesc('echeance_le')->orderByDesc('id')->get();
        $etats = $devoirs->mapWithKeys(fn (Devoir $devoir) => [$devoir->id => $this->devoirs->etats($devoir, $eleves)]);

        return [
            'groupe' => $this->resumeGroupe($groupe, count($ids)),
            'resume' => [
                'eleves' => count($ids),
                'jauge_moyenne' => $ids === [] ? null : (int) round(array_sum($jauges) / count($ids)),
                'actifs_semaine' => count($actifs),
                'devoirs_ouverts' => $devoirs->filter(fn (Devoir $d) => $d->echeance_le->isFuture())->count(),
            ],
            'notions_faibles' => $this->maitrise->notionsFaibles($type, $ids),
            'eleves' => $eleves->map(fn (User $eleve) => [
                ...$this->identite($eleve),
                'jauge' => $jauges[$eleve->id] ?? 0,
                'actif_semaine' => in_array($eleve->id, $actifs, true),
                'derniere_activite' => isset($derniere[$eleve->id]) ? CarbonImmutable::parse($derniere[$eleve->id])->toDateString() : null,
                'devoirs_rendus' => $etats->filter(fn (array $parEleve) => ($parEleve[$eleve->id]['etat'] ?? null) === 'rendu')->count(),
            ])->values()->all(),
            'devoirs' => $devoirs->map(fn (Devoir $devoir) => [
                ...$this->resumeDevoir($devoir),
                'rendus' => collect($etats[$devoir->id])->where('etat', 'rendu')->count(),
                'en_cours' => collect($etats[$devoir->id])->where('etat', 'en_cours')->count(),
            ])->values()->all(),
        ];
    }

    /**
     * Le suivi d'un devoir : où en est chaque élève.
     *
     * @return array<string, mixed>
     */
    public function devoir(Devoir $devoir): array
    {
        $groupe = $devoir->groupe;
        $eleves = $groupe->eleves()->orderBy('prenom')->orderBy('users.id')->get();
        $etats = $this->devoirs->etats($devoir, $eleves);
        $questions = $devoir->questions()->with('notion.chapitre.matiere')->get();

        return [
            'groupe' => $this->resumeGroupe($groupe->loadMissing(['examen', 'serie', 'etablissement']), $eleves->count()),
            'devoir' => [
                ...$this->resumeDevoir($devoir->loadCount('questions')),
                'consigne' => $devoir->consigne,
            ],
            'questions' => $questions->map(fn ($question) => [
                'uuid' => $question->uuid,
                'extrait' => $question->extrait,
                'notion' => $question->notion->titre,
                'matiere' => ['cle' => $question->notion->chapitre->matiere->teinte->value, 'nom' => $question->notion->chapitre->matiere->nom],
            ])->values()->all(),
            'eleves' => $eleves->map(fn (User $eleve) => [...$this->identite($eleve), ...$etats[$eleve->id]])->values()->all(),
        ];
    }

    /**
     * Le rapport de préparation d'un établissement, par groupe (PLAN M14).
     *
     * @return array<string, mixed>
     */
    public function etablissement(Etablissement $etablissement, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $groupes = $etablissement->groupes()->ouverts()->with(['examen', 'serie', 'enseignant'])->orderBy('nom')->orderBy('id')->get();
        $lignes = $groupes->map(function (Groupe $groupe) use ($maintenant) {
            $ids = array_values($groupe->eleves()->pluck('users.id')->map(fn ($id) => (int) $id)->all());
            $type = $groupe->profilType();
            $jauges = $this->maitrise->jaugesDuGroupe($type, $ids);
            $faibles = $this->maitrise->notionsFaibles($type, $ids, 3);

            return [
                ...$this->resumeGroupe($groupe, count($ids)),
                'enseignant' => $groupe->enseignant->prenom,
                'jauge_moyenne' => $ids === [] ? null : (int) round(array_sum($jauges) / count($ids)),
                'actifs_semaine' => count($this->actifsDepuis($ids, $maintenant->startOfDay()->subDays(self::JOURS_ACTIVITE - 1))),
                'notions_faibles' => $faibles,
            ];
        });

        return [
            'etablissement' => [
                'id' => $etablissement->id,
                'nom' => $etablissement->nom,
                'commune' => $etablissement->commune,
                'est_exemple' => $etablissement->est_exemple,
            ],
            'groupes' => $lignes->values()->all(),
            'resume' => [
                'groupes' => $groupes->count(),
                'eleves' => (int) $lignes->sum('eleves'),
                'enseignants' => $etablissement->rattachements()->actifs()->where('role', 'enseignant')->count(),
                'jauge_moyenne' => $lignes->whereNotNull('jauge_moyenne')->isEmpty() ? null : (int) round($lignes->whereNotNull('jauge_moyenne')->avg('jauge_moyenne')),
            ],
            'licences' => $etablissement->licences()->orderByDesc('fin')->orderByDesc('id')->get()->map(fn (LicenceEtablissement $licence) => $this->resumeLicence($licence))->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function resumeLicence(LicenceEtablissement $licence): array
    {
        $maintenant = CarbonImmutable::now();

        return [
            'id' => $licence->id,
            'places' => $licence->places,
            'prises' => $this->etablissements->placesPrises($licence),
            'debut' => $licence->debut->toIso8601ZuluString(),
            'fin' => $licence->fin->toIso8601ZuluString(),
            'en_cours' => $licence->debut->lessThanOrEqualTo($maintenant) && $licence->fin->greaterThan($maintenant),
            'reference' => $licence->reference,
            'est_exemple' => $licence->est_exemple,
        ];
    }

    /** @return array<string, mixed> */
    public function resumeGroupe(Groupe $groupe, int $eleves): array
    {
        return [
            'id' => $groupe->id,
            'nom' => $groupe->nom,
            'code' => $groupe->code,
            'examen' => $groupe->libelleExamen(),
            'etablissement' => $groupe->etablissement?->nom,
            'archive' => $groupe->archive_le !== null,
            'eleves' => $eleves,
            'est_exemple' => $groupe->est_exemple,
        ];
    }

    /** @return array<string, mixed> */
    public function resumeDevoir(Devoir $devoir): array
    {
        return [
            'id' => $devoir->id,
            'titre' => $devoir->titre,
            'echeance_le' => $devoir->echeance_le->toIso8601ZuluString(),
            'echu' => $devoir->echeance_le->isPast(),
            'questions' => (int) ($devoir->questions_count ?? $devoir->questions()->count()),
            'est_exemple' => $devoir->est_exemple,
        ];
    }

    /** @return array{id: int, prenom: string, pseudo: string} */
    public function identite(User $eleve): array
    {
        return ['id' => $eleve->id, 'prenom' => $eleve->prenom, 'pseudo' => $eleve->pseudo];
    }

    /**
     * @param  list<int>  $ids
     * @return list<int>
     */
    private function actifsDepuis(array $ids, CarbonImmutable $depuis): array
    {
        if ($ids === []) {
            return [];
        }

        /** @var Collection<int, int> $actifs */
        $actifs = SerieJour::query()
            ->whereIn('user_id', $ids)
            ->where('jour', '>=', $depuis->toDateString())
            ->where('reponses', '>', 0)
            ->distinct()
            ->pluck('user_id');

        return array_values($actifs->map(fn ($id) => (int) $id)->all());
    }
}
