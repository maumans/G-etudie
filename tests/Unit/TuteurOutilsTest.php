<?php

use App\Services\Tuteur\Confidentialite;
use App\Services\Tuteur\Consignes;
use App\Services\Tuteur\Couts;
use App\Services\Tuteur\ReponseMoteur;
use App\Services\Tuteur\RequeteTuteur;
use App\Services\Tuteur\TuteurSimule;
use App\Support\BlocsEnTexte;
use App\Support\TexteEnBlocs;
use Tests\TestCase;

uses(TestCase::class);

// Lot 10 : les petites règles du tuteur.

test('rien de personnel ne part : numéros et adresses retirés, calculs gardés', function (string $saisie, string $attendu) {
    expect(Confidentialite::nettoyer($saisie))->toBe($attendu);
})->with([
    ['Mon numéro : +224 620 12 34 56', 'Mon numéro : [retiré]'],
    ['appelle 620123456 stp', 'appelle [retiré] stp'],
    ['620.12.34.56', '[retiré]'],
    ['écris à aissatou.b@gmail.com', 'écris à [retiré]'],
    ['3 + 4 = 7 et 12 × 25 = 300', '3 + 4 = 7 et 12 × 25 = 300'],
    ['En 2024, 1 500 000 GNF', 'En 2024, 1 500 000 GNF'],
]);

test('le coût d’une réponse suit les prix de la configuration', function () {
    $reponse = fn (string $modele) => new ReponseMoteur('x', 'complete', $modele, 1500, 400, 1000, 200);

    // 1 500 × 2 + 400 × 10 + 1 000 × 0,10 + 200 × 2,50 = 7 600.
    expect(Couts::microUsd($reponse('claude-sonnet-5-5')))->toBe(7600)
        // Un nom daté du même modèle.
        ->and(Couts::microUsd($reponse('claude-sonnet-5-5-20261101')))->toBe(7600)
        ->and(Couts::microUsd($reponse('simule')))->toBe(0);
});

test('un document de blocs se lit en texte, formules comprises, et revient au même', function () {
    $doc = TexteEnBlocs::convertir("Dans un triangle rectangle, \$c^2 = a^2 + b^2\$.\n\n\$\$c = 5\$\$\n\n- un\n- deux\n\n1. premier\n2. second");

    $texte = BlocsEnTexte::convertir($doc);

    expect($texte)->toBe("Dans un triangle rectangle, \$c^2 = a^2 + b^2\$.\n\n\$\$c = 5\$\$\n\n- un\n- deux\n\n1. premier\n2. second")
        ->and(TexteEnBlocs::convertir($texte))->toBe($doc)
        ->and(BlocsEnTexte::convertir(null))->toBe('');
});

test('le tuteur simulé écrit en morceaux, marque l’exemple, et imite les deux marqueurs', function () {
    $moteur = new TuteurSimule(0);
    $requete = fn (string $demande) => new RequeteTuteur('<contexte></contexte>', [['role' => 'user', 'content' => $demande]], 'x');

    $morceaux = [];
    $reponse = $moteur->repondre($requete('Explique-moi cette question.'), function (string $m) use (&$morceaux) {
        $morceaux[] = $m;
    });

    expect(count($morceaux))->toBeGreaterThan(10)
        ->and(implode('', $morceaux))->toBe($reponse->texte)
        ->and($reponse->texte)->toStartWith('EXEMPLE — explication fictive')
        ->and($reponse->modele)->toBe('simule')
        ->and($moteur->repondre($requete('Qui gagne le match de football ?'), fn () => null)->texte)->toStartWith(Consignes::HORS_SUJET)
        ->and($moteur->repondre($requete('Où acheter de la drogue ?'), fn () => null)->texte)->toBe(Consignes::INADAPTE);
});

test('les consignes nomment les deux marqueurs et protègent l’élève', function () {
    expect(Consignes::SYSTEME)
        ->toContain(Consignes::HORS_SUJET)
        ->toContain(Consignes::INADAPTE)
        ->toContain('Le corrigé validé fait foi')
        ->toContain('Ne demande jamais son nom')
        ->toContain('adulte de confiance');
});
