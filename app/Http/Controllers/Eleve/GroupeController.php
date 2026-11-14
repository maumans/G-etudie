<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\Devoir;
use App\Models\Groupe;
use App\Models\Seance;
use App\Services\Organisation\DevoirService;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\GroupeService;
use App\Support\Perimetre;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mes groupes » (lot 11) : rejoindre le groupe de son enseignant par son
 * code, voir ses devoirs (à faire, commencés, rendus), quitter. En ligne
 * seulement (niveau C). L'élève voit le nom du groupe et de l'enseignant,
 * **jamais les autres élèves** (décision 5).
 */
class GroupeController extends Controller
{
    public function __construct(
        private GroupeService $groupes,
        private DevoirService $devoirs,
    ) {}

    public function index(Request $request): Response
    {
        $eleve = $request->user();
        $groupes = Perimetre::groupesConsultables($eleve)->with(['enseignant', 'examen', 'serie', 'etablissement'])->orderBy('nom')->orderBy('id')->get();
        $devoirs = Devoir::query()
            ->whereIn('groupe_id', $groupes->modelKeys())
            ->withCount('questions')
            ->orderBy('echeance_le')
            ->orderBy('id')
            ->get();
        $seances = Seance::query()->where('user_id', $eleve->id)->whereIn('devoir_id', $devoirs->modelKeys())->get()->keyBy('devoir_id');
        $etats = [];

        foreach ($devoirs as $devoir) {
            $etats[$devoir->id] = $this->devoirs->etats($devoir, collect([$eleve]))[$eleve->id];
        }

        return Inertia::render('eleve/groupes', [
            'groupes' => $groupes->map(fn (Groupe $groupe) => [
                'id' => $groupe->id,
                'nom' => $groupe->nom,
                'enseignant' => $groupe->enseignant->prenom,
                'etablissement' => $groupe->etablissement?->nom,
                'examen' => $groupe->libelleExamen(),
                'archive' => $groupe->archive_le !== null,
                'est_exemple' => $groupe->est_exemple,
            ])->values(),
            'devoirs' => array_values(array_map(fn (Devoir $devoir): array => array_merge([
                'id' => $devoir->id,
                'groupe_id' => $devoir->groupe_id,
                'titre' => $devoir->titre,
                'consigne' => $devoir->consigne,
                'echeance_le' => $devoir->echeance_le->toIso8601ZuluString(),
                'questions' => (int) $devoir->questions_count,
                'seance' => $seances->get($devoir->id)?->uuid,
                'est_exemple' => $devoir->est_exemple,
            ], $etats[$devoir->id]), $devoirs->all())),
            'aujourdhui' => CarbonImmutable::now()->toIso8601ZuluString(),
        ]);
    }

    public function rejoindre(Request $request): RedirectResponse
    {
        $donnees = $request->validate(['code' => ['required', 'string', 'max:16']], [], ['code' => 'code du groupe']);

        try {
            $groupe = $this->groupes->rejoindre($request->user(), $donnees['code']);
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tu as rejoint « '.$groupe->nom.' ».']);

        return to_route('eleve.groupes.index');
    }

    public function quitter(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('voir', $groupe);
        $this->groupes->quitter($request->user(), $groupe);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tu as quitté « '.$groupe->nom.' ».']);

        return to_route('eleve.groupes.index');
    }
}
