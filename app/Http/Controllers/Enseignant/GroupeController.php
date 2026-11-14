<?php

namespace App\Http\Controllers\Enseignant;

use App\Enums\Filiere;
use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\Serie;
use App\Models\User;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\GroupeService;
use App\Services\Organisation\SuiviService;
use App\Support\JournalAcces;
use App\Support\Perimetre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Espace enseignant (lot 11, PLAN M14) : ses groupes ; un groupe, avec les
 * notions faibles de la classe et qui a fait quoi (critère du lot). Un
 * groupe d'un autre enseignant n'existe pas (GroupePolicy, 404).
 */
class GroupeController extends Controller
{
    public function __construct(
        private GroupeService $groupes,
        private SuiviService $suivi,
    ) {}

    public function index(Request $request): Response
    {
        $enseignant = $request->user();
        $groupes = Perimetre::groupesConsultables($enseignant)
            ->where('enseignant_id', $enseignant->id)
            ->with(['examen', 'serie', 'etablissement'])
            ->withCount(['membres as eleves_count' => fn ($q) => $q->actifs()])
            ->orderByRaw('archive_le is not null')
            ->orderBy('nom')
            ->orderBy('id')
            ->get();

        return Inertia::render('enseignant/accueil', [
            'groupes' => $groupes->map(fn (Groupe $groupe) => [
                ...$this->suivi->resumeGroupe($groupe, (int) $groupe->eleves_count),
                ...($groupe->archive_le === null ? $this->apercu($groupe) : ['jauge_moyenne' => null, 'notions_faibles' => [], 'devoirs_ouverts' => 0]),
            ])->values(),
            'examens' => Examen::query()->with('series')->orderBy('ordre')->orderBy('id')->get()->map(fn (Examen $examen) => [
                'id' => $examen->id,
                'nom' => $examen->nom,
                'series' => $examen->series->map(fn (Serie $serie) => ['id' => $serie->id, 'nom' => $serie->nom, 'code' => $serie->code->value])->values(),
            ])->values(),
            'etablissements' => Perimetre::etablissementsEnseignes($enseignant)->orderBy('nom')->get(['id', 'nom']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:80'],
            'examen' => ['required', 'integer', Rule::exists('examens', 'id')],
            'serie' => ['nullable', 'integer', Rule::exists('series', 'id')],
            'filiere' => ['nullable', Rule::enum(Filiere::class)],
            'etablissement' => ['nullable', 'integer'],
        ], [], ['nom' => 'nom du groupe']);

        try {
            $groupe = $this->groupes->creer(
                $request->user(),
                $donnees['nom'],
                Examen::query()->whereKey((int) $donnees['examen'])->firstOrFail(),
                isset($donnees['serie']) ? Serie::query()->whereKey((int) $donnees['serie'])->firstOrFail() : null,
                Filiere::tryFrom($donnees['filiere'] ?? '') ?? Filiere::Generale,
                isset($donnees['etablissement']) ? Perimetre::etablissementsEnseignes($request->user())->whereKey((int) $donnees['etablissement'])->first() : null,
            );
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Groupe créé. Donnez le code '.$groupe->code.' à vos élèves.']);

        return to_route('enseignant.groupes.show', $groupe);
    }

    public function show(Request $request, Groupe $groupe): Response
    {
        Gate::authorize('gerer', $groupe);

        return Inertia::render('enseignant/groupe', [
            'suivi' => $this->suivi->groupe($groupe),
        ]);
    }

    public function update(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('gerer', $groupe);
        $donnees = $request->validate(['nom' => ['required', 'string', 'max:80']], [], ['nom' => 'nom du groupe']);
        $this->groupes->renommer($groupe, $donnees['nom']);

        return back();
    }

    public function changerCode(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('gerer', $groupe);
        $this->groupes->changerCode($groupe);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Nouveau code : '.$groupe->code.'. L\'ancien ne marche plus.']);

        return back();
    }

    public function archiver(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('gerer', $groupe);
        $this->groupes->archiver($groupe);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Groupe archivé : il reste consultable, plus personne ne le rejoint.']);

        return to_route('enseignant.accueil');
    }

    public function retirer(Request $request, Groupe $groupe, User $eleve): RedirectResponse
    {
        Gate::authorize('gerer', $groupe);
        abort_unless(Perimetre::estMembre($eleve, $groupe), 404);

        $this->groupes->retirer($request->user(), $groupe, $eleve);
        JournalAcces::consigner('groupe.eleve_retire', $groupe, ['eleve_id' => $eleve->id]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $eleve->prenom.' ne fait plus partie du groupe.']);

        return back();
    }

    /**
     * La carte d'un groupe sur l'accueil : jauge moyenne, deux notions
     * faibles, devoirs ouverts.
     *
     * @return array<string, mixed>
     */
    private function apercu(Groupe $groupe): array
    {
        $suivi = $this->suivi->groupe($groupe);

        return [
            'jauge_moyenne' => $suivi['resume']['jauge_moyenne'],
            'actifs_semaine' => $suivi['resume']['actifs_semaine'],
            'devoirs_ouverts' => $suivi['resume']['devoirs_ouverts'],
            'notions_faibles' => array_slice($suivi['notions_faibles'], 0, 2),
        ];
    }
}
