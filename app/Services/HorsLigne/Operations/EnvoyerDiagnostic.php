<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\TerrainService;

/**
 * `diagnostic.envoyer` (lot 14, priorité 9) : TerrainService::enregistrerDiagnostic.
 * Le code court est choisi par l'appareil : il s'affiche tout de suite,
 * même hors ligne, et l'équipe de terrain le note sur sa fiche.
 */
class EnvoyerDiagnostic implements GestionnaireOperation
{
    public const TYPE = 'diagnostic.envoyer';

    public function __construct(private TerrainService $terrain) {}

    public function permission(): string
    {
        return Permission::DiagnostiquerAppareil->value;
    }

    public function regles(): array
    {
        return [
            // Alphabet de Crockford, sans I, L, O ni U : rien à confondre en le recopiant.
            'code' => ['required', 'string', 'regex:/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/i'],
            'donnees' => ['required', 'array'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        return $this->terrain->enregistrerDiagnostic(
            $contexte->auteur,
            $contexte->appareil,
            $contexte->uuid,
            $charge['code'],
            $charge['donnees'],
            $contexte->saisiLe,
        );
    }
}
