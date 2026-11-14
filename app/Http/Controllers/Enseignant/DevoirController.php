<?php

namespace App\Http\Controllers\Enseignant;

use App\Http\Controllers\Controller;
use App\Models\Devoir;
use App\Models\Groupe;
use App\Models\Question;
use App\Services\Organisation\DevoirService;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\SuiviService;
use App\Support\CatalogueEleve;
use App\Support\RechercheTexte;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Les devoirs d'un groupe (lot 11, PLAN M14, décision 6) : choisir des
 * questions **publiées** du catalogue du groupe, fixer l'échéance ; suivre
 * qui a rendu. 404 hors du groupe de l'enseignant (policies).
 */
class DevoirController extends Controller
{
    /** Questions proposées à la fois : la recherche affine (côté serveur). */
    public const QUESTIONS_PROPOSEES = 120;

    public function __construct(
        private DevoirService $devoirs,
        private SuiviService $suivi,
    ) {}

    public function create(Request $request, Groupe $groupe): Response
    {
        Gate::authorize('gerer', $groupe);
        abort_if($groupe->archive_le !== null, 404);

        $filtres = $request->validate([
            'recherche' => ['nullable', 'string', 'max:80'],
            'matiere' => ['nullable', 'string', 'max:40'],
        ]);
        $type = $groupe->profilType();
        $requete = $this->devoirs->questionsDuGroupe($groupe)->with('notion.chapitre.matiere');

        if (($filtres['matiere'] ?? null) !== null) {
            $requete->whereHas('notion.chapitre.matiere', fn ($matiere) => $matiere->where('slug', $filtres['matiere']));
        }

        RechercheTexte::appliquer($requete, $filtres['recherche'] ?? null, ['extrait', 'notion.titre', 'notion.chapitre.titre']);

        $questions = $requete->orderBy('notion_id')->orderBy('id')->limit(self::QUESTIONS_PROPOSEES + 1)->get();

        return Inertia::render('enseignant/devoir-nouveau', [
            'groupe' => $this->suivi->resumeGroupe($groupe->load(['examen', 'serie', 'etablissement']), $groupe->eleves()->count()),
            'filtres' => ['recherche' => $filtres['recherche'] ?? '', 'matiere' => $filtres['matiere'] ?? ''],
            'matieres' => CatalogueEleve::epreuves($type)->map(fn ($epreuve) => [
                'slug' => $epreuve->matiere->slug,
                'nom' => $epreuve->matiere->nom,
                'cle' => $epreuve->matiere->teinte->value,
            ])->values(),
            'questions' => $questions->take(self::QUESTIONS_PROPOSEES)->map(fn (Question $question) => [
                'uuid' => $question->uuid,
                'extrait' => $question->extrait,
                'type' => $question->type->value,
                'difficulte' => $question->difficulte,
                'notion' => $question->notion->titre,
                'chapitre' => $question->notion->chapitre->titre,
                'matiere' => ['cle' => $question->notion->chapitre->matiere->teinte->value, 'nom' => $question->notion->chapitre->matiere->nom],
                'est_exemple' => $question->est_exemple,
            ])->values(),
            'tronque' => $questions->count() > self::QUESTIONS_PROPOSEES,
            'questions_max' => DevoirService::QUESTIONS_MAX,
        ]);
    }

    public function store(Request $request, Groupe $groupe): RedirectResponse
    {
        Gate::authorize('gerer', $groupe);

        $donnees = $request->validate([
            'titre' => ['required', 'string', 'max:120'],
            'consigne' => ['nullable', 'string', 'max:1000'],
            'echeance' => ['required', 'date'],
            'questions' => ['required', 'array', 'min:1', 'max:'.DevoirService::QUESTIONS_MAX],
            'questions.*' => ['string', 'uuid'],
        ], [], ['titre' => 'titre', 'echeance' => 'échéance', 'questions' => 'questions']);

        try {
            $devoir = $this->devoirs->creer(
                $request->user(),
                $groupe,
                $donnees['titre'],
                $donnees['consigne'] ?? null,
                // Une date seule : jusqu'à la fin de ce jour-là.
                self::echeance($donnees['echeance']),
                array_values($donnees['questions']),
            );
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Devoir donné : vos élèves le voient dans « Mes groupes ».']);

        return to_route('enseignant.devoirs.show', $devoir);
    }

    public function show(Request $request, Devoir $devoir): Response
    {
        Gate::authorize('gerer', $devoir);

        return Inertia::render('enseignant/devoir', [
            'suivi' => $this->suivi->devoir($devoir),
        ]);
    }

    public function update(Request $request, Devoir $devoir): RedirectResponse
    {
        Gate::authorize('gerer', $devoir);
        $donnees = $request->validate(['echeance' => ['required', 'date']], [], ['echeance' => 'échéance']);

        try {
            $this->devoirs->changerEcheance($devoir, self::echeance($donnees['echeance']));
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Échéance changée.']);

        return back();
    }

    private static function echeance(string $saisie): CarbonImmutable
    {
        $date = CarbonImmutable::parse($saisie);

        return strlen($saisie) <= 10 ? $date->endOfDay() : $date;
    }
}
