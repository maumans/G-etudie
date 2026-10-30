<?php

use App\Enums\Role;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Serie;
use App\Models\User;
use Database\Seeders\ReferentielSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(ReferentielSeeder::class);
    $this->pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
});

test('seuls le responsable pédagogique et l\'administrateur plateforme ouvrent le référentiel', function (Role $role, int $statut) {
    $user = User::factory()->avecRole($role)->create();

    foreach (['matieres.index', 'epreuves.index', 'programme.index', 'annees.index'] as $route) {
        $this->actingAs($user)->get(route("contenu.referentiel.{$route}"))->assertStatus($statut);
    }
})->with([
    'rédacteur' => [Role::Redacteur, 403],
    'relecteur' => [Role::Relecteur, 403],
    'élève' => [Role::Eleve, 403],
    'responsable pédagogique' => [Role::AdminContenu, 200],
    'administrateur plateforme' => [Role::Superadmin, 200],
]);

test('un rédacteur ne peut rien écrire dans le référentiel', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();

    $this->actingAs($redacteur)
        ->post(route('contenu.referentiel.matieres.store'), ['nom' => 'Arabe', 'teinte' => 'anglais'])
        ->assertForbidden();

    expect(Matiere::where('nom', 'Arabe')->exists())->toBeFalse();
});

test('l\'écran des matières liste les matières avec leurs teintes', function () {
    $this->actingAs($this->pedagogie)
        ->get(route('contenu.referentiel.matieres.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/referentiel/matieres')
            ->has('matieres', count(ReferentielSeeder::MATIERES))
            ->where('matieres.0.nom', 'Mathématiques')
            ->where('matieres.0.teinte', 'maths')
            ->where('matieres.0.phares', 3)
            ->has('teintes', 10));
});

test('ajouter une matière : slug tiré du nom, teinte enregistrée, placée en dernier', function () {
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.matieres.store'), ['nom' => 'Éducation civique et morale', 'teinte' => 'histoire'])
        ->assertRedirect(route('contenu.referentiel.matieres.index'));

    $matiere = Matiere::where('nom', 'Éducation civique et morale')->sole();

    expect($matiere->slug)->toBe('education-civique-et-morale')
        ->and($matiere->teinte->value)->toBe('histoire')
        ->and($matiere->ordre)->toBe(Matiere::max('ordre'));
});

test('une matière au nom déjà pris ou à la teinte inconnue est refusée', function () {
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.matieres.store'), ['nom' => 'Mathématiques', 'teinte' => 'violet'])
        ->assertSessionHasErrors(['nom', 'teinte']);

    expect(Matiere::count())->toBe(count(ReferentielSeeder::MATIERES));
});

test('renommer une matière garde un slug unique', function () {
    $culture = Matiere::where('slug', 'culture')->sole();

    $this->actingAs($this->pedagogie)
        ->put(route('contenu.referentiel.matieres.update', $culture), ['nom' => 'Maths', 'teinte' => 'culture'])
        ->assertSessionHasNoErrors();

    expect($culture->fresh()->slug)->toBe('maths-2');
});

test('une matière qui porte une épreuve ne se supprime pas ; une matière libre, si', function () {
    $maths = Matiere::where('slug', 'maths')->sole();
    $culture = Matiere::where('slug', 'culture')->sole();

    $this->actingAs($this->pedagogie)
        ->delete(route('contenu.referentiel.matieres.destroy', $maths))
        ->assertSessionHasErrors('matiere');
    $this->actingAs($this->pedagogie)
        ->delete(route('contenu.referentiel.matieres.destroy', $culture))
        ->assertSessionHasNoErrors();

    expect($maths->fresh())->not->toBeNull()
        ->and($culture->fresh())->toBeNull();
});

test('ajouter une épreuve au Bac SS, puis la saisir', function () {
    $annee = AnneeScolaire::courante();
    $anglais = Matiere::where('slug', 'anglais')->sole();

    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.epreuves.store'), [
            'annee_scolaire_id' => $annee->id,
            'parcours' => 'BAC-SS',
            'matiere_id' => $anglais->id,
            'filiere' => 'generale',
        ])
        ->assertSessionHasNoErrors();

    $epreuve = Epreuve::where('matiere_id', $anglais->id)->sole();
    $ss = Serie::where('code', 'SS')->sole();

    expect($epreuve->serie_id)->toBe($ss->id)
        ->and($epreuve->coefficient)->toBeNull()
        ->and($epreuve->phare)->toBeFalse();

    $this->actingAs($this->pedagogie)
        ->put(route('contenu.referentiel.epreuves.update', $epreuve), [
            'filiere' => 'generale',
            'coefficient' => '2.5',
            'duree_minutes' => 120,
            'phare' => true,
        ])
        ->assertSessionHasNoErrors();

    $epreuve->refresh();
    expect($epreuve->coefficient)->toBe('2.5')
        ->and($epreuve->duree_minutes)->toBe(120)
        ->and($epreuve->phare)->toBeTrue();
});

test('une matière ne figure qu\'une fois par examen et filière ; un coefficient se saisit par demi-points', function () {
    $annee = AnneeScolaire::courante();
    $maths = Matiere::where('slug', 'maths')->sole();

    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.epreuves.store'), [
            'annee_scolaire_id' => $annee->id,
            'parcours' => 'BEPC',
            'matiere_id' => $maths->id,
            'filiere' => 'generale',
        ])
        ->assertSessionHasErrors('matiere_id');

    $epreuve = Epreuve::where('matiere_id', $maths->id)->firstOrFail();
    $this->actingAs($this->pedagogie)
        ->put(route('contenu.referentiel.epreuves.update', $epreuve), ['filiere' => 'generale', 'coefficient' => '2.3'])
        ->assertSessionHasErrors('coefficient');

    // Même matière en filière franco-arabe : une autre épreuve.
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.epreuves.store'), [
            'annee_scolaire_id' => $annee->id,
            'parcours' => 'BEPC',
            'matiere_id' => $maths->id,
            'filiere' => 'franco_arabe',
        ])
        ->assertSessionHasNoErrors();
});

test('l\'écran des épreuves montre le parcours choisi, coefficients vides', function () {
    $this->actingAs($this->pedagogie)
        ->get(route('contenu.referentiel.epreuves.index', ['parcours' => 'BAC-SE']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/referentiel/offre')
            ->where('parcours_cle', 'BAC-SE')
            ->has('parcours', 5)
            ->has('epreuves', 4)
            ->where('epreuves.0.coefficient', null)
            ->where('epreuves.0.phare', true));
});

test('le programme : chapitres et notions s\'ajoutent en dernier et se réordonnent', function () {
    $maths = Matiere::where('slug', 'maths')->sole();
    $classe = Classe::where('examen_id', Examen::where('code', 'BEPC')->value('id'))->sole();

    foreach (['Premier', 'Deuxième', 'Troisième'] as $titre) {
        $this->actingAs($this->pedagogie)
            ->post(route('contenu.referentiel.chapitres.store'), [
                'matiere_id' => $maths->id,
                'classe_id' => $classe->id,
                'titre' => $titre,
            ])
            ->assertSessionHasNoErrors();
    }

    $troisieme = Chapitre::where('titre', 'Troisième')->sole();
    expect($troisieme->ordre)->toBe(3);

    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.chapitres.deplacer', $troisieme), ['sens' => -1]);

    expect(Chapitre::orderBy('ordre')->pluck('titre')->all())->toBe(['Premier', 'Troisième', 'Deuxième']);

    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.notions.store', $troisieme), ['titre' => 'Une notion'])
        ->assertSessionHasNoErrors();

    $this->actingAs($this->pedagogie)
        ->delete(route('contenu.referentiel.chapitres.destroy', $troisieme))
        ->assertSessionHasErrors('chapitre');
    expect($troisieme->fresh())->not->toBeNull();

    $this->actingAs($this->pedagogie)
        ->get(route('contenu.referentiel.programme.index', ['matiere' => $maths->id, 'classe' => $classe->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/referentiel/programme')
            ->has('chapitres', 3)
            ->where('chapitres.1.titre', 'Troisième')
            ->where('chapitres.1.notions.0.titre', 'Une notion'));
});

test('déplacer le premier vers le haut ne change rien', function () {
    $maths = Matiere::where('slug', 'maths')->sole();
    $classe = Classe::firstOrFail();
    $a = Chapitre::create(['matiere_id' => $maths->id, 'classe_id' => $classe->id, 'titre' => 'A', 'ordre' => 1]);
    Chapitre::create(['matiere_id' => $maths->id, 'classe_id' => $classe->id, 'titre' => 'B', 'ordre' => 2]);

    $this->actingAs($this->pedagogie)->post(route('contenu.referentiel.chapitres.deplacer', $a), ['sens' => -1]);
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.chapitres.deplacer', $a), ['sens' => 5])
        ->assertSessionHasErrors('sens');

    expect(Chapitre::orderBy('ordre')->pluck('titre')->all())->toBe(['A', 'B']);
});

test('une notion sans leçon se renomme et se supprime', function () {
    $chapitre = Chapitre::create(['matiere_id' => Matiere::firstOrFail()->id, 'classe_id' => Classe::firstOrFail()->id, 'titre' => 'C']);
    $notion = Notion::create(['chapitre_id' => $chapitre->id, 'titre' => 'Ancien titre', 'ordre' => 1]);

    $this->actingAs($this->pedagogie)->put(route('contenu.referentiel.notions.update', $notion), ['titre' => 'Nouveau titre']);
    expect($notion->fresh()->titre)->toBe('Nouveau titre');

    $this->actingAs($this->pedagogie)->delete(route('contenu.referentiel.notions.destroy', $notion))->assertSessionHasNoErrors();
    expect($notion->fresh())->toBeNull();
});

test('une seule année est courante', function () {
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.annees.store'), ['libelle' => '2027-2028', 'debut' => '2027-09-01', 'fin' => '2028-08-31'])
        ->assertSessionHasNoErrors();

    $nouvelle = AnneeScolaire::where('libelle', '2027-2028')->sole();
    expect($nouvelle->courante)->toBeFalse();

    $this->actingAs($this->pedagogie)->post(route('contenu.referentiel.annees.courante', $nouvelle));

    expect(AnneeScolaire::where('courante', true)->pluck('libelle')->all())->toBe(['2027-2028']);
});

test('une année mal écrite ou qui finit avant de commencer est refusée', function () {
    $this->actingAs($this->pedagogie)
        ->post(route('contenu.referentiel.annees.store'), ['libelle' => '2027', 'debut' => '2027-09-01', 'fin' => '2027-01-01'])
        ->assertSessionHasErrors(['libelle', 'fin']);
});
