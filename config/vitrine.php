<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Illustrations de la vitrine
    |--------------------------------------------------------------------------
    |
    | Une image par emplacement, chemin depuis public/. Par défaut, les
    | dessins livrés avec l'application (images/vitrine/defaut/). Pour en
    | changer : déposer l'image dans public/images/vitrine/ et indiquer son
    | chemin ici. Formats : SVG, WebP ou JPEG, ≤ 150 Ko ; mêmes proportions
    | que le dessin remplacé (héros 6:7, examens 18:11, soir 28:23). Pas de
    | photo d'élève mineur (DESIGN.md § 8). Un chemin qui ne mène à aucun
    | fichier retombe sur le dessin par défaut.
    |
    */

    'illustrations' => [
        'heros' => 'images/vitrine/defaut/heros.svg',
        'cee' => 'images/vitrine/defaut/cee.svg',
        'bepc' => 'images/vitrine/defaut/bepc.svg',
        'bac' => 'images/vitrine/defaut/bac.svg',
        'soir' => 'images/vitrine/defaut/soir.svg',
    ],

    /*
    |--------------------------------------------------------------------------
    | Photo du héros de la vitrine
    |--------------------------------------------------------------------------
    |
    | Facultative. Chemin, depuis public/, d'une photo détourée (WebP à fond
    | transparent, 900 × 1100 px environ, ≤ 150 Ko), posée devant
    | l'illustration du héros. Une personne majeure, avec son autorisation
    | écrite (DESIGN.md § 8). Absente : l'illustration seule.
    |
    */

    'photo_heros' => 'images/vitrine/heros.webp',

];
