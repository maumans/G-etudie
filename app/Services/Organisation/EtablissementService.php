<?php

namespace App\Services\Organisation;

use App\Enums\Role;
use App\Enums\TypeEtablissement;
use App\Models\Abonnement;
use App\Models\Etablissement;
use App\Models\LicenceEtablissement;
use App\Models\MembreGroupe;
use App\Models\RattachementEtablissement;
use App\Models\User;
use App\Services\AbonnementService;
use App\Support\JournalAcces;
use App\Support\Telephone;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Les établissements partenaires (lot 11, PLAN M14, décision 3) :
 *
 *  - la **console** crée l'établissement, nomme son gestionnaire et lui
 *    accorde des **licences** (contrat signé hors de l'application) ;
 *  - le **gestionnaire** rattache ses enseignants et attribue les places
 *    de ses licences aux élèves présents dans les groupes de son école.
 *
 * Pas de création de comptes élèves en lot (décision 3) : un élève
 * s'inscrit lui-même et rejoint son groupe par le code. Les comptes du
 * personnel (gestionnaire, enseignant), eux, peuvent être ouverts ici : un
 * mot de passe provisoire est montré **une fois**, à changer dans « Mon
 * compte ».
 */
class EtablissementService
{
    public function __construct(private AbonnementService $abonnements) {}

    public function creer(User $auteur, string $nom, TypeEtablissement $type, ?string $prefecture, ?string $commune, ?string $region): Etablissement
    {
        $etablissement = Etablissement::create([
            'nom' => $nom,
            'type' => $type->value,
            'prefecture' => $prefecture,
            'commune' => $commune,
            'region' => $region,
        ]);

        JournalAcces::consigner('etablissement.cree', $etablissement, [], $auteur);

        return $etablissement;
    }

    /**
     * Rattache un compte du rôle voulu (gestionnaire ou enseignant) ; l'ouvre
     * s'il n'existe pas. Renvoie le mot de passe provisoire d'un compte ouvert.
     *
     * @return array{user: User, mot_de_passe: string|null}
     */
    public function rattacher(User $auteur, Etablissement $etablissement, Role $role, string $telephoneSaisi, string $prenom): array
    {
        if (! in_array($role, [Role::GestionnaireEtablissement, Role::Enseignant], true)) {
            throw new GesteRefuse('Seuls un gestionnaire ou un enseignant se rattachent à un établissement.', 'role');
        }

        $telephone = Telephone::normaliser($telephoneSaisi) ?? throw new GesteRefuse('Ce numéro ne ressemble pas à un numéro guinéen (6xx xx xx xx).', 'telephone');

        return DB::transaction(function () use ($auteur, $etablissement, $role, $telephone, $prenom) {
            $user = User::query()->where('telephone', $telephone)->first();
            $motDePasse = null;

            if ($user === null) {
                $motDePasse = self::motDePasseProvisoire();
                $user = User::create([
                    'prenom' => $prenom,
                    'pseudo' => self::pseudoLibre($prenom),
                    'telephone' => $telephone,
                    'password' => Hash::make($motDePasse),
                ]);
                $user->assignRole($role->value);
                JournalAcces::consigner('compte.ouvert_par_etablissement', $user, ['role' => $role->value, 'etablissement_id' => $etablissement->id], $auteur);
            } elseif (! $user->hasRole($role)) {
                // Un élève ou un parent ne devient pas enseignant par un numéro saisi.
                throw new GesteRefuse('Ce numéro appartient déjà à un compte '.mb_strtolower($user->getRoleNames()->map(fn (string $nom) => Role::from($nom)->libelle())->join(', ')).'.', 'telephone');
            }

            $rattachement = RattachementEtablissement::query()->updateOrCreate(
                ['user_id' => $user->id, 'etablissement_id' => $etablissement->id],
                ['role' => $role->value, 'rattache_le' => CarbonImmutable::now(), 'retire_le' => null],
            );

            JournalAcces::consigner('etablissement.rattache', $rattachement, ['role' => $role->value], $auteur);

            return ['user' => $user, 'mot_de_passe' => $motDePasse];
        });
    }

    public function retirer(User $auteur, RattachementEtablissement $rattachement): void
    {
        if ($rattachement->retire_le !== null) {
            return;
        }

        $rattachement->update(['retire_le' => CarbonImmutable::now()]);
        JournalAcces::consigner('etablissement.retire', $rattachement, ['role' => $rattachement->role->value], $auteur);
    }

    public function accorderLicence(User $auteur, Etablissement $etablissement, int $places, CarbonImmutable $debut, CarbonImmutable $fin, ?string $reference): LicenceEtablissement
    {
        if ($places < 1 || $places > 5000) {
            throw new GesteRefuse('De 1 à 5 000 places.', 'places');
        }

        if (! $fin->greaterThan($debut)) {
            throw new GesteRefuse('La fin doit venir après le début.', 'fin');
        }

        $licence = LicenceEtablissement::create([
            'etablissement_id' => $etablissement->id,
            'places' => $places,
            'debut' => $debut,
            'fin' => $fin,
            'reference' => $reference,
            'cree_par' => $auteur->id,
        ]);

        JournalAcces::consigner('licence.accordee', $licence, ['places' => $places, 'fin' => $fin->toDateString()], $auteur);

        return $licence;
    }

    /** Places prises : abonnements de la licence encore en cours. */
    public function placesPrises(LicenceEtablissement $licence): int
    {
        return Abonnement::query()->where('licence_id', $licence->id)->where('fin', '>', CarbonImmutable::now())->count();
    }

    /**
     * Le gestionnaire attribue une place à un élève présent dans un groupe
     * de son établissement : un abonnement jusqu'à la fin de la licence.
     */
    public function attribuer(User $gestionnaire, LicenceEtablissement $licence, User $eleve): Abonnement
    {
        return DB::transaction(function () use ($gestionnaire, $licence, $eleve) {
            // Deux attributions en même temps ne dépassent pas les places.
            $licence = LicenceEtablissement::query()->whereKey($licence->id)->lockForUpdate()->firstOrFail();
            $maintenant = CarbonImmutable::now();

            if ($licence->fin->lessThanOrEqualTo($maintenant) || $licence->debut->greaterThan($maintenant)) {
                throw new GesteRefuse('Cette licence n\'est pas en cours.', 'licence');
            }

            if (! $this->estEleveDe($licence->etablissement, $eleve)) {
                throw new GesteRefuse('Cet élève n\'est dans aucun groupe de l\'établissement.', 'eleve');
            }

            if (Abonnement::query()->where('licence_id', $licence->id)->where('user_id', $eleve->id)->where('fin', '>', $maintenant)->exists()) {
                throw new GesteRefuse($eleve->prenom.' a déjà une place de cette licence.', 'eleve');
            }

            if ($this->placesPrises($licence) >= $licence->places) {
                throw new GesteRefuse('Toutes les places de cette licence sont prises.', 'licence');
            }

            $abonnement = $this->abonnements->activerLicence($eleve, $licence);

            JournalAcces::consigner('licence.attribuee', $abonnement, ['licence_id' => $licence->id, 'eleve_id' => $eleve->id], $gestionnaire);

            return $abonnement;
        });
    }

    /** Reprendre la place : l'abonnement de la licence s'arrête maintenant. */
    public function reprendre(User $gestionnaire, LicenceEtablissement $licence, User $eleve): void
    {
        if ($this->abonnements->arreterLicence($eleve, $licence) > 0) {
            JournalAcces::consigner('licence.reprise', $licence, ['eleve_id' => $eleve->id], $gestionnaire);
        }
    }

    public function estEleveDe(Etablissement $etablissement, User $eleve): bool
    {
        return MembreGroupe::query()->actifs()
            ->where('eleve_id', $eleve->id)
            ->whereHas('groupe', fn ($groupe) => $groupe->ouverts()->where('etablissement_id', $etablissement->id))
            ->exists();
    }

    private static function motDePasseProvisoire(): string
    {
        // Lisible au téléphone : sans 0/O, 1/l/I.
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        $mot = '';

        for ($i = 0; $i < 10; $i++) {
            $mot .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $mot;
    }

    private static function pseudoLibre(string $prenom): string
    {
        $base = Str::of($prenom)->ascii()->lower()->replaceMatches('/[^a-z0-9]/', '')->limit(14, '')->value() ?: 'membre';

        do {
            $pseudo = $base.'_'.random_int(100, 9999);
        } while (User::query()->where('pseudo', $pseudo)->exists());

        return $pseudo;
    }
}
