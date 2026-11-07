<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Support\AnnalesPubliques;
use App\Support\ImagesVitrine;
use App\Support\QuestionDemonstration;
use App\Support\Seo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Accueil public (habillage vitrine, DESIGN.md § 7) — la vitrine finale du
 * lot 8 : question jouable sans compte, compte à rebours national, sujets
 * récents, tarifs en GNF, partenaires réels, installation, et les balises
 * de référencement et de partage dans le HTML du serveur.
 */
class VitrineController extends Controller
{
    public function __invoke(): Response
    {
        $illustrations = ImagesVitrine::illustrations();

        $reponse = Inertia::render('vitrine/accueil', [
            'illustrations' => $illustrations,
            'photoHeros' => ImagesVitrine::photoHeros(),
            'compteARebours' => self::compteARebours(),
            'questionDemo' => QuestionDemonstration::question(),
            'sujetsRecents' => AnnalesPubliques::requete()
                ->with(['examen', 'serie', 'matiere'])
                ->withCount(['questions' => fn (Builder $q) => $q->whereNotNull('questions.version_publiee_id')])
                ->orderByDesc('session')->orderByDesc('publie_le')
                ->limit(4)->get()
                ->map(AnnalesPubliques::carte(...))->values(),
            'tarifs' => config('vitrine.tarifs'),
            'partenaires' => ImagesVitrine::partenaires(),
        ]);

        return Seo::appliquer($reponse, Seo::page(
            titre: 'Préparer le CEE, le BEPC et le Baccalauréat',
            canonique: url('/'),
            jsonLd: Seo::site(),
            // L'illustration du héros est l'élément le plus grand de l'écran :
            // annoncée dans le document, elle n'attend pas le rendu de React.
            precharger: [$illustrations['heros']],
        ));
    }

    /**
     * Les prochaines sessions **saisies par l'équipe** (Référentiel ›
     * Épreuves), jamais devinées : un examen sans date n'apparaît pas.
     *
     * @return list<array{examen: string, nom: string, date: string}>
     */
    public static function compteARebours(): array
    {
        return array_values(Examen::query()
            ->whereNotNull('date_prochaine_session')
            ->whereDate('date_prochaine_session', '>=', Carbon::today())
            ->orderBy('date_prochaine_session')
            ->get()
            ->map(fn (Examen $examen) => [
                'examen' => $examen->code->value,
                'nom' => $examen->code->nom(),
                'date' => $examen->date_prochaine_session?->toDateString() ?? '',
            ])
            ->all());
    }
}
