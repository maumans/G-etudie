<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\StatutContenu;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\ProgressionLecon;
use App\Models\Question;
use App\Models\RessourceExterne;
use App\Support\BlocsContenu;
use App\Support\CatalogueEleve;
use App\Support\PresentationCours;
use App\Support\PresentationQuestion;
use Illuminate\Http\Request;
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
        $profil = CatalogueEleve::profil($request->user()) ?? abort(404);
        $voisines = PresentationCours::leconsDuChapitre($profil, $lecon->notion->chapitre);
        $progression = ProgressionLecon::query()->where('user_id', $request->user()->id)->where('lecon_id', $lecon->id)->first();

        return Inertia::render('eleve/lecon', [
            'lecon' => self::contenu($lecon),
            'contexte' => PresentationCours::contexteLecon($lecon, $voisines),
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
        $profil = CatalogueEleve::profil($request->user()) ?? abort(404);

        return Inertia::render('eleve/fiche', PresentationCours::fiche($chapitre, PresentationCours::leconsDuChapitre($profil, $chapitre)));
    }

    /**
     * L'objet de contenu d'une leçon : ce qu'un pack contiendra aussi.
     *
     * @return array<string, mixed>
     */
    public static function contenu(Lecon $lecon): array
    {
        $version = $lecon->versionPubliee;

        $blocs = $version->blocs ?? BlocsContenu::vide();

        return [
            'type' => 'lecon',
            'uuid' => $lecon->uuid,
            'version' => $version->numero ?? 0,
            'titre' => $version->titre ?? $lecon->titre,
            'blocs' => $blocs,
            'minutes' => BlocsContenu::minutesDeLecture($blocs),
            'est_exemple' => $lecon->est_exemple,
            // Mini-questions : embarquées dans l'objet, pour qu'une leçon
            // lue depuis un pack les ait aussi. Une question pas (ou plus)
            // publiée n'est pas livrée ; son bloc ne s'affiche pas.
            'questions' => (object) self::miniQuestions($blocs),
            // Lot 12 (PLAN M19) : les ressources externes vérifiées de la
            // notion, dans l'objet aussi (une leçon du pack les montre ;
            // hors ligne, le lien demande la connexion). Un lien que le
            // contrôle hebdomadaire n'a pas joint n'est plus proposé.
            'ressources' => array_values(RessourceExterne::query()
                ->verifiees()
                ->where('notion_id', $lecon->notion_id)
                ->whereNull('lien_casse_le')
                ->orderBy('type')
                ->orderBy('id')
                ->get()
                ->map(fn (RessourceExterne $ressource) => $ressource->pourEleve())
                ->all()),
        ];
    }

    /**
     * @param  array<string, mixed>  $blocs
     * @return array<string, array<string, mixed>> uuid => question publiée
     */
    private static function miniQuestions(array $blocs): array
    {
        $uuids = BlocsContenu::questionsCitees($blocs);

        if ($uuids === []) {
            return [];
        }

        return Question::query()
            ->with(['notion.chapitre.matiere', 'versionPubliee'])
            ->whereIn('uuid', $uuids)
            ->whereNotNull('version_publiee_id')
            ->where('statut', '!=', StatutContenu::Archive->value)
            ->get()
            ->mapWithKeys(fn (Question $question) => [$question->uuid => PresentationQuestion::publiee($question)])
            ->all();
    }
}
