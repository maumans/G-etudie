<?php

/*
| Mode hors ligne (HORS_LIGNE.md A.3.1, A.3.7).
|
| `pages` : liste blanche des écrans gardés par le service worker (copie par
| utilisateur, réseau d'abord). Préfixes comparés par segment : « /lecons »
| couvre « /lecons/12 », pas « /lecons-admin » ; un « $ » final borne le
| préfixe (« /annales$ » = la liste seulement). La même règle vit dans
| resources/service-worker/sw.js et resources/js/lib/hors-ligne/ecrans.ts.
|
| Chaque lot y ajoute ses écrans de niveau B (A.2) : leçons (lot 2), annales
| (lot 4), progression (lot 6)…
*/

return [
    'pages' => [
        '/eleve$',
        '/compte/affichage$',
    ],

    // Réseau d'abord : au-delà, la copie gardée est servie (A.3.1).
    'delai_reseau_ms' => 6000,

    // Versions du build gardées par le service worker (A.3.1).
    'versions_gardees' => 3,
];
