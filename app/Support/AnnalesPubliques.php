<?php

namespace App\Support;

use App\Enums\CodeExamen;
use App\Enums\TypeSujet;
use App\Models\Sujet;
use Illuminate\Database\Eloquent\Builder;

/**
 * Les annales visibles **sans compte** (lot 8, PLAN M1 « SEO ») — seule
 * autorité : la liste `/sujets`, la page `/sujets/{slug}`, le plan du site
 * et l'image de partage passent tous par ici.
 *
 * Un sujet est public s'il est en ligne (CatalogueEleve::sujetEnLigne) **et**
 *  - c'est une annale officielle dont l'autorisation de publier est saisie
 *    (champ « Droits de publication », D5 : rien de public pendant le test
 *    fermé, décision de Maurice du 2026-11-06) ;
 *  - ou c'est un sujet maison, écrit par l'équipe ;
 *  - ou c'est un sujet d'exemple (développement) : visible avec le bandeau
 *    « EXEMPLE », mais **jamais indexé** ni dans le plan du site.
 *
 * La page publique montre l'énoncé ; **la réponse, les indices et le
 * corrigé n'en sortent jamais** (réservés aux inscrits, M1).
 */
class AnnalesPubliques
{
    /** @return Builder<Sujet> */
    public static function requete(): Builder
    {
        return CatalogueEleve::sujetEnLigne(Sujet::query())
            ->whereNotNull('slug')
            ->where(fn (Builder $q) => $q
                ->where('est_exemple', true)
                ->orWhere('type', TypeSujet::BlancMaison->value)
                ->orWhere(fn (Builder $o) => $o
                    ->where('type', TypeSujet::Officiel->value)
                    ->whereNotNull('droits')
                    ->where('droits', '!=', '')));
    }

    /** @return Builder<Sujet> les sujets que les moteurs de recherche peuvent indexer */
    public static function indexables(): Builder
    {
        return self::requete()->where('est_exemple', false);
    }

    public static function trouver(string $slug): ?Sujet
    {
        return self::requete()->with(['examen', 'serie', 'matiere', 'versionPubliee'])->where('slug', $slug)->first();
    }

    public static function indexable(Sujet $sujet): bool
    {
        return ! $sujet->est_exemple;
    }

    /**
     * La page publique : l'objet de contenu de l'élève (PresentationSujet),
     * **amputé** de ce qui est réservé aux inscrits.
     *
     * @return array<string, mixed>|null
     */
    public static function presenter(Sujet $sujet): ?array
    {
        $contenu = PresentationSujet::publiee($sujet);

        if ($contenu === null) {
            return null;
        }

        unset($contenu['document']);

        $contenu['parties'] = array_map(fn (array $partie) => [
            ...$partie,
            'questions' => array_map(self::enonceSeul(...), $partie['questions']),
        ], $contenu['parties']);

        return [...$contenu, 'slug' => $sujet->slug, 'examen_nom' => $sujet->examen->code->nom()];
    }

    /**
     * Une question sans sa réponse : ni `attendue`, ni indices, ni corrigé,
     * ni barème (le barème d'une question ouverte dit ce qu'il fallait écrire).
     *
     * @param  array<string, mixed>  $question
     * @return array<string, mixed>
     */
    private static function enonceSeul(array $question): array
    {
        $donnees = (array) $question['donnees'];
        unset($donnees['bareme']);

        return [
            'uuid' => $question['uuid'],
            'type' => $question['type'],
            'enonce' => $question['enonce'],
            'donnees' => (object) $donnees,
            'corrige_etapes' => count($question['corrige']),
        ];
    }

    /**
     * Une ligne de liste (vitrine, `/sujets`).
     *
     * @return array<string, mixed>
     */
    public static function carte(Sujet $sujet): array
    {
        return [
            'slug' => $sujet->slug,
            'titre' => $sujet->titre,
            'libelle_session' => $sujet->libelleSession(),
            'session' => $sujet->session,
            'examen' => $sujet->examen->code->value,
            'serie' => $sujet->serie?->code->value,
            'origine' => $sujet->type->value,
            'matiere' => ['cle' => $sujet->matiere->teinte->value, 'nom' => $sujet->matiere->nom],
            'questions' => (int) ($sujet->getAttribute('questions_count') ?? 0),
            'est_exemple' => $sujet->est_exemple,
        ];
    }

    /**
     * « Sujet de Mathématiques, BEPC 2024 » : le titre que tape un élève
     * dans Google (« sujet bepc 2024 maths »).
     */
    public static function titre(Sujet $sujet): string
    {
        return "Sujet de {$sujet->matiere->nom}, {$sujet->libelleSession()}";
    }

    public static function description(Sujet $sujet): string
    {
        $examen = $sujet->examen->code === CodeExamen::Bac
            ? 'Baccalauréat unique'.($sujet->serie ? ' série '.$sujet->serie->code->value : '')
            : $sujet->examen->code->value;

        return "L'énoncé complet du sujet de {$sujet->matiere->nom} du {$examen} {$sujet->session}, "
            .'et son corrigé pas à pas pour les inscrits. Gratuit, sur N’karamögö.';
    }
}
