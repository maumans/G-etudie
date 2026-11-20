<?php

namespace App\Services\Plateforme;

use App\Models\ProfilEleve;
use App\Models\ReleveJauge;
use App\Services\MaitriseService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Lot 13 : le relevé hebdomadaire de la jauge (`jauges:relever`, le
 * dimanche soir). La valeur vient de la même règle que la jauge de
 * l'accueil élève (`MaitriseService::jaugesDuGroupe`, elle-même alignée sur
 * `jauge()`) : une règle, une autorité. Les élèves sont regroupés par
 * examen, série, filière et classe — ils voient les mêmes matières — pour
 * tenir en quelques requêtes par groupe.
 *
 * Idempotent : relever deux fois la même semaine remplace la valeur.
 */
class ReleveJaugeService
{
    public function __construct(private MaitriseService $maitrise) {}

    /** Le lundi de la semaine qui contient ce jour. */
    public static function semaine(CarbonImmutable $jour): CarbonImmutable
    {
        return $jour->startOfWeek(CarbonImmutable::MONDAY)->startOfDay();
    }

    /**
     * @return int nombre d'élèves relevés
     */
    public function relever(CarbonImmutable $jour): int
    {
        $semaine = self::semaine($jour)->toDateString();
        $releves = 0;

        ProfilEleve::query()
            ->whereHas('user', fn ($q) => $q->whereNull('desactive_le'))
            ->orderBy('id')
            ->get(['id', 'user_id', 'examen_id', 'serie_id', 'filiere', 'classe_id', 'etablissement_id'])
            ->groupBy(fn (ProfilEleve $p) => implode('-', [$p->examen_id, $p->serie_id ?? 0, $p->filiere->value, $p->classe_id]))
            ->each(function (Collection $profils) use ($semaine, &$releves) {
                foreach ($profils->chunk(200) as $paquet) {
                    /** @var ProfilEleve $type */
                    $type = $paquet->first();
                    $jauges = $this->maitrise->jaugesDuGroupe($type, array_values($paquet->map(fn (ProfilEleve $p) => $p->user_id)->all()));
                    $maintenant = now();

                    ReleveJauge::query()->upsert(
                        $paquet->map(fn (ProfilEleve $p) => [
                            'user_id' => $p->user_id,
                            'semaine' => $semaine,
                            'pourcentage' => $jauges[$p->user_id] ?? 0,
                            'examen_id' => $p->examen_id,
                            'serie_id' => $p->serie_id,
                            'etablissement_id' => $p->etablissement_id,
                            'created_at' => $maintenant,
                            'updated_at' => $maintenant,
                        ])->values()->all(),
                        ['user_id', 'semaine'],
                        ['pourcentage', 'examen_id', 'serie_id', 'etablissement_id', 'updated_at'],
                    );
                    $releves += $paquet->count();
                }
            });

        return $releves;
    }
}
