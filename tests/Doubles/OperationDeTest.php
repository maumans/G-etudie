<?php

namespace Tests\Doubles;

use App\Enums\Permission;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Type d'opération des tests de synchronisation (`test.noter`) : le registre
 * est vide au lot 0, le premier geste élève arrive au lot 3.
 *
 * `valeur` < 0 → refus métier ; `valeur` = 999 → panne inattendue.
 */
class OperationDeTest implements GestionnaireOperation
{
    public const TYPE = 'test.noter';

    /** @var list<array{auteur: int|string|null, valeur: int, saisi_le: string, horloge_suspecte: bool}> */
    public static array $executions = [];

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return ['valeur' => ['required', 'integer']];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        if ($charge['valeur'] < 0) {
            throw new OperationRejetee('Une note ne peut pas être négative.');
        }

        if ($charge['valeur'] === 999) {
            throw new RuntimeException('Panne simulée.');
        }

        self::$executions[] = [
            'auteur' => Auth::id(),
            'valeur' => $charge['valeur'],
            'saisi_le' => $contexte->saisiLe->toIso8601String(),
            'horloge_suspecte' => $contexte->horlogeSuspecte,
        ];

        return ['note' => $charge['valeur'], 'auteur' => Auth::id()];
    }
}
