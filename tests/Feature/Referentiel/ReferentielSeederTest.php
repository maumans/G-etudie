<?php

use App\Enums\CodeExamen;
use App\Enums\TeinteMatiere;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Serie;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Database\UniqueConstraintViolationException;

test('le référentiel sème la structure des examens, et se relance sans doublon', function () {
    $this->seed(ReferentielSeeder::class);
    $this->seed(ReferentielSeeder::class);

    expect(Examen::orderBy('ordre')->pluck('code')->all())->toBe(CodeExamen::cases())
        ->and(Serie::count())->toBe(3)
        ->and(Classe::orderBy('ordre')->pluck('nom')->all())->toBe(['6e année', '10e année', 'Terminale'])
        ->and(Matiere::count())->toBe(count(ReferentielSeeder::MATIERES))
        ->and(AnneeScolaire::where('courante', true)->count())->toBe(1);

    $attendues = array_sum(array_map('count', ReferentielSeeder::PHARES));
    expect(Epreuve::where('phare', true)->count())->toBe($attendues);
});

test('aucune donnée officielle inventée : ni coefficient, ni durée, ni programme', function () {
    $this->seed(ReferentielSeeder::class);

    expect(Epreuve::whereNotNull('coefficient')->orWhereNotNull('duree_minutes')->count())->toBe(0)
        ->and(Chapitre::count())->toBe(0)
        ->and(Notion::count())->toBe(0);
});

test('un db:seed de déploiement ne défait pas le travail du responsable pédagogique', function () {
    $this->seed(ReferentielSeeder::class);

    $maths = Matiere::where('slug', 'maths')->sole();
    $maths->update(['nom' => 'Maths (renommée)']);
    Matiere::where('slug', 'culture')->sole()->delete();

    $epreuve = Epreuve::where('matiere_id', $maths->id)->firstOrFail();
    $epreuve->update(['coefficient' => '4.0', 'phare' => false]);
    Epreuve::where('matiere_id', '!=', $maths->id)->firstOrFail()->delete();
    $avant = Epreuve::count();

    $this->seed(ReferentielSeeder::class);

    expect($maths->fresh()->nom)->toBe('Maths (renommée)')
        ->and(Matiere::where('slug', 'culture')->exists())->toBeFalse()
        ->and($epreuve->fresh()->coefficient)->toBe('4.0')
        ->and($epreuve->fresh()->phare)->toBeFalse()
        ->and(Epreuve::count())->toBe($avant);
});

test('la clé d\'unicité d\'une épreuve compte la série nulle', function () {
    $this->seed(ReferentielSeeder::class);

    $epreuve = Epreuve::whereNull('serie_id')->firstOrFail();

    expect(fn () => Epreuve::create($epreuve->only([
        'annee_scolaire_id', 'examen_id', 'serie_id', 'matiere_id', 'filiere',
    ])))->toThrow(UniqueConstraintViolationException::class);
});

test('les teintes de matière sont les mêmes en PHP et dans lib/matieres.ts', function () {
    $source = file_get_contents(resource_path('js/lib/matieres.ts'));
    preg_match('/export type CleMatiere =([^;]+);/', $source, $type);
    preg_match_all("/'([a-z]+)'/", $type[1], $cles);

    expect($cles[1])->toBe(array_map(fn (TeinteMatiere $t) => $t->value, TeinteMatiere::cases()))
        ->and(array_keys(ReferentielSeeder::MATIERES))->toBe($cles[1]);
});
