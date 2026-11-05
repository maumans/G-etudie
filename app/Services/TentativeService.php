<?php

namespace App\Services;

use App\Enums\DecisionRelecture;
use App\Enums\ModeTentative;
use App\Enums\TypeQuestion;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Models\VersionContenu;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use App\Support\FormatQuestion;
use Carbon\CarbonImmutable;

/**
 * Enregistre une réponse (opération `tentative.enregistrer`, HORS_LIGNE.md
 * A.6) et **la recorrige** : ce que l'appareil a affiché ne compte pas.
 *
 * **La version vue fait foi** (A.9) : la tentative porte le numéro de la
 * version que l'élève avait sous les yeux, et le serveur corrige contre
 * celle-là, même si une version corrigée est sortie depuis. Un élève ne perd
 * pas de points pour l'erreur de l'équipe, et n'en gagne pas non plus.
 *
 * Score de 0 à 100, juste à 100 seulement (FormatQuestion). Une question
 * ouverte reste sans score jusqu'à `tentative.auto_evaluer`.
 */
class TentativeService
{
    public function __construct(
        private MaitriseService $maitrise,
        private MotivationService $motivation,
        private SeanceService $seances,
    ) {}

    /**
     * @param  array<string, mixed>  $reponse
     * @return array{score: int|null, correcte: bool|null, attendue: array<string, mixed>}
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
        int $indicesUtilises = 0,
        ?ModeTentative $mode = null,
    ): array {
        $existante = Tentative::query()->where('uuid', $uuid)->first();

        if ($existante !== null) {
            if ($existante->user_id !== $eleve->id) {
                throw new OperationRejetee('Cette réponse n\'est pas la tienne.');
            }

            return $this->resultat($existante, $this->versionVue($question, $existante->version));
        }

        if (! CatalogueEleve::peutRecevoirQuestion($eleve, $question)) {
            throw new OperationRejetee('Cette question n\'est plus proposée.');
        }

        if ($seance !== null && ($seance->user_id !== $eleve->id || ! in_array($question->id, $seance->questions, true))) {
            throw new OperationRejetee('Cette question ne fait pas partie de ta séance.');
        }

        $version = $this->versionVue($question, $versionVue)
            ?? throw new OperationRejetee('Cette version de la question n\'a jamais été publiée.');

        $score = FormatQuestion::corriger(TypeQuestion::from($version->blocs['type']), $version->blocs['attendue'], $reponse);
        $indices = count($version->blocs['indices'] ?? []);

        $tentative = Tentative::create([
            'uuid' => $uuid,
            'user_id' => $eleve->id,
            'question_id' => $question->id,
            'version' => $version->numero,
            'seance_id' => $seance?->id,
            'mode' => $mode ?? ($seance !== null ? ModeTentative::Seance : ModeTentative::Entrainement),
            'reponse' => $reponse,
            'score' => $score,
            'correcte' => $score === null ? null : $score === 100,
            'duree_secondes' => $dureeSecondes,
            // Les indices ne retirent rien au verdict ; leur nombre est gardé
            // pour la maîtrise (lot 6).
            'indices_utilises' => max(0, min($indicesUtilises, $indices)),
            'saisi_le' => $saisiLe,
            'recu_le' => $recuLe,
        ]);

        // Lot 6 : la séance préparée prend son jour, la maîtrise de la notion
        // est recalculée, la série et les points suivent — dans la même
        // transaction que la réponse (SynchroService).
        if ($seance !== null) {
            $this->seances->demarrer($seance, $saisiLe);
        }

        if ($tentative->score !== null) {
            $this->maitrise->apresTentative($tentative);
        }

        $this->motivation->apresTentative($tentative);

        return $this->resultat($tentative, $version);
    }

    /**
     * Opération `tentative.auto_evaluer` (A.6) : l'élève a comparé sa
     * rédaction au corrigé et coché les critères du barème qu'il remplit.
     * Une seule fois : une seconde auto-évaluation est acceptée sans rien
     * changer.
     *
     * @param  list<string>  $criteres
     * @return array{score: int|null, correcte: bool|null}
     */
    public function autoEvaluer(User $eleve, string $uuidTentative, array $criteres, CarbonImmutable $saisiLe): array
    {
        $tentative = Tentative::query()->where('uuid', $uuidTentative)->first();

        if ($tentative === null || $tentative->user_id !== $eleve->id) {
            throw new OperationRejetee('Cette réponse est introuvable.');
        }

        $version = $this->versionVue($tentative->question, $tentative->version);

        if ($version === null || ! TypeQuestion::from($version->blocs['type'])->estAutoEvaluee()) {
            throw new OperationRejetee('Cette question se corrige toute seule.');
        }

        if ($tentative->auto_evaluee_le === null) {
            $score = FormatQuestion::scoreAutoEvaluation($version->blocs['donnees'], $criteres);
            $connus = array_column($version->blocs['donnees']['bareme'] ?? [], 'id');

            $tentative->forceFill([
                'score' => $score,
                'correcte' => $score === 100,
                'criteres' => array_values(array_intersect($connus, $criteres)),
                'auto_evaluee_le' => $saisiLe,
            ])->save();

            $this->maitrise->apresTentative($tentative);
            $this->motivation->apresEvaluation($tentative);
        }

        return ['score' => $tentative->score, 'correcte' => $tentative->correcte];
    }

    /** Une version de la question qui a été publiée (et elle seule). */
    private function versionVue(Question $question, int $numero): ?VersionContenu
    {
        /** @var VersionContenu|null */
        return $question->versions()
            ->where('numero', $numero)
            ->where('decision', DecisionRelecture::Publiee->value)
            ->first();
    }

    /**
     * @return array{score: int|null, correcte: bool|null, attendue: array<string, mixed>}
     */
    private function resultat(Tentative $tentative, ?VersionContenu $version): array
    {
        return [
            'score' => $tentative->score,
            'correcte' => $tentative->correcte,
            'attendue' => $version->blocs['attendue'] ?? [],
        ];
    }
}
