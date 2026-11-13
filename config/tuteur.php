<?php

/*
| Le tuteur N'karamögö (lot 10, PLAN M11).
|
| `moteur` : qui écrit les explications.
|   - `claude` : l'API Claude (App\Services\Tuteur\TuteurClaude), clé
|     `ANTHROPIC_API_KEY` dans `.env` ;
|   - `simule` : des explications d'exemple écrites d'avance, diffusées mot à
|     mot, sans appel réseau, marquées « EXEMPLE » (développement et tests).
|     Jamais en production : là, sans clé, le tuteur dit qu'il est fermé.
|
| `modele` : choisi par Maurice au lot 10 (Sonnet 5.5 : très bon, deux fois
| moins cher qu'Opus, rapide à démarrer). Modifiable sans toucher au code ;
| ajouter alors son prix dans `prix`.
*/

$enProduction = env('APP_ENV') === 'production';

return [
    'moteur' => env('TUTEUR_MOTEUR', $enProduction || env('ANTHROPIC_API_KEY') ? 'claude' : 'simule'),

    'modele' => env('TUTEUR_MODELE', 'claude-sonnet-5-5'),

    // Une explication courte, pour un élève : `low` démarre vite (critère
    // du lot : premier mot en moins de 3 s) et suffit à reformuler un
    // corrigé déjà juste.
    'effort' => env('TUTEUR_EFFORT', 'low'),

    // Plafond d'une réponse (environ 800 mots) : l'explication reste courte.
    'jetons_max' => 2000,

    /*
    | Quotas par jour (décision de Maurice, 2026-11-12) : un avant-goût pour
    | l'élève gratuit, presque sans limite pour l'abonné. Un refus, une
    | demande hors sujet ou une panne ne décomptent rien.
    */
    'quota_gratuit' => (int) env('TUTEUR_QUOTA_GRATUIT', 3),
    'quota_abonne' => (int) env('TUTEUR_QUOTA_ABONNE', 30),

    // Relances dans une même conversation (« Encore plus simple »…).
    'relances_max' => 5,

    // Longueur d'une question tapée par l'élève.
    'texte_max' => 400,

    /*
    | Prix par million de jetons, en dollars (docs.claude.com, relevés le
    | 2026-11-12). Sert au suivi des coûts de la console ; le coût de chaque
    | réponse est gardé en micro-dollars.
    */
    'prix' => [
        'claude-sonnet-5-5' => ['entree' => 2.00, 'sortie' => 10.00, 'cache_lu' => 0.10, 'cache_ecrit' => 2.50],
        'claude-opus-5-5' => ['entree' => 4.00, 'sortie' => 20.00, 'cache_lu' => 0.20, 'cache_ecrit' => 5.00],
        'claude-haiku-5-5' => ['entree' => 0.10, 'sortie' => 0.50, 'cache_lu' => 0.01, 'cache_ecrit' => 0.125],
    ],

    // Pour lire le coût en GNF dans la console (estimation, à ajuster).
    'gnf_par_dollar' => (int) env('TUTEUR_GNF_PAR_DOLLAR', 8600),
];
