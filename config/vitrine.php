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

    /*
    |--------------------------------------------------------------------------
    | Tarifs (lot 8, D4)
    |--------------------------------------------------------------------------
    |
    | Montants en GNF, entiers, affichés par formaterGnf() (« 15 000 GNF »).
    | Prix de départ proposés au lot 8 (décision de Maurice du 2026-11-06 :
    | « fixe-les, on pourra les changer ») ; à modifier ici ou dans `.env`
    | (TARIF_MENSUEL_GNF, TARIF_ANNEE_GNF), puis `php artisan config:cache`.
    | Repères : un forfait de données de 1 Go coûte environ 10 000 GNF ;
    | l'année scolaire court d'octobre aux examens de juin-juillet. Le lot 9
    | (paiements) lira les mêmes montants.
    |
    */

    'tarifs' => [
        'gratuit' => [
            'Les cours de toutes les matières de votre examen',
            'Une partie des sujets, avec leurs corrigés',
            'La séance du jour et la jauge de préparation',
            'Une matière téléchargée pour réviser hors connexion',
        ],
        'formules' => [
            [
                'cle' => 'mensuel',
                'nom' => 'Mensuel',
                'prix_gnf' => (int) env('TARIF_MENSUEL_GNF', 15000),
                'periode' => 'par mois',
                'mois' => 1,
            ],
            [
                'cle' => 'annee',
                'nom' => 'Année scolaire',
                'prix_gnf' => (int) env('TARIF_ANNEE_GNF', 100000),
                'periode' => 'pour 10 mois',
                'mois' => 10,
            ],
        ],
        'abonnement' => [
            'Tout ce qui est gratuit',
            'Les corrigés détaillés de tous les sujets depuis 2010',
            'Les examens blancs, sans limite',
            'Toutes les matières de votre examen hors connexion',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Partenaires et établissements (PLAN M1)
    |--------------------------------------------------------------------------
    |
    | Seulement de vrais partenaires, avec leur accord : aucun faux logo,
    | aucun faux témoignage. Liste vide : la section n'apparaît pas.
    | Exemple : ['nom' => 'Lycée …', 'logo' => 'images/partenaires/x.svg', 'url' => null]
    |
    */

    'partenaires' => [],

    /*
    |--------------------------------------------------------------------------
    | Question jouable de la vitrine (PLAN M1)
    |--------------------------------------------------------------------------
    |
    | Identifiant (uuid) d'une question **publiée** choisie par l'équipe
    | (BEPC, mathématiques de préférence). Vide ou introuvable : la question
    | d'exemple livrée avec l'application (App\Support\QuestionDemonstration,
    | marquée « Exemple »).
    |
    */

    'question_demo' => env('VITRINE_QUESTION_DEMO'),

    /*
    |--------------------------------------------------------------------------
    | Indexation par les moteurs de recherche (lot 8)
    |--------------------------------------------------------------------------
    |
    | `false` sur une préproduction : balise robots « noindex » partout et
    | `/robots.txt` fermé. Vrai par défaut (production).
    |
    */

    'indexer' => (bool) env('VITRINE_INDEXER', true),

];
