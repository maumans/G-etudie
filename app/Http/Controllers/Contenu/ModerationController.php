<?php

namespace App\Http\Controllers\Contenu;

use App\Http\Controllers\Controller;
use App\Models\MotInterdit;
use App\Models\PublicationGroupe;
use App\Models\SignalementPublication;
use App\Services\Communaute\FilGroupeService;
use App\Support\FiltreFil;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Modération (lot 12, PLAN M13) : la liste des mots refusés
 * dans les fils des groupes, tenue par le responsable pédagogique, et ce que
 * le filtre refuse déjà seul. Aucun message d'élève n'est lu ici : le fil
 * d'un groupe appartient à son enseignant.
 */
class ModerationController extends Controller
{
    public function index(): Response
    {
        $depuis = CarbonImmutable::now()->subDays(30);

        return Inertia::render('contenu/moderation', [
            'mots' => MotInterdit::query()->orderBy('mot')->orderBy('id')->get(['id', 'mot'])->map(fn (MotInterdit $m) => ['id' => $m->id, 'mot' => $m->mot])->values(),
            'regles' => [
                'texte_max' => FilGroupeService::TEXTE_MAX,
                'par_jour' => FilGroupeService::PAR_JOUR,
                'intervalle' => FilGroupeService::INTERVALLE_SECONDES,
                'signalements' => FilGroupeService::SIGNALEMENTS_POUR_MASQUER,
            ],
            // Des chiffres, jamais de contenu ni de nom (30 derniers jours).
            'activite' => [
                'publications' => PublicationGroupe::query()->where('created_at', '>=', $depuis)->count(),
                'signalements' => SignalementPublication::query()->where('created_at', '>=', $depuis)->count(),
                'masquees' => PublicationGroupe::query()->where('masquee_le', '>=', $depuis)->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate(['mot' => ['required', 'string', 'min:2', 'max:60']], [], ['mot' => 'mot']);
        $mot = FiltreFil::normaliser(trim($donnees['mot']));

        if ($mot === '' || preg_match('/\s/', $mot) === 1 && mb_strlen($mot) > 40) {
            throw ValidationException::withMessages(['mot' => 'Un mot ou une courte expression.']);
        }

        MotInterdit::query()->firstOrCreate(['mot' => $mot], ['ajoute_par' => $request->user()->id]);
        Inertia::flash('toast', ['type' => 'success', 'message' => '« '.$mot.' » est refusé dans les fils.']);

        return back();
    }

    public function destroy(MotInterdit $mot): RedirectResponse
    {
        $mot->delete();

        return back();
    }
}
