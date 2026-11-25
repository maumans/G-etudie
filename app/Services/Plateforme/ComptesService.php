<?php

namespace App\Services\Plateforme;

use App\Enums\Role;
use App\Models\User;
use App\Support\CompteProvisoire;
use App\Support\JournalAcces;
use App\Support\Telephone;
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

    /**
     * Les rôles qu'un administrateur ouvre lui-même (`compte:creer`). Les
     * autres ont leur propre porte : l'élève et le parent s'inscrivent
     * seuls ; l'enseignant et le gestionnaire sont rattachés à un
     * établissement (Console › Établissements, puis l'espace Établissement).
     */
    public const ROLES_OUVERTS_PAR_L_ADMINISTRATEUR = [
        Role::Superadmin,
        Role::AdminContenu,
        Role::Redacteur,
        Role::Relecteur,
        Role::Parent,
    ];

    /**
     * Ouvre un compte avec un **mot de passe provisoire**, rendu une seule
     * fois (il n'est gardé nulle part en clair) : le titulaire le change à
     * sa première connexion (« Mon compte › Mot de passe »). Le numéro est
     * tenu pour vérifié : c'est l'administrateur qui le donne. Journalisé.
     *
     * @return array{user: User, mot_de_passe: string}
     */
    public function ouvrir(Role $role, string $telephoneSaisi, string $prenom, ?User $auteur = null): array
    {
        if (! in_array($role, self::ROLES_OUVERTS_PAR_L_ADMINISTRATEUR, true)) {
            throw ValidationException::withMessages(['role' => match ($role) {
                Role::Eleve => 'Un élève s’inscrit lui-même, sur la page « Créer un compte ».',
                Role::Enseignant, Role::GestionnaireEtablissement => 'Un enseignant ou un gestionnaire s’ouvre depuis son établissement (Console › Établissements).',
            }]);
        }

        $telephone = Telephone::normaliser($telephoneSaisi)
            ?? throw ValidationException::withMessages(['telephone' => 'Ce numéro ne ressemble pas à un numéro guinéen (6xx xx xx xx).']);
        $prenom = trim($prenom);

        if ($prenom === '' || mb_strlen($prenom) > 60) {
            throw ValidationException::withMessages(['prenom' => 'Le prénom est obligatoire (60 caractères au plus).']);
        }

        if (User::query()->where('telephone', $telephone)->exists()) {
            throw ValidationException::withMessages(['telephone' => 'Un compte existe déjà avec ce numéro.']);
        }

        return DB::transaction(function () use ($role, $telephone, $prenom, $auteur) {
            $motDePasse = CompteProvisoire::motDePasse();
            $user = User::create([
                'prenom' => $prenom,
                'pseudo' => CompteProvisoire::pseudoLibre($prenom),
                'telephone' => $telephone,
                'password' => $motDePasse,
            ]);
            $user->forceFill(['telephone_verifie_le' => CarbonImmutable::now()])->save();
            $user->assignRole($role->value);
            JournalAcces::consigner('compte.ouvert_par_administrateur', $user, ['role' => $role->value], $auteur);

            return ['user' => $user, 'mot_de_passe' => $motDePasse];
        });
    }

    private function administrateursActifs(): int
    {
        return User::role(Role::Superadmin->value)->whereNull('desactive_le')->count();
    }
}
