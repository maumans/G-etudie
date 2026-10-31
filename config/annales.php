<?php

/*
| Annales et import assisté (PLAN M6, M17 ; lot 4).
|
| `extracteur` : qui lit le document téléversé.
|   - `claude` : l'API Claude en vision (App\Services\Annales\ExtracteurClaude),
|     clé `ANTHROPIC_API_KEY` dans `.env` ;
|   - `simule` : un sujet d'exemple fixe, sans appel réseau, marqué
|     `est_exemple` (développement et tests). Jamais en production : là,
|     l'absence de clé fait échouer l'import avec sa raison.
|
| `modele` : choisi par Maurice au lot 4 (Opus 5.5, meilleur sur les scans
| flous et les formules denses) ; modifiable sans toucher au code.
*/

$enProduction = env('APP_ENV') === 'production';

return [
    'extracteur' => env('ANNALES_EXTRACTEUR', $enProduction || env('ANTHROPIC_API_KEY') ? 'claude' : 'simule'),

    'modele' => env('ANNALES_MODELE', 'claude-opus-5-5'),

    // Effort de lecture : un sujet entier, formules comprises, mérite `high`.
    'effort' => env('ANNALES_EFFORT', 'high'),

    // Le document original : disque privé, jamais servi sans policy.
    'disque' => env('ANNALES_DISQUE', 'local'),
    'dossier' => 'annales',

    // 20 Mo : sous la limite de l'API (32 Mo par requête, base64 compris).
    'taille_max_ko' => 20_480,

    'types' => [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ],
];
