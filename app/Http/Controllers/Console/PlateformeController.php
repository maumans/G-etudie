<?php

namespace App\Http\Controllers\Console;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Services\Plateforme\PlateformeService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * La console plateforme (PLAN M18, lot 13) : la vue d'ensemble et les
 * écrans Activité, Contenu, Revenus. Tous les chiffres viennent de
 * PlateformeService ; aucun élève n'y est nommé.
 */
class PlateformeController extends Controller
{
    public function __construct(private PlateformeService $plateforme) {}

    public function accueil(Request $request): Response
    {
        $maintenant = CarbonImmutable::now();
        $impact = $request->user()->can(Permission::VoirImpact->value)
            ? $this->plateforme->impact(PlateformeService::filtresImpact(12, null, null), $maintenant)
            : null;

        return Inertia::render('console/accueil', [
            'aujourdhui' => $maintenant->toDateString(),
            'activite' => $this->plateforme->activite($maintenant),
            'contenu' => $this->plateforme->contenu($maintenant),
            'revenus' => $request->user()->can(Permission::VoirPaiements->value) ? $this->plateforme->revenus($maintenant) : null,
            'impact' => $impact,
        ]);
    }

    public function activite(): Response
    {
        $maintenant = CarbonImmutable::now();

        return Inertia::render('console/activite', [
            'aujourdhui' => $maintenant->toDateString(),
            'activite' => $this->plateforme->activite($maintenant),
            'regles' => [
                'seances_par_semaine' => PlateformeService::SEANCES_PAR_SEMAINE,
                'seuil' => PlateformeService::SEUIL_ANONYMAT,
            ],
        ]);
    }

    public function contenu(): Response
    {
        return Inertia::render('console/contenu', [
            'contenu' => $this->plateforme->contenu(CarbonImmutable::now()),
        ]);
    }

    public function revenus(): Response
    {
        $maintenant = CarbonImmutable::now();

        return Inertia::render('console/revenus', [
            'aujourdhui' => $maintenant->toDateString(),
            'revenus' => $this->plateforme->revenus($maintenant),
        ]);
    }

    /**
     * Les établissements qu'on peut choisir dans les filtres de l'impact.
     *
     * @return list<array{id: int, nom: string}>
     */
    public static function etablissements(): array
    {
        return array_values(Etablissement::query()
            ->whereHas('profils')
            ->orderBy('nom')->orderBy('id')
            ->get(['id', 'nom'])
            ->map(fn (Etablissement $e) => ['id' => $e->id, 'nom' => $e->nom])
            ->all());
    }
}
