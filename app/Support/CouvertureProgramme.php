<?php

namespace App\Support;

use App\Enums\StatutContenu;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\Notion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * La couverture du programme (PLAN M17, planning éditorial ; M18, console
 * › Contenu) : une seule réponse à « quelle part du programme a sa
 * leçon ? », lue par le tableau de bord du back-office et par la console.
 */
class CouvertureProgramme
{
    /**
     * Couverture des matières phares de l'année courante : pour chaque
     * matière et classe d'examen, la part des notions du programme qui ont
     * une leçon publiée.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function matieresPhares(): array
    {
        $annee = AnneeScolaire::courante();

        if ($annee === null) {
            return [];
        }

        $phares = Epreuve::query()
            ->with(['matiere', 'examen.classe', 'serie'])
            ->where('annee_scolaire_id', $annee->id)
            ->where('phare', true)
            ->get()
            ->filter(fn (Epreuve $e) => $e->examen->classe !== null)
            ->groupBy(fn (Epreuve $e) => $e->matiere_id.'-'.$e->examen->classe->id);

        return $phares->map(function (Collection $epreuves) {
            /** @var Epreuve $premiere */
            $premiere = $epreuves->first();
            $classe = $premiere->examen->classe;

            $notions = Notion::query()->whereHas('chapitre', fn (Builder $q) => $q
                ->where('matiere_id', $premiere->matiere_id)
                ->where('classe_id', $classe->id));

            return [
                'matiere' => ['nom' => $premiere->matiere->nom, 'teinte' => $premiere->matiere->teinte->value],
                'classe' => $classe->nom,
                'examens' => $epreuves->map(fn (Epreuve $e) => $e->serie ? 'Bac '.$e->serie->code->value : $e->examen->code->value)->unique()->values(),
                'chapitres' => Chapitre::query()->where('matiere_id', $premiere->matiere_id)->where('classe_id', $classe->id)->count(),
                'notions' => (clone $notions)->count(),
                'couvertes' => (clone $notions)->whereHas('lecons', fn (Builder $q) => $q->whereNotNull('version_publiee_id')->where('statut', '!=', StatutContenu::Archive))->count(),
                'ordre' => [$classe->ordre, $premiere->matiere->ordre],
            ];
        })
            ->sortBy('ordre')
            ->map(fn (array $ligne) => collect($ligne)->except('ordre')->all())
            ->values()
            ->all();
    }
}
