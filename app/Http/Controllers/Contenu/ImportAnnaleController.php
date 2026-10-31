<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\Filiere;
use App\Enums\StatutImport;
use App\Enums\TypeSujet;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Examen;
use App\Models\ImportSujet;
use App\Models\Matiere;
use App\Models\Serie;
use App\Services\Annales\ImportSujetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Annales › Importer (PLAN M17) : téléverser un sujet scanné ;
 * la lecture se fait en file (ImportSujetService), la liste des annales
 * montre l'avancement et ouvre l'annale créée.
 */
class ImportAnnaleController extends Controller
{
    public function __construct(private ImportSujetService $imports) {}

    public function create(): Response
    {
        // Les couples (examen, matière) dont le programme a des notions :
        // sans programme, l'import est refusé (la notion est obligatoire).
        $avecProgramme = Chapitre::query()
            ->join('classes', 'classes.id', '=', 'chapitres.classe_id')
            ->whereNotNull('classes.examen_id')
            ->whereHas('notions')
            ->distinct()
            ->get(['classes.examen_id', 'chapitres.matiere_id'])
            ->map(fn (Chapitre $c) => $c->getAttribute('examen_id').':'.$c->matiere_id)
            ->values();

        return Inertia::render('contenu/annales/importer', [
            'examens' => Examen::query()->with('series')->orderBy('ordre')->get()->map(fn (Examen $e) => [
                'id' => $e->id,
                'code' => $e->code->value,
                'nom' => $e->nom,
                'series' => $e->series->map(fn (Serie $s) => ['id' => $s->id, 'code' => $s->code->value, 'nom' => $s->nom])->values(),
            ]),
            'matieres' => Matiere::query()->orderBy('ordre')->get(['id', 'nom', 'teinte']),
            'avec_programme' => $avecProgramme,
            'types' => collect(TypeSujet::cases())->map(fn (TypeSujet $t) => ['valeur' => $t->value, 'libelle' => $t->libelle()]),
            'taille_max_ko' => (int) config('annales.taille_max_ko'),
            'extracteur' => config('annales.extracteur'),
            'annee' => now()->year,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'document' => [
                'required', 'file',
                'mimetypes:'.implode(',', array_keys(config('annales.types'))),
                'max:'.config('annales.taille_max_ko'),
            ],
            'examen_id' => ['required', 'integer', Rule::exists('examens', 'id')],
            'serie_id' => ['nullable', 'integer', Rule::exists('series', 'id')->where('examen_id', $request->integer('examen_id'))],
            'matiere_id' => ['required', 'integer', Rule::exists('matieres', 'id')],
            'session' => ['required', 'integer', 'between:1990,'.(now()->year + 1)],
            'type' => ['required', Rule::enum(TypeSujet::class)],
        ], [
            'document.mimetypes' => 'Le document est un PDF ou une photo (JPEG, PNG, WebP).',
            'document.max' => 'Le document pèse '.intdiv((int) config('annales.taille_max_ko'), 1024).' Mo au plus.',
        ]);

        $examen = Examen::query()->whereKey($donnees['examen_id'])->firstOrFail();
        $serie = isset($donnees['serie_id']) ? Serie::query()->whereKey($donnees['serie_id'])->firstOrFail() : null;

        if ($examen->code->aDesSeries() && $serie === null) {
            return back()->withErrors(['serie_id' => 'Choisissez la série de ce sujet de Bac.']);
        }

        $this->imports->demarrer($request->user(), $request->file('document'), [
            'examen' => $examen,
            'serie' => $examen->code->aDesSeries() ? $serie : null,
            'matiere' => Matiere::query()->whereKey($donnees['matiere_id'])->firstOrFail(),
            'filiere' => Filiere::Generale,
            'session' => (int) $donnees['session'],
            'type' => TypeSujet::from($donnees['type']),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Document reçu : la lecture commence. L’annale apparaîtra ici en brouillon.']);

        return to_route('contenu.annales.index');
    }

    public function relancer(Request $request, ImportSujet $import): RedirectResponse
    {
        $this->imports->relancer($import, $request->user());

        return to_route('contenu.annales.index');
    }

    /**
     * @return array<string, mixed>
     */
    public static function presenter(ImportSujet $import): array
    {
        return [
            'uuid' => $import->uuid,
            'document' => $import->document_nom,
            'octets' => $import->document_octets,
            'matiere' => ['nom' => $import->matiere->nom, 'teinte' => $import->matiere->teinte->value],
            'libelle' => trim(($import->examen->code->value === 'BAC' ? 'Bac' : $import->examen->code->value).' '.($import->serie?->code->value ?? '')).' '.$import->session,
            'statut' => $import->statut->value,
            'statut_libelle' => $import->statut->libelle(),
            'en_cours' => ! $import->statut->estTermine(),
            'erreur' => $import->erreur,
            'avertissements' => count($import->avertissements ?? []),
            'sujet' => $import->sujet?->uuid,
            'simule' => $import->extracteur !== 'claude',
            'cree_le' => $import->created_at->toIso8601String(),
            'peut_relancer' => $import->statut === StatutImport::Echec,
        ];
    }
}
