<?php

namespace App\Services\Organisation;

use App\Enums\Role;
use App\Models\CodeLiaison;
use App\Models\LienParent;
use App\Models\User;
use App\Support\JournalAcces;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Le lien parent ↔ enfant (lot 11, PLAN M15, décision 1) : **c'est l'élève
 * qui consent**. Il génère dans « Mon compte » un code de six chiffres,
 * valable 24 h et une fois, qu'il donne à son parent ; le parent le saisit
 * dans son espace. Pas de SMS (aucun fournisseur, D3).
 *
 * Seule l'empreinte du code est gardée (HMAC avec la clé de l'application) ;
 * un nouveau code annule le précédent. L'élève voit ses parents et peut
 * retirer un lien ; le parent aussi. Limites : deux parents par élève, huit
 * enfants par parent.
 */
class LiaisonParentService
{
    public const VALIDITE_HEURES = 24;

    public const PARENTS_MAX = 2;

    public const ENFANTS_MAX = 8;

    /**
     * Un nouveau code pour l'élève, en clair (montré une fois).
     *
     * @return array{code: string, expire_le: CarbonImmutable}
     */
    public function genererCode(User $eleve): array
    {
        if (LienParent::query()->actifs()->where('eleve_id', $eleve->id)->count() >= self::PARENTS_MAX) {
            throw new GesteRefuse('Deux parents te suivent déjà. Retire un lien avant d\'en créer un autre.');
        }

        return DB::transaction(function () use ($eleve) {
            $maintenant = CarbonImmutable::now();

            CodeLiaison::query()
                ->where('eleve_id', $eleve->id)
                ->whereNull('utilise_le')
                ->where('expire_le', '>', $maintenant)
                ->update(['expire_le' => $maintenant]);

            // Deux codes valides identiques ne doivent pas coexister.
            do {
                $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
            } while ($this->valide($code) !== null);

            $expireLe = $maintenant->addHours(self::VALIDITE_HEURES);

            CodeLiaison::create([
                'eleve_id' => $eleve->id,
                'empreinte' => self::empreinte($code),
                'expire_le' => $expireLe,
            ]);

            return ['code' => $code, 'expire_le' => $expireLe];
        });
    }

    /** Le parent saisit le code : le lien naît (ou renaît). */
    public function lier(User $parent, string $saisie): LienParent
    {
        $code = preg_replace('/\D/', '', $saisie) ?? '';

        if (strlen($code) !== 6) {
            throw new GesteRefuse('Le code a six chiffres.');
        }

        return DB::transaction(function () use ($parent, $code) {
            $ligne = CodeLiaison::query()
                ->where('empreinte', self::empreinte($code))
                ->whereNull('utilise_le')
                ->where('expire_le', '>', CarbonImmutable::now())
                ->lockForUpdate()
                ->first();

            if ($ligne === null) {
                throw new GesteRefuse('Ce code n\'est pas valable : il a peut-être expiré. Demandez-en un nouveau à votre enfant.');
            }

            $eleve = User::query()->find($ligne->eleve_id);

            if ($eleve === null || ! $eleve->hasRole(Role::Eleve) || $eleve->getKey() === $parent->getKey()) {
                throw new GesteRefuse('Ce code n\'est pas valable.');
            }

            $existant = LienParent::query()->where('parent_id', $parent->id)->where('eleve_id', $eleve->id)->first();

            if ($existant?->revoque_le === null && $existant !== null) {
                throw new GesteRefuse('Vous suivez déjà '.$eleve->prenom.'.');
            }

            if (LienParent::query()->actifs()->where('parent_id', $parent->id)->count() >= self::ENFANTS_MAX) {
                throw new GesteRefuse('Vous suivez déjà '.self::ENFANTS_MAX.' enfants.');
            }

            $ligne->update(['utilise_le' => CarbonImmutable::now(), 'utilise_par' => $parent->id]);

            $lien = LienParent::query()->updateOrCreate(
                ['parent_id' => $parent->id, 'eleve_id' => $eleve->id],
                ['lie_le' => CarbonImmutable::now(), 'revoque_le' => null],
            );

            JournalAcces::consigner('parent.lie', $lien, ['eleve_id' => $eleve->id], $parent);

            return $lien;
        });
    }

    /** L'élève ou le parent retire le lien ; il reste daté. */
    public function revoquer(User $auteur, LienParent $lien): void
    {
        if ($lien->revoque_le !== null) {
            return;
        }

        $lien->update(['revoque_le' => CarbonImmutable::now()]);
        JournalAcces::consigner('parent.delie', $lien, ['eleve_id' => $lien->eleve_id, 'parent_id' => $lien->parent_id], $auteur);
    }

    /**
     * Le code valable de l'élève, s'il en a un (pour « Code en cours »).
     */
    public function codeEnCours(User $eleve): ?CodeLiaison
    {
        return CodeLiaison::query()
            ->where('eleve_id', $eleve->id)
            ->whereNull('utilise_le')
            ->where('expire_le', '>', CarbonImmutable::now())
            ->latest('id')
            ->first();
    }

    private function valide(string $code): ?CodeLiaison
    {
        return CodeLiaison::query()
            ->where('empreinte', self::empreinte($code))
            ->whereNull('utilise_le')
            ->where('expire_le', '>', CarbonImmutable::now())
            ->first();
    }

    public static function empreinte(string $code): string
    {
        return hash_hmac('sha256', 'liaison:'.$code, (string) config('app.key'));
    }
}
