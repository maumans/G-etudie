<?php

namespace App\Services;

use App\Enums\CibleSignalement;
use App\Enums\MotifSignalement;
use App\Enums\Permission;
use App\Enums\StatutSignalement;
use App\Models\Lecon;
use App\Models\Question;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * « Signaler une erreur » (PLAN M5, M17 ; opération `signalement.creer`,
 * HORS_LIGNE.md A.6, priorité 3) et la réponse de l'équipe.
 *
 *  - l'élève ne signale que ce qu'il peut voir (CatalogueEleve) ;
 *  - **10 signalements par jour** au plus (jour de la saisie) : au-delà,
 *    refus avec sa phrase ;
 *  - même `uuid` reçu deux fois : un seul signalement ;
 *  - l'équipe répond une fois (corrigé, ou sans suite) ; l'élève lit la
 *    réponse, sans fil de discussion (CLAUDE.md § 9).
 */
class SignalementService
{
    public const PAR_JOUR = 10;

    public const MESSAGE_MAX = 500;

    /**
     * @return array{statut: string}
     */
    public function creer(
        User $eleve,
        string $uuid,
        CibleSignalement $cible,
        string $uuidCible,
        ?int $version,
        MotifSignalement $motif,
        ?string $message,
        CarbonImmutable $saisiLe,
        CarbonImmutable $recuLe,
    ): array {
        $existant = Signalement::query()->where('uuid', $uuid)->first();

        if ($existant !== null) {
            if ($existant->user_id !== $eleve->id) {
                throw new OperationRejetee('Ce signalement n\'est pas le tien.');
            }

            return ['statut' => $existant->statut->value];
        }

        $contenu = $this->cibleVisible($eleve, $cible, $uuidCible)
            ?? throw new OperationRejetee('Ce contenu n\'est plus proposé : rien à signaler.');

        $duJour = Signalement::query()
            ->where('user_id', $eleve->id)
            ->whereBetween('saisi_le', [$saisiLe->startOfDay(), $saisiLe->endOfDay()])
            ->count();

        if ($duJour >= self::PAR_JOUR) {
            throw new OperationRejetee('Tu as déjà envoyé '.self::PAR_JOUR.' signalements aujourd\'hui. Merci ! Réessaie demain.');
        }

        $message = $message === null ? null : trim(mb_substr($message, 0, self::MESSAGE_MAX));

        $signalement = Signalement::create([
            'uuid' => $uuid,
            'user_id' => $eleve->id,
            'cible_type' => $cible,
            'cible_id' => $contenu->getKey(),
            'version' => $version,
            'motif' => $motif,
            'message' => $message === '' ? null : $message,
            'statut' => StatutSignalement::Ouvert,
            'saisi_le' => $saisiLe,
            'recu_le' => $recuLe,
        ]);

        return ['statut' => $signalement->statut->value];
    }

    /**
     * L'équipe répond : corrigé (`traite`) ou sans suite (`rejete`). Une
     * réponse se corrige tant que l'élève ne l'a pas lue.
     */
    public function repondre(Signalement $signalement, User $acteur, StatutSignalement $statut, string $reponse): Signalement
    {
        if (! $acteur->can(Permission::TraiterSignalements->value)) {
            throw new AuthorizationException('Vous ne traitez pas les signalements.');
        }

        if ($statut === StatutSignalement::Ouvert) {
            throw ValidationException::withMessages(['statut' => 'Choisissez « corrigé » ou « sans suite ».']);
        }

        if (mb_strlen(trim($reponse)) < 10) {
            throw ValidationException::withMessages(['reponse' => 'Répondez à l\'élève en une phrase au moins (10 caractères).']);
        }

        if ($signalement->reponse_vue_le !== null) {
            throw ValidationException::withMessages(['reponse' => 'L\'élève a déjà lu la réponse : elle ne change plus.']);
        }

        $signalement->forceFill([
            'statut' => $statut,
            'reponse' => trim(mb_substr($reponse, 0, 2000)),
            'traite_par_id' => $acteur->id,
            'traite_le' => now(),
        ])->save();

        return $signalement;
    }

    /** Les réponses que l'élève n'a pas encore lues. */
    public static function reponsesNonLues(User $eleve): int
    {
        return Signalement::query()
            ->where('user_id', $eleve->id)
            ->whereNotNull('traite_le')
            ->whereNull('reponse_vue_le')
            ->count();
    }

    /** L'élève a ouvert « Mes signalements » : les réponses sont lues. */
    public function marquerLues(User $eleve): void
    {
        Signalement::query()
            ->where('user_id', $eleve->id)
            ->whereNotNull('traite_le')
            ->whereNull('reponse_vue_le')
            ->update(['reponse_vue_le' => now()]);
    }

    private function cibleVisible(User $eleve, CibleSignalement $cible, string $uuid): ?Model
    {
        return match ($cible) {
            CibleSignalement::Question => ($q = Question::query()->where('uuid', $uuid)->first()) && CatalogueEleve::peutRecevoirQuestion($eleve, $q) ? $q : null,
            CibleSignalement::Lecon => ($l = Lecon::query()->where('uuid', $uuid)->first()) && CatalogueEleve::peutLireLecon($eleve, $l) ? $l : null,
            CibleSignalement::Sujet => ($s = Sujet::query()->where('uuid', $uuid)->first()) && CatalogueEleve::peutLireSujet($eleve, $s) ? $s : null,
        };
    }
}
