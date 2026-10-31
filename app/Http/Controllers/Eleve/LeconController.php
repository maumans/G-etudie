<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\ProgressionLecon;
use App\Support\BlocsContenu;
use App\Support\CatalogueEleve;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lecture d'une leçon (PLAN M4) et fiche de révision d'un chapitre.
 *
 * L'écran reçoit un **objet de contenu** (`lecon` : la version publiée et
 * ses blocs) séparé de son contexte de navigation : le même objet viendra
 * d'un pack hors ligne (HORS_LIGNE.md A.4, `lib/contenu/source.ts`), et
 * l'écran ne sait pas d'où il vient. Gardé par LeconPolicy::lire (404).
 */
class LeconController extends Controller
{
    public function show(Request $request, Lecon $lecon): Response
    {
        Gate::authorize('lire', $lecon);

        $lecon->load(['versionPubliee', 'notion.chapitre.matiere']);
        $chapitre = $lecon->notion->chapitre;
        $voisines = $this->leconsDuChapitre($request, $chapitre);
        $rang = $voisines->search(fn (Lecon $voisine) => $voisine->id === $lecon->id);
        $progression = ProgressionLecon::query()->where('user_id', $request->user()->id)->where('lecon_id', $lecon->id)->first();

        return Inertia::render('eleve/lecon', [
            'lecon' => self::contenu($lecon),
            'contexte' => [
                'matiere' => [
                    'cle' => $chapitre->matiere->teinte->value,
                    'nom' => $chapitre->matiere->nom,
                    'slug' => $chapitre->matiere->slug,
                ],
                'chapitre' => ['id' => $chapitre->id, 'titre' => $chapitre->titre],
                'notion' => $lecon->notion->titre,
                'rang' => $rang === false ? 1 : $rang + 1,
                'total' => $voisines->count(),
                'precedente' => $rang > 0 ? self::lien($voisines[$rang - 1]) : null,
                'suivante' => $rang !== false && $rang + 1 < $voisines->count() ? self::lien($voisines[$rang + 1]) : null,
            ],
            'progression' => [
                'etat' => $progression?->etat?->value,
                'position' => $progression->position ?? 0,
            ],
        ]);
    }

    public function fiche(Request $request, Chapitre $chapitre): Response
    {
        abort_unless(CatalogueEleve::peutVoirChapitre($request->user(), $chapitre), 404);

        $chapitre->load('matiere');
        $lecons = $this->leconsDuChapitre($request, $chapitre);

        return Inertia::render('eleve/fiche', [
            'chapitre' => ['id' => $chapitre->id, 'titre' => $chapitre->titre],
            'matiere' => [
                'cle' => $chapitre->matiere->teinte->value,
                'nom' => $chapitre->matiere->nom,
                'slug' => $chapitre->matiere->slug,
            ],
            'lecons' => $lecons->map(fn (Lecon $lecon) => self::contenu($lecon))->values(),
        ]);
    }

    /**
     * L'objet de contenu d'une leçon : ce qu'un pack contiendra aussi.
     *
     * @return array<string, mixed>
     */
    public static function contenu(Lecon $lecon): array
    {
        $version = $lecon->versionPubliee;

        return [
            'type' => 'lecon',
            'uuid' => $lecon->uuid,
            'version' => $version->numero ?? 0,
            'titre' => $version->titre ?? $lecon->titre,
            'blocs' => $version->blocs ?? BlocsContenu::vide(),
            'minutes' => BlocsContenu::minutesDeLecture($version->blocs ?? []),
            'est_exemple' => $lecon->est_exemple,
        ];
    }

    /** @return array{uuid: string, titre: string} */
    private static function lien(Lecon $lecon): array
    {
        return ['uuid' => $lecon->uuid, 'titre' => $lecon->versionPubliee->titre ?? $lecon->titre];
    }

    /** @return Collection<int, Lecon> */
    private function leconsDuChapitre(Request $request, Chapitre $chapitre): Collection
    {
        $profil = CatalogueEleve::profil($request->user()) ?? abort(404);

        return CatalogueEleve::lecons($profil)
            ->with(['versionPubliee', 'notion'])
            ->whereHas('notion', fn ($notion) => $notion->where('chapitre_id', $chapitre->id))
            ->get()
            ->sortBy([
                fn (Lecon $a, Lecon $b) => $a->notion->ordre <=> $b->notion->ordre,
                fn (Lecon $a, Lecon $b) => $a->id <=> $b->id,
            ])
            ->values();
    }
}
