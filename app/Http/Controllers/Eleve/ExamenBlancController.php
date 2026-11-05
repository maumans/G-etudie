<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\ExamenBlanc;
use App\Models\VersionContenu;
use App\Support\CatalogueEleve;
use App\Support\PresentationSujet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mes examens blancs » (PLAN M7) : l'historique (avec ce qui attend encore
 * d'être envoyé, lu sur l'appareil par l'écran) et le résultat d'un examen
 * — note sur 20 du serveur, détail par partie, verdict au regard de la
 * moyenne d'admission **si l'équipe l'a saisie**, comparaison avec les
 * précédents de la même matière, corrigé.
 */
class ExamenBlancController extends Controller
{
    public function index(Request $request): Response
    {
        $profil = CatalogueEleve::profil($request->user()) ?? abort(404);
        $examens = ExamenBlanc::query()
            ->with(['sujet.matiere', 'sujet.examen', 'sujet.serie'])
            ->where('user_id', $request->user()->id)
            ->latest('termine_le')
            ->limit(50)
            ->get();

        return Inertia::render('eleve/examens-blancs', [
            'examen' => $profil->libelleExamen(),
            'moyenne_admission' => $this->seuil($profil->examen->moyenne_admission),
            'examens' => $examens->map(fn (ExamenBlanc $e) => $this->resume($e))->values(),
            'annales_disponibles' => CatalogueEleve::sujets($profil)->count(),
        ]);
    }

    public function show(Request $request, ExamenBlanc $examen): Response
    {
        Gate::authorize('voir', $examen);

        $examen->load(['sujet.matiere', 'sujet.examen', 'sujet.serie']);
        $sujet = $examen->sujet;

        /** @var VersionContenu|null $version */
        $version = $sujet->versions()->where('numero', $examen->version)->first();
        $seuil = $this->seuil($sujet->examen->moyenne_admission);
        $note = (float) $examen->note_sur_20;

        $precedents = ExamenBlanc::query()
            ->where('user_id', $examen->user_id)
            ->whereKeyNot($examen->id)
            ->whereHas('sujet', fn ($q) => $q->where('matiere_id', $sujet->matiere_id))
            ->where('termine_le', '<', $examen->termine_le)
            ->latest('termine_le')
            ->limit(5)
            ->get(['uuid', 'note_sur_20', 'termine_le']);

        return Inertia::render('eleve/examen-blanc', [
            'examen' => [
                ...$this->resume($examen),
                'note_appareil' => $examen->note_appareil === null ? null : (float) $examen->note_appareil,
                'motif_horloge' => $examen->motif_horloge,
                'origine_duree' => $examen->origine_duree,
                'commence_le' => $examen->commence_le->toIso8601String(),
                'parties' => $examen->details['parties'] ?? [],
            ],
            // La version passée, avec ses corrigés (le serveur la garde).
            'sujet' => $version === null ? null : PresentationSujet::depuisVersion($sujet, $version),
            'verdict' => $seuil === null ? null : ['seuil' => $seuil, 'au_dessus' => $note >= $seuil],
            'precedents' => $precedents->map(fn (ExamenBlanc $p) => [
                'uuid' => $p->uuid,
                'note' => (float) $p->note_sur_20,
                'termine_le' => $p->termine_le->toIso8601String(),
            ])->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resume(ExamenBlanc $examen): array
    {
        $sujet = $examen->sujet;

        return [
            'uuid' => $examen->uuid,
            'note' => (float) $examen->note_sur_20,
            'termine_le' => $examen->termine_le->toIso8601String(),
            'duree_minutes' => $examen->duree_minutes,
            'minutes_passees' => (int) min($examen->duree_minutes, max(0, round($examen->commence_le->diffInMinutes($examen->termine_le)))),
            'temps_ecoule' => $examen->temps_ecoule,
            'horloge_suspecte' => $examen->horloge_suspecte,
            'est_exemple' => $sujet->est_exemple,
            'sujet' => [
                'uuid' => $sujet->uuid,
                'titre' => $sujet->titre,
                'libelle_session' => $sujet->libelleSession(),
                'matiere' => ['cle' => $sujet->matiere->teinte->value, 'nom' => $sujet->matiere->nom],
            ],
        ];
    }

    private function seuil(?string $moyenne): ?float
    {
        return $moyenne === null ? null : (float) $moyenne;
    }
}
