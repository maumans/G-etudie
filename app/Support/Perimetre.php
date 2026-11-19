<?php

namespace App\Support;

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Contracts\ContenuRelisable;
use App\Models\Etablissement;
use App\Models\Groupe;
use App\Models\LienParent;
use App\Models\MembreGroupe;
use App\Models\RattachementEtablissement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Seule réponse à « sur quels élèves ce compte peut-il agir ? » (DEVBOOK § 7).
 * Aucun contrôleur, aucune policy ne refait cette question à sa façon.
 *
 * Deux notions, à ne pas confondre :
 *  - le périmètre : ce que le compte peut **consulter** ;
 *  - les rattachements : là où il **agit** ; une garde d'écriture exige un
 *    rattachement, jamais le seul périmètre de consultation.
 *
 * Lot 0 : un élève se voit lui-même ; l'administrateur plateforme consulte
 * tous les élèves sans être rattaché à aucun.
 *
 * Lot 11 : un parent est rattaché à ses enfants (lien actif) ; un enseignant
 * aux élèves présents dans ses groupes ouverts ; un gestionnaire aux élèves
 * présents dans les groupes ouverts de son établissement. Les groupes se
 * consultent par la même règle (`groupesConsultables`) ; seul l'enseignant
 * du groupe y agit (devoirs, retirer un élève).
 *
 * Lot 1, contenu : tout le personnel du back-office consulte tout le
 * catalogue ; on n'agit que sur ce à quoi on est rattaché. Une leçon est
 * rattachée à son auteur (il la rédige) ; le responsable pédagogique agit
 * sur toutes. Un relecteur n'est jamais rattaché à ce qu'il a écrit.
 *
 * Lot 3 : les questions suivent la même règle que les leçons.
 */
class Perimetre
{
    /**
     * Élèves que ce compte peut consulter.
     *
     * @return Builder<User>
     */
    public static function elevesConsultables(User $acteur): Builder
    {
        $eleves = User::query()->role(Role::Eleve);

        if ($acteur->hasRole(Role::Superadmin)) {
            return $eleves;
        }

        return $eleves->whereKey(self::elevesRattaches($acteur));
    }

    public static function peutConsulterEleve(User $acteur, User $eleve): bool
    {
        return self::elevesConsultables($acteur)->whereKey($eleve->getKey())->exists();
    }

    /** Agir sur un élève (modifier, réinitialiser…) exige un rattachement. */
    public static function peutAgirSurEleve(User $acteur, User $eleve): bool
    {
        return in_array($eleve->getKey(), self::elevesRattaches($acteur), true);
    }

    /**
     * Identifiants des élèves auxquels le compte est rattaché.
     *
     * @return list<int>
     */
    private static function elevesRattaches(User $acteur): array
    {
        $ids = $acteur->hasRole(Role::Eleve) ? [$acteur->getKey()] : [];

        if ($acteur->hasRole(Role::Parent)) {
            $ids = [...$ids, ...self::enfants($acteur)->pluck('users.id')->all()];
        }

        if ($acteur->hasRole(Role::Enseignant) || $acteur->hasRole(Role::GestionnaireEtablissement)) {
            $groupes = self::groupesConsultables($acteur)->ouverts()->select('id');
            $ids = [...$ids, ...MembreGroupe::query()->actifs()->whereIn('groupe_id', $groupes)->pluck('eleve_id')->all()];
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    /**
     * Les enfants d'un parent (liens actifs).
     *
     * @return Builder<User>
     */
    public static function enfants(User $parent): Builder
    {
        return User::query()->role(Role::Eleve)->whereIn('users.id', LienParent::query()
            ->actifs()
            ->where('parent_id', $parent->getKey())
            ->select('eleve_id'));
    }

    public static function estParentDe(User $parent, User $eleve): bool
    {
        return $parent->hasRole(Role::Parent)
            && LienParent::query()->actifs()->where('parent_id', $parent->getKey())->where('eleve_id', $eleve->getKey())->exists();
    }

    /**
     * Établissements auxquels le compte est rattaché comme gestionnaire.
     *
     * @return Builder<Etablissement>
     */
    public static function etablissementsGeres(User $acteur): Builder
    {
        return Etablissement::query()->whereIn('id', self::rattachements($acteur, Role::GestionnaireEtablissement));
    }

    public static function peutGererEtablissement(User $acteur, Etablissement $etablissement): bool
    {
        return $acteur->can(Permission::GererEtablissement->value)
            && self::etablissementsGeres($acteur)->whereKey($etablissement->getKey())->exists();
    }

    /**
     * Établissements où le compte enseigne.
     *
     * @return Builder<Etablissement>
     */
    public static function etablissementsEnseignes(User $acteur): Builder
    {
        return Etablissement::query()->whereIn('id', self::rattachements($acteur, Role::Enseignant));
    }

    /** @return Builder<RattachementEtablissement> */
    private static function rattachements(User $acteur, Role $role): Builder
    {
        return RattachementEtablissement::query()
            ->actifs()
            ->where('user_id', $acteur->getKey())
            ->where('role', $role->value)
            ->select('etablissement_id');
    }

    /**
     * Groupes que ce compte peut consulter (archivés compris) : l'enseignant
     * les siens ; le gestionnaire ceux de son établissement ; l'élève ceux où
     * il est présent ; l'administrateur plateforme tous.
     *
     * @return Builder<Groupe>
     */
    public static function groupesConsultables(User $acteur): Builder
    {
        $groupes = Groupe::query();

        if ($acteur->hasRole(Role::Superadmin)) {
            return $groupes;
        }

        // Groupé : le OU ne doit pas sortir de la closure (CLAUDE.md § 4).
        return $groupes->where(function (Builder $requete) use ($acteur) {
            $requete->whereRaw('1 = 0');

            if ($acteur->hasRole(Role::Enseignant)) {
                $requete->orWhere('enseignant_id', $acteur->getKey());
            }

            if ($acteur->hasRole(Role::GestionnaireEtablissement)) {
                $requete->orWhereIn('etablissement_id', self::rattachements($acteur, Role::GestionnaireEtablissement));
            }

            if ($acteur->hasRole(Role::Eleve)) {
                $requete->orWhereIn('id', MembreGroupe::query()->actifs()->where('eleve_id', $acteur->getKey())->select('groupe_id'));
            }
        });
    }

    public static function peutConsulterGroupe(User $acteur, Groupe $groupe): bool
    {
        return self::groupesConsultables($acteur)->whereKey($groupe->getKey())->exists();
    }

    /** Donner un devoir, retirer un élève, archiver : l'enseignant du groupe seulement. */
    public static function peutGererGroupe(User $acteur, Groupe $groupe): bool
    {
        return $acteur->can(Permission::GererGroupes->value) && $groupe->enseignant_id === $acteur->getKey();
    }

    /**
     * Lot 12 (PLAN M13) : lire le fil d'un groupe et y écrire. L'élève
     * présent dans le groupe, ou l'enseignant du groupe ; jamais un autre
     * enseignant, ni le gestionnaire (le fil est la classe, pas un rapport).
     */
    public static function peutParticiperAuFil(User $acteur, Groupe $groupe): bool
    {
        return ($acteur->can(Permission::ParticiperCommunaute->value) && self::estMembre($acteur, $groupe))
            || self::peutModererFil($acteur, $groupe);
    }

    /** Masquer, retirer la parole, fermer le fil : l'enseignant du groupe seulement. */
    public static function peutModererFil(User $acteur, Groupe $groupe): bool
    {
        return $acteur->can(Permission::ModererCommunaute->value) && self::peutGererGroupe($acteur, $groupe);
    }

    public static function estMembre(User $eleve, Groupe $groupe): bool
    {
        return MembreGroupe::query()->actifs()->where('groupe_id', $groupe->getKey())->where('eleve_id', $eleve->getKey())->exists();
    }

    /**
     * Modifier le brouillon d'un contenu (leçon, question), l'envoyer en
     * relecture, le reprendre : son auteur, ou le responsable pédagogique.
     */
    public static function peutRediger(User $acteur, ContenuRelisable $contenu): bool
    {
        if (! $acteur->can(Permission::RedigerContenu->value)) {
            return false;
        }

        return $contenu->auteurId() === $acteur->getKey()
            || $acteur->can(Permission::AdministrerContenu->value);
    }

    /**
     * Relire la version en attente : jamais son auteur, ni l'auteur du
     * contenu (« rien n'est publié sans relecteur différent de l'auteur »,
     * PLAN M17), même responsable pédagogique.
     */
    public static function peutRelire(User $acteur, ContenuRelisable $contenu): bool
    {
        return $acteur->can(Permission::RelireContenu->value) && ! self::estAuteurDe($acteur, $contenu);
    }

    /** A écrit le contenu, ou la version qui attend sa relecture. */
    public static function estAuteurDe(User $acteur, ContenuRelisable $contenu): bool
    {
        return $contenu->auteurId() === $acteur->getKey()
            || $contenu->versionEnRelecture()?->auteur_id === $acteur->getKey();
    }
}
