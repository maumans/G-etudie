<?php

use App\Enums\DecisionRelecture;
use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Models\Lecon;
use App\Models\User;
use App\Services\ContenuService;
use App\Support\Uuid7;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->contenu = app(ContenuService::class);
    $this->notion = notionDeTest();
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create();
    $this->pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
});

function leconRedigee(): Lecon
{
    $lecon = test()->contenu->creerLecon(test()->redacteur, test()->notion, 'Pythagore');

    return test()->contenu->enregistrerBrouillon($lecon, test()->redacteur, 'Pythagore', blocsDeTest(), 0);
}

test('critère du lot : un rédacteur écrit une leçon avec formules, un autre la relit et la publie', function () {
    $lecon = leconRedigee();
    $lecon = $this->contenu->soumettre($lecon, $this->redacteur);

    expect($lecon->statut)->toBe(StatutContenu::EnRelecture);

    $lecon = $this->contenu->publier($lecon, $this->relecteur, 'Clair et juste.');

    // Relu en base, pas seulement l'absence d'exception (CLAUDE.md § 4).
    $lecon->refresh();
    $version = $lecon->versionPubliee;

    expect($lecon->statut)->toBe(StatutContenu::Publie)
        ->and($lecon->publie_le)->not->toBeNull()
        ->and($version->numero)->toBe(1)
        ->and($version->blocs['content'][1]['attrs']['latex'])->toBe('a^2 + b^2 = c^2')
        ->and($version->auteur_id)->toBe($this->redacteur->id)
        ->and($version->decision)->toBe(DecisionRelecture::Publiee)
        ->and($version->decide_par_id)->toBe($this->relecteur->id)
        ->and($version->commentaire)->toBe('Clair et juste.');
});

test('critère du lot : l\'auteur ne peut pas se relire, même responsable pédagogique', function () {
    // Le responsable pédagogique a les deux droits : rédiger et relire.
    $lecon = $this->contenu->creerLecon($this->pedagogie, $this->notion, 'Pythagore');
    $lecon = $this->contenu->enregistrerBrouillon($lecon, $this->pedagogie, 'Pythagore', blocsDeTest(), 0);
    $lecon = $this->contenu->soumettre($lecon, $this->pedagogie);

    expect(fn () => $this->contenu->publier($lecon, $this->pedagogie))
        ->toThrow(AuthorizationException::class, 'un autre relecteur');
    expect(fn () => $this->contenu->renvoyer($lecon, $this->pedagogie, 'Je me renvoie ma leçon.'))
        ->toThrow(AuthorizationException::class);

    expect($lecon->fresh()->statut)->toBe(StatutContenu::EnRelecture);
});

test('qui envoie une version ne la relit pas, même s\'il n\'a pas créé la leçon', function () {
    $lecon = leconRedigee();
    // Le responsable pédagogique reprend le brouillon du rédacteur et l'envoie.
    $lecon = $this->contenu->enregistrerBrouillon($lecon, $this->pedagogie, 'Pythagore revu', blocsDeTest('Revu :'), 1);
    $lecon = $this->contenu->soumettre($lecon, $this->pedagogie);

    expect(fn () => $this->contenu->publier($lecon, $this->pedagogie))->toThrow(AuthorizationException::class);
    expect(fn () => $this->contenu->publier($lecon, $this->redacteur))->toThrow(AuthorizationException::class);

    $this->contenu->publier($lecon, $this->relecteur);
    expect($lecon->fresh()->statut)->toBe(StatutContenu::Publie);
});

test('un rédacteur ne relit pas, un relecteur ne rédige pas', function () {
    $autre = User::factory()->avecRole(Role::Redacteur)->create();
    $lecon = $this->contenu->soumettre(leconRedigee(), $this->redacteur);

    expect(fn () => $this->contenu->publier($lecon, $autre))->toThrow(AuthorizationException::class)
        ->and(fn () => $this->contenu->creerLecon($this->relecteur, $this->notion, 'X'))->toThrow(AuthorizationException::class);
});

test('un rédacteur ne touche pas au brouillon d\'un autre ; le responsable pédagogique, si', function () {
    $lecon = leconRedigee();
    $autre = User::factory()->avecRole(Role::Redacteur)->create();

    expect(fn () => $this->contenu->enregistrerBrouillon($lecon, $autre, 'Volé', blocsDeTest(), 1))
        ->toThrow(AuthorizationException::class);

    $this->contenu->enregistrerBrouillon($lecon, $this->pedagogie, 'Corrigé', blocsDeTest(), 1);
    expect($lecon->fresh()->titre)->toBe('Corrigé');
});

test('renvoyer exige un commentaire, que l\'auteur retrouve ; la leçon revient en brouillon', function () {
    $lecon = $this->contenu->soumettre(leconRedigee(), $this->redacteur);

    expect(fn () => $this->contenu->renvoyer($lecon, $this->relecteur, 'Non.'))->toThrow(ValidationException::class);

    $this->contenu->renvoyer($lecon, $this->relecteur, 'Ajoutez un exemple résolu avec des longueurs.');
    $lecon->refresh();

    expect($lecon->statut)->toBe(StatutContenu::Brouillon)
        ->and($lecon->dernierRenvoi()?->commentaire)->toBe('Ajoutez un exemple résolu avec des longueurs.')
        ->and($lecon->version_publiee_id)->toBeNull();

    // Corrigée et renvoyée : version 2.
    $lecon = $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Pythagore', blocsDeTest('Avec un exemple :'), $lecon->revision);
    $lecon = $this->contenu->soumettre($lecon, $this->redacteur);
    expect($lecon->versionEnRelecture()->numero)->toBe(2);
});

test('une leçon publiée qu\'on modifie reste en ligne jusqu\'à la publication suivante', function () {
    $lecon = $this->contenu->publier($this->contenu->soumettre(leconRedigee(), $this->redacteur), $this->relecteur);
    $premiere = $lecon->version_publiee_id;

    $lecon = $this->contenu->ouvrirModification($lecon, $this->redacteur);
    $lecon = $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Pythagore v2', blocsDeTest('Nouveau :'), $lecon->revision);

    expect($lecon->statut)->toBe(StatutContenu::Brouillon)
        ->and($lecon->version_publiee_id)->toBe($premiere)
        ->and($lecon->versionPubliee->titre)->toBe('Pythagore');

    $lecon = $this->contenu->publier($this->contenu->soumettre($lecon, $this->redacteur), $this->relecteur);
    expect($lecon->versionPubliee->titre)->toBe('Pythagore v2')
        ->and($lecon->versionPubliee->numero)->toBe(2);
});

test('deux onglets : le second enregistrement ne s\'écrase pas en silence', function () {
    $lecon = $this->contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore');
    $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Onglet 1', blocsDeTest(), 0);

    expect(fn () => $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Onglet 2', blocsDeTest(), 0))
        ->toThrow(ValidationException::class);
    expect($lecon->fresh()->titre)->toBe('Onglet 1');
});

test('des blocs invalides ne sont jamais enregistrés', function () {
    $lecon = $this->contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore');

    expect(fn () => $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'X', ['type' => 'doc', 'content' => [['type' => 'image']]], 0))
        ->toThrow(ValidationException::class);
    expect($lecon->fresh()->revision)->toBe(0);
});

test('une leçon vide ne part pas en relecture ; une leçon en relecture ne se modifie pas', function () {
    $vide = $this->contenu->creerLecon($this->redacteur, $this->notion, 'Vide');
    expect(fn () => $this->contenu->soumettre($vide, $this->redacteur))->toThrow(ValidationException::class);

    $lecon = $this->contenu->soumettre(leconRedigee(), $this->redacteur);
    expect(fn () => $this->contenu->enregistrerBrouillon($lecon, $this->redacteur, 'X', blocsDeTest(), $lecon->revision))
        ->toThrow(ValidationException::class);
});

test('l\'auteur reprend sa leçon avant décision : la version est marquée reprise', function () {
    $lecon = $this->contenu->soumettre(leconRedigee(), $this->redacteur);
    $version = $lecon->versionEnRelecture();

    $this->contenu->reprendre($lecon, $this->redacteur);

    expect($lecon->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and($version->fresh()->decision)->toBe(DecisionRelecture::Retiree);
});

test('deux relecteurs en même temps : une seule décision', function () {
    $lecon = $this->contenu->soumettre(leconRedigee(), $this->redacteur);
    $second = User::factory()->avecRole(Role::Relecteur)->create();

    $this->contenu->publier($lecon, $this->relecteur);

    expect(fn () => $this->contenu->renvoyer($lecon, $second, 'Trop tard, déjà publiée ailleurs.'))
        ->toThrow(ValidationException::class);
    expect($lecon->fresh()->statut)->toBe(StatutContenu::Publie);
});

test('archiver et restaurer : responsable pédagogique seulement', function () {
    $lecon = leconRedigee();

    expect(fn () => $this->contenu->archiver($lecon, $this->redacteur))->toThrow(AuthorizationException::class);

    $this->contenu->archiver($lecon, $this->pedagogie);
    expect($lecon->fresh()->statut)->toBe(StatutContenu::Archive);

    $this->contenu->restaurer($lecon, $this->pedagogie);
    expect($lecon->fresh()->statut)->toBe(StatutContenu::Brouillon);
});

test('une leçon a un identifiant UUID v7', function () {
    $lecon = $this->contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore');

    expect(Uuid7::estValide($lecon->uuid))->toBeTrue();
});
