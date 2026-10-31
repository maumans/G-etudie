<?php

namespace App\Support;

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Contracts\ContenuRelisable;
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
 * tous les élèves sans être rattaché à aucun. Les liens parent ↔ enfant,
 * groupe et établissement s'ajoutent ici au lot 11.
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
        return $acteur->hasRole(Role::Eleve) ? [$acteur->getKey()] : [];
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
