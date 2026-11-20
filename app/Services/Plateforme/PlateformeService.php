<?php

namespace App\Services\Plateforme;

use App\Enums\CodeExamen;
use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\SourceAbonnement;
use App\Enums\StatutContenu;
use App\Enums\StatutImport;
use App\Enums\StatutPaiement;
use App\Enums\StatutSignalement;
use App\Models\Abonnement;
use App\Models\CodeAcces;
use App\Models\Etablissement;
use App\Models\ExamenBlanc;
use App\Models\ImportSujet;
use App\Models\Lecon;
use App\Models\Paiement;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\ReleveJauge;
use App\Models\Seance;
use App\Models\SerieJour;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Support\CouvertureProgramme;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as Requete;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * La console plateforme (PLAN M18, lot 13) : activité, contenu, revenus et
 * impact. **Seule autorité** de ces chiffres : l'accueil de la console,
 * chacun de ses écrans et le rapport PDF les lisent ici.
 *
 * Règles du lot (décisions du 2026-11-20) :
 *  - un élève **actif** un jour est un élève qui a répondu ce jour-là
 *    (`series_jours`, tenue au jour du geste, HORS_LIGNE.md A.6) ;
 *  - un élève **assidu** sur une période a terminé au moins
 *    SEANCES_PAR_SEMAINE séances (séances du jour et devoirs ; pas les quiz
 *    de culture, hors préparation) pendant au moins la moitié des semaines
 *    (PLAN § 15) ;
 *  - un groupe de moins de SEUIL_ANONYMAT élèves n'est **pas chiffré** :
 *    on ne publie rien qui permette de deviner un élève (ce sont des
 *    mineurs). Aucun nom, pseudo ni numéro ne sort d'ici.
 */
class PlateformeService
{
    public const SEANCES_PAR_SEMAINE = 3;

    public const SEUIL_ANONYMAT = 10;

    public const SEMAINES_ACTIVITE = 12;

    /** Périodes proposées pour l'impact, en semaines. */
    public const PERIODES = [8, 12, 26];

    // ------------------------------------------------------------------
    // Activité
    // ------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function activite(CarbonImmutable $maintenant): array
    {
        $aujourdhui = $maintenant->startOfDay();
        $semaines = $this->semaines($maintenant, self::SEMAINES_ACTIVITE);
        $debut = $semaines->first();

        $actifsParSemaine = $this->parSemaine(
            SerieJour::query()->toBase()->where('reponses', '>', 0)->where('jour', '>=', $debut->toDateString()),
            'jour',
            $debut,
            'count(distinct user_id)',
        );
        $seancesParSemaine = $this->parSemaine(
            $this->seancesTerminees()->where('termine_le', '>=', $debut),
            'termine_le',
            $debut,
            'count(*)',
        );
        $examensParSemaine = $this->parSemaine(
            ExamenBlanc::query()->toBase()->where('termine_le', '>=', $debut),
            'termine_le',
            $debut,
            'count(*)',
        );
        $assidusParSemaine = $this->assidusParSemaine($debut, null);

        return [
            'actifs' => [
                'jour' => $this->actifsDepuis($aujourdhui),
                'semaine' => $this->actifsDepuis($aujourdhui->subDays(6)),
                'mois' => $this->actifsDepuis($aujourdhui->subDays(29)),
                'semaine_precedente' => $this->actifsEntre($aujourdhui->subDays(13), $aujourdhui->subDays(7)),
            ],
            'inscrits' => ProfilEleve::query()->count(),
            'nouveaux_semaine' => ProfilEleve::query()->where('created_at', '>=', $aujourdhui->subDays(6))->count(),
            'retention' => [
                'j7' => $this->retention($aujourdhui, 7, 90),
                'j30' => $this->retention($aujourdhui, 30, 120),
            ],
            'semaines' => $semaines->map(fn (CarbonImmutable $semaine, int $rang) => [
                'semaine' => $semaine->toDateString(),
                'actifs' => $actifsParSemaine[$rang] ?? 0,
                'seances' => $seancesParSemaine[$rang] ?? 0,
                'examens_blancs' => $examensParSemaine[$rang] ?? 0,
                'assidus' => $assidusParSemaine[$rang] ?? 0,
            ])->values()->all(),
            'par_examen' => $this->actifsParExamen($aujourdhui->subDays(6)),
            'rythme' => $this->rythme($aujourdhui->subDays(6)),
            'est_exemple' => $this->contientExemples(),
        ];
    }

    private function actifsDepuis(CarbonImmutable $jour): int
    {
        return SerieJour::query()->where('reponses', '>', 0)->where('jour', '>=', $jour->toDateString())->distinct()->count('user_id');
    }

    private function actifsEntre(CarbonImmutable $debut, CarbonImmutable $fin): int
    {
        return SerieJour::query()->where('reponses', '>', 0)
            ->whereBetween('jour', [$debut->toDateString(), $fin->toDateString()])
            ->distinct()->count('user_id');
    }

    /**
     * Rétention à N jours : parmi les élèves inscrits il y a plus de N jours
     * (et moins de `fenetre`), la part qui a répondu au moins une fois N
     * jours ou plus après son inscription.
     *
     * @return array{taux: int|null, cohorte: int, revenus: int}
     */
    private function retention(CarbonImmutable $aujourdhui, int $jours, int $fenetre): array
    {
        $cohorte = ProfilEleve::query()
            ->where('created_at', '<', $aujourdhui->subDays($jours))
            ->where('created_at', '>=', $aujourdhui->subDays($fenetre));
        $taille = (clone $cohorte)->count();
        $revenus = (clone $cohorte)->whereExists(fn (Requete $q) => $q->from('series_jours')
            ->whereColumn('series_jours.user_id', 'profils_eleves.user_id')
            ->where('series_jours.reponses', '>', 0)
            ->whereRaw('series_jours.jour >= date_add(date(profils_eleves.created_at), interval ? day)', [$jours]))
            ->count();

        return [
            'taux' => $taille < self::SEUIL_ANONYMAT ? null : (int) round(100 * $revenus / $taille),
            'cohorte' => $taille,
            'revenus' => $revenus,
        ];
    }

    /**
     * @return list<array{cle: string, libelle: string, actifs: int, inscrits: int}>
     */
    private function actifsParExamen(CarbonImmutable $depuis): array
    {
        $lignes = ProfilEleve::query()->toBase()
            ->join('examens', 'examens.id', '=', 'profils_eleves.examen_id')
            ->leftJoin('series', 'series.id', '=', 'profils_eleves.serie_id')
            ->selectRaw('examens.code as examen, series.code as serie, count(*) as inscrits')
            ->selectRaw('sum(case when exists (select 1 from series_jours where series_jours.user_id = profils_eleves.user_id and series_jours.reponses > 0 and series_jours.jour >= ?) then 1 else 0 end) as actifs', [$depuis->toDateString()])
            ->groupBy('examens.code', 'series.code')
            ->get()
            ->keyBy(fn (object $l) => self::cleExamen((string) $l->examen, $l->serie === null ? null : (string) $l->serie));

        return array_values(collect(self::examens())
            ->map(fn (string $libelle, string $cle) => [
                'cle' => $cle,
                'libelle' => $libelle,
                'actifs' => (int) ($lignes->get($cle)->actifs ?? 0),
                'inscrits' => (int) ($lignes->get($cle)->inscrits ?? 0),
            ])->all());
    }

    /**
     * Combien de séances les élèves actifs de la semaine ont terminées.
     *
     * @return array{aucune: int, une_ou_deux: int, assidus: int}
     */
    private function rythme(CarbonImmutable $depuis): array
    {
        $parEleve = $this->seancesTerminees()
            ->where('termine_le', '>=', $depuis)
            ->selectRaw('user_id, count(*) as n')
            ->groupBy('user_id')
            ->pluck('n', 'user_id');
        $actifs = $this->actifsDepuis($depuis);
        $assidus = $parEleve->filter(fn ($n) => (int) $n >= self::SEANCES_PAR_SEMAINE)->count();
        $unOuDeux = $parEleve->count() - $assidus;

        return [
            'aucune' => max(0, $actifs - $parEleve->count()),
            'une_ou_deux' => $unOuDeux,
            'assidus' => $assidus,
        ];
    }

    // ------------------------------------------------------------------
    // Contenu
    // ------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function contenu(CarbonImmutable $maintenant): array
    {
        $traites = Signalement::query()->toBase()
            ->whereNotNull('traite_le')
            ->where('traite_le', '>=', $maintenant->subDays(90))
            ->selectRaw('timestampdiff(minute, recu_le, traite_le) as minutes')
            ->pluck('minutes')
            ->map(fn ($m) => max(0, (int) $m))
            ->sort()
            ->values();

        return [
            'couverture' => CouvertureProgramme::matieresPhares(),
            'lecons' => Lecon::query()->toBase()->selectRaw('statut, count(*) as n')->groupBy('statut')->pluck('n', 'statut')
                ->map(fn ($n) => (int) $n)->all() + array_fill_keys(array_map(fn (StatutContenu $s) => $s->value, StatutContenu::cases()), 0),
            'en_relecture' => [
                'lecons' => Lecon::query()->where('statut', StatutContenu::EnRelecture->value)->count(),
                'questions' => Question::query()->where('statut', StatutContenu::EnRelecture->value)->count(),
                'annales' => Sujet::query()->where('statut', StatutContenu::EnRelecture->value)->count(),
            ],
            'publies' => [
                'lecons' => Lecon::query()->whereNotNull('version_publiee_id')->where('statut', '!=', StatutContenu::Archive->value)->count(),
                'questions' => Question::query()->where('statut', StatutContenu::Publie->value)->count(),
                'annales' => Sujet::query()->whereNotNull('version_publiee_id')->where('statut', '!=', StatutContenu::Archive->value)->count(),
            ],
            'imports_en_cours' => ImportSujet::query()->whereIn('statut', [StatutImport::EnAttente->value, StatutImport::EnCours->value])->count(),
            'signalements' => [
                'ouverts' => Signalement::query()->where('statut', StatutSignalement::Ouvert->value)->count(),
                'ouverts_depuis_7_jours' => Signalement::query()->where('statut', StatutSignalement::Ouvert->value)->where('recu_le', '<', $maintenant->subDays(7))->count(),
                'traites_90_jours' => $traites->count(),
                // PLAN § 15 : « délai moyen de correction d'un signalement ».
                'delai_median_heures' => $traites->isEmpty() ? null : round($traites[intdiv($traites->count(), 2)] / 60, 1),
            ],
            'est_exemple' => Lecon::query()->where('est_exemple', true)->exists(),
        ];
    }

    // ------------------------------------------------------------------
    // Revenus
    // ------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public function revenus(CarbonImmutable $maintenant): array
    {
        $semaines = $this->semaines($maintenant, self::SEMAINES_ACTIVITE);
        $debut = $semaines->first();
        $reussis = fn () => Paiement::query()->toBase()->where('statut', StatutPaiement::Reussi->value);
        $depuis30 = $maintenant->startOfDay()->subDays(29);

        $montants = $this->parSemaine($reussis()->where('initie_le', '>=', $debut), 'initie_le', $debut, 'sum(montant_gnf)');
        $codes = $this->parSemaine(CodeAcces::query()->toBase()->whereNotNull('utilise_le')->where('utilise_le', '>=', $debut), 'utilise_le', $debut, 'count(*)');
        $actifs = Abonnement::query()->where('debut', '<=', $maintenant)->where('fin', '>', $maintenant);

        return [
            'montant_30_jours' => (int) $reussis()->where('initie_le', '>=', $depuis30)->sum('montant_gnf'),
            'montant_30_jours_precedents' => (int) $reussis()->whereBetween('initie_le', [$depuis30->subDays(30), $depuis30])->sum('montant_gnf'),
            'paiements_30_jours' => $reussis()->where('initie_le', '>=', $depuis30)->count(),
            'echecs_30_jours' => Paiement::query()->whereIn('statut', [StatutPaiement::Echoue->value, StatutPaiement::Expire->value])->where('initie_le', '>=', $depuis30)->count(),
            'abonnes' => (clone $actifs)->distinct()->count('user_id'),
            'eleves' => ProfilEleve::query()->count(),
            'abonnes_par_source' => collect(SourceAbonnement::cases())->map(fn (SourceAbonnement $s) => [
                'cle' => $s->value,
                'libelle' => $s->libelle(),
                'abonnes' => (clone $actifs)->where('source', $s->value)->distinct()->count('user_id'),
            ])->values()->all(),
            'par_moyen' => collect(MoyenPaiement::cases())->map(fn (MoyenPaiement $m) => [
                'cle' => $m->value,
                'libelle' => $m->libelle(),
                'montant_gnf' => (int) $reussis()->where('moyen', $m->value)->where('initie_le', '>=', $debut)->sum('montant_gnf'),
                'paiements' => $reussis()->where('moyen', $m->value)->where('initie_le', '>=', $debut)->count(),
            ])->values()->all(),
            'par_formule' => collect(FormuleAbonnement::cases())->map(fn (FormuleAbonnement $f) => [
                'cle' => $f->value,
                'libelle' => $f->nom(),
                'montant_gnf' => (int) $reussis()->where('formule', $f->value)->where('initie_le', '>=', $debut)->sum('montant_gnf'),
                'paiements' => $reussis()->where('formule', $f->value)->where('initie_le', '>=', $debut)->count(),
            ])->values()->all(),
            'codes' => [
                'emis' => CodeAcces::query()->whereHas('lot', fn (Builder $q) => $q->whereNull('desactive_le'))->count(),
                'utilises' => CodeAcces::query()->whereNotNull('utilise_le')->count(),
                'utilises_30_jours' => CodeAcces::query()->where('utilise_le', '>=', $depuis30)->count(),
            ],
            'semaines' => $semaines->map(fn (CarbonImmutable $semaine, int $rang) => [
                'semaine' => $semaine->toDateString(),
                'montant_gnf' => $montants[$rang] ?? 0,
                'codes' => $codes[$rang] ?? 0,
            ])->values()->all(),
            'est_exemple' => Abonnement::query()->where('est_exemple', true)->exists() || $this->contientExemples(),
        ];
    }

    // ------------------------------------------------------------------
    // Impact
    // ------------------------------------------------------------------

    /**
     * Les filtres de l'impact, nettoyés.
     *
     * @return array{semaines: int, examen: string|null, etablissement: int|null}
     */
    public static function filtresImpact(mixed $semaines, mixed $examen, mixed $etablissement): array
    {
        $semaines = (int) $semaines;
        $examen = is_string($examen) && array_key_exists($examen, self::examens()) ? $examen : null;
        $etablissement = is_numeric($etablissement) && Etablissement::query()->whereKey((int) $etablissement)->exists() ? (int) $etablissement : null;

        return [
            'semaines' => in_array($semaines, self::PERIODES, true) ? $semaines : 12,
            'examen' => $examen,
            'etablissement' => $etablissement,
        ];
    }

    /**
     * L'impact (PLAN M18 : « évolution de la jauge et des notes d'examens
     * blancs des élèves assidus — la preuve à montrer aux partenaires »),
     * assidus et autres côte à côte.
     *
     * @param  array{semaines: int, examen: string|null, etablissement: int|null}  $filtres
     * @return array<string, mixed>
     */
    public function impact(array $filtres, CarbonImmutable $maintenant): array
    {
        $semaines = $this->semaines($maintenant, $filtres['semaines']);
        $debut = $semaines->first();
        $fin = $maintenant;

        $population = $this->population($filtres);
        $assidus = $this->assidus($population, $debut, $filtres['semaines']);

        $releves = ReleveJauge::query()->toBase()
            ->whereIn('user_id', $population)
            ->whereBetween('semaine', [$debut->toDateString(), $fin->toDateString()])
            ->orderBy('semaine')->orderBy('id')
            ->get(['user_id', 'semaine', 'pourcentage'])
            ->groupBy('user_id');
        $examens = ExamenBlanc::query()->toBase()
            ->whereIn('user_id', $population)
            ->whereBetween('termine_le', [$debut, $fin])
            ->orderBy('termine_le')->orderBy('id')
            ->get(['user_id', 'note_sur_20'])
            ->groupBy('user_id');

        $groupes = [];
        foreach (['assidus' => true, 'autres' => false] as $cle => $estAssidu) {
            $eleves = array_values(array_filter($population, fn (int $id) => isset($assidus[$id]) === $estAssidu));
            $groupes[$cle] = [
                'eleves' => count($eleves),
                'jauge' => $this->evolution($eleves, $releves, fn (stdClass $r) => (float) $r->pourcentage),
                'examens_blancs' => $this->evolution($eleves, $examens, fn (stdClass $e) => (float) $e->note_sur_20),
            ];
        }

        $moyennes = $this->jaugeParSemaine($population, $assidus, $releves, $semaines);

        return [
            'filtres' => $filtres,
            'periode' => ['debut' => $debut->toDateString(), 'fin' => $fin->toDateString()],
            'eleves' => count($population),
            'assidus' => $groupes['assidus'],
            'autres' => $groupes['autres'],
            'courbe' => $moyennes,
            'releves' => [
                'premiere_semaine' => ReleveJauge::query()->min('semaine'),
                'semaines_relevees' => ReleveJauge::query()->whereBetween('semaine', [$debut->toDateString(), $fin->toDateString()])->distinct()->count('semaine'),
            ],
            'methode' => [
                'seances_par_semaine' => self::SEANCES_PAR_SEMAINE,
                'semaines_minimum' => (int) ceil($filtres['semaines'] / 2),
                'seuil' => self::SEUIL_ANONYMAT,
            ],
            'libelles' => [
                'examen' => $filtres['examen'] === null ? 'Tous les examens' : self::examens()[$filtres['examen']],
                'etablissement' => $filtres['etablissement'] === null ? 'Tous les établissements' : (string) Etablissement::query()->whereKey($filtres['etablissement'])->value('nom'),
            ],
            'est_exemple' => $this->contientExemples($population),
        ];
    }

    /**
     * Les élèves concernés par les filtres (examen et série, établissement).
     *
     * @param  array{semaines: int, examen: string|null, etablissement: int|null}  $filtres
     * @return list<int>
     */
    private function population(array $filtres): array
    {
        $requete = ProfilEleve::query()->toBase()
            ->join('examens', 'examens.id', '=', 'profils_eleves.examen_id')
            ->leftJoin('series', 'series.id', '=', 'profils_eleves.serie_id');

        if ($filtres['examen'] !== null) {
            [$examen, $serie] = array_pad(explode('-', $filtres['examen'], 2), 2, null);
            $requete->where('examens.code', $examen);
            $serie === null ? $requete->whereNull('profils_eleves.serie_id') : $requete->where('series.code', $serie);
        }

        if ($filtres['etablissement'] !== null) {
            $requete->where('profils_eleves.etablissement_id', $filtres['etablissement']);
        }

        return array_values($requete->orderBy('profils_eleves.user_id')->pluck('profils_eleves.user_id')->map(fn ($id) => (int) $id)->all());
    }

    /**
     * @param  list<int>  $population
     * @return array<int, true> élève => assidu
     */
    private function assidus(array $population, CarbonImmutable $debut, int $semaines): array
    {
        if ($population === []) {
            return [];
        }

        $minimum = (int) ceil($semaines / 2);

        $semainesAssidues = self::parRang(
            $this->seancesTerminees()->whereIn('user_id', $population)->where('termine_le', '>=', $debut)->select('user_id'),
            'termine_le',
            $debut,
        )
            ->select('user_id', 'rang_semaine')
            ->groupBy('user_id', 'rang_semaine')
            ->havingRaw('count(*) >= ?', [self::SEANCES_PAR_SEMAINE])
            ->get()
            ->countBy(fn (stdClass $ligne) => (int) $ligne->user_id);

        $assidus = [];
        foreach ($semainesAssidues as $eleve => $nombre) {
            if ($nombre >= $minimum) {
                $assidus[(int) $eleve] = true;
            }
        }

        return $assidus;
    }

    /**
     * Combien d'élèves ont été assidus chaque semaine (au moins
     * SEANCES_PAR_SEMAINE séances dans la semaine).
     *
     * @param  list<int>|null  $population
     * @return array<int, int> rang de la semaine => élèves
     */
    private function assidusParSemaine(CarbonImmutable $debut, ?array $population): array
    {
        $parEleve = self::parRang(
            $this->seancesTerminees()
                ->when($population !== null, fn (Requete $q) => $q->whereIn('user_id', $population))
                ->where('termine_le', '>=', $debut)
                ->select('user_id'),
            'termine_le',
            $debut,
        )
            ->select('user_id', 'rang_semaine')
            ->groupBy('user_id', 'rang_semaine')
            ->havingRaw('count(*) >= ?', [self::SEANCES_PAR_SEMAINE])
            ->get();

        return $parEleve->countBy(fn (stdClass $l) => (int) $l->rang_semaine)->all();
    }

    /**
     * La moyenne au début et à la fin de la période (premier et dernier
     * relevé ou examen de chaque élève qui en a au moins deux), et l'écart.
     * Rien si le groupe compte moins de SEUIL_ANONYMAT élèves mesurés.
     *
     * @param  list<int>  $eleves
     * @param  Collection<int|string, Collection<int, stdClass>>  $mesures
     * @param  callable(stdClass): float  $valeur
     * @return array{mesures: int, debut: float|null, fin: float|null, ecart: float|null, en_progres: int|null}
     */
    private function evolution(array $eleves, Collection $mesures, callable $valeur): array
    {
        $debuts = [];
        $fins = [];

        foreach ($eleves as $eleve) {
            $siennes = $mesures->get($eleve);

            if ($siennes === null || $siennes->count() < 2) {
                continue;
            }

            $debuts[] = $valeur($siennes->first());
            $fins[] = $valeur($siennes->last());
        }

        $n = count($debuts);

        if ($n < self::SEUIL_ANONYMAT) {
            return ['mesures' => $n, 'debut' => null, 'fin' => null, 'ecart' => null, 'en_progres' => null];
        }

        $debut = array_sum($debuts) / $n;
        $fin = array_sum($fins) / $n;
        $enProgres = count(array_filter(array_keys($debuts), fn (int $i) => $fins[$i] > $debuts[$i]));

        return [
            'mesures' => $n,
            'debut' => round($debut, 1),
            'fin' => round($fin, 1),
            'ecart' => round($fin - $debut, 1),
            'en_progres' => (int) round(100 * $enProgres / $n),
        ];
    }

    /**
     * La jauge moyenne de chaque groupe, semaine par semaine (null quand la
     * semaine compte moins de SEUIL_ANONYMAT relevés dans le groupe).
     *
     * @param  list<int>  $population
     * @param  array<int, true>  $assidus
     * @param  Collection<int|string, Collection<int, stdClass>>  $releves
     * @param  Collection<int, CarbonImmutable>  $semaines
     * @return list<array{semaine: string, assidus: float|null, autres: float|null}>
     */
    private function jaugeParSemaine(array $population, array $assidus, Collection $releves, Collection $semaines): array
    {
        $sommes = [];

        foreach ($population as $eleve) {
            $groupe = isset($assidus[$eleve]) ? 'assidus' : 'autres';

            foreach ($releves->get($eleve) ?? [] as $releve) {
                $semaine = substr((string) $releve->semaine, 0, 10);
                $sommes[$semaine][$groupe][] = (int) $releve->pourcentage;
            }
        }

        $moyenne = fn (?array $valeurs) => $valeurs === null || count($valeurs) < self::SEUIL_ANONYMAT ? null : round(array_sum($valeurs) / count($valeurs), 1);

        return array_values($semaines->map(fn (CarbonImmutable $s) => [
            'semaine' => $s->toDateString(),
            'assidus' => $moyenne($sommes[$s->toDateString()]['assidus'] ?? null),
            'autres' => $moyenne($sommes[$s->toDateString()]['autres'] ?? null),
        ])->all());
    }

    // ------------------------------------------------------------------
    // Commun
    // ------------------------------------------------------------------

    /**
     * Les examens tels que la console les filtre : CEE, BEPC, Bac par série.
     *
     * @return array<string, string>
     */
    public static function examens(): array
    {
        return [
            'CEE' => 'CEE',
            'BEPC' => 'BEPC',
            'BAC-SM' => 'Bac SM',
            'BAC-SE' => 'Bac SE',
            'BAC-SS' => 'Bac SS',
        ];
    }

    private static function cleExamen(string $examen, ?string $serie): string
    {
        return $examen === CodeExamen::Bac->value && $serie !== null ? $examen.'-'.$serie : $examen;
    }

    /**
     * Les lundis des N dernières semaines, la semaine en cours comprise.
     *
     * @return Collection<int, CarbonImmutable>
     */
    private function semaines(CarbonImmutable $maintenant, int $nombre): Collection
    {
        $courante = ReleveJaugeService::semaine($maintenant);

        return collect(range($nombre - 1, 0))->map(fn (int $recul) => $courante->subWeeks($recul))->values();
    }

    /**
     * Une valeur agrégée par semaine (rang 0 = la première).
     *
     * @param  literal-string  $colonne
     * @param  literal-string  $agregat
     * @return array<int, int>
     */
    private function parSemaine(Requete $requete, string $colonne, CarbonImmutable $debut, string $agregat): array
    {
        return self::parRang($requete->select('*'), $colonne, $debut)
            ->selectRaw("rang_semaine, {$agregat} as valeur")
            ->groupBy('rang_semaine')
            ->pluck('valeur', 'rang_semaine')
            ->mapWithKeys(fn ($valeur, $rang) => [(int) $rang => (int) $valeur])
            ->all();
    }

    /**
     * La requête, enrichie du rang de la semaine de chaque ligne (0 = la
     * semaine de `$debut`), dans une sous-requête : MySQL
     * (`only_full_group_by`) refuse de regrouper sur une expression qui
     * contient un paramètre lié ; on regroupe donc sur la colonne `rang` de
     * la sous-requête.
     *
     * @param  literal-string  $colonne
     */
    private static function parRang(Requete $requete, string $colonne, CarbonImmutable $debut): Requete
    {
        return DB::query()->fromSub(
            $requete->selectRaw("floor(datediff(date({$colonne}), ?) / 7) as rang_semaine", [$debut->toDateString()]),
            'semaines',
        );
    }

    /** Les séances terminées qui comptent pour la préparation (pas les quiz de culture). */
    private function seancesTerminees(): Requete
    {
        return Seance::query()->toBase()->whereNotNull('termine_le')->where('culture', false);
    }

    /**
     * Des élèves fictifs entrent-ils dans les chiffres ?
     *
     * @param  list<int>|null  $population
     */
    private function contientExemples(?array $population = null): bool
    {
        return ProfilEleve::query()
            ->where('est_exemple', true)
            ->when($population !== null, fn (Builder $q) => $q->whereIn('user_id', $population))
            ->exists();
    }
}
