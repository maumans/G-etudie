<?php

namespace Database\Seeders;

use App\Models\ExamenBlanc;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use App\Services\ExamenBlancService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Examens blancs de démonstration (lot 5, développement seulement) : deux
 * examens d'Aïssatou sur les annales **fictives** (`est_exemple`) de
 * DemoAnnalesSeeder, passés par le vrai chemin (ExamenBlancService, comme
 * `examen_blanc.terminer`) : l'historique, la comparaison et le résultat
 * ont de quoi s'afficher.
 */
class DemoExamensBlancsSeeder extends Seeder
{
    public function run(ExamenBlancService $examens): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les examens blancs de démonstration ne sont jamais semés en production.');
        }

        $aissatou = User::where('pseudo', 'aissatou_demo')->firstOrFail();
        $profil = CatalogueEleve::profil($aissatou);

        if ($profil === null || ExamenBlanc::query()->where('user_id', $aissatou->id)->exists()) {
            return;
        }

        $sujets = CatalogueEleve::sujets($profil)->with('versionPubliee')->where('est_exemple', true)->orderBy('session')->get();

        // Un premier essai moyen, puis un meilleur la semaine suivante.
        foreach ($sujets->take(2)->values() as $rang => $sujet) {
            $debut = CarbonImmutable::now()->subDays(9 - 7 * $rang)->setTime(16, 0);
            $examens->terminer(
                $aissatou,
                (string) Str::uuid7(),
                $sujet,
                (int) $sujet->versionPubliee->numero,
                $debut,
                $debut->addMinutes(95 + 10 * $rang),
                $this->reponses($sujet, justes: $rang === 0 ? 0.5 : 0.75),
                [
                    'duree_minutes' => $sujet->duree_minutes ?? 120,
                    'origine_duree' => $sujet->duree_minutes ? 'imprimee' : 'choisie',
                    'temps_ecoule' => false,
                    'note_appareil' => null,
                    'horloge_suspecte' => false,
                    'motif_horloge' => null,
                ],
                false,
                $debut->addMinutes(96 + 10 * $rang),
            );
        }
    }

    /**
     * Les bonnes réponses pour une part des questions, une mauvaise ensuite ;
     * une rédaction auto-évaluée sur son premier critère.
     *
     * @return array<string, array{version: int, reponse: array<string, mixed>|null, criteres: list<string>|null}>
     */
    private function reponses(Sujet $sujet, float $justes): array
    {
        $questions = Question::query()
            ->with('versionPubliee')
            ->whereIn('sujet_partie_id', $sujet->parties()->select('id'))
            ->orderBy('id')
            ->get();
        $nombre = (int) round($questions->count() * $justes);
        $reponses = [];

        foreach ($questions->values() as $rang => $question) {
            $version = $question->versionPubliee;
            $attendue = $version->blocs['attendue'] ?? [];
            $juste = $rang < $nombre;

            $reponse = match ($version->blocs['type']) {
                'qcm_une' => ['option' => $juste ? $attendue['option'] : 'z'],
                'vrai_faux' => ['valeur' => $juste ? $attendue['valeur'] : ! $attendue['valeur']],
                'numerique' => ['valeur' => $juste ? (string) $attendue['valeur'] : '0'],
                'courte' => ['texte' => $juste ? $attendue['acceptees'][0] : 'je ne sais pas'],
                'ouverte' => ['texte' => 'Ma rédaction d\'exemple.'],
                default => null,
            };

            $reponses[$question->uuid] = [
                'version' => $version->numero,
                'reponse' => $reponse,
                'criteres' => $version->blocs['type'] === 'ouverte' ? ['c1'] : null,
            ];
        }

        return $reponses;
    }
}
