<?php

use App\Models\User;

/**
 * Filet de démarrage (HORS_LIGNE.md A.3.3, défaut 2) : il vit dans le
 * document, car c'est justement le code de l'application qui manque.
 */
test('le filet est dans le document, caché par un style en ligne, et rassure d\'abord', function () {
    $html = $this->get('/')->assertOk()->getContent();

    expect($html)->toMatch('/<div id="filet-demarrage" role="alert" style="display:none;/')
        ->and($html)->not->toMatch('/id="filet-demarrage"[^>]*\shidden[\s>]/')
        ->and($html)->toContain('Tes réponses déjà faites sont gardées sur ce téléphone.')
        ->and($html)->toContain("location.origin + '/build/'")
        ->and($html)->toContain("addEventListener('online'");
});

test('chaque page déclare le manifeste de l\'application installable', function () {
    $this->actingAs(User::factory()->create())
        ->get('/eleve')
        ->assertOk()
        ->assertSee('<link rel="manifest" href="/manifest.webmanifest">', false);

    $manifeste = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true);

    expect($manifeste['display'])->toBe('standalone')
        ->and($manifeste['start_url'])->toBe('/eleve')
        ->and(collect($manifeste['icons'])->pluck('purpose')->all())->toContain('maskable');

    foreach ($manifeste['icons'] as $icone) {
        expect(public_path(ltrim($icone['src'], '/')))->toBeFile();
    }
});

test('la liste blanche des écrans est partagée à chaque page', function () {
    $this->actingAs(User::factory()->create())
        ->get('/eleve')
        ->assertInertia(fn ($page) => $page->where('hors_ligne_pages', config('hors_ligne.pages')));
});
