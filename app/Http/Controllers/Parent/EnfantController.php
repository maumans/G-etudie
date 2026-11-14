<?php

namespace App\Http\Controllers\Parent;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\StatutPaiement;
use App\Http\Controllers\Controller;
use App\Models\LienParent;
use App\Models\Paiement;
use App\Models\User;
use App\Services\AbonnementService;
use App\Services\CodeAccesService;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\LiaisonParentService;
use App\Services\Organisation\SuiviService;
use App\Services\Paiements\CodeRefuse;
use App\Services\Paiements\PaiementRefuse;
use App\Services\Paiements\Passerelles;
use App\Services\PaiementService;
use App\Support\Perimetre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Espace parent (lot 11, PLAN M15) : ses enfants, en lecture seule ; lier
 * un enfant par le code qu'il a donné ; payer son abonnement (lot 9 :
 * « parents payeurs »). Un enfant hors des liens du parent n'existe pas
 * (404, Perimetre::estParentDe).
 */
class EnfantController extends Controller
{
    public function __construct(private SuiviService $suivi) {}

    public function index(Request $request): Response
    {
        $parent = $request->user();
        $enfants = Perimetre::enfants($parent)->orderBy('prenom')->orderBy('users.id')->get();

        return Inertia::render('parent/accueil', [
            'enfants' => $enfants->map(fn (User $enfant) => $this->suivi->enfant($enfant))->values(),
        ]);
    }

    public function show(Request $request, User $enfant): Response
    {
        $this->autoriser($request, $enfant);

        return Inertia::render('parent/enfant', [
            'suivi' => $this->suivi->enfant($enfant),
        ]);
    }

    public function lier(Request $request, LiaisonParentService $liaisons): RedirectResponse
    {
        $donnees = $request->validate(['code' => ['required', 'string', 'max:12']], [], ['code' => 'code']);

        try {
            $lien = $liaisons->lier($request->user(), $donnees['code']);
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vous suivez maintenant '.$lien->eleve->prenom.'.']);

        return to_route('parent.enfants.show', $lien->eleve_id);
    }

    public function delier(Request $request, User $enfant, LiaisonParentService $liaisons): RedirectResponse
    {
        $this->autoriser($request, $enfant);

        $lien = LienParent::query()->actifs()->where('parent_id', $request->user()->id)->where('eleve_id', $enfant->id)->firstOrFail();
        $liaisons->revoquer($request->user(), $lien);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vous ne suivez plus '.$enfant->prenom.'.']);

        return to_route('parent.accueil');
    }

    public function abonnement(Request $request, User $enfant, AbonnementService $abonnements, Passerelles $passerelles): Response
    {
        $this->autoriser($request, $enfant);

        return Inertia::render('parent/abonnement', [
            'enfant' => $this->suivi->identite($enfant),
            'etat' => $abonnements->etat($enfant),
            'formules' => array_map(fn (FormuleAbonnement $f) => $f->pourEcran(), FormuleAbonnement::cases()),
            'avantages' => config('vitrine.tarifs.abonnement'),
            'moyens' => array_map(fn (MoyenPaiement $m) => ['cle' => $m->value, 'libelle' => $m->libelle()], MoyenPaiement::cases()),
            'mobile_money' => $passerelles->ouvertes(),
            'numero_verifie' => $request->user()->telephoneVerifie(),
        ]);
    }

    public function payer(Request $request, User $enfant, PaiementService $paiements): RedirectResponse
    {
        $this->autoriser($request, $enfant);

        $donnees = $request->validate([
            'formule' => ['required', Rule::enum(FormuleAbonnement::class)],
            'moyen' => ['required', Rule::enum(MoyenPaiement::class)],
            'numero' => ['required', 'string', 'max:25'],
        ], [], ['numero' => 'numéro du payeur', 'moyen' => 'moyen de paiement']);

        try {
            $paiement = $paiements->initier(
                $request->user(),
                FormuleAbonnement::from($donnees['formule']),
                MoyenPaiement::from($donnees['moyen']),
                $donnees['numero'],
                $enfant,
            );
        } catch (PaiementRefuse $refus) {
            throw ValidationException::withMessages(['numero' => $refus->getMessage()]);
        }

        return to_route('parent.paiements.show', $paiement);
    }

    public function code(Request $request, User $enfant, CodeAccesService $codes): RedirectResponse
    {
        $this->autoriser($request, $enfant);
        $donnees = $request->validate(['code' => ['required', 'string', 'max:40']], [], ['code' => 'code']);

        try {
            $abonnement = $codes->utiliser($enfant, $donnees['code'], $request->user());
        } catch (CodeRefuse $refus) {
            throw ValidationException::withMessages(['code' => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Code accepté : l\'abonnement de '.$enfant->prenom.' court jusqu\'au '.$abonnement->fin->translatedFormat('j F Y').'.']);

        return to_route('parent.enfants.show', $enfant);
    }

    /** Le paiement lancé par ce parent ; l'écran se relit tant qu'il attend. */
    public function paiement(Request $request, Paiement $paiement, AbonnementService $abonnements): Response
    {
        abort_unless($paiement->user_id === $request->user()->id && $paiement->beneficiaire_id !== null, 404);

        return Inertia::render('parent/paiement', [
            'paiement' => function () use ($paiement, $abonnements) {
                $paiement->refresh()->load('beneficiaire');

                return [
                    'uuid' => $paiement->uuid,
                    'statut' => $paiement->statut->value,
                    'formule' => $paiement->formule->pourEcran(),
                    'moyen' => ['cle' => $paiement->moyen->value, 'libelle' => $paiement->moyen->libelle()],
                    'consigne' => $paiement->moyen->consigne(),
                    'montant_gnf' => $paiement->montant_gnf,
                    'numero' => $paiement->numeroMasque(),
                    'reference' => $paiement->reference_operateur,
                    'motif' => $paiement->motif_echec,
                    'expire_le' => $paiement->expire_le->toIso8601ZuluString(),
                    'url_paiement' => $paiement->statut === StatutPaiement::EnAttente ? $paiement->url_paiement : null,
                    'simule' => $paiement->passerelle === 'simulee',
                    'enfant' => $this->suivi->identite($paiement->eleveAbonne()),
                    'fin_abonnement' => $paiement->statut === StatutPaiement::Reussi
                        ? $abonnements->finAbonnement($paiement->eleveAbonne())?->toIso8601ZuluString()
                        : null,
                ];
            },
        ]);
    }

    private function autoriser(Request $request, User $enfant): void
    {
        abort_unless(Perimetre::estParentDe($request->user(), $enfant), 404);
    }
}
