<?php

namespace App\Http\Controllers\Contenu\Referentiel;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Services\ReferentielService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Référentiel › Années scolaires : les épreuves (coefficients, durées) sont
 * rangées par année, une seule est courante.
 */
class AnneeScolaireController extends Controller
{
    public function __construct(private ReferentielService $referentiel) {}

    public function index(): Response
    {
        return Inertia::render('contenu/referentiel/annees', [
            'annees' => AnneeScolaire::query()
                ->withCount(['epreuves', 'epreuves as coefficients_count' => fn ($q) => $q->whereNotNull('coefficient')])
                ->orderByDesc('debut')
                ->get()
                ->map(fn (AnneeScolaire $a) => [
                    'id' => $a->id,
                    'libelle' => $a->libelle,
                    'debut' => $a->debut->toDateString(),
                    'fin' => $a->fin->toDateString(),
                    'courante' => $a->courante,
                    'epreuves' => $a->epreuves_count,
                    'coefficients' => $a->coefficients_count,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $annee = AnneeScolaire::create([...$this->valider($request), 'courante' => false]);

        if (AnneeScolaire::where('courante', true)->doesntExist()) {
            $this->referentiel->rendreCourante($annee);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Année {$annee->libelle} ajoutée."]);

        return back();
    }

    public function update(Request $request, AnneeScolaire $annee): RedirectResponse
    {
        $annee->update($this->valider($request, $annee));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Année enregistrée.']);

        return back();
    }

    public function rendreCourante(AnneeScolaire $annee): RedirectResponse
    {
        $this->referentiel->rendreCourante($annee);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$annee->libelle} est l'année courante."]);

        return back();
    }

    /**
     * @return array{libelle: string, debut: string, fin: string}
     */
    private function valider(Request $request, ?AnneeScolaire $annee = null): array
    {
        /** @var array{libelle: string, debut: string, fin: string} */
        return $request->validate([
            'libelle' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/', Rule::unique('annees_scolaires', 'libelle')->ignore($annee)],
            'debut' => ['required', 'date'],
            'fin' => ['required', 'date', 'after:debut'],
        ], [
            'libelle.regex' => 'Le libellé s\'écrit comme « 2026-2027 ».',
        ]);
    }
}
