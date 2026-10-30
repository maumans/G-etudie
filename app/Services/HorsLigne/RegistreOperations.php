<?php

namespace App\Services\HorsLigne;

/**
 * Les types d'opération que le serveur sait exécuter (HORS_LIGNE.md A.3.6,
 * A.6). Vide au lot 0 : le premier geste élève (`tentative.enregistrer`)
 * arrive au lot 3. Chaque type a aussi son libellé dans
 * resources/js/lib/hors-ligne/libelles.ts.
 */
class RegistreOperations
{
    /** @var array<string, class-string<GestionnaireOperation>> */
    public const TYPES = [];

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
