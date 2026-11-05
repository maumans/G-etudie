<?php

namespace App\Services;

use App\Enums\EtatLecon;
use App\Models\Lecon;
use App\Models\ProgressionLecon;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

/**
 * Progression d'un élève dans les leçons (opération `lecon.progression`,
 * HORS_LIGNE.md A.6) : « compris / à revoir » et position de lecture.
 *
 * **La saisie la plus récente gagne** (`saisi_le` de l'appareil), quel que
 * soit l'ordre de réception : chaque champ garde l'heure de sa dernière
 * saisie, et une saisie plus ancienne ne l'écrase pas.
 */
class ProgressionService
{
    public function __construct(private MotivationService $motivation) {}

    /**
     * @param  EtatLecon|false|null  $etat  `false` : ne pas toucher ; `null` : effacer
     */
    public function lecon(User $eleve, Lecon $lecon, EtatLecon|false|null $etat, ?int $position, CarbonImmutable $saisiLe): ProgressionLecon
    {
        if (! CatalogueEleve::peutLireLecon($eleve, $lecon)) {
            throw new OperationRejetee('Cette leçon n\'est plus proposée.');
        }

        $progression = ProgressionLecon::query()
            ->lockForUpdate()
            ->firstOrNew(['user_id' => $eleve->id, 'lecon_id' => $lecon->id]);

        if ($etat !== false && ($progression->etat_saisi_le === null || $saisiLe->greaterThan($progression->etat_saisi_le))) {
            $progression->etat = $etat;
            $progression->etat_saisi_le = Carbon::instance($saisiLe);
        }

        if ($position !== null && ($progression->position_saisie_le === null || $saisiLe->greaterThan($progression->position_saisie_le))) {
            $progression->position = max(0, min(100, $position));
            $progression->position_saisie_le = Carbon::instance($saisiLe);
        }

        $progression->save();
        // Lot 6 : ouvrir une leçon compte dans la série, au jour du geste.
        $this->motivation->apresLecon($eleve->id, $saisiLe);

        return $progression;
    }
}
