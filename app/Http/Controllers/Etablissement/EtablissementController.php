<?php

namespace App\Http\Controllers\Etablissement;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Abonnement;
use App\Models\Etablissement;
use App\Models\Groupe;
use App\Models\LicenceEtablissement;
use App\Models\MembreGroupe;
use App\Models\RattachementEtablissement;
use App\Models\User;
use App\Services\Organisation\EtablissementService;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\SuiviService;
use App\Support\Perimetre;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Espace établissement (lot 11, PLAN M14, décision 3) : le rapport de
 * préparation par groupe, les enseignants rattachés, les licences et leurs
 * places. Le gestionnaire ne voit que **son** établissement (Perimetre) ;
 * un groupe, une licence ou un rattachement d'un autre n'existe pas (404).
 */
class EtablissementController extends Controller
{
    public function __construct(
        private EtablissementService $etablissements,
        private SuiviService $suivi,
    ) {}

    public function index(Request $request): Response
    {
        $etablissement = Perimetre::etablissementsGeres($request->user())->orderBy('nom')->orderBy('id')->first();

        if ($etablissement === null) {
            // Compte ouvert, pas encore rattaché : un état vide qui dit quoi faire.
            return Inertia::render('etablissement/accueil', [
                'etablissement' => null,
                'groupes' => [],
                'resume' => null,
                'licences' => [],
                'enseignants' => [],
                'mot_de_passe_provisoire' => null,
            ]);
        }

        return Inertia::render('etablissement/accueil', [
            ...$this->suivi->etablissement($etablissement),
            'enseignants' => $etablissement->rattachements()->actifs()
                ->where('role', Role::Enseignant->value)
                ->with('user')
                ->orderBy('rattache_le')
                ->orderBy('id')
                ->get()
                ->map(fn (RattachementEtablissement $r) => [
                    'id' => $r->id,
                    'prenom' => $r->user->prenom,
                    'pseudo' => $r->user->pseudo,
                    'groupes' => Groupe::query()->ouverts()->where('etablissement_id', $etablissement->id)->where('enseignant_id', $r->user_id)->count(),
                    'rattache_le' => $r->rattache_le->toIso8601ZuluString(),
                ])->values(),
            'mot_de_passe_provisoire' => $request->session()->get('mot_de_passe_provisoire'),
        ]);
    }

    public function groupe(Request $request, Groupe $groupe): Response
    {
        $etablissement = $this->sien($request);
        abort_unless($groupe->etablissement_id === $etablissement->id && Perimetre::peutConsulterGroupe($request->user(), $groupe), 404);

        return Inertia::render('etablissement/groupe', [
            'suivi' => $this->suivi->groupe($groupe),
            'etablissement' => ['nom' => $etablissement->nom],
        ]);
    }

    public function licences(Request $request): Response
    {
        $etablissement = $this->sien($request);
        $licences = $etablissement->licences()->orderByDesc('fin')->orderByDesc('id')->get();
        $courante = $licences->first(fn (LicenceEtablissement $l) => $l->debut->isPast() && $l->fin->isFuture());
        $eleves = User::query()
            ->whereIn('users.id', MembreGroupe::query()->actifs()
                ->whereIn('groupe_id', $etablissement->groupes()->ouverts()->select('id'))
                ->select('eleve_id'))
            ->orderBy('prenom')
            ->orderBy('users.id')
            ->get();
        $places = $courante === null ? collect() : Abonnement::query()
            ->where('licence_id', $courante->id)
            ->where('fin', '>', CarbonImmutable::now())
            ->pluck('user_id')
            ->flip();
        $groupesDe = MembreGroupe::query()->actifs()
            ->whereIn('eleve_id', $eleves->modelKeys())
            ->whereHas('groupe', fn ($g) => $g->ouverts()->where('etablissement_id', $etablissement->id))
            ->with('groupe:id,nom')
            ->get()
            ->groupBy('eleve_id');

        return Inertia::render('etablissement/licences', [
            'etablissement' => ['nom' => $etablissement->nom, 'est_exemple' => $etablissement->est_exemple],
            'licences' => $licences->map(fn (LicenceEtablissement $l) => $this->suivi->resumeLicence($l))->values(),
            'courante' => $courante?->id,
            'eleves' => $eleves->map(fn (User $eleve) => [
                ...$this->suivi->identite($eleve),
                'groupes' => ($groupesDe->get($eleve->id) ?? collect())->map(fn (MembreGroupe $m) => $m->groupe->nom)->values(),
                'a_une_place' => $places->has($eleve->id),
            ])->values(),
        ]);
    }

    public function attribuer(Request $request, LicenceEtablissement $licence): RedirectResponse
    {
        $this->licenceSienne($request, $licence);
        $donnees = $request->validate(['eleve' => ['required', 'integer']]);
        $eleve = User::query()->whereKey((int) $donnees['eleve'])->firstOrFail();

        try {
            $this->etablissements->attribuer($request->user(), $licence, $eleve);
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $eleve->prenom.' a une place : abonné jusqu\'au '.$licence->fin->translatedFormat('j F Y').'.']);

        return back();
    }

    public function reprendre(Request $request, LicenceEtablissement $licence, User $eleve): RedirectResponse
    {
        $this->licenceSienne($request, $licence);
        $this->etablissements->reprendre($request->user(), $licence, $eleve);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Place reprise : elle est de nouveau libre.']);

        return back();
    }

    public function rattacher(Request $request): RedirectResponse
    {
        $etablissement = $this->sien($request);
        $donnees = $request->validate([
            'prenom' => ['required', 'string', 'max:60'],
            'telephone' => ['required', 'string', 'max:25'],
        ], [], ['telephone' => 'numéro']);

        try {
            $resultat = $this->etablissements->rattacher($request->user(), $etablissement, Role::Enseignant, $donnees['telephone'], $donnees['prenom']);
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        if ($resultat['mot_de_passe'] !== null) {
            // Montré une fois, sur l'écran qui suit : jamais dans un toast qui reste à l'écran.
            $request->session()->flash('mot_de_passe_provisoire', [
                'prenom' => $resultat['user']->prenom,
                'mot_de_passe' => $resultat['mot_de_passe'],
            ]);
        } else {
            Inertia::flash('toast', ['type' => 'success', 'message' => $resultat['user']->prenom.' est rattaché(e) à l\'établissement.']);
        }

        return to_route('etablissement.accueil');
    }

    public function retirer(Request $request, RattachementEtablissement $rattachement): RedirectResponse
    {
        $etablissement = $this->sien($request);
        abort_unless($rattachement->etablissement_id === $etablissement->id && $rattachement->role === Role::Enseignant, 404);

        $this->etablissements->retirer($request->user(), $rattachement);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Enseignant retiré de l\'établissement. Ses groupes restent les siens.']);

        return back();
    }

    /** L'établissement du gestionnaire (le premier, s'il en gère plusieurs). */
    private function sien(Request $request): Etablissement
    {
        return Perimetre::etablissementsGeres($request->user())->orderBy('nom')->orderBy('id')->first() ?? abort(404);
    }

    private function licenceSienne(Request $request, LicenceEtablissement $licence): void
    {
        abort_unless(Perimetre::peutGererEtablissement($request->user(), $licence->etablissement), 404);
    }
}
