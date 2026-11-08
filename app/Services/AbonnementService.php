<?php

namespace App\Services;

use App\Enums\FormuleAbonnement;
use App\Enums\SourceAbonnement;
use App\Models\Abonnement;
use App\Models\User;
use App\Support\Abonnements\SourceAbonnements;
use App\Support\JournalAcces;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Les abonnements (PLAN M16) — seul endroit qui en ouvre ou en prolonge un,
 * qu'il vienne d'un paiement (PaiementService) ou d'un code prépayé
 * (CodeAccesService). Fournit aussi la fin d'abonnement que lisent les
 * droits (`SourceAbonnements` : DroitsPacks, DroitsAbonne).
 *
 * Une nouvelle période commence à la fin de celle en cours : payer un mois
 * avant la fin ne fait perdre aucun jour. Deux activations simultanées pour
 * un même élève sont mises en file par un verrou sur sa ligne `users`.
 */
class AbonnementService implements SourceAbonnements
{
    public function finAbonnement(User $eleve, ?CarbonImmutable $maintenant = null): ?CarbonImmutable
    {
        $fin = Abonnement::query()
            ->where('user_id', $eleve->id)
            ->where('fin', '>', $maintenant ?? CarbonImmutable::now())
            ->max('fin');

        return $fin === null ? null : CarbonImmutable::parse($fin);
    }

    /** L'abonnement dont la période couvre maintenant (pour afficher sa formule). */
    public function enCours(User $eleve): ?Abonnement
    {
        $maintenant = CarbonImmutable::now();

        return Abonnement::query()
            ->where('user_id', $eleve->id)
            ->where('debut', '<=', $maintenant)
            ->where('fin', '>', $maintenant)
            ->orderByDesc('fin')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Ouvre une période, à la suite de celle en cours s'il y en a une. À
     * appeler dans la transaction qui conclut le paiement ou consomme le
     * code : un échec annule les deux.
     */
    public function activer(
        User $eleve,
        FormuleAbonnement $formule,
        SourceAbonnement $source,
        ?int $paiementId = null,
        ?int $codeId = null,
        bool $exemple = false,
    ): Abonnement {
        return DB::transaction(function () use ($eleve, $formule, $source, $paiementId, $codeId, $exemple) {
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $maintenant = CarbonImmutable::now();
            $debut = $this->finAbonnement($eleve, $maintenant) ?? $maintenant;

            $abonnement = Abonnement::create([
                'user_id' => $eleve->id,
                'formule' => $formule->value,
                'debut' => $debut,
                'fin' => $debut->addMonthsNoOverflow($formule->mois()),
                'source' => $source->value,
                'paiement_id' => $paiementId,
                'code_acces_id' => $codeId,
                'est_exemple' => $exemple,
            ]);

            JournalAcces::consigner('abonnement.active', $abonnement, [
                'formule' => $formule->value,
                'source' => $source->value,
                'fin' => $abonnement->fin->toDateString(),
            ], $eleve);

            return $abonnement;
        });
    }

    /**
     * L'état à montrer à l'élève (« Mon abonnement »).
     *
     * @return array{abonne: bool, formule: string|null, debut: string|null, fin: string|null, jours_restants: int|null, est_exemple: bool}
     */
    public function etat(User $eleve): array
    {
        $fin = $this->finAbonnement($eleve);
        $courant = $this->enCours($eleve);

        return [
            'abonne' => $fin !== null,
            'formule' => $courant?->formule->nom(),
            'debut' => $courant?->debut->toIso8601ZuluString(),
            'fin' => $fin?->toIso8601ZuluString(),
            'jours_restants' => $fin === null ? null : (int) ceil(CarbonImmutable::now()->diffInHours($fin) / 24),
            'est_exemple' => $courant !== null && $courant->est_exemple,
        ];
    }
}
