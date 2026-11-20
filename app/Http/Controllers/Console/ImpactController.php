<?php

namespace App\Http\Controllers\Console;

use App\Http\Controllers\Controller;
use App\Services\Plateforme\PlateformeService;
use App\Services\Plateforme\RapportImpact;
use App\Support\JournalAcces;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Response as ReponseHttp;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Impact (PLAN M18 : « la preuve à montrer aux partenaires ») et
 * son rapport PDF (critère du lot 13). L'écran et le PDF lisent le même
 * calcul (PlateformeService::impact) avec les mêmes filtres : ce qu'on
 * voit est ce qu'on envoie. Chaque export est inscrit au journal des
 * accès sensibles. Permission `console.impact`.
 */
class ImpactController extends Controller
{
    public function __construct(private PlateformeService $plateforme) {}

    public function index(Request $request): Response
    {
        $filtres = $this->filtres($request);

        return Inertia::render('console/impact', [
            'impact' => $this->plateforme->impact($filtres, CarbonImmutable::now()),
            'choix' => [
                'periodes' => PlateformeService::PERIODES,
                'examens' => collect(PlateformeService::examens())
                    ->map(fn (string $libelle, string $cle) => ['cle' => $cle, 'libelle' => $libelle])
                    ->values(),
                'etablissements' => PlateformeController::etablissements(),
            ],
        ]);
    }

    public function rapport(Request $request, RapportImpact $rapport): ReponseHttp
    {
        $filtres = $this->filtres($request);
        $maintenant = CarbonImmutable::now();
        $impact = $this->plateforme->impact($filtres, $maintenant);

        JournalAcces::consigner('rapport_impact.exporte', details: [
            'semaines' => $filtres['semaines'],
            'examen' => $filtres['examen'],
            'etablissement' => $filtres['etablissement'],
        ]);

        return response($rapport->pdf($impact, $maintenant), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.RapportImpact::nomFichier($maintenant).'"',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /**
     * @return array{semaines: int, examen: string|null, etablissement: int|null}
     */
    private function filtres(Request $request): array
    {
        return PlateformeService::filtresImpact(
            $request->query('semaines'),
            $request->query('examen'),
            $request->query('etablissement'),
        );
    }
}
