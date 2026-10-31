<?php

namespace App\Support;

use App\Enums\StatutContenu;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Seule réponse à « quels contenus cet élève voit-il ? » (CLAUDE.md § 3 :
 * une règle = une autorité). Le rattachement est son profil d'examen :
 *
 *  - ses **matières** : les épreuves de l'année courante pour son examen, sa
 *    série et sa filière (la table qui porte les coefficients, PLAN M3) ;
 *  - ses **chapitres** : ceux de ces matières pour sa classe d'examen ;
 *  - ses **leçons** : celles de ces chapitres qui ont une version publiée et
 *    ne sont pas archivées (une leçon publiée qu'on retouche reste en ligne,
 *    DEVBOOK point 15) ;
 *  - ses **questions** : celles de ces chapitres qui ont une version
 *    publiée et ne sont pas archivées (même règle que les leçons, lot 3) ;
 *    celles d'une annale, seulement si l'annale est en ligne (lot 4) ;
 *  - ses **annales** : publiées, non archivées, de son examen, sa série et
 *    sa filière, dans ses matières (lot 4).
 *
 * Les écrans, les policies, la séance du jour et la synchronisation passent
 * tous par ici ; aucun ne refait la requête à sa façon.
 */
class CatalogueEleve
{
    public static function profil(User $eleve): ?ProfilEleve
    {
        return $eleve->profilEleve()->with(['examen', 'serie'])->first();
    }

    /**
     * Les épreuves de l'élève, matière chargée, phares d'abord.
     *
     * @return Collection<int, Epreuve>
     */
    public static function epreuves(ProfilEleve $profil): Collection
    {
        $annee = AnneeScolaire::courante();

        if ($annee === null) {
            return new Collection;
        }

        return Epreuve::query()
            ->with('matiere')
            ->where('annee_scolaire_id', $annee->id)
            ->where('examen_id', $profil->examen_id)
            ->where('filiere', $profil->filiere->value)
            ->where(fn (Builder $requete) => $profil->serie_id === null
                ? $requete->whereNull('serie_id')
                : $requete->where('serie_id', $profil->serie_id))
            ->get()
            ->sortBy([
                fn (Epreuve $a, Epreuve $b) => $b->phare <=> $a->phare,
                fn (Epreuve $a, Epreuve $b) => $a->matiere->ordre <=> $b->matiere->ordre,
            ])
            ->values();
    }

    /** @return list<int> */
    public static function matieresIds(ProfilEleve $profil): array
    {
        return array_values(self::epreuves($profil)->map(fn (Epreuve $epreuve) => $epreuve->matiere_id)->all());
    }

    public static function voitMatiere(ProfilEleve $profil, Matiere $matiere): bool
    {
        return in_array($matiere->id, self::matieresIds($profil), true);
    }

    /**
     * Chapitres de l'élève, d'une matière ou de toutes.
     *
     * @return Builder<Chapitre>
     */
    public static function chapitres(ProfilEleve $profil, ?Matiere $matiere = null): Builder
    {
        $matieres = self::matieresIds($profil);

        if ($matiere !== null) {
            $matieres = in_array($matiere->id, $matieres, true) ? [$matiere->id] : [];
        }

        return Chapitre::query()
            ->where('classe_id', $profil->classe_id)
            ->whereIn('matiere_id', $matieres);
    }

    /**
     * Leçons que l'élève peut lire.
     *
     * @return Builder<Lecon>
     */
    public static function lecons(ProfilEleve $profil, ?Matiere $matiere = null): Builder
    {
        $chapitres = self::chapitres($profil, $matiere)->select('id');

        return Lecon::query()
            ->whereNotNull('version_publiee_id')
            ->where('statut', '!=', StatutContenu::Archive->value)
            ->whereHas('notion', fn (Builder $notion) => $notion->whereIn('chapitre_id', $chapitres));
    }

    public static function peutLireLecon(User $eleve, Lecon $lecon): bool
    {
        $profil = self::profil($eleve);

        return $profil !== null && self::lecons($profil)->whereKey($lecon->id)->exists();
    }

    public static function peutVoirChapitre(User $eleve, Chapitre $chapitre): bool
    {
        $profil = self::profil($eleve);

        return $profil !== null && self::chapitres($profil)->whereKey($chapitre->id)->exists();
    }

    /**
     * Questions que l'élève peut recevoir.
     *
     * @return Builder<Question>
     */
    public static function questions(ProfilEleve $profil, ?Matiere $matiere = null): Builder
    {
        $chapitres = self::chapitres($profil, $matiere)->select('id');

        return Question::query()
            ->whereNotNull('version_publiee_id')
            ->where('statut', '!=', StatutContenu::Archive->value)
            ->whereHas('notion', fn (Builder $notion) => $notion->whereIn('chapitre_id', $chapitres))
            // Une question d'annale suit son sujet : publié, pas archivé
            // (groupé : le OU ne doit pas s'unir aux conditions précédentes).
            ->where(fn (Builder $q) => $q->whereNull('sujet_partie_id')
                ->orWhereHas('partie.sujet', fn (Builder $sujet) => self::sujetEnLigne($sujet)));
    }

    /**
     * Annales que l'élève peut consulter : publiées, non archivées, de son
     * examen, de sa série (Bac) et de sa filière, dans ses matières.
     *
     * @return Builder<Sujet>
     */
    public static function sujets(ProfilEleve $profil, ?Matiere $matiere = null): Builder
    {
        $matieres = self::matieresIds($profil);

        if ($matiere !== null) {
            $matieres = in_array($matiere->id, $matieres, true) ? [$matiere->id] : [];
        }

        $requete = Sujet::query()
            ->where('examen_id', $profil->examen_id)
            ->where('filiere', $profil->filiere->value)
            ->whereIn('matiere_id', $matieres)
            ->where(fn (Builder $q) => $profil->serie_id === null
                ? $q->whereNull('serie_id')
                : $q->where('serie_id', $profil->serie_id));

        return self::sujetEnLigne($requete);
    }

    public static function peutLireSujet(User $eleve, Sujet $sujet): bool
    {
        $profil = self::profil($eleve);

        return $profil !== null && self::sujets($profil)->whereKey($sujet->id)->exists();
    }

    /**
     * @template T of Builder<Sujet>
     *
     * @param  T  $requete
     * @return T
     */
    private static function sujetEnLigne(Builder $requete): Builder
    {
        return $requete->whereNotNull('version_publiee_id')
            ->where('statut', '!=', StatutContenu::Archive->value);
    }

    public static function peutRecevoirQuestion(User $eleve, Question $question): bool
    {
        $profil = self::profil($eleve);

        return $profil !== null && self::questions($profil)->whereKey($question->id)->exists();
    }
}
