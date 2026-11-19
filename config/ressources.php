<?php

/*
| Ressources externes (lot 12, PLAN M19) : liens vers des ressources libres
| et sûres, par notion, vérifiés par un relecteur. **Liste fermée** des
| sites acceptés (HTTPS seulement ; un sous-domaine d'un site listé est
| accepté : « fr.wikipedia.org » couvre « fr.m.wikipedia.org »). Aucun
| raccourcisseur de liens.
|
| YouTube : accepté à la demande de Maurice (2026-11-18), chaque vidéo
| vérifiée par un relecteur. Le site affiche ses suggestions et ses
| publicités : l'élève en est prévenu avant de partir.
*/

return [
    'domaines' => [
        'wikipedia.org' => 'Wikipédia',
        'wikimedia.org' => 'Wikimedia Commons',
        'vikidia.org' => 'Vikidia',
        'khanacademy.org' => 'Khan Academy',
        'lumni.fr' => 'Lumni',
        'youtube.com' => 'YouTube',
        'youtu.be' => 'YouTube',
    ],

    // Domaines dont les pages affichent des suggestions et de la publicité :
    // le dialogue de sortie le dit.
    'avec_suggestions' => ['youtube.com', 'youtu.be'],

    // Contrôle hebdomadaire des liens vérifiés (ressources:verifier).
    'controle' => [
        'delai_secondes' => 8,
        'par_passage' => 200,
    ],
];
