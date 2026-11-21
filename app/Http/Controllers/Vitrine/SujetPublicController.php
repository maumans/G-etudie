<?php

namespace App\Http\Controllers\Vitrine;

use App\Enums\CodeExamen;
use App\Http\Controllers\Controller;
use App\Models\Matiere;
use App\Models\Sujet;
use App\Support\AnnalesPubliques;
use App\Support\Seo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Les sujets publics (lot 8, PLAN M1 « SEO ») : une page par sujet, ce
 * que les élèves tapent dans Google (« sujet bac sm 2019 maths »). L'énoncé
 * est visible ; le corrigé est réservé aux inscrits. Qui est public : seule
 * AnnalesPubliques en décide (D5).
 */
class SujetPublicController extends Controller
{
    private const PAR_PAGE = 24;

    /** Les filtres d'examen : `bepc`, `bac-se`… */
    private const EXAMENS = [
        'cee' => [CodeExamen::Cee, null],
        'bepc' => [CodeExamen::Bepc, null],
        'bac-sm' => [CodeExamen::Bac, 'SM'],
        'bac-se' => [CodeExamen::Bac, 'SE'],
        'bac-ss' => [CodeExamen::Bac, 'SS'],
    ];

    public function index(Request $request): Response
    {
        $examen = $request->string('examen')->toString();
        $examen = array_key_exists($examen, self::EXAMENS) ? $examen : null;
        $matieres = Matiere::query()->whereIn('id', AnnalesPubliques::requete()->select('matiere_id'))->orderBy('ordre')->get();
        $matiere = $matieres->firstWhere('slug', $request->string('matiere')->toString());

        $page = self::filtrer(AnnalesPubliques::requete(), $examen)
            ->when($matiere, fn (Builder $q, Matiere $m) => $q->where('matiere_id', $m->id))
            ->with(['examen', 'serie', 'matiere'])
            ->withCount(['questions' => fn (Builder $q) => $q->whereNotNull('questions.version_publiee_id')])
            ->orderByDesc('session')->orderBy('matiere_id')->orderBy('id')
            ->paginate(self::PAR_PAGE)->withQueryString();

        $exemples = collect($page->items())->contains('est_exemple', true);

        $reponse = Inertia::render('vitrine/sujets', [
            'filtres' => ['examen' => $examen, 'matiere' => $matiere?->slug],
            'examens' => collect(self::EXAMENS)->map(fn (array $e, string $cle) => [
                'cle' => $cle,
                'libelle' => $e[0] === CodeExamen::Bac ? "Bac {$e[1]}" : $e[0]->value,
                'sujets' => self::filtrer(AnnalesPubliques::requete(), $cle)->count(),
            ])->values(),
            'matieres' => $matieres->map(fn (Matiere $m) => ['slug' => $m->slug, 'nom' => $m->nom, 'cle' => $m->teinte->value])->values(),
            'sujets' => [
                'donnees' => collect($page->items())->map(AnnalesPubliques::carte(...))->values(),
                'page' => $page->currentPage(),
                'derniere' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'est_exemple' => $exemples,
        ]);

        return Seo::appliquer($reponse, Seo::page(
            titre: 'Sujets corrigés du CEE, du BEPC et du Bac',
            description: 'Les sujets du CEE, du BEPC et du Baccalauréat unique (SM, SE, SS) depuis 2010, par matière et par année : l’énoncé en clair, le corrigé pas à pas pour les inscrits.',
            // Une page filtrée reste la même liste : une seule adresse canonique par filtre.
            canonique: route('vitrine.sujets.index', array_filter(['examen' => $examen, 'matiere' => $matiere?->slug])),
            indexer: ! $exemples && $page->currentPage() === 1,
        ));
    }

    public function show(string $slug): Response
    {
        $sujet = AnnalesPubliques::trouver($slug) ?? abort(404);
        $contenu = AnnalesPubliques::presenter($sujet) ?? abort(404);
        $titre = AnnalesPubliques::titre($sujet);
        $adresse = route('vitrine.sujets.show', $sujet->slug);

        $reponse = Inertia::render('vitrine/sujet', [
            'sujet' => $contenu,
            'autres' => AnnalesPubliques::requete()
                ->with(['examen', 'serie', 'matiere'])
                ->withCount(['questions' => fn (Builder $q) => $q->whereNotNull('questions.version_publiee_id')])
                ->where('matiere_id', $sujet->matiere_id)
                ->where('examen_id', $sujet->examen_id)
                ->whereKeyNot($sujet->id)
                ->orderByDesc('session')->orderByDesc('id')->limit(4)->get()
                ->map(AnnalesPubliques::carte(...))->values(),
            'partage' => [
                'url' => $adresse,
                'texte' => "{$titre} : l’énoncé complet sur N’karamögö",
            ],
        ]);

        return Seo::appliquer($reponse, Seo::page(
            titre: $titre,
            description: AnnalesPubliques::description($sujet),
            canonique: $adresse,
            image: route('partage.image.sujet', $sujet->slug),
            indexer: AnnalesPubliques::indexable($sujet),
            type: 'article',
            jsonLd: [[
                '@context' => 'https://schema.org',
                '@type' => 'LearningResource',
                'name' => $titre,
                'description' => AnnalesPubliques::description($sujet),
                'url' => $adresse,
                'inLanguage' => 'fr',
                'learningResourceType' => 'Sujet d’examen',
                'educationalLevel' => $sujet->libelleSession(),
                'about' => $sujet->matiere->nom,
                'isAccessibleForFree' => true,
                'publisher' => ['@type' => 'Organization', 'name' => config('app.name')],
            ]],
        ));
    }

    /**
     * @param  Builder<Sujet>  $requete
     * @return Builder<Sujet>
     */
    private static function filtrer(Builder $requete, ?string $examen): Builder
    {
        if ($examen === null) {
            return $requete;
        }

        [$code, $serie] = self::EXAMENS[$examen];

        return $requete
            ->whereHas('examen', fn (Builder $q) => $q->where('code', $code->value))
            ->where(fn (Builder $q) => $serie === null
                ? $q->whereNull('serie_id')
                : $q->whereHas('serie', fn (Builder $s) => $s->where('code', $serie)));
    }
}
