<?php

namespace App\Http\Controllers\Console;

use App\Enums\FormuleAbonnement;
use App\Http\Controllers\Controller;
use App\Models\CodeAcces;
use App\Models\LotCodes;
use App\Services\CodeAccesService;
use App\Support\CodeAcces as FormatCode;
use App\Support\Gnf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Console › Codes prépayés (lot 9, PLAN M16) : fabriquer un lot, imprimer
 * ses cartes ou télécharger le fichier, dire qu'il est remis (les codes en
 * clair disparaissent alors), désactiver un lot perdu. Permission
 * `codes.gerer` (administrateur de la plateforme).
 */
class CodesController extends Controller
{
    public function __construct(private CodeAccesService $codes) {}

    public function index(): Response
    {
        $lots = LotCodes::query()
            ->withCount(['codes as utilises' => fn ($q) => $q->whereNotNull('utilise_le')])
            ->orderByDesc('created_at')->orderByDesc('id')
            ->paginate(20);

        return Inertia::render('console/codes/index', [
            'lots' => [
                'donnees' => collect($lots->items())->map(fn (LotCodes $lot) => $this->resume($lot))->values(),
                'page' => $lots->currentPage(),
                'derniere' => $lots->lastPage(),
                'total' => $lots->total(),
            ],
            'formules' => array_map(fn (FormuleAbonnement $f) => $f->pourEcran(), FormuleAbonnement::cases()),
            'quantite_max' => (int) config('paiements.codes.quantite_max'),
            'bilan' => [
                'lots' => LotCodes::query()->count(),
                'codes' => (int) LotCodes::query()->sum('quantite'),
                'utilises' => CodeAcces::query()->whereNotNull('utilise_le')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'libelle' => ['required', 'string', 'max:120'],
            'formule' => ['required', Rule::enum(FormuleAbonnement::class)],
            'quantite' => ['required', 'integer', 'min:1', 'max:'.config('paiements.codes.quantite_max')],
            'revendeur' => ['nullable', 'string', 'max:120'],
        ], [], ['libelle' => 'nom du lot', 'quantite' => 'nombre de codes']);

        $lot = $this->codes->creerLot(
            $request->user(),
            FormuleAbonnement::from($donnees['formule']),
            (int) $donnees['quantite'],
            $donnees['libelle'],
            $donnees['revendeur'] ?? null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$lot->quantite} codes fabriqués. Imprime-les ou télécharge-les, puis dis qu'ils sont remis."]);

        return to_route('console.codes.show', $lot);
    }

    public function show(LotCodes $lot): Response
    {
        $lot->loadCount(['codes as utilises' => fn ($q) => $q->whereNotNull('utilise_le')]);
        $derniers = $lot->codes()->with('lot')->whereNotNull('utilise_le')
            ->orderByDesc('utilise_le')->orderByDesc('id')->limit(10)->get();

        return Inertia::render('console/codes/fiche', [
            'lot' => $this->resume($lot),
            'apercu' => $lot->codes_en_attente === null ? null : array_map(
                fn (string $code) => FormatCode::afficher($code),
                array_slice($lot->codes_en_attente, 0, 6),
            ),
            'utilisations' => $derniers->map(fn ($code) => [
                'fin' => $code->fin,
                'utilise_le' => $code->utilise_le?->toIso8601ZuluString(),
            ])->values(),
        ]);
    }

    /** La planche de cartes à imprimer, tant que les codes ne sont pas remis. */
    public function impression(LotCodes $lot): Response
    {
        abort_if($lot->codes_en_attente === null, 404);

        return Inertia::render('impression/codes', [
            'lot' => $this->resume($lot),
            'codes' => array_map(fn (string $code) => FormatCode::afficher($code), $lot->codes_en_attente),
            'prix' => Gnf::formater($lot->formule->prixGnf()),
        ]);
    }

    public function fichier(LotCodes $lot): StreamedResponse
    {
        abort_if($lot->codes_en_attente === null, 404);
        $codes = $lot->codes_en_attente;

        return response()->streamDownload(function () use ($lot, $codes) {
            $sortie = fopen('php://output', 'w');
            assert($sortie !== false);
            fwrite($sortie, "\u{FEFF}");
            fputcsv($sortie, ['code', 'formule', 'duree', 'lot'], ';');

            foreach ($codes as $code) {
                fputcsv($sortie, [FormatCode::afficher($code), $lot->formule->nom(), $lot->formule->duree(), $lot->libelle], ';');
            }

            fclose($sortie);
        }, "codes-{$lot->uuid}.csv", ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    public function remis(Request $request, LotCodes $lot): RedirectResponse
    {
        $this->codes->marquerRemis($lot, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Codes remis : ils ne sont plus lisibles ici.']);

        return back();
    }

    public function desactiver(Request $request, LotCodes $lot): RedirectResponse
    {
        $this->codes->desactiver($lot, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lot désactivé : ses codes non utilisés ne valent plus rien.']);

        return back();
    }

    /** @return array<string, mixed> */
    private function resume(LotCodes $lot): array
    {
        return [
            'uuid' => $lot->uuid,
            'libelle' => $lot->libelle,
            'formule' => $lot->formule->pourEcran(),
            'quantite' => $lot->quantite,
            'utilises' => (int) $lot->getAttribute('utilises'),
            'revendeur' => $lot->revendeur,
            'cree_le' => $lot->created_at->toIso8601ZuluString(),
            'codes_disponibles' => $lot->codes_en_attente !== null,
            'remis_le' => $lot->codes_remis_le?->toIso8601ZuluString(),
            'desactive_le' => $lot->desactive_le?->toIso8601ZuluString(),
            'est_exemple' => $lot->est_exemple,
        ];
    }
}
