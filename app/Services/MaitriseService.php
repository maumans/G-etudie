<?php

namespace App\Services;

use App\Models\Epreuve;
use App\Models\Maitrise;
use App\Models\Notion;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Tentative;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * **Seule autorité** sur la maîtrise, la révision espacée et la jauge de
 * préparation (PLAN M8 ; HORS_LIGNE.md A.10 : jamais recalculées en
 * JavaScript).
 *
 * **Maîtrise d'une notion** (0 à 100) : moyenne des scores des 20 dernières
 * réponses notées, chacune pesant deux fois moins tous les 14 jours (comptés
 * depuis la réponse la plus récente) ; tant que l'élève a donné moins de 3
 * réponses, elle est réduite d'autant (une seule réponse juste ne fait pas
 * 100 %). Les indices ne retirent rien (lot 3). Recalculée **à partir de
 * toutes les réponses**, triées par `saisi_le` : des réponses hors ligne
 * arrivées dans le désordre donnent le même résultat.
 *
 * **Révision espacée** : une réussite (100) à une notion due la fait monter
 * d'un palier ; elle revient après 1, 3, 7, 14 puis 30 jours. Une réponse
 * en partie juste la fait revenir le lendemain ; une réponse fausse (sous
 * 50) la remet au palier 0, le lendemain aussi. Réussir une notion avant
 * qu'elle soit due ne la fait pas monter.
 *
 * **Maîtrise d'une matière** : moyenne de ses notions **évaluables** (celles
 * qui ont au moins une question pour l'élève) ; une notion jamais travaillée
 * compte 0. **Jauge** : moyenne des matières pondérée par les coefficients
 * quand ils sont **tous** saisis, sinon simple (aucun coefficient inventé,
 * CLAUDE.md § 5). Elle ne flatte pas : rien de fait, 0 %.
 *
 * Une nouvelle version d'une question ne recalcule rien (A.9) : le score
 * d'une tentative est celui de la version vue.
 */
class MaitriseService
{
    public const DEMI_VIE_JOURS = 14;

    public const REPONSES_POUR_CONFIANCE = 3;

    public const REPONSES_RETENUES = 20;

    public const SEUIL_MAITRISEE = 80;

    public const SEUIL_FRAGILE = 50;

    /** Délai avant la révision suivante, par palier atteint (1 à 5). */
    public const INTERVALLES_JOURS = [1, 3, 7, 14, 30];

    /** Après une réponse notée (ou auto-évaluée) : sa notion est recalculée. */
    public function apresTentative(Tentative $tentative): ?Maitrise
    {
        $notionId = Question::query()->whereKey($tentative->question_id)->value('notion_id');

        return $notionId === null ? null : $this->recalculer($tentative->user_id, (int) $notionId);
    }

    public function recalculer(int $userId, int $notionId): ?Maitrise
    {
        $reponses = array_values(Tentative::query()
            ->where('user_id', $userId)
            ->whereNotNull('score')
            ->whereIn('question_id', Question::query()->where('notion_id', $notionId)->select('id'))
            ->orderBy('saisi_le')
            ->orderBy('id')
            ->get(['score', 'saisi_le'])
            ->map(fn (Tentative $tentative) => [
                'score' => (int) $tentative->score,
                'saisi_le' => CarbonImmutable::instance($tentative->saisi_le),
            ])
            ->all());

        if ($reponses === []) {
            Maitrise::query()->where('user_id', $userId)->where('notion_id', $notionId)->delete();

            return null;
        }

        $calcul = self::calculer($reponses);

        return Maitrise::query()->updateOrCreate(
            ['user_id' => $userId, 'notion_id' => $notionId],
            [...$calcul, 'maj_le' => CarbonImmutable::now()],
        );
    }

    /**
     * Le calcul lui-même, sans base : testé seul et rejoué par le scénario
     * de jauge (tests/fixtures/scenario-jauge.json).
     *
     * @param  non-empty-list<array{score: int, saisi_le: CarbonImmutable}>  $reponses  triées par `saisi_le`
     * @return array{score: int, reponses: int, palier: int, prochaine_revision_le: string|null, derniere_reponse_le: CarbonImmutable}
     */
    public static function calculer(array $reponses): array
    {
        $derniere = $reponses[array_key_last($reponses)]['saisi_le'];
        $retenues = array_slice($reponses, -self::REPONSES_RETENUES);
        $somme = 0.0;
        $poids = 0.0;

        foreach ($retenues as $reponse) {
            $ageJours = max(0, $reponse['saisi_le']->diffInSeconds($derniere)) / 86400;
            $poidsReponse = 0.5 ** ($ageJours / self::DEMI_VIE_JOURS);
            $somme += $reponse['score'] * $poidsReponse;
            $poids += $poidsReponse;
        }

        $confiance = min(1, count($retenues) / self::REPONSES_POUR_CONFIANCE);
        $palier = 0;
        $prochaine = null;

        foreach ($reponses as $reponse) {
            $jour = $reponse['saisi_le']->startOfDay();

            if ($reponse['score'] === 100) {
                if ($prochaine === null || $palier === 0 || $jour->greaterThanOrEqualTo($prochaine)) {
                    $palier = min($palier + 1, count(self::INTERVALLES_JOURS));
                    $prochaine = $jour->addDays(self::INTERVALLES_JOURS[$palier - 1]);
                }
            } elseif ($reponse['score'] >= self::SEUIL_FRAGILE) {
                $prochaine = $jour->addDay();
            } else {
                $palier = 0;
                $prochaine = $jour->addDay();
            }
        }

        return [
            'score' => (int) round($poids > 0 ? $somme / $poids * $confiance : 0),
            'reponses' => count($retenues),
            'palier' => $palier,
            'prochaine_revision_le' => $prochaine->toDateString(),
            'derniere_reponse_le' => $derniere,
        ];
    }

    /**
     * La jauge (forme inchangée depuis le lot 2, plus `calcule_le` pour
     * l'appareil, A.10).
     *
     * @return array{pourcentage: int, matieres: list<array{cle: string, maitrise: int}>, calcule_le: string}
     */
    public function jauge(ProfilEleve $profil): array
    {
        $matieres = $this->parMatiere($profil);

        return [
            'pourcentage' => self::ponderer($matieres->all()),
            'matieres' => array_values($matieres->map(fn (array $matiere) => ['cle' => $matiere['cle'], 'maitrise' => $matiere['maitrise']])->all()),
            'calcule_le' => CarbonImmutable::now()->toIso8601ZuluString('millisecond'),
        ];
    }

    /**
     * La jauge d'une matière à l'autre : pondérée par les coefficients s'ils
     * sont tous saisis, sinon simple.
     *
     * @param  array<int, array{coefficient: float|null, maitrise: int}>  $matieres
     */
    private static function ponderer(array $matieres): int
    {
        $tousCoefficients = array_all($matieres, fn (array $matiere) => $matiere['coefficient'] !== null);
        $somme = 0.0;
        $poids = 0.0;

        foreach ($matieres as $matiere) {
            $coefficient = $tousCoefficients ? (float) $matiere['coefficient'] : 1.0;
            $somme += $matiere['maitrise'] * $coefficient;
            $poids += $coefficient;
        }

        return $poids > 0 ? (int) round($somme / $poids) : 0;
    }

    /**
     * Lot 11 : la jauge de chaque élève d'un groupe, par la même règle que
     * `jauge()`, en quelques requêtes (le profil type du groupe donne les
     * matières et les notions ; les élèves d'un groupe ont son examen, sa
     * série et sa filière).
     *
     * @param  list<int>  $eleves
     * @return array<int, int> élève => pourcentage
     */
    public function jaugesDuGroupe(ProfilEleve $type, array $eleves): array
    {
        if ($eleves === []) {
            return [];
        }

        $epreuves = CatalogueEleve::epreuves($type);
        $notions = $this->notionsEvaluables($type);
        $scores = Maitrise::query()
            ->whereIn('user_id', $eleves)
            ->whereIn('notion_id', $notions->pluck('id')->all())
            ->get(['user_id', 'notion_id', 'score'])
            ->groupBy('user_id');
        $jauges = [];

        foreach ($eleves as $eleve) {
            $siens = ($scores->get($eleve) ?? collect())->keyBy('notion_id');
            $matieres = $epreuves->map(function (Epreuve $epreuve) use ($notions, $siens) {
                $notes = $notions
                    ->filter(fn (Notion $notion) => $notion->chapitre->matiere_id === $epreuve->matiere_id)
                    ->map(fn (Notion $notion) => $siens->get($notion->id)->score ?? 0);

                return [
                    'coefficient' => $epreuve->coefficient === null ? null : (float) $epreuve->coefficient,
                    'maitrise' => $notes->isEmpty() ? 0 : (int) round($notes->avg()),
                ];
            });
            $jauges[$eleve] = self::ponderer($matieres->all());
        }

        return $jauges;
    }

    /**
     * Lot 11 (critère : « un enseignant voit les notions faibles de sa
     * classe ») : pour chaque notion du groupe travaillée par au moins un de
     * ses élèves, la maîtrise moyenne de ceux qui l'ont travaillée, combien
     * sont fragiles (sous SEUIL_FRAGILE) et combien ne l'ont jamais
     * travaillée. Les plus faibles d'abord ; une notion maîtrisée en moyenne
     * n'y figure pas. Seuls les élèves passés en argument comptent : la
     * question « lesquels ? » est celle de Perimetre.
     *
     * @param  list<int>  $eleves
     * @return list<array{notion_id: int, notion: string, chapitre: string, matiere: string, cle: string, moyenne: int, travaillee_par: int, fragiles: int, jamais: int}>
     */
    public function notionsFaibles(ProfilEleve $type, array $eleves, int $limite = 8): array
    {
        if ($eleves === []) {
            return [];
        }

        $notions = Notion::query()
            ->whereIn('id', CatalogueEleve::questions($type)->select('notion_id'))
            ->with('chapitre.matiere')
            ->get()
            ->keyBy('id');
        $lignes = Maitrise::query()
            ->whereIn('user_id', $eleves)
            ->whereIn('notion_id', $notions->keys())
            ->get(['user_id', 'notion_id', 'score'])
            ->groupBy('notion_id');
        $total = count($eleves);

        return array_values($lignes
            ->map(function (Collection $maitrises, int $notionId) use ($notions, $total) {
                $notion = $notions->get($notionId);

                return [
                    'notion_id' => $notionId,
                    'notion' => $notion->titre,
                    'chapitre' => $notion->chapitre->titre,
                    'matiere' => $notion->chapitre->matiere->nom,
                    'cle' => $notion->chapitre->matiere->teinte->value,
                    'moyenne' => (int) round($maitrises->avg('score')),
                    'travaillee_par' => $maitrises->count(),
                    'fragiles' => $maitrises->filter(fn (Maitrise $maitrise) => $maitrise->score < self::SEUIL_FRAGILE)->count(),
                    'jamais' => $total - $maitrises->count(),
                ];
            })
            ->filter(fn (array $ligne) => $ligne['moyenne'] < self::SEUIL_MAITRISEE)
            ->sortBy([['moyenne', 'asc'], ['fragiles', 'desc'], ['notion_id', 'asc']])
            ->take($limite)
            ->all());
    }

    /**
     * Par matière de l'élève (ordre de CatalogueEleve::epreuves) : sa
     * maîtrise et ses notions.
     *
     * @return Collection<int, array{matiere_id: int, cle: string, nom: string, slug: string, coefficient: float|null, maitrise: int, notions: int, maitrisees: int}>
     */
    public function parMatiere(ProfilEleve $profil): Collection
    {
        $notions = $this->notionsEvaluables($profil);
        $maitrises = $this->maitrises($profil->user_id);

        return CatalogueEleve::epreuves($profil)->map(function (Epreuve $epreuve) use ($notions, $maitrises) {
            $siennes = $notions->filter(fn (Notion $notion) => $notion->chapitre->matiere_id === $epreuve->matiere_id);
            $scores = $siennes->map(fn (Notion $notion) => $maitrises->get($notion->id)->score ?? 0);

            return [
                'matiere_id' => $epreuve->matiere_id,
                'cle' => $epreuve->matiere->teinte->value,
                'nom' => $epreuve->matiere->nom,
                'slug' => $epreuve->matiere->slug,
                'coefficient' => $epreuve->coefficient === null ? null : (float) $epreuve->coefficient,
                'maitrise' => $scores->isEmpty() ? 0 : (int) round($scores->avg()),
                'notions' => $siennes->count(),
                'maitrisees' => $scores->filter(fn (int $score) => $score >= self::SEUIL_MAITRISEE)->count(),
            ];
        })->values();
    }

    /**
     * La matière où l'effort rapporte le plus à la jauge : coefficient (1
     * s'ils ne sont pas tous saisis) × ce qui manque à sa maîtrise ; parmi
     * celles qui ont des questions. Sert au défi de la semaine et à l'ordre
     * des séances.
     *
     * @return array<int, float> matiere_id => poids, du plus fort au plus faible
     */
    public function poidsMatieres(ProfilEleve $profil): array
    {
        $matieres = $this->parMatiere($profil)->filter(fn (array $matiere) => $matiere['notions'] > 0);
        $tousCoefficients = $matieres->every(fn (array $matiere) => $matiere['coefficient'] !== null);
        $lignes = [];

        foreach ($matieres->values() as $rang => $matiere) {
            $lignes[] = [$matiere['matiere_id'], ($tousCoefficients ? $matiere['coefficient'] : 1.0) * (100 - $matiere['maitrise']), $rang];
        }

        // À poids égal, l'ordre des épreuves (phares d'abord).
        usort($lignes, fn (array $a, array $b) => [$b[1], $a[2]] <=> [$a[1], $b[2]]);

        $poids = [];

        foreach ($lignes as [$id, $valeur]) {
            $poids[$id] = $valeur;
        }

        return $poids;
    }

    /**
     * L'état d'une notion pour l'élève.
     *
     * @return 'nouvelle'|'a_revoir'|'maitrisee'|'fragile'|'en_cours'
     */
    public static function etat(?Maitrise $maitrise, CarbonImmutable $aujourdhui): string
    {
        return match (true) {
            $maitrise === null => 'nouvelle',
            $maitrise->prochaine_revision_le !== null && $maitrise->prochaine_revision_le->lessThanOrEqualTo($aujourdhui->startOfDay()) => 'a_revoir',
            $maitrise->score >= self::SEUIL_MAITRISEE => 'maitrisee',
            $maitrise->score < self::SEUIL_FRAGILE => 'fragile',
            default => 'en_cours',
        };
    }

    /**
     * Le détail pour « Ma progression » : par matière, ses chapitres et leurs
     * notions évaluables ; et les notions à revoir aujourd'hui.
     *
     * @return array{matieres: list<array<string, mixed>>, a_revoir: list<array<string, mixed>>, resume: array<string, int>}
     */
    public function detail(ProfilEleve $profil, CarbonImmutable $aujourdhui): array
    {
        $notions = $this->notionsEvaluables($profil);
        $maitrises = $this->maitrises($profil->user_id);
        $resume = ['maitrisees' => 0, 'en_cours' => 0, 'a_revoir' => 0, 'nouvelles' => 0];
        $aRevoir = [];

        $matieres = $this->parMatiere($profil)->map(function (array $matiere) use ($notions, $maitrises, $aujourdhui, &$resume, &$aRevoir) {
            $chapitres = $notions
                ->filter(fn (Notion $notion) => $notion->chapitre->matiere_id === $matiere['matiere_id'])
                ->groupBy('chapitre_id')
                ->sortBy(fn (Collection $groupe) => $groupe->first()->chapitre->ordre)
                ->map(function (Collection $groupe) use ($maitrises, $aujourdhui, $matiere, &$resume, &$aRevoir) {
                    $chapitre = $groupe->first()->chapitre;

                    return [
                        'id' => $chapitre->id,
                        'titre' => $chapitre->titre,
                        'notions' => $groupe->sortBy('ordre')->map(function (Notion $notion) use ($maitrises, $aujourdhui, $matiere, $chapitre, &$resume, &$aRevoir) {
                            $maitrise = $maitrises->get($notion->id);
                            $etat = self::etat($maitrise, $aujourdhui);
                            // Par score, comme « notions maîtrisées » de la
                            // matière ; les révisions dues se comptent à part.
                            $resume[match (true) {
                                $maitrise === null => 'nouvelles',
                                $maitrise->score >= self::SEUIL_MAITRISEE => 'maitrisees',
                                default => 'en_cours',
                            }]++;

                            if ($etat === 'a_revoir') {
                                $resume['a_revoir']++;
                            }

                            $ligne = [
                                'id' => $notion->id,
                                'titre' => $notion->titre,
                                'maitrise' => $maitrise?->score,
                                'etat' => $etat,
                                'prochaine_revision_le' => $maitrise?->prochaine_revision_le?->toDateString(),
                            ];

                            if ($etat === 'a_revoir') {
                                $aRevoir[] = [...$ligne, 'cle' => $matiere['cle'], 'chapitre' => $chapitre->titre];
                            }

                            return $ligne;
                        })->values()->all(),
                    ];
                })->values()->all();

            return [...collect($matiere)->except(['matiere_id', 'coefficient'])->all(), 'chapitres' => $chapitres];
        })->values()->all();

        usort($aRevoir, fn (array $a, array $b) => $a['prochaine_revision_le'] <=> $b['prochaine_revision_le']);

        return ['matieres' => array_values($matieres), 'a_revoir' => array_slice($aRevoir, 0, 8), 'resume' => $resume];
    }

    /** Nombre de chapitres dont toutes les notions évaluables sont maîtrisées. */
    public function chapitresMaitrises(ProfilEleve $profil): int
    {
        $maitrises = $this->maitrises($profil->user_id);

        return $this->notionsEvaluables($profil)
            ->groupBy('chapitre_id')
            ->filter(fn (Collection $groupe) => $groupe->every(
                fn (Notion $notion) => ($maitrises->get($notion->id)->score ?? 0) >= self::SEUIL_MAITRISEE,
            ))
            ->count();
    }

    /**
     * Les notions de l'élève qui ont au moins une question pour lui :
     * seules elles se mesurent.
     *
     * @return Collection<int, Notion>
     */
    public function notionsEvaluables(ProfilEleve $profil): Collection
    {
        return Notion::query()
            ->whereIn('id', CatalogueEleve::questions($profil)->select('notion_id'))
            ->with('chapitre')
            ->orderBy('id')
            ->get();
    }

    /** @return Collection<int, Maitrise> notion_id => maîtrise */
    public function maitrises(int $userId): Collection
    {
        return Maitrise::query()->where('user_id', $userId)->get()->keyBy('notion_id');
    }
}
