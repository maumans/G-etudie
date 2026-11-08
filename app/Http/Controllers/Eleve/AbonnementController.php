<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Http\Controllers\Controller;
use App\Models\Abonnement;
use App\Models\Paiement;
use App\Models\User;
use App\Services\AbonnementService;
use App\Services\CodeAccesService;
use App\Services\Paiements\CodeRefuse;
use App\Services\Paiements\Passerelles;
use App\Support\DroitsAbonne;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mon abonnement » (lot 9, PLAN M16) : l'état de l'abonnement, les deux
 * formules, payer par mobile money, utiliser un code prépayé, l'historique.
 * En ligne seulement (niveau C, HORS_LIGNE.md A.2) : hors de la liste
 * blanche, la garde de navigation le dit hors ligne.
 */
class AbonnementController extends Controller
{
    public function __construct(
        private AbonnementService $abonnements,
        private DroitsAbonne $droits,
        private Passerelles $passerelles,
    ) {}

    public function index(Request $request): Response
    {
        $eleve = $request->user();
        $paiements = Paiement::query()->where('user_id', $eleve->id)
            ->orderByDesc('initie_le')->orderByDesc('id')->limit(10)->get();
        $codes = Abonnement::query()->with('user')->where('user_id', $eleve->id)
            ->whereNotNull('code_acces_id')->orderByDesc('created_at')->orderByDesc('id')->limit(10)->get();

        $historique = $paiements->map(fn (Paiement $p) => [
            'cle' => 'p-'.$p->uuid,
            'date' => $p->initie_le->toIso8601ZuluString(),
            'formule' => $p->formule->nom(),
            'moyen' => $p->moyen->libelle(),
            'montant_gnf' => $p->montant_gnf,
            'statut' => $p->statut->value,
            'libelle_statut' => $p->statut->libelle(),
            'paiement' => $p->uuid,
        ])->concat($codes->map(fn (Abonnement $a) => [
            'cle' => 'c-'.$a->id,
            'date' => $a->created_at?->toIso8601ZuluString(),
            'formule' => $a->formule->nom(),
            'moyen' => 'Code prépayé',
            'montant_gnf' => null,
            'statut' => 'reussi',
            'libelle_statut' => 'Activé',
            'paiement' => null,
        ]))->sortByDesc('date')->values()->take(10)->values();

        $etat = $this->abonnements->etat($eleve);

        return Inertia::render('eleve/abonnement', [
            'etat' => $etat,
            'droits' => $this->droits->pourAppareil($eleve),
            'formules' => array_map(fn (FormuleAbonnement $f) => [
                ...$f->pourEcran(),
                'fin_si_paye' => $this->finSiPaye($eleve, $f),
            ], FormuleAbonnement::cases()),
            'avantages' => config('vitrine.tarifs.abonnement'),
            'gratuit' => config('vitrine.tarifs.gratuit'),
            'mobile_money' => $this->passerelles->ouvertes(),
            'numero_verifie' => $eleve->telephoneVerifie(),
            'appareils' => $etat['abonne'] ? $this->droits->appareils($eleve) : null,
            'historique' => $historique,
        ]);
    }

    /** L'écran « Payer » d'une formule : moyen et numéro du payeur. */
    public function payer(Request $request, string $formule): Response|RedirectResponse
    {
        $choisie = FormuleAbonnement::tryFrom($formule) ?? abort(404);
        $eleve = $request->user();

        return Inertia::render('eleve/payer', [
            'formule' => [...$choisie->pourEcran(), 'fin_si_paye' => $this->finSiPaye($eleve, $choisie)],
            'moyens' => array_map(fn (MoyenPaiement $m) => ['cle' => $m->value, 'libelle' => $m->libelle()], MoyenPaiement::cases()),
            'mobile_money' => $this->passerelles->ouvertes(),
            'numero_verifie' => $eleve->telephoneVerifie(),
            'abonne_jusqu_au' => $this->abonnements->finAbonnement($eleve)?->toIso8601ZuluString(),
        ]);
    }

    /** Un code prépayé (route limitée : `throttle:code-acces`). */
    public function code(Request $request, CodeAccesService $codes): RedirectResponse
    {
        $donnees = $request->validate(['code' => ['required', 'string', 'max:40']], [], ['code' => 'code']);

        try {
            $abonnement = $codes->utiliser($request->user(), $donnees['code']);
        } catch (CodeRefuse $refus) {
            throw ValidationException::withMessages(['code' => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Code accepté : ton abonnement '.$abonnement->formule->nom().' court jusqu\'au '.$abonnement->fin->translatedFormat('j F Y').'.']);

        return to_route('eleve.abonnement');
    }

    /** Payer maintenant : jusqu'où irait l'abonnement (à la suite de celui en cours). */
    private function finSiPaye(User $eleve, FormuleAbonnement $formule): string
    {
        $debut = $this->abonnements->finAbonnement($eleve) ?? CarbonImmutable::now();

        return $debut->addMonthsNoOverflow($formule->mois())->toIso8601ZuluString();
    }
}
