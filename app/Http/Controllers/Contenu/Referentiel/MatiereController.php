<?php

namespace App\Http\Controllers\Contenu\Referentiel;

use App\Enums\TeinteMatiere;
use App\Http\Controllers\Controller;
use App\Models\Matiere;
use App\Services\ReferentielService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Référentiel › Matières : le responsable pédagogique les ajoute, les
 * renomme, change leur teinte, les supprime tant que rien n'en dépend.
 */
class MatiereController extends Controller
{
    public function __construct(private ReferentielService $referentiel) {}

    public function index(): Response
    {
        $matieres = Matiere::query()
            ->withCount(['epreuves', 'chapitres', 'epreuves as phares_count' => fn ($q) => $q->where('phare', true)])
            ->orderBy('ordre')
            ->orderBy('nom')
            ->get();

        return Inertia::render('contenu/referentiel/matieres', [
            'matieres' => $matieres->map(fn (Matiere $matiere) => [
                'id' => $matiere->id,
                'nom' => $matiere->nom,
                'teinte' => $matiere->teinte->value,
                'epreuves' => $matiere->epreuves_count,
                'phares' => $matiere->phares_count,
                'chapitres' => $matiere->chapitres_count,
            ]),
            'teintes' => array_map(fn (TeinteMatiere $t) => $t->value, TeinteMatiere::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $this->valider($request);

        Matiere::create([
            ...$donnees,
            'slug' => $this->referentiel->slugMatiere($donnees['nom']),
            'ordre' => (int) Matiere::max('ordre') + 1,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Matière « {$donnees['nom']} » ajoutée."]);

        return to_route('contenu.referentiel.matieres.index');
    }

    public function update(Request $request, Matiere $matiere): RedirectResponse
    {
        $donnees = $this->valider($request, $matiere);

        $matiere->update([
            ...$donnees,
            'slug' => $this->referentiel->slugMatiere($donnees['nom'], $matiere),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Matière enregistrée.']);

        return to_route('contenu.referentiel.matieres.index');
    }

    public function destroy(Matiere $matiere): RedirectResponse
    {
        $this->referentiel->supprimerMatiere($matiere);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Matière « {$matiere->nom} » supprimée."]);

        return to_route('contenu.referentiel.matieres.index');
    }

    /**
     * @return array{nom: string, teinte: string}
     */
    private function valider(Request $request, ?Matiere $matiere = null): array
    {
        /** @var array{nom: string, teinte: string} */
        return $request->validate([
            'nom' => ['required', 'string', 'max:80', Rule::unique('matieres', 'nom')->ignore($matiere)],
            'teinte' => ['required', Rule::enum(TeinteMatiere::class)],
        ]);
    }
}
