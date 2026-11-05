<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\ProfilEleve;
use App\Services\MaitriseService;
use App\Services\MotivationService;
use App\Services\SeanceService;
use App\Services\TableauDeBordEleveService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Ma progression » (lot 6, PLAN M8-M9) : la jauge, la maîtrise de chaque
 * notion et sa prochaine révision, la série, les points, les badges et le
 * défi de la semaine — tout calculé par MaitriseService et
 * MotivationService. Et l'instantané que l'appareil garde pour le hors
 * ligne (HL4).
 */
class ProgressionController extends Controller
{
    public function index(
        Request $request,
        MaitriseService $maitrise,
        MotivationService $motivation,
        SeanceService $seances,
    ): Response {
        $eleve = $request->user();
        $profil = $this->profil($request);
        $maintenant = CarbonImmutable::now();
        $enCours = $seances->enCours($eleve);
        $prochaine = $enCours ?? $seances->aVenir($eleve, $profil)->first();

        return Inertia::render('eleve/progression', [
            'examen' => $profil->libelleExamen(),
            'est_exemple' => CatalogueEleve::questions($profil)->where('est_exemple', true)->exists(),
            'jauge' => $maitrise->jauge($profil),
            'detail' => $maitrise->detail($profil, $maintenant),
            'serie' => $motivation->serie($eleve->id, $maintenant),
            'points' => $motivation->points($eleve->id),
            'badges' => $motivation->badges($eleve->id),
            'defi' => $motivation->defi($profil, $maintenant),
            'seance' => [
                'en_cours' => $enCours?->uuid,
                'questions' => $prochaine !== null ? count($prochaine->questions) : 0,
                'duree_minutes' => $profil->objectif_minutes,
            ],
        ]);
    }

    /** L'instantané de l'appareil (HORS_LIGNE.md A.10), jamais mis en cache. */
    public function instantane(Request $request, TableauDeBordEleveService $tableau): JsonResponse
    {
        return response()
            ->json($tableau->instantane($request->user(), $this->profil($request)))
            ->header('Cache-Control', 'no-store');
    }

    private function profil(Request $request): ProfilEleve
    {
        return CatalogueEleve::profil($request->user()) ?? abort(404);
    }
}
