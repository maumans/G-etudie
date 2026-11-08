<?php

namespace Database\Seeders;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\SourceAbonnement;
use App\Enums\StatutPaiement;
use App\Models\Abonnement;
use App\Models\LotCodes;
use App\Models\Paiement;
use App\Models\User;
use App\Services\AbonnementService;
use App\Services\CodeAccesService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Lot 9 (développement seulement) : de quoi voir les deux côtés de
 * l'abonnement.
 *
 *  - un **lot de codes d'exemple** (marqué `est_exemple`), fabriqué par Sékou
 *    (08, console), ses codes encore à remettre ;
 *  - **Ousmane** (09, Bac SE) abonné : un mois payé par mobile money,
 *    prolongé d'une année par un code de ce lot ;
 *    **Aïssatou** (01) reste gratuite : corrigés réservés, deux examens
 *    blancs par mois, un seul pack.
 *
 * Idempotent : un second `db:seed` ne refait ni le lot ni l'abonnement.
 */
class DemoAbonnementsSeeder extends Seeder
{
    public const LOT = 'Lot de démonstration · Librairie de Madina';

    public function run(CodeAccesService $codes, AbonnementService $abonnements): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les données de démonstration ne sont jamais créées en production.');
        }

        $sekou = User::query()->where('telephone', '+224600000008')->firstOrFail();
        $ousmane = User::query()->where('telephone', '+224600000009')->firstOrFail();
        $aissatou = User::query()->where('telephone', '+224600000001')->firstOrFail();

        $lot = LotCodes::query()->where('libelle', self::LOT)->first()
            ?? $codes->creerLot($sekou, FormuleAbonnement::Annee, 24, self::LOT, 'Librairie de Madina (exemple)', exemple: true);

        if (Abonnement::query()->where('user_id', $ousmane->id)->exists() || $lot->codes_en_attente === null) {
            return;
        }

        // Ousmane : un mois payé par Orange Money, puis l'année par un code
        // (la seconde période suit la première) ; Aïssatou : un essai MoMo
        // refusé. Paiements d'exemple (passerelle simulée, références fixes).
        $maintenant = CarbonImmutable::now();
        $mensuel = $this->paiement($ousmane, FormuleAbonnement::Mensuel, MoyenPaiement::OrangeMoney, 'SIM-DEMO-0001', StatutPaiement::Reussi, $maintenant->subDays(3));
        $abonnements->activer($ousmane, FormuleAbonnement::Mensuel, SourceAbonnement::Paiement, paiementId: $mensuel->id, exemple: true);
        $codes->utiliser($ousmane, $lot->codes_en_attente[0]);

        $this->paiement($aissatou, FormuleAbonnement::Annee, MoyenPaiement::MtnMomo, 'SIM-DEMO-0002', StatutPaiement::Echoue, $maintenant->subDays(1), 'Paiement refusé par le payeur.');
    }

    private function paiement(User $eleve, FormuleAbonnement $formule, MoyenPaiement $moyen, string $reference, StatutPaiement $statut, CarbonImmutable $le, ?string $motif = null): Paiement
    {
        return Paiement::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'formule' => $formule->value,
            'montant_gnf' => $formule->prixGnf(),
            'moyen' => $moyen->value,
            'passerelle' => 'simulee',
            'numero_payeur' => '+224622000042',
            'numero_fin' => '42',
            'reference_operateur' => $reference,
            'statut' => $statut->value,
            'motif_echec' => $motif,
            'initie_le' => $le,
            'conclu_le' => $le->addMinute(),
            'expire_le' => $le->addMinutes(30),
        ]);
    }
}
