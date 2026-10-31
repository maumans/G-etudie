<?php

namespace App\Services\HorsLigne;

/**
 * Les types d'opération que le serveur sait exécuter (HORS_LIGNE.md A.3.6,
 * A.6). Les premiers gestes élève arrivent au lot 2 : réponse, fin de
 * séance, progression dans une leçon. Chaque type a aussi son libellé dans
 * resources/js/lib/hors-ligne/libelles.ts.
 */
class RegistreOperations
{
    /** @var array<string, class-string<GestionnaireOperation>> */
    public const TYPES = [
        Operations\EnregistrerTentative::TYPE => Operations\EnregistrerTentative::class,
        Operations\AutoEvaluerTentative::TYPE => Operations\AutoEvaluerTentative::class,
        Operations\TerminerSeance::TYPE => Operations\TerminerSeance::class,
        Operations\ProgressionLecon::TYPE => Operations\ProgressionLecon::class,
    ];

    /** @var array<string, class-string<GestionnaireOperation>> */
    private array $types = self::TYPES;

    /**
     * Ajoute un type (tests seulement : en production, TYPES fait foi).
     *
     * @param  class-string<GestionnaireOperation>  $gestionnaire
     */
    public function inscrire(string $type, string $gestionnaire): void
    {
        $this->types[$type] = $gestionnaire;
    }

    public function gestionnaire(string $type): ?GestionnaireOperation
    {
        $classe = $this->types[$type] ?? null;

        return $classe === null ? null : app($classe);
    }
}
