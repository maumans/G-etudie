<?php

namespace App\Http\Controllers\Communaute;

use App\Enums\MotifSignalementPublication;
use App\Http\Controllers\Controller;
use App\Models\Groupe;
use App\Models\Matiere;
use App\Models\PublicationGroupe;
use App\Models\User;
use App\Services\Communaute\FilGroupeService;
use App\Services\Organisation\GesteRefuse;
use App\Support\CatalogueEleve;
use App\Support\Perimetre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Le fil « Questions du groupe » (lot 12, PLAN M13), côté élève et côté
 * enseignant. Tout passe par FilGroupeService ; un groupe hors périmètre
 * répond 404 (GroupePolicy). En ligne seulement (niveau C).
 */
class FilController extends Controller
{
    public function __construct(private FilGroupeService $fil) {}

    public function eleve(Request $request, Groupe $groupe): Response
    {
        Gate::authorize('participer', $groupe);

        return Inertia::render('eleve/fil', $this->props($request->user(), $groupe));
    }

    public function enseignant(Request $request, Groupe $groupe): Response
    {
        Gate::authorize('moderer', $groupe);

        return Inertia::render('enseignant/fil', $this->props($request->user(), $groupe));
    }

    public function publier(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('participer', $groupe);

        $donnees = $request->validate([
            'texte' => ['required', 'string', 'max:2000'],
            'parent' => ['nullable', 'string', 'uuid'],
            'matiere' => ['nullable', 'string', 'max:40'],
            'uuid' => ['nullable', 'string', 'uuid'],
        ], [], ['texte' => 'message']);

        $parent = isset($donnees['parent']) ? PublicationGroupe::query()->where('uuid', $donnees['parent'])->first() : null;
        $matiere = isset($donnees['matiere']) ? Matiere::query()->where('slug', $donnees['matiere'])->first() : null;

        $this->tenter(fn () => $this->fil->publier($request->user(), $groupe, $donnees['texte'], $parent, $matiere, $donnees['uuid'] ?? null));

        return back();
    }

    public function signaler(Request $request, PublicationGroupe $publication): RedirectResponse
    {
        Gate::authorize('participer', $publication->groupe);

        $donnees = $request->validate(['motif' => ['required', Rule::enum(MotifSignalementPublication::class)]], [], ['motif' => 'motif']);
        $this->tenter(fn () => $this->fil->signaler($request->user(), $publication, MotifSignalementPublication::from($donnees['motif'])));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Merci. Ton enseignant va regarder ce message.']);

        return back();
    }

    public function masquer(Request $request, PublicationGroupe $publication): RedirectResponse
    {
        Gate::authorize('moderer', $publication->groupe);
        $this->tenter(fn () => $this->fil->masquer($request->user(), $publication));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message masqué : les élèves ne le voient plus.']);

        return back();
    }

    public function garder(Request $request, PublicationGroupe $publication): RedirectResponse
    {
        Gate::authorize('moderer', $publication->groupe);
        $this->tenter(fn () => $this->fil->garder($request->user(), $publication));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message gardé : il reste visible.']);

        return back();
    }

    public function parole(Request $request, Groupe $groupe, User $eleve): RedirectResponse
    {
        Gate::authorize('moderer', $groupe);
        abort_unless(Perimetre::estMembre($eleve, $groupe), 404);

        $donnees = $request->validate(['jours' => ['required', 'integer', 'min:0', 'max:30']]);
        $this->tenter(fn () => $this->fil->parole($request->user(), $groupe, $eleve, (int) $donnees['jours']));
        Inertia::flash('toast', ['type' => 'success', 'message' => (int) $donnees['jours'] === 0
            ? $eleve->prenom.' peut de nouveau écrire dans le fil.'
            : $eleve->prenom.' lit le fil sans y écrire pendant '.$donnees['jours'].' jours.']);

        return back();
    }

    public function fermer(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('moderer', $groupe);

        $donnees = $request->validate(['ferme' => ['required', 'boolean']]);
        $this->tenter(fn () => $this->fil->fermer($request->user(), $groupe, (bool) $donnees['ferme']));
        Inertia::flash('toast', ['type' => 'success', 'message' => $donnees['ferme'] ? 'Fil fermé : les élèves le lisent sans y écrire.' : 'Fil rouvert.']);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function props(User $acteur, Groupe $groupe): array
    {
        $groupe->loadMissing(['enseignant', 'examen', 'serie']);

        return [
            'groupe' => [
                'id' => $groupe->id,
                'nom' => $groupe->nom,
                'enseignant' => $groupe->enseignant->prenom,
                'examen' => $groupe->libelleExamen(),
                'archive' => $groupe->archive_le !== null,
                'est_exemple' => $groupe->est_exemple,
            ],
            'fil' => $this->fil->fil($acteur, $groupe),
            'matieres' => CatalogueEleve::epreuves($groupe->profilType())->map(fn ($epreuve) => [
                'slug' => $epreuve->matiere->slug,
                'nom' => $epreuve->matiere->nom,
                'cle' => $epreuve->matiere->teinte->value,
            ])->values(),
            'motifs' => collect(MotifSignalementPublication::cases())->map(fn (MotifSignalementPublication $m) => ['valeur' => $m->value, 'libelle' => $m->libelle()]),
            'limites' => ['texte_max' => FilGroupeService::TEXTE_MAX, 'par_jour' => FilGroupeService::PAR_JOUR],
        ];
    }

    private function tenter(callable $geste): void
    {
        try {
            $geste();
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }
    }
}
