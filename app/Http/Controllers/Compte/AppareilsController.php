<?php

namespace App\Http\Controllers\Compte;

use App\Http\Controllers\Controller;
use App\Models\Appareil;
use App\Services\HorsLigne\AppareilService;
use App\Support\JournalAcces;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mon compte › Appareils » (HORS_LIGNE.md A.7, HL6) : les téléphones et
 * navigateurs où ce compte est enregistré. Retirer un appareil ôte le profil
 * de ce téléphone : son jeton ne vaut plus, ses gestes encore en file y
 * attendent une nouvelle connexion. Chacun ne voit et ne retire que les siens
 * (un appareil où il n'est pas : 404).
 */
class AppareilsController extends Controller
{
    /** Les plus récents ; les autres sont comptés (un compte ne devrait en avoir que quelques-uns). */
    public const AFFICHES = 10;

    public function __construct(private AppareilService $appareils) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $requete = Appareil::query()
            ->join('appareil_profils', 'appareil_profils.appareil_id', '=', 'appareils.id')
            ->where('appareil_profils.user_id', $user->id)
            ->whereNull('appareil_profils.retire_le')
            ->whereNull('appareils.revoque_le');
        $total = (clone $requete)->count();
        $appareils = $requete
            ->orderByDesc('appareils.dernier_contact_le')
            ->orderByDesc('appareils.id')
            ->limit(self::AFFICHES)
            ->get(['appareils.*', 'appareil_profils.ajoute_le as profil_ajoute_le']);

        return Inertia::render('compte/appareils', [
            'appareils' => $appareils->map(fn (Appareil $appareil) => [
                'uuid' => $appareil->uuid,
                'libelle' => $appareil->libelle,
                'ajoute_le' => $appareil->getAttribute('profil_ajoute_le'),
                'dernier_contact_le' => $appareil->dernier_contact_le->toIso8601ZuluString(),
                'profils' => $appareil->profils()->wherePivotNull('retire_le')->count(),
            ])->values(),
            'autres' => max(0, $total - $appareils->count()),
        ]);
    }

    public function retirer(Request $request, Appareil $appareil): RedirectResponse
    {
        abort_unless($appareil->aPourProfil($request->user()), 404);

        $this->appareils->retirerProfil($appareil, $request->user());
        JournalAcces::consigner('appareil.retire', $appareil, ['appareil' => $appareil->libelle]);

        return back()->with('succes', "Ton profil est retiré de « {$appareil->libelle} ».");
    }
}
