<?php

namespace Database\Seeders;

use App\Enums\MotifSignalementTuteur;
use App\Enums\TypeQuestion;
use App\Models\ConversationTuteur;
use App\Models\MessageTuteur;
use App\Models\Question;
use App\Models\User;
use App\Services\Tuteur\Couts;
use App\Services\Tuteur\MoteurTuteur;
use App\Services\Tuteur\ReponseMoteur;
use App\Services\Tuteur\TuteurService;
use App\Services\Tuteur\TuteurSimule;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Conversations de démonstration avec le tuteur (lot 10, développement
 * seulement) : celles d'Aïssatou (gratuite) et d'Ousmane (abonné), sur les
 * questions **fictives** du contenu de démonstration, étalées sur deux
 * semaines. Elles passent par le vrai chemin (TuteurService, avec le tuteur
 * simulé qui écrit « EXEMPLE — explication fictive ») ; le modèle, les
 * jetons et le coût sont ensuite posés comme si l'API avait répondu, pour
 * que « Mon tuteur », le journal du back-office et la console aient de quoi
 * s'afficher. Tout est marqué `est_exemple` (bandeau).
 */
class DemoTuteurSeeder extends Seeder
{
    private const MODELE = 'claude-sonnet-5-5';

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les conversations de démonstration ne sont jamais semées en production.');
        }

        if (ConversationTuteur::query()->where('est_exemple', true)->exists()) {
            return;
        }

        // Le tuteur simulé, sans pause : le semis ne doit pas attendre.
        app()->instance(MoteurTuteur::class, new TuteurSimule(0));
        $tuteur = app(TuteurService::class);
        $maintenant = CarbonImmutable::now();

        foreach (['aissatou_demo' => 9, 'ousmane_demo' => 5] as $pseudo => $nombre) {
            $eleve = User::where('pseudo', $pseudo)->first();
            $profil = $eleve ? CatalogueEleve::profil($eleve) : null;

            if ($profil === null) {
                continue;
            }

            $questions = CatalogueEleve::questions($profil)
                ->with('versionPubliee', 'notion.chapitre.matiere')
                ->where('est_exemple', true)
                // Les questions des cours : le corrigé d'une annale peut être réservé.
                ->whereNull('sujet_partie_id')
                ->orderBy('id')
                ->get()
                ->filter(fn (Question $q) => ($q->versionPubliee->blocs['corrige'] ?? []) !== [])
                ->values();
            $matiere = $questions->first()?->notion->chapitre->matiere;

            for ($rang = 0; $rang < $nombre; $rang++) {
                // Du plus ancien au plus récent ; la dernière d'Aïssatou aujourd'hui.
                $jour = $maintenant->subDays(($nombre - 1 - $rang) * 2)->setTime(17 + $rang % 4, 10 + 7 * $rang % 50);
                $question = $questions->isEmpty() ? null : $questions[$rang % $questions->count()];

                $champs = match (true) {
                    $rang === 2 && $matiere !== null => ['demande' => 'question', 'matiere' => $matiere->slug, 'texte' => 'Pourquoi on met les côtés au carré dans le théorème de Pythagore ?'],
                    $rang === 4 && $matiere !== null => ['demande' => 'question', 'matiere' => $matiere->slug, 'texte' => 'Tu as vu le match de football hier ?'],
                    $question === null => null,
                    $rang % 3 === 1 => ['demande' => 'etape', 'etape' => 0, ...$this->surQuestion($question)],
                    default => ['demande' => 'expliquer', ...$this->surQuestion($question)],
                };

                if ($champs === null) {
                    continue;
                }

                $conversation = $this->echange($tuteur, $eleve, $champs, $jour);

                // Une relance de temps en temps (« Encore plus simple »).
                if ($conversation !== null && $rang % 3 === 0) {
                    $this->echange($tuteur, $eleve, ['demande' => 'plus_simple', 'conversation' => $conversation->uuid], $jour->addMinutes(3));
                }

                // Une réponse signalée, pour le journal du back-office.
                if ($conversation !== null && $pseudo === 'aissatou_demo' && $rang === 3) {
                    $conversation->messages()->where('role', MessageTuteur::TUTEUR)->first()?->forceFill([
                        'signale_le' => $jour->addMinutes(5),
                        'signale_motif' => MotifSignalementTuteur::PasClaire,
                    ])->save();
                }
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function surQuestion(Question $question): array
    {
        $blocs = $question->versionPubliee->blocs;
        $reponse = null;

        // Une mauvaise réponse à un QCM : le tuteur part de ce que l'élève a choisi.
        if (TypeQuestion::from($blocs['type']) === TypeQuestion::QcmUne) {
            foreach ((array) ($blocs['donnees']['options'] ?? []) as $option) {
                if (is_array($option) && ($option['id'] ?? null) !== ($blocs['attendue']['option'] ?? null)) {
                    $reponse = ['option' => $option['id']];
                    break;
                }
            }
        }

        return ['question' => $question->uuid, 'version' => $question->versionPubliee->numero, 'reponse' => $reponse];
    }

    /**
     * Une demande par le vrai chemin, puis datée et habillée comme une
     * réponse de l'API.
     *
     * @param  array<string, mixed>  $champs
     */
    private function echange(TuteurService $tuteur, User $eleve, array $champs, CarbonImmutable $le): ?ConversationTuteur
    {
        $message = $tuteur->diffuser($tuteur->preparer($eleve, $champs), fn () => null);

        if (! $message->exists) {
            return null;
        }

        $conversation = $message->conversation;

        $conversation->forceFill(['est_exemple' => true, 'created_at' => $conversation->wasRecentlyCreated ? $le : $conversation->created_at, 'updated_at' => $le])->saveQuietly();

        foreach ($conversation->messages()->where('created_at', '>=', now()->subMinute())->get() as $m) {
            $champsMessage = ['est_exemple' => true, 'created_at' => $le, 'updated_at' => $le];

            if ($m->role === MessageTuteur::TUTEUR && ! $m->depuis_cache && $m->modele === TuteurSimule::MODELE) {
                $graine = $m->id * 37;
                $reponse = new ReponseMoteur(
                    texte: $m->texte,
                    fin: 'complete',
                    modele: self::MODELE,
                    jetonsEntree: 900 + $graine % 700,
                    jetonsSortie: 220 + $graine % 180,
                    jetonsCacheLus: $m->demande->ouvre() ? 0 : 1200,
                );
                $champsMessage += [
                    'modele' => self::MODELE,
                    'jetons_entree' => $reponse->jetonsEntree,
                    'jetons_sortie' => $reponse->jetonsSortie,
                    'jetons_cache_lus' => $reponse->jetonsCacheLus,
                    'cout_micro_usd' => Couts::microUsd($reponse),
                    'premier_mot_ms' => 850 + $graine % 1400,
                    'duree_ms' => 4200 + $graine % 3000,
                ];
            }

            $m->forceFill($champsMessage)->saveQuietly();
        }

        return $conversation;
    }
}
