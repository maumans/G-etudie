<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\CibleSignalement;
use App\Http\Controllers\Controller;
use App\Models\Lecon;
use App\Models\Question;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Services\SignalementService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mes signalements » (PLAN M5) : ce que l'élève a signalé et la réponse de
 * l'équipe. L'ouvrir marque les réponses comme lues (la pastille de
 * l'accueil s'éteint). Bornée au compte de l'élève : aucune fiche par
 * identifiant, donc rien à garder de plus.
 */
class SignalementController extends Controller
{
    public function index(Request $request, SignalementService $signalements): Response
    {
        $eleve = $request->user();
        $liste = Signalement::query()->where('user_id', $eleve->id)->latest('saisi_le')->limit(50)->get();
        $nonLues = $liste->filter(fn (Signalement $s) => $s->traite_le !== null && $s->reponse_vue_le === null)->pluck('id');

        $titres = $liste->groupBy(fn (Signalement $s) => $s->cible_type->value)
            ->map(fn ($groupe, string $type) => CibleSignalement::from($type)->modele()::query()
                ->whereKey($groupe->pluck('cible_id'))->get()->keyBy('id'));

        $signalements->marquerLues($eleve);

        return Inertia::render('eleve/signalements', [
            'signalements' => $liste->map(fn (Signalement $s) => [
                'uuid' => $s->uuid,
                'cible' => $s->cible_type->libelle(),
                'titre' => self::titre($titres[$s->cible_type->value][$s->cible_id] ?? null),
                'motif' => $s->motif->libelle(),
                'message' => $s->message,
                'statut' => $s->statut->value,
                'statut_libelle' => $s->statut->libelle(),
                'reponse' => $s->reponse,
                'nouvelle' => $nonLues->contains($s->id),
                'saisi_le' => $s->saisi_le->toIso8601String(),
                'traite_le' => $s->traite_le?->toIso8601String(),
            ])->values(),
        ]);
    }

    private static function titre(?Model $cible): string
    {
        return match (true) {
            $cible instanceof Question => $cible->extrait !== '' ? $cible->extrait : 'Une question',
            $cible instanceof Lecon, $cible instanceof Sujet => $cible->titre,
            default => 'Contenu retiré',
        };
    }
}
