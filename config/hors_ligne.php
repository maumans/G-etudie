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
        // Lot 2 : les cours se relisent hors ligne d'après leur copie, ou
        // depuis un pack (lot 7) ; la séance se reprend après un rechargement.
        '/eleve/cours',
        '/eleve/lecons',
        '/eleve/chapitres',
        '/eleve/seances',
        // Lot 4 : une annale déjà ouverte se relit d'après sa copie (packs au
        // lot 7) ; le document original (/eleve/documents/…), lui, reste en
        // ligne seulement.
        '/eleve/annales',
        '/eleve/signalements$',
        // Lot 5 : l'historique et les résultats se relisent d'après leur copie.
        '/eleve/examens-blancs',
        '/compte/affichage$',
    ],

    // Réseau d'abord : au-delà, la copie gardée est servie (A.3.1).
    'delai_reseau_ms' => 6000,

    // Versions du build gardées par le service worker (A.3.1).
    'versions_gardees' => 3,
];
