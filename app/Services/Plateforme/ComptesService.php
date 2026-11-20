<?php

namespace App\Services\Plateforme;

use App\Enums\Role;
use App\Models\User;
use App\Support\JournalAcces;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lot 13 (point ouvert du point 15) : désactiver ou réactiver un compte du
 * personnel. Un compte qui a signé du contenu ne se supprime pas (son nom
 * reste sur ses relectures) : on le désactive. Désactiver ferme tout de
 * suite ses sessions ouvertes (table `sessions`, jeton « se souvenir de
 * moi » changé) ; le middleware CompteDesactive déconnecte une requête qui
 * passerait quand même, et la connexion le refuse déjà (Fortify).
 *
 * Seuls les comptes du personnel (Role::estPersonnel) passent ici ; les
 * élèves et les parents ne se désactivent pas depuis la console.
 */
class ComptesService
{
    public static function estPersonnel(User $user): bool
    {
        return $user->getRoleNames()->contains(fn (string $nom) => Role::tryFrom($nom)?->estPersonnel() === true);
    }

    public function desactiver(User $cible, User $auteur): void
    {
        if ($cible->is($auteur)) {
            throw ValidationException::withMessages(['compte' => 'Tu ne peux pas désactiver ton propre compte.']);
        }

        if ($cible->hasRole(Role::Superadmin->value) && $this->administrateursActifs() <= 1) {
            throw ValidationException::withMessages(['compte' => 'C’est le dernier administrateur actif : la plateforme n’aurait plus personne pour la gérer.']);
        }

        if ($cible->estDesactive()) {
            return;
        }

        DB::transaction(function () use ($cible, $auteur) {
            $cible->forceFill([
                'desactive_le' => CarbonImmutable::now(),
                'remember_token' => Str::random(60),
            ])->save();
            DB::table('sessions')->where('user_id', $cible->id)->delete();
            JournalAcces::consigner('compte.desactive', $cible, auteur: $auteur);
        });
    }

    public function reactiver(User $cible, User $auteur): void
    {
        if (! $cible->estDesactive()) {
            return;
        }

        $cible->forceFill(['desactive_le' => null])->save();
        JournalAcces::consigner('compte.reactive', $cible, auteur: $auteur);
    }

    private function administrateursActifs(): int
    {
        return User::role(Role::Superadmin->value)->whereNull('desactive_le')->count();
    }
}
