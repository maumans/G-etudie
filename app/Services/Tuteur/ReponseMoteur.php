<?php

namespace App\Services\Tuteur;

/**
 * Ce qu'un moteur rend une fois le flux fini.
 *
 * `fin` : `complete` (fin naturelle), `coupee` (plafond de jetons atteint :
 * le texte reste, c'est une explication longue), `refus` (le modèle a
 * décliné).
 */
final readonly class ReponseMoteur
{
    public function __construct(
        public string $texte,
        public string $fin,
        public string $modele,
        public int $jetonsEntree = 0,
        public int $jetonsSortie = 0,
        public int $jetonsCacheLus = 0,
        public int $jetonsCacheEcrits = 0,
    ) {}
}
