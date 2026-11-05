<?php

namespace App\Services;

use App\Enums\DecisionRelecture;
use App\Enums\ModeTentative;
use App\Enums\TypeQuestion;
use App\Models\ExamenBlanc;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use App\Models\VersionContenu;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use App\Support\NoteExamen;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * La fin d'un examen blanc (opération `examen_blanc.terminer`, priorité 0,
 * HORS_LIGNE.md A.6 et A.8) : la note que l'élève tient le plus à ne pas
 * perdre.
 *
 *  - **le serveur recorrige** chaque réponse contre la version vue de sa
 *    question (TentativeService, une tentative `examen_blanc` par réponse :
 *    elles comptent pour la maîtrise) ; une rédaction est notée sur
 *    l'auto-évaluation de l'élève au barème ;
 *  - la note sur 20 vient de NoteExamen, la même règle que l'appareil ;
 *    un écart avec la note affichée est rendu, pour être expliqué ;
 *  - une horloge douteuse (recul, saut, examen plus long que sa durée)
 *    est **signalée** sur le résultat, jamais sanctionnée (A.8) ;
 *  - même examen reçu deux fois : le premier résultat, rien de rejoué.
 */
class ExamenBlancService
{
    /** Au-delà de la durée, la marge tolérée avant de signaler l'horloge. */
    public const MARGE_MINUTES = 5;

    public function __construct(private TentativeService $tentatives) {}

    /**
     * @param  array<string, array{version: int, reponse: array<string, mixed>|null, criteres: list<string>|null}>  $reponses  par uuid de question
     * @param  array{duree_minutes: int, origine_duree: string, temps_ecoule: bool, note_appareil: float|null, horloge_suspecte: bool, motif_horloge: string|null}  $passage
     * @return array{note: float, note_appareil: float|null, ecart: bool, horloge_suspecte: bool}
     */
    public function terminer(
        User $eleve,
        string $uuid,
        Sujet $sujet,
        int $versionVue,
        CarbonImmutable $commenceLe,
        CarbonImmutable $termineLe,
        array $reponses,
        array $passage,
        bool $horlogeSuspecteSynchro,
        CarbonImmutable $recuLe,
    ): array {
        $existant = ExamenBlanc::query()->where('uuid', $uuid)->first();

        if ($existant !== null) {
            if ($existant->user_id !== $eleve->id) {
                throw new OperationRejetee('Cet examen n\'est pas le tien.');
            }

            return $this->resultat($existant);
        }

        if (! CatalogueEleve::peutLireSujet($eleve, $sujet)) {
            throw new OperationRejetee('Cette annale n\'est plus proposée : ton examen ne peut pas être noté.');
        }

        /** @var VersionContenu|null $version */
        $version = $sujet->versions()
            ->where('numero', $versionVue)
            ->where('decision', DecisionRelecture::Publiee->value)
            ->first();

        if ($version === null) {
            throw new OperationRejetee('Cette version de l\'annale n\'a jamais été publiée.');
        }

        [$suspecte, $motif] = $this->horloge($commenceLe, $termineLe, $passage, $horlogeSuspecteSynchro);

        return DB::transaction(function () use ($eleve, $uuid, $sujet, $version, $commenceLe, $termineLe, $reponses, $passage, $suspecte, $motif, $recuLe) {
            /** @var list<array{uuid: string, titre: string, bareme: float|int|null, questions: list<string>}> $parties */
            $parties = $version->blocs['parties'] ?? [];
            $questions = Question::query()->whereIn('uuid', array_merge([], ...array_map(fn (array $p) => $p['questions'], $parties)))->get()->keyBy('uuid');

            $details = [];
            $aNoter = [];

            foreach ($parties as $partie) {
                $scores = [];
                $lignes = [];

                foreach ($partie['questions'] as $uuidQuestion) {
                    $question = $questions->get($uuidQuestion);
                    $score = $question === null ? null : $this->corriger($eleve, $question, $reponses[$uuidQuestion] ?? null, $termineLe, $recuLe);
                    $scores[] = $score;
                    $lignes[] = ['uuid' => $uuidQuestion, 'score' => $score, 'repondue' => isset($reponses[$uuidQuestion]['reponse'])];
                }

                $aNoter[] = ['bareme' => $partie['bareme'] ?? null, 'scores' => $scores];
                $details[] = ['uuid' => $partie['uuid'], 'titre' => $partie['titre'], 'bareme' => $partie['bareme'] ?? null, 'questions' => $lignes];
            }

            $note = NoteExamen::calculer($aNoter);

            foreach ($note['parties'] as $rang => $points) {
                $details[$rang] += $points;
            }

            $examen = ExamenBlanc::create([
                'uuid' => $uuid,
                'user_id' => $eleve->id,
                'sujet_id' => $sujet->id,
                'version' => $version->numero,
                'mode' => 'conditions_reelles',
                'duree_minutes' => $passage['duree_minutes'],
                'origine_duree' => $passage['origine_duree'],
                'commence_le' => $commenceLe,
                'termine_le' => $termineLe,
                'temps_ecoule' => $passage['temps_ecoule'],
                'note_sur_20' => $note['note'],
                'note_appareil' => $passage['note_appareil'],
                'details' => ['parties' => $details],
                'horloge_suspecte' => $suspecte,
                'motif_horloge' => $motif,
                'recu_le' => $recuLe,
            ]);

            return $this->resultat($examen);
        });
    }

    /**
     * Une réponse recorrigée, par TentativeService (la version vue fait foi).
     * Sans réponse : 0, sans tentative. Une question retirée depuis : 0.
     *
     * @param  array{version: int, reponse: array<string, mixed>|null, criteres: list<string>|null}|null  $donnee
     */
    private function corriger(User $eleve, Question $question, ?array $donnee, CarbonImmutable $termineLe, CarbonImmutable $recuLe): ?int
    {
        if ($donnee === null || $donnee['reponse'] === null) {
            return null;
        }

        $uuidTentative = (string) Str::uuid7();

        try {
            $resultat = $this->tentatives->enregistrer($eleve, $uuidTentative, $question, $donnee['version'], $donnee['reponse'], null, null, $termineLe, $recuLe, 0, ModeTentative::ExamenBlanc);

            if ($question->type === TypeQuestion::Ouverte && $donnee['criteres'] !== null) {
                $resultat = $this->tentatives->autoEvaluer($eleve, $uuidTentative, $donnee['criteres'], $termineLe);
            }
        } catch (OperationRejetee) {
            return null;
        }

        return $resultat['score'];
    }

    /**
     * @param  array{duree_minutes: int, horloge_suspecte: bool, motif_horloge: string|null}  $passage
     * @return array{0: bool, 1: string|null}
     */
    private function horloge(CarbonImmutable $commenceLe, CarbonImmutable $termineLe, array $passage, bool $synchro): array
    {
        return match (true) {
            $passage['horloge_suspecte'] => [true, $passage['motif_horloge'] ?? 'L\'heure du téléphone a changé pendant l\'examen.'],
            $termineLe->lessThan($commenceLe) => [true, 'L\'examen finit avant d\'avoir commencé : l\'heure du téléphone a reculé.'],
            $commenceLe->diffInMinutes($termineLe) > $passage['duree_minutes'] + self::MARGE_MINUTES => [true, 'L\'examen a duré plus longtemps que prévu.'],
            $synchro => [true, 'L\'heure du téléphone ne correspond pas à celle du serveur.'],
            default => [false, null],
        };
    }

    /**
     * @return array{note: float, note_appareil: float|null, ecart: bool, horloge_suspecte: bool}
     */
    private function resultat(ExamenBlanc $examen): array
    {
        $note = (float) $examen->note_sur_20;
        $appareil = $examen->note_appareil === null ? null : (float) $examen->note_appareil;

        return [
            'note' => $note,
            'note_appareil' => $appareil,
            'ecart' => $appareil !== null && abs($appareil - $note) >= 0.01,
            'horloge_suspecte' => $examen->horloge_suspecte,
        ];
    }
}
