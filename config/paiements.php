<?php

/*
| Abonnements et paiements (lot 9, PLAN M16).
|
| Les **prix** et les **durées** des formules sont dans config/vitrine.php
| (`tarifs.formules`) : la vitrine les affiche, le paiement les lit.
*/

return [

    /*
    | La passerelle de paiement mobile utilisée. `simulee` : un faux écran
    | d'opérateur, en développement et en test seulement (refusée en
    | production : le paiement mobile y reste fermé tant qu'un vrai
    | fournisseur n'est pas branché). Les vrais pilotes (Orange Money, MTN
    | MoMo, ou un agrégateur qui couvre les deux) s'ajoutent dans
    | App\Services\Paiements\Passerelles::PILOTES, avec leurs clés ci-dessous.
    */
    'passerelle' => env('PAIEMENT_PASSERELLE', 'simulee'),

    'passerelles' => [
        'simulee' => [
            // Signe les faux webhooks (HMAC SHA-256). Développement seulement.
            'secret' => env('PAIEMENT_SIMULE_SECRET', 'secret-de-la-passerelle-simulee'),
        ],
    ],

    // Un paiement non confirmé au bout de ce délai est déclaré expiré.
    'delai_minutes' => (int) env('PAIEMENT_DELAI_MINUTES', 30),

    /*
    | Codes prépayés. L'empreinte d'un code est un HMAC avec cette clé (à
    | défaut, APP_KEY). **Ne jamais la changer** une fois des codes vendus :
    | ils deviendraient tous invalides. Mettre une clé propre (CODES_ACCES_CLE)
    | dès la mise en production permet de changer APP_KEY sans les perdre.
    */
    'codes' => [
        'cle' => env('CODES_ACCES_CLE'),
        'quantite_max' => 1000,
        // Les codes en clair d'un lot non remis sont effacés au-delà.
        'jours_avant_effacement' => 14,
    ],

    // HL-D8 : un abonnement vaut pour deux appareils (packs d'abonné).
    'appareils_abonne' => 2,

    // Un appareil compte s'il a parlé au serveur dans ce délai.
    'jours_appareil_actif' => 30,

    // Décision de Maurice (2026-11-08) : deux examens blancs par mois sans abonnement.
    'examens_blancs_gratuits_par_mois' => 2,
];
