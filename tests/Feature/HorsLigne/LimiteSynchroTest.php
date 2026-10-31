<?php

use App\Models\User;

/*
 * Bug trouvé au lot 2 : la synchronisation (`throttle:120,1`) et « Mon
 * compte » (`throttle:6,1`) partageaient le même compteur par utilisateur.
 * Après une séance (une requête par réponse), supprimer son compte ou
 * changer son mot de passe répondait 429.
 */

test('une séance synchronisée ne bloque pas la suppression du compte', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);

    // Dix battements : plus que la limite de 6 de « Mon compte ».
    foreach (range(1, 10) as $ignore) {
        $this->actingAs($eleve)->withHeaders(['X-Appareil' => $jeton])->getJson(route('sync.etat'))->assertOk();
    }

    $this->actingAs($eleve)
        ->delete(route('compte.destroy'), ['password' => 'password'])
        ->assertRedirect('/');

    expect(User::find($eleve->id))->toBeNull();
});

test('la synchronisation garde sa propre limite de 120 requêtes par minute', function () {
    $eleve = User::factory()->create();
    appareilDe($eleve);

    // appareilDe() a fait le premier battement.
    foreach (range(1, 119) as $ignore) {
        $this->actingAs($eleve)->getJson(route('sync.etat'));
    }

    $this->actingAs($eleve)->getJson(route('sync.etat'))->assertStatus(429);
});
