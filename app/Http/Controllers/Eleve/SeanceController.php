<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Services\SeanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Séance du jour (PLAN M5, version minimale du lot 2) : « Commencer »
 * reprend la séance en cours ou en prépare une ; l'écran est le lecteur
 * d'exercice (« l'ardoise », DESIGN.md § 6.4). Les réponses partent par la
 * file d'opérations (`tentative.enregistrer`), jamais par une route.
 */
class SeanceController extends Controller
{
    public function commencer(Request $request, SeanceService $seances): RedirectResponse
    {
        $seance = $seances->commencer($request->user());

        if ($seance === null) {
            Inertia::flash('toast', ['type' => 'info', 'message' => 'Pas encore de questions pour ton examen : elles arrivent bientôt.']);

            return to_route('eleve.accueil');
        }

        return to_route('eleve.seances.show', $seance);
    }

    public function show(Request $request, Seance $seance, SeanceService $seances): Response
    {
        // Une séance d'un autre élève n'existe pas (404, pas 403).
        abort_unless($seance->user_id === $request->user()->id, 404);

        $uuids = Question::query()->whereKey($seance->questions)->pluck('uuid', 'id');

        return Inertia::render('eleve/seance', [
            'seance' => [
                'uuid' => $seance->uuid,
                'duree_minutes' => $seance->duree_minutes,
                'terminee' => $seance->termine_le !== null,
            ],
            'questions' => $seances->questionsDe($seance),
            // Réponses déjà reçues par le serveur : la séance reprend là où
            // l'élève l'a laissée (les réponses encore en file sont lues sur
            // l'appareil).
            'reponses' => Tentative::query()
                ->where('seance_id', $seance->id)
                ->orderBy('saisi_le')
                ->get()
                ->map(fn (Tentative $tentative) => [
                    'question' => $uuids->get($tentative->question_id),
                    'option' => $tentative->reponse['option'] ?? null,
                    'correcte' => $tentative->correcte,
                ])
                ->values(),
        ]);
    }
}
