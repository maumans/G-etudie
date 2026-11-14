<?php

namespace App\Http\Controllers\Compte;

use App\Http\Controllers\Controller;
use App\Models\LienParent;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\LiaisonParentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mon compte › Mes parents » (lot 11, décision 1) : l'élève donne un code
 * à son parent (c'est lui qui consent), voit qui le suit, retire un lien.
 * Le code en clair n'est montré qu'une fois, juste après sa création.
 */
class ParentsController extends Controller
{
    public function __construct(private LiaisonParentService $liaisons) {}

    public function index(Request $request): Response
    {
        $eleve = $request->user();
        $enCours = $this->liaisons->codeEnCours($eleve);

        return Inertia::render('compte/parents', [
            'parents' => LienParent::query()->actifs()->with('parent')->where('eleve_id', $eleve->id)
                ->orderBy('lie_le')->orderBy('id')->get()
                ->map(fn (LienParent $lien) => [
                    'id' => $lien->id,
                    'prenom' => $lien->parent->prenom,
                    'lie_le' => $lien->lie_le->toIso8601ZuluString(),
                ])->values(),
            // Le code en clair : seulement sur l'écran qui suit sa création.
            'code' => $request->session()->get('code_liaison'),
            'code_en_cours_expire_le' => $enCours?->expire_le->toIso8601ZuluString(),
            'parents_max' => LiaisonParentService::PARENTS_MAX,
            'validite_heures' => LiaisonParentService::VALIDITE_HEURES,
        ]);
    }

    public function code(Request $request): RedirectResponse
    {
        try {
            $code = $this->liaisons->genererCode($request->user());
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages(['code' => $refus->getMessage()]);
        }

        $request->session()->flash('code_liaison', [
            'code' => $code['code'],
            'expire_le' => $code['expire_le']->toIso8601ZuluString(),
        ]);

        return to_route('compte.parents.index');
    }

    public function retirer(Request $request, LienParent $lien): RedirectResponse
    {
        abort_unless($lien->eleve_id === $request->user()->id && $lien->revoque_le === null, 404);

        $this->liaisons->revoquer($request->user(), $lien);
        Inertia::flash('toast', ['type' => 'success', 'message' => $lien->parent->prenom.' ne te suit plus.']);

        return to_route('compte.parents.index');
    }
}
