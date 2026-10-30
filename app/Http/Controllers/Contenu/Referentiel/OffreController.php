<?php

namespace App\Http\Controllers\Contenu\Referentiel;

use App\Enums\CodeSerie;
use App\Enums\Filiere;
use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\Matiere;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Référentiel › Épreuves : pour une année et un parcours (CEE, BEPC, Bac SM,
 * SE, SS), les matières à l'examen, leur coefficient et leur durée — vides
 * tant que l'équipe pédagogique ne les a pas saisis (CLAUDE.md § 5) — et les
 * matières phares (D1).
 */
class OffreController extends Controller
{
    public function index(Request $request): Response
    {
        $annees = AnneeScolaire::query()->orderByDesc('debut')->get();
        $annee = $annees->firstWhere('id', $request->integer('annee')) ?? $annees->firstWhere('courante', true) ?? $annees->first();
        $parcours = $this->parcours();
        $choisi = collect($parcours)->firstWhere('cle', $request->string('parcours')->toString()) ?? $parcours[1] ?? $parcours[0];

        $epreuves = $annee === null ? new Collection : Epreuve::query()
            ->with('matiere')
            ->where('annee_scolaire_id', $annee->id)
            ->get();

        return Inertia::render('contenu/referentiel/offre', [
            'annees' => $annees->map(fn (AnneeScolaire $a) => ['id' => $a->id, 'libelle' => $a->libelle, 'courante' => $a->courante]),
            'annee_id' => $annee?->id,
            'parcours' => array_map(function (array $p) use ($epreuves) {
                $siennes = $epreuves->filter(fn (Epreuve $e) => $this->appartient($e, $p));

                return [
                    ...$p,
                    'epreuves' => $siennes->count(),
                    'phares' => $siennes->where('phare', true)->count(),
                ];
            }, $parcours),
            'parcours_cle' => $choisi['cle'],
            'epreuves' => $epreuves
                ->filter(fn (Epreuve $e) => $this->appartient($e, $choisi))
                ->sortBy([['phare', 'desc'], fn (Epreuve $a, Epreuve $b) => $a->matiere->ordre <=> $b->matiere->ordre])
                ->values()
                ->map(fn (Epreuve $e) => [
                    'id' => $e->id,
                    'matiere' => ['id' => $e->matiere->id, 'nom' => $e->matiere->nom, 'teinte' => $e->matiere->teinte->value],
                    'filiere' => $e->filiere->value,
                    'coefficient' => $e->coefficient,
                    'duree_minutes' => $e->duree_minutes,
                    'phare' => $e->phare,
                ]),
            'matieres' => Matiere::query()->orderBy('ordre')->get(['id', 'nom', 'teinte']),
            'filieres' => array_map(fn (Filiere $f) => ['valeur' => $f->value, 'libelle' => $f->libelle()], Filiere::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'annee_scolaire_id' => ['required', 'integer', Rule::exists('annees_scolaires', 'id')],
            'parcours' => ['required', 'string'],
            'matiere_id' => ['required', 'integer', Rule::exists('matieres', 'id')],
            ...$this->reglesEpreuve(),
        ]);

        $parcours = collect($this->parcours())->firstWhere('cle', $donnees['parcours'])
            ?? throw ValidationException::withMessages(['parcours' => 'Parcours inconnu.']);
        $filiere = Filiere::from($donnees['filiere']);

        $cle = Epreuve::cleUnicite($donnees['annee_scolaire_id'], $parcours['examen_id'], $parcours['serie_id'], $donnees['matiere_id'], $filiere);

        if (Epreuve::where('cle_unicite', $cle)->exists()) {
            throw ValidationException::withMessages(['matiere_id' => 'Cette matière figure déjà à cet examen, pour cette filière.']);
        }

        Epreuve::create([
            'annee_scolaire_id' => $donnees['annee_scolaire_id'],
            'examen_id' => $parcours['examen_id'],
            'serie_id' => $parcours['serie_id'],
            'matiere_id' => $donnees['matiere_id'],
            'filiere' => $filiere,
            'coefficient' => $donnees['coefficient'] ?? null,
            'duree_minutes' => $donnees['duree_minutes'] ?? null,
            'phare' => $request->boolean('phare'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Épreuve ajoutée.']);

        return back();
    }

    public function update(Request $request, Epreuve $epreuve): RedirectResponse
    {
        $donnees = $request->validate($this->reglesEpreuve());
        $filiere = Filiere::from($donnees['filiere']);

        $cle = Epreuve::cleUnicite($epreuve->annee_scolaire_id, $epreuve->examen_id, $epreuve->serie_id, $epreuve->matiere_id, $filiere);

        if (Epreuve::where('cle_unicite', $cle)->whereKeyNot($epreuve->id)->exists()) {
            throw ValidationException::withMessages(['filiere' => 'Cette matière figure déjà à cet examen, pour cette filière.']);
        }

        $epreuve->update([
            'filiere' => $filiere,
            'coefficient' => $donnees['coefficient'] ?? null,
            'duree_minutes' => $donnees['duree_minutes'] ?? null,
            'phare' => $request->boolean('phare'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Épreuve enregistrée.']);

        return back();
    }

    public function destroy(Epreuve $epreuve): RedirectResponse
    {
        $epreuve->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Épreuve retirée.']);

        return back();
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function reglesEpreuve(): array
    {
        return [
            'filiere' => ['required', Rule::enum(Filiere::class)],
            'coefficient' => ['nullable', 'numeric', 'min:0.5', 'max:20', 'multiple_of:0.5'],
            'duree_minutes' => ['nullable', 'integer', 'min:15', 'max:600'],
            'phare' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Les parcours d'examen : un par examen sans série, un par série du Bac.
     *
     * @return list<array{cle: string, libelle: string, examen_id: int, serie_id: int|null}>
     */
    private function parcours(): array
    {
        $parcours = [];

        foreach (Examen::query()->with('series')->orderBy('ordre')->get() as $examen) {
            if ($examen->series->isEmpty()) {
                $parcours[] = ['cle' => $examen->code->value, 'libelle' => $examen->code->value, 'examen_id' => $examen->id, 'serie_id' => null];

                continue;
            }

            foreach ($examen->series->sortBy(fn ($s) => array_search($s->code, CodeSerie::cases(), true)) as $serie) {
                $parcours[] = [
                    'cle' => $examen->code->value.'-'.$serie->code->value,
                    'libelle' => 'Bac '.$serie->code->value,
                    'examen_id' => $examen->id,
                    'serie_id' => $serie->id,
                ];
            }
        }

        return $parcours;
    }

    /**
     * @param  array{examen_id: int, serie_id: int|null}  $parcours
     */
    private function appartient(Epreuve $epreuve, array $parcours): bool
    {
        return $epreuve->examen_id === $parcours['examen_id'] && $epreuve->serie_id === $parcours['serie_id'];
    }
}
