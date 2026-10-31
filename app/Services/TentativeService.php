<?php

namespace App\Services;

use App\Enums\ModeTentative;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use App\Support\FormatQuestion;
use Carbon\CarbonImmutable;

/**
 * Enregistre une réponse (opération `tentative.enregistrer`, HORS_LIGNE.md
 * A.6) et **la recorrige** : ce que l'appareil a affiché ne compte pas.
 *
 * Version : la tentative garde la version vue par l'élève. Au lot 2 seule
 * la version courante existe ; corriger contre une version ancienne viendra
 * avec l'historique des questions (lot 3, A.9).
 */
class TentativeService
{
    /**
     * @param  array<string, mixed>  $reponse
     * @return array{correcte: bool, attendue: array<string, mixed>}
     */
    public function enregistrer(
        User $eleve,
        string $uuid,
        Question $question,
        int $versionVue,
        array $reponse,
        ?Seance $seance,
        ?int $dureeSecondes,
        CarbonImmutable $saisiLe,
        CarbonImmutable $recuLe,
    ): array {
        $existante = Tentative::query()->where('uuid', $uuid)->first();

        if ($existante !== null) {
            if ($existante->user_id !== $eleve->id) {
                throw new OperationRejetee('Cette réponse n\'est pas la tienne.');
            }

            return ['correcte' => $existante->correcte, 'attendue' => $question->reponse_attendue];
        }

        if (! CatalogueEleve::peutRecevoirQuestion($eleve, $question)) {
            throw new OperationRejetee('Cette question n\'est plus proposée.');
        }

        if ($seance !== null && ($seance->user_id !== $eleve->id || ! in_array($question->id, $seance->questions, true))) {
            throw new OperationRejetee('Cette question ne fait pas partie de ta séance.');
        }

        $correcte = FormatQuestion::corriger($question->type, $question->reponse_attendue, $reponse);

        Tentative::create([
            'uuid' => $uuid,
            'user_id' => $eleve->id,
            'question_id' => $question->id,
            'version' => $versionVue,
            'seance_id' => $seance?->id,
            'mode' => $seance !== null ? ModeTentative::Seance : ModeTentative::Entrainement,
            'reponse' => $reponse,
            'correcte' => $correcte,
            'duree_secondes' => $dureeSecondes,
            'saisi_le' => $saisiLe,
            'recu_le' => $recuLe,
        ]);

        return ['correcte' => $correcte, 'attendue' => $question->reponse_attendue];
    }
}
