<?php

namespace App\Services;

use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Matiere;
use App\Models\Notion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Règles du référentiel qui ne tiennent pas dans une validation de
 * formulaire : ordre des chapitres et notions, ce qui peut être supprimé,
 * l'année courante unique. Le contenu officiel (coefficients, durées,
 * programme) est saisi par le responsable pédagogique, jamais inventé ici.
 */
class ReferentielService
{
    /** Slug unique tiré du nom (adresse stable d'une matière). */
    public function slugMatiere(string $nom, ?Matiere $sauf = null): string
    {
        $base = Str::slug($nom) ?: 'matiere';
        $slug = $base;
        $rang = 1;

        while (Matiere::query()->where('slug', $slug)->when($sauf, fn (Builder $q) => $q->whereKeyNot($sauf->getKey()))->exists()) {
            $slug = $base.'-'.++$rang;
        }

        return $slug;
    }

    public function supprimerMatiere(Matiere $matiere): void
    {
        if ($matiere->estUtilisee()) {
            throw ValidationException::withMessages([
                'matiere' => "« {$matiere->nom} » porte des épreuves ou des chapitres : retirez-les d'abord.",
            ]);
        }

        $matiere->delete();
    }

    public function supprimerChapitre(Chapitre $chapitre): void
    {
        if ($chapitre->notions()->exists()) {
            throw ValidationException::withMessages([
                'chapitre' => 'Ce chapitre a encore des notions : supprimez-les ou déplacez-les d\'abord.',
            ]);
        }

        $chapitre->delete();
    }

    public function supprimerNotion(Notion $notion): void
    {
        if ($notion->lecons()->exists()) {
            throw ValidationException::withMessages([
                'notion' => 'Des leçons sont rattachées à cette notion : elle ne peut pas être supprimée.',
            ]);
        }

        $notion->delete();
    }

    /** Rang suivant dans une liste ordonnée (nouveau chapitre ou nouvelle notion en dernier). */
    public function rangSuivant(Builder $freres): int
    {
        return ((int) $freres->max('ordre')) + 1;
    }

    /**
     * Échange un chapitre ou une notion avec son voisin, vers le haut (-1) ou
     * le bas (+1). Les rangs sont d'abord renumérotés 1, 2, 3… : deux rangs
     * égaux (saisie concurrente) ne bloquent jamais le déplacement.
     *
     * @param  Builder<Chapitre>|Builder<Notion>  $freres
     */
    public function deplacer(Chapitre|Notion $element, Builder $freres, int $sens): void
    {
        DB::transaction(function () use ($element, $freres, $sens) {
            $liste = $freres->orderBy('ordre')->orderBy('id')->lockForUpdate()->get()->values();
            $position = $liste->search(fn ($frere) => $frere->is($element));
            $cible = $position + ($sens < 0 ? -1 : 1);

            if ($position === false || $cible < 0 || $cible >= $liste->count()) {
                return;
            }

            $ordre = $liste->all();
            [$ordre[$position], $ordre[$cible]] = [$ordre[$cible], $ordre[$position]];

            foreach ($ordre as $rang => $frere) {
                $frere->forceFill(['ordre' => $rang + 1])->save();
            }
        });
    }

    /** Une seule année courante (les épreuves affichées par défaut sont les siennes). */
    public function rendreCourante(AnneeScolaire $annee): void
    {
        DB::transaction(function () use ($annee) {
            AnneeScolaire::query()->whereKeyNot($annee->getKey())->update(['courante' => false]);
            $annee->forceFill(['courante' => true])->save();
        });
    }
}
