<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\CodeExamen;
use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\ProfilEleve;
use App\Models\Serie;
use App\Services\ProfilEleveService;
use App\Services\SeanceService;
use App\Support\CatalogueEleve;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Parcours d'accueil (PLAN M2) : examen → série (Bac) → établissement
 * (seulement si la liste existe) → objectif du soir, puis **un premier
 * exercice tout de suite**. Le même écran sert ensuite à changer d'examen
 * (« Moi › Mon examen ») ; il ne relance alors pas de séance.
 */
class ParcoursAccueilController extends Controller
{
    public function edit(Request $request): Response
    {
        $profil = CatalogueEleve::profil($request->user());

        return Inertia::render('eleve/bienvenue', [
            'examens' => Examen::query()->with('series')->orderBy('ordre')->get()->map(fn (Examen $examen) => [
                'id' => $examen->id,
                'code' => $examen->code->value,
                'court' => $examen->code === CodeExamen::Bac ? 'Bac' : $examen->code->value,
                'nom' => $examen->nom,
                'series' => $examen->series->sortBy('code')->values()->map(fn (Serie $serie) => [
                    'id' => $serie->id,
                    'code' => $serie->code->value,
                    'nom' => $serie->nom,
                ]),
            ]),
            'etablissements' => Etablissement::query()->orderBy('nom')->limit(500)->get(['id', 'nom', 'commune'])
                ->map(fn (Etablissement $etablissement) => [
                    'id' => $etablissement->id,
                    'nom' => $etablissement->nom,
                    'commune' => $etablissement->commune,
                ]),
            'objectifs' => array_map(fn (int $minutes) => [
                'minutes' => $minutes,
                'questions' => SeanceService::nombreDeQuestions($minutes),
            ], ProfilEleve::OBJECTIFS),
            'profil' => $profil === null ? null : [
                'examen_id' => $profil->examen_id,
                'serie_id' => $profil->serie_id,
                'etablissement_id' => $profil->etablissement_id,
                'objectif_minutes' => $profil->objectif_minutes,
            ],
        ]);
    }

    public function update(Request $request, ProfilEleveService $profils, SeanceService $seances): RedirectResponse
    {
        $donnees = $request->validate([
            'examen' => ['required', 'integer'],
            'serie' => ['nullable', 'integer'],
            'etablissement' => ['nullable', 'integer'],
            'objectif' => ['required', 'integer', Rule::in(ProfilEleve::OBJECTIFS)],
        ], [
            'examen.required' => 'Choisis ton examen.',
            'objectif.required' => 'Choisis ton objectif du soir.',
            'objectif.in' => 'Choisis 10, 15 ou 30 minutes.',
        ]);

        $premiereFois = $request->user()->profilEleve()->doesntExist();

        $profils->enregistrer(
            $request->user(),
            (int) $donnees['examen'],
            isset($donnees['serie']) ? (int) $donnees['serie'] : null,
            isset($donnees['etablissement']) ? (int) $donnees['etablissement'] : null,
            (int) $donnees['objectif'],
        );

        if (! $premiereFois) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Ton examen est enregistré.']);

            return to_route('eleve.accueil');
        }

        // Premier exercice tout de suite, pas un tableau vide (PLAN M2).
        $seance = $seances->commencer($request->user());

        return $seance !== null
            ? to_route('eleve.seances.show', $seance)
            : to_route('eleve.accueil');
    }
}
