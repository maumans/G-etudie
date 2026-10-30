<?php

namespace App\Services\HorsLigne;

use App\Models\Appareil;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Ce que sait un gestionnaire d'opération du geste qu'il exécute : qui, depuis
 * quel appareil, quand (heure de l'appareil corrigée du décalage mesuré) et si
 * cette heure est douteuse.
 */
final readonly class ContexteOperation
{
    public function __construct(
        public User $auteur,
        public Appareil $appareil,
        public string $uuid,
        public CarbonImmutable $saisiLe,
        public CarbonImmutable $recuLe,
        public ?int $decalageSecondes,
        public bool $horlogeSuspecte,
    ) {}
}
