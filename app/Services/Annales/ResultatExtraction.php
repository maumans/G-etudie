<?php

namespace App\Services\Annales;

/**
 * Ce que rend un extracteur : la proposition (forme de ExtracteurClaude::SCHEMA),
 * le modèle et les jetons consommés (coût suivi, PLAN M11), et si le contenu
 * est fictif (extracteur simulé : le sujet créé porte `est_exemple`).
 */
final readonly class ResultatExtraction
{
    /**
     * @param  array<string, mixed>  $proposition
     */
    public function __construct(
        public array $proposition,
        public ?string $modele = null,
        public ?int $jetonsEntree = null,
        public ?int $jetonsSortie = null,
        public bool $estExemple = false,
    ) {}
}
