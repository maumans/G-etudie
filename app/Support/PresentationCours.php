<?php

namespace App\Support;

use App\Http\Controllers\Eleve\LeconController;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\ProfilEleve;
use Closure;
use Illuminate\Support\Collection;

/**
 * Les props des écrans de cours (matière, leçon, fiche), **une seule
 * fabrique** pour la route en ligne et pour le pack (HORS_LIGNE.md A.4 : le
 * rendu ne dépend pas de la source). Le pack les prend sans rien de
 * personnel (maîtrise, état de lecture vides) ; la route y ajoute ceux de
 * l'élève par les fonctions `$notionPerso` et `$leconPerso`.
 */
class PresentationCours
{
    /** @return array{cle: string, nom: string, slug: string} */
    public static function matiere(Matiere $matiere): array
    {
        return ['cle' => $matiere->teinte->value, 'nom' => $matiere->nom, 'slug' => $matiere->slug];
    }

    /**
     * Les chapitres d'une matière, leurs notions et leurs leçons publiées.
     *
     * @param  (Closure(Notion): array{maitrise: int|null, etat: string|null})|null  $notionPerso
     * @param  (Closure(Lecon): array{etat: string|null, position: int})|null  $leconPerso
     * @param  (Closure(Notion): bool)|null  $garderNotion
     * @return list<array<string, mixed>>
     */
    public static function chapitres(ProfilEleve $profil, Matiere $matiere, ?Closure $notionPerso = null, ?Closure $leconPerso = null, ?Closure $garderNotion = null): array
    {
        $lecons = CatalogueEleve::lecons($profil, $matiere)->with('versionPubliee')->orderBy('id')->get()->groupBy('notion_id');
        $chapitres = CatalogueEleve::chapitres($profil, $matiere)->with('notions')->orderBy('ordre')->get();
        $notionPerso ??= fn (): array => ['maitrise' => null, 'etat' => null];
        $leconPerso ??= fn (): array => ['etat' => null, 'position' => 0];

        return array_values($chapitres->map(fn (Chapitre $chapitre) => [
            'id' => $chapitre->id,
            'titre' => $chapitre->titre,
            'notions' => $chapitre->notions
                ->filter(fn (Notion $notion) => $garderNotion === null || $garderNotion($notion))
                ->map(fn (Notion $notion) => [
                    'id' => $notion->id,
                    'titre' => $notion->titre,
                    ...$notionPerso($notion),
                    'lecons' => ($lecons->get($notion->id) ?? collect())->map(fn (Lecon $lecon) => [
                        'uuid' => $lecon->uuid,
                        'titre' => $lecon->versionPubliee->titre ?? $lecon->titre,
                        'minutes' => BlocsContenu::minutesDeLecture($lecon->versionPubliee->blocs ?? []),
                        ...$leconPerso($lecon),
                    ])->values()->all(),
                ])->values()->all(),
        ])->filter(fn (array $chapitre) => $garderNotion === null || $chapitre['notions'] !== [])->all());
    }

    /**
     * Les leçons d'un chapitre, dans l'ordre des notions.
     *
     * @return Collection<int, Lecon>
     */
    public static function leconsDuChapitre(ProfilEleve $profil, Chapitre $chapitre): Collection
    {
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

    /**
     * Le contexte de navigation d'une leçon (matière, chapitre, voisines) :
     * rien de personnel, il entre dans le pack avec la leçon.
     *
     * @param  Collection<int, Lecon>  $voisines
     * @return array<string, mixed>
     */
    public static function contexteLecon(Lecon $lecon, Collection $voisines): array
    {
        $chapitre = $lecon->notion->chapitre;
        $rang = $voisines->search(fn (Lecon $voisine) => $voisine->id === $lecon->id);
        $lien = fn (Lecon $l): array => ['uuid' => $l->uuid, 'titre' => $l->versionPubliee->titre ?? $l->titre];

        return [
            'matiere' => self::matiere($chapitre->matiere),
            'chapitre' => ['id' => $chapitre->id, 'titre' => $chapitre->titre],
            'notion' => $lecon->notion->titre,
            'rang' => $rang === false ? 1 : $rang + 1,
            'total' => $voisines->count(),
            'precedente' => $rang > 0 ? $lien($voisines[$rang - 1]) : null,
            'suivante' => $rang !== false && $rang + 1 < $voisines->count() ? $lien($voisines[$rang + 1]) : null,
        ];
    }

    /**
     * Les props de la fiche de révision d'un chapitre (`eleve/fiche`).
     *
     * @param  Collection<int, Lecon>  $lecons
     * @return array<string, mixed>
     */
    public static function fiche(Chapitre $chapitre, Collection $lecons): array
    {
        return [
            'chapitre' => ['id' => $chapitre->id, 'titre' => $chapitre->titre],
            'matiere' => self::matiere($chapitre->matiere),
            'lecons' => $lecons->map(fn (Lecon $lecon) => LeconController::contenu($lecon))->values()->all(),
        ];
    }
}
