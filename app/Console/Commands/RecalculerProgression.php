<?php

namespace App\Console\Commands;

use App\Models\ExamenBlanc;
use App\Models\Maitrise;
use App\Models\ProgressionLecon;
use App\Models\Question;
use App\Models\Seance;
use App\Models\SerieJour;
use App\Models\Tentative;
use App\Services\MaitriseService;
use App\Services\MotivationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Lot 6 : remet la progression d'aplomb à partir de ce qui fait foi — les
 * réponses, séances, leçons et examens blancs reçus. À lancer une fois au
 * déploiement du lot 6 (les réponses des lots 2 à 5 n'avaient ni maîtrise
 * ni série), puis seulement si une règle de calcul change. Idempotent :
 * maîtrises et séries sont recalculées, les points et badges déjà acquis ne
 * sont jamais retirés ni comptés deux fois (source unique).
 */
#[Signature('progression:recalculer {--eleve= : identifiant d\'un seul élève}')]
#[Description('Recalcule maîtrises, séries de jours, points et badges depuis les réponses reçues')]
class RecalculerProgression extends Command
{
    public function handle(MaitriseService $maitrise, MotivationService $motivation): int
    {
        $eleves = Tentative::query()->distinct()->pluck('user_id')
            ->merge(ProgressionLecon::query()->distinct()->pluck('user_id'))
            ->merge(ExamenBlanc::query()->distinct()->pluck('user_id'))
            ->merge(Maitrise::query()->distinct()->pluck('user_id'))
            ->unique()
            ->when($this->option('eleve'), fn ($ids) => $ids->intersect([(int) $this->option('eleve')]))
            ->values();

        foreach ($eleves as $userId) {
            DB::transaction(function () use ($userId, $maitrise, $motivation) {
                // Les notions des réponses, et celles qui avaient une maîtrise
                // (toutes leurs réponses ont pu être effacées : elle disparaît).
                $notions = Question::query()
                    ->whereIn('id', Tentative::query()->where('user_id', $userId)->select('question_id'))
                    ->distinct()
                    ->pluck('notion_id')
                    ->merge(Maitrise::query()->where('user_id', $userId)->pluck('notion_id'))
                    ->unique();

                foreach ($notions as $notionId) {
                    $maitrise->recalculer($userId, (int) $notionId);
                }

                // La série est refaite au jour de chaque geste.
                SerieJour::query()->where('user_id', $userId)->delete();

                Tentative::query()->where('user_id', $userId)->orderBy('saisi_le')->each(
                    fn (Tentative $tentative) => $motivation->apresTentative($tentative),
                );
                ProgressionLecon::query()->where('user_id', $userId)->each(function (ProgressionLecon $progression) use ($userId, $motivation) {
                    foreach ([$progression->etat_saisi_le, $progression->position_saisie_le] as $saisiLe) {
                        if ($saisiLe !== null) {
                            $motivation->apresLecon($userId, CarbonImmutable::instance($saisiLe));
                        }
                    }
                });
                Seance::query()->where('user_id', $userId)->whereNotNull('termine_le')->each(
                    fn (Seance $seance) => $motivation->apresSeance($seance, CarbonImmutable::instance($seance->termine_le), $seance->termine_le),
                );
                ExamenBlanc::query()->where('user_id', $userId)->each(
                    fn (ExamenBlanc $examen) => $motivation->apresExamenBlanc($examen),
                );
            });
        }

        $this->info("Progression recalculée pour {$eleves->count()} élève(s).");

        return self::SUCCESS;
    }
}
