<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\StatutImport;
use App\Enums\StatutSignalement;
use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\ImportSujet;
use App\Models\Lecon;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tableau de bord du back-office : où en est le catalogue, ce qui attend ce
 * compte (relire, reprendre), et la couverture des matières phares — la
 * vue du planning éditorial (PLAN M17) : « on voit ce qui manque ».
 */
class TableauDeBordController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $relit = $user->can(Permission::RelireContenu->value);
        $redige = $user->can(Permission::RedigerContenu->value);

        $compteurs = Lecon::query()->toBase()
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        return Inertia::render('contenu/accueil', [
            'compteurs' => collect(StatutContenu::cases())
                ->mapWithKeys(fn (StatutContenu $s) => [$s->value => (int) ($compteurs[$s->value] ?? 0)]),
            'a_relire' => $relit ? $this->presenter($this->aRelire($user)->latest('updated_at')->limit(5)->get()) : null,
            'nombre_a_relire' => $relit ? $this->aRelire($user)->count() : null,
            'a_reprendre' => $redige ? $this->presenter($this->aReprendre($user)) : null,
            'mes_brouillons' => $redige ? $this->presenter(
                Lecon::query()->where('auteur_id', $user->id)->where('statut', StatutContenu::Brouillon)->latest('updated_at')->limit(4)->get(),
            ) : null,
            'couverture' => $this->couverture(),
            'est_exemple' => Lecon::query()->where('est_exemple', true)->exists(),
            // Lot 4 : les annales et les signalements des élèves.
            'annales' => [
                'a_relire' => $relit ? AnnaleController::nombreARelire($user) : null,
                'a_verifier' => $redige ? Question::query()->where('auteur_id', $user->id)->where('reponse_a_verifier', true)->count() : null,
                'imports_en_cours' => ImportSujet::query()->where('auteur_id', $user->id)->whereIn('statut', [StatutImport::EnAttente->value, StatutImport::EnCours->value])->count(),
                'publiees' => Sujet::query()->whereNotNull('version_publiee_id')->where('statut', '!=', StatutContenu::Archive->value)->count(),
            ],
            'signalements_ouverts' => $user->can(Permission::TraiterSignalements->value)
                ? Signalement::query()->where('statut', StatutSignalement::Ouvert->value)->count()
                : null,
        ]);
    }

    /**
     * @return Builder<Lecon>
     */
    private function aRelire(User $user): Builder
    {
        return Lecon::query()
            ->where('statut', StatutContenu::EnRelecture)
            ->where('auteur_id', '!=', $user->id)
            ->whereDoesntHave('versions', fn (Builder $q) => $q->whereNull('decision')->where('auteur_id', $user->id));
    }

    /**
     * Ses brouillons dont la dernière décision est un renvoi.
     *
     * @return Collection<int, Lecon>
     */
    private function aReprendre(User $user): Collection
    {
        return Lecon::query()
            ->where('auteur_id', $user->id)
            ->where('statut', StatutContenu::Brouillon)
            ->with('versions')
            ->latest('updated_at')
            ->get()
            ->filter(fn (Lecon $lecon) => $lecon->dernierRenvoi() !== null)
            ->take(4)
            ->values();
    }

    /**
     * Couverture des matières phares de l'année courante : pour chaque
     * matière et classe d'examen, la part des notions du programme qui ont
     * une leçon publiée.
     *
     * @return array<int, array<string, mixed>>
     */
    private function couverture(): array
    {
        $annee = AnneeScolaire::courante();

        if ($annee === null) {
            return [];
        }

        $phares = Epreuve::query()
            ->with(['matiere', 'examen.classe', 'serie'])
            ->where('annee_scolaire_id', $annee->id)
            ->where('phare', true)
            ->get()
            ->filter(fn (Epreuve $e) => $e->examen->classe !== null)
            ->groupBy(fn (Epreuve $e) => $e->matiere_id.'-'.$e->examen->classe->id);

        return $phares->map(function (Collection $epreuves) {
            /** @var Epreuve $premiere */
            $premiere = $epreuves->first();
            $classe = $premiere->examen->classe;

            $notions = Notion::query()->whereHas('chapitre', fn (Builder $q) => $q
                ->where('matiere_id', $premiere->matiere_id)
                ->where('classe_id', $classe->id));

            return [
                'matiere' => ['nom' => $premiere->matiere->nom, 'teinte' => $premiere->matiere->teinte->value],
                'classe' => $classe->nom,
                'examens' => $epreuves->map(fn (Epreuve $e) => $e->serie ? 'Bac '.$e->serie->code->value : $e->examen->code->value)->unique()->values(),
                'chapitres' => Chapitre::query()->where('matiere_id', $premiere->matiere_id)->where('classe_id', $classe->id)->count(),
                'notions' => (clone $notions)->count(),
                'couvertes' => (clone $notions)->whereHas('lecons', fn (Builder $q) => $q->whereNotNull('version_publiee_id')->where('statut', '!=', StatutContenu::Archive))->count(),
                'ordre' => [$classe->ordre, $premiere->matiere->ordre],
            ];
        })
            ->sortBy('ordre')
            ->map(fn (array $ligne) => collect($ligne)->except('ordre')->all())
            ->values()
            ->all();
    }

    /**
     * @param  iterable<Lecon>  $lecons
     * @return list<array<string, mixed>>
     */
    private function presenter(iterable $lecons): array
    {
        $resultat = [];

        foreach ($lecons as $lecon) {
            $lecon->loadMissing(['notion.chapitre.matiere', 'auteur']);
            $renvoi = $lecon->statut === StatutContenu::Brouillon ? $lecon->dernierRenvoi() : null;

            $resultat[] = [
                'uuid' => $lecon->uuid,
                'titre' => $lecon->titre,
                'statut' => $lecon->statut->value,
                'auteur' => $lecon->auteur->pseudo,
                'notion' => $lecon->notion->titre,
                'matiere' => [
                    'nom' => $lecon->notion->chapitre->matiere->nom,
                    'teinte' => $lecon->notion->chapitre->matiere->teinte->value,
                ],
                'modifiee_le' => $lecon->updated_at->toIso8601String(),
                'commentaire' => $renvoi?->commentaire,
            ];
        }

        return $resultat;
    }
}
