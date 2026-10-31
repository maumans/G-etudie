<?php

use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Enums\StatutImport;
use App\Enums\TypeQuestion;
use App\Models\Examen;
use App\Models\ImportSujet;
use App\Models\Matiere;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use App\Services\Annales\ExtracteurClaude;
use App\Services\Annales\ExtracteurSimule;
use App\Services\Annales\ExtracteurSujet;
use App\Services\Annales\ExtractionImpossible;
use App\Services\Annales\ResultatExtraction;
use Database\Seeders\DemoAnnalesSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Critère d'acceptation du lot 4 (PLAN § 12) : un sujet scanné devient un
 * sujet structuré publiable **sans saisie manuelle de l'énoncé**. Par les
 * routes réelles : téléversement, lecture (extracteur simulé, la file est
 * `sync` en test), vérification, relecture par un autre, puis l'élève lit.
 */

beforeEach(function () {
    Storage::fake('local');
    config(['annales.extracteur' => 'simule', 'annales.disque' => 'local']);
    $this->notion = notionDeTest();
    notionDeTest('La réciproque du théorème de Pythagore');
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create();
    $this->bepc = Examen::where('code', 'BEPC')->sole();
    $this->maths = Matiere::where('slug', 'maths')->sole();
});

function televerser(object $test, User $auteur, array $champs = []): TestResponse
{
    return $test->actingAs($auteur)->post(route('contenu.annales.imports.store'), [
        'document' => UploadedFile::fake()->createWithContent('bepc-2024.pdf', DemoAnnalesSeeder::pdfExemple('BEPC 2024')),
        'examen_id' => $test->bepc->id,
        'matiere_id' => $test->maths->id,
        'session' => 2024,
        'type' => 'officiel',
        ...$champs,
    ]);
}

test('critère du lot 4 : un sujet scanné devient une annale publiée, sans saisir l\'énoncé', function () {
    televerser($this, $this->redacteur)->assertRedirect(route('contenu.annales.index'));

    $import = ImportSujet::query()->sole();
    $sujet = $import->sujet;

    // Lu, structuré, en brouillon ; le document original reste attaché.
    expect($import->statut)->toBe(StatutImport::Pret)
        ->and($sujet->statut)->toBe(StatutContenu::Brouillon)
        ->and($sujet->est_exemple)->toBeTrue()
        ->and($sujet->document_chemin)->toBe($import->document_chemin)
        ->and($sujet->session)->toBe(2024)
        ->and($sujet->parties()->count())->toBe(2);
    Storage::disk('local')->assertExists($sujet->document_chemin);

    $questions = $sujet->questions()->get();
    expect($questions)->toHaveCount(4)
        ->and($questions->every(fn (Question $q) => $q->reponse_a_verifier && $q->source === 'annale'))->toBeTrue()
        ->and($questions->every(fn (Question $q) => ($q->enonce['content'] ?? []) !== []))->toBeTrue()
        ->and($questions->first()->type)->toBe(TypeQuestion::Numerique)
        ->and($questions->first()->reponse_attendue)->toEqual(['valeur' => 11, 'tolerance' => 0, 'relative' => false]);

    // Pas de relecture tant qu'une réponse proposée n'est pas vérifiée.
    $this->actingAs($this->redacteur)->post(route('contenu.annales.soumettre', $sujet))
        ->assertSessionHasErrors(['blocs' => 'Des réponses proposées par l\'IA restent à vérifier.']);

    foreach ($questions as $question) {
        $this->post(route('contenu.annales.questions.verifier', $question))->assertRedirect();
    }

    $this->post(route('contenu.annales.soumettre', $sujet))->assertRedirect(route('contenu.annales.show', $sujet));
    expect($sujet->fresh()->statut)->toBe(StatutContenu::EnRelecture)
        ->and(Question::query()->where('statut', StatutContenu::EnRelecture->value)->count())->toBe(4);

    // Un autre enseignant publie l'ensemble d'un geste.
    $this->actingAs($this->relecteur)->post(route('contenu.annales.publier', $sujet), ['commentaire' => 'Fidèle.'])
        ->assertRedirect(route('contenu.annales.show', $sujet));

    expect($sujet->fresh()->statut)->toBe(StatutContenu::Publie)
        ->and(Question::query()->where('statut', StatutContenu::Publie->value)->whereNotNull('version_publiee_id')->count())->toBe(4);

    // L'élève de BEPC la lit, énoncé compris.
    $eleve = eleveAvecProfil('BEPC');
    $this->actingAs($eleve)->get(route('eleve.annales.show', $sujet))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/annale')
            ->where('sujet.uuid', $sujet->uuid)
            ->has('sujet.parties', 2)
            ->has('sujet.parties.0.questions', 2)
            ->where('sujet.parties.0.questions.0.annale', 'BEPC 2024')
            ->where('sujet.document.octets', $sujet->document_octets));
});

test('une réponse proposée incohérente devient une question ouverte, l\'énoncé est gardé', function () {
    app()->instance(ExtracteurSujet::class, new class implements ExtracteurSujet
    {
        public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction
        {
            return new ResultatExtraction([
                'titre' => 'Sujet', 'duree_minutes' => 9999, 'coefficient' => '2', 'avertissements' => ['Page 1 floue.'],
                'parties' => [['titre' => 'Exercice 1', 'bareme' => 5, 'consigne' => 'Soit $x$ un réel.', 'questions' => [[
                    'enonce' => 'Calcule $x^2$ pour $x = 3$.', 'type' => 'qcm_une', 'options' => ['9'], 'bonnes_options' => [0],
                    'vrai' => null, 'valeur' => null, 'unite' => null, 'tolerance' => null, 'acceptees' => [], 'bareme' => [],
                    'corrige' => [['titre' => 'Calcul', 'texte' => '$3^2 = 9$']], 'notion_id' => 999999, 'difficulte' => 9,
                ]]]],
            ]);
        }
    });

    televerser($this, $this->redacteur);

    $import = ImportSujet::query()->sole();
    $question = $import->sujet->questions()->sole();

    expect($question->type)->toBe(TypeQuestion::Ouverte)
        ->and($question->extrait)->toStartWith('Calcule')
        ->and($question->donnees['bareme'])->toHaveCount(1)
        ->and($question->notion_id)->toBe($this->notion->id)
        ->and($question->difficulte)->toBe(5)
        ->and($question->corrige[0]['blocs']['content'][0]['content'][0]['type'])->toBe('formule')
        // Durée absurde : non reprise (seulement ce qui est imprimé et plausible).
        ->and($import->sujet->duree_minutes)->toBeNull()
        ->and($import->sujet->coefficient)->toBe('2')
        ->and($import->avertissements)->toContain('Page 1 floue.')
        ->and(implode(' ', $import->avertissements))->toContain('passée en question ouverte')
        ->and(implode(' ', $import->avertissements))->toContain('notion à choisir');
});

test('un échec de lecture est noté avec sa raison, et se relance', function () {
    app()->instance(ExtracteurSujet::class, new class implements ExtracteurSujet
    {
        public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction
        {
            throw new ExtractionImpossible('Le document n\'a pas pu être lu (format ou taille refusés).');
        }
    });

    televerser($this, $this->redacteur);
    $import = ImportSujet::query()->sole();

    expect($import->statut)->toBe(StatutImport::Echec)
        ->and($import->erreur)->toBe('Le document n\'a pas pu être lu (format ou taille refusés).')
        ->and(Sujet::query()->count())->toBe(0);

    // Relancé avec un extracteur qui lit : l'annale est créée.
    app()->instance(ExtracteurSujet::class, app(ExtracteurSimule::class));
    $this->actingAs($this->redacteur)->post(route('contenu.annales.imports.relancer', $import))->assertRedirect();

    expect($import->fresh()->statut)->toBe(StatutImport::Pret)
        ->and($import->fresh()->erreur)->toBeNull()
        ->and(Sujet::query()->count())->toBe(1);
});

test('une réponse sans structure rend l\'import en échec, sans annale à moitié créée', function () {
    app()->instance(ExtracteurSujet::class, new class implements ExtracteurSujet
    {
        public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction
        {
            return new ResultatExtraction(['titre' => 'Rien', 'avertissements' => ['Ce document n\'est pas un sujet d\'examen.'], 'parties' => []]);
        }
    });

    televerser($this, $this->redacteur);

    expect(ImportSujet::query()->sole()->erreur)->toContain('Ce document n\'est pas un sujet d\'examen.')
        ->and(Sujet::query()->count())->toBe(0)
        ->and(Question::query()->count())->toBe(0);
});

test('l\'import est refusé sans programme, sans fichier valide, ou sans permission', function () {
    $physique = Matiere::where('slug', 'physique')->sole();

    televerser($this, $this->redacteur, ['matiere_id' => $physique->id])
        ->assertSessionHasErrors('matiere_id');

    televerser($this, $this->redacteur, ['document' => UploadedFile::fake()->create('sujet.docx', 10, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')])
        ->assertSessionHasErrors(['document' => 'Le document est un PDF ou une photo (JPEG, PNG, WebP).']);

    televerser($this, $this->redacteur, ['document' => UploadedFile::fake()->create('lourd.pdf', 30_000, 'application/pdf')])
        ->assertSessionHasErrors('document');

    // Un Bac sans série.
    televerser($this, $this->redacteur, ['examen_id' => Examen::where('code', 'BAC')->value('id')])
        ->assertSessionHasErrors('serie_id');

    // Le relecteur n'importe pas (l'appel à l'IA a un coût).
    televerser($this, $this->relecteur)->assertForbidden();

    expect(ImportSujet::query()->count())->toBe(0);
});

test('l\'extracteur Claude sans clé échoue avec une phrase claire, sans appel réseau', function () {
    config(['services.anthropic.cle' => null]);
    $import = new ImportSujet(['document_type' => 'application/pdf']);

    expect(fn () => (new ExtracteurClaude)->extraire($import, '%PDF', []))
        ->toThrow(ExtractionImpossible::class, 'clé de l\'API Claude absente');
});

test('le schéma demandé à l\'IA est strict : tout champ requis, aucun en plus', function () {
    $schema = ExtracteurClaude::schema();
    $question = $schema['properties']['parties']['items']['properties']['questions']['items'];

    expect($schema['additionalProperties'])->toBeFalse()
        ->and($schema['required'])->toBe(array_keys($schema['properties']))
        ->and($question['additionalProperties'])->toBeFalse()
        ->and($question['properties']['type']['enum'])->toBe(ExtracteurClaude::TYPES)
        ->and($question['required'])->toContain('enonce', 'corrige', 'notion_id');
});
