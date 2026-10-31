<?php

namespace App\Models;

use App\Enums\CodeExamen;
use App\Enums\Filiere;
use App\Enums\StatutContenu;
use App\Enums\TypeSujet;
use App\Models\Concerns\EstRelisable;
use App\Models\Contracts\ContenuRelisable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Carbon;

/**
 * Un sujet d'examen (PLAN M6) : une annale (`officiel`) ou un sujet maison,
 * découpé en parties dont les questions sont des questions ordinaires
 * (`source = annale`). Le document original (scan, PDF) reste attaché : il
 * prouve l'authenticité de la version structurée.
 *
 * Même circuit que les leçons et les questions (App\Services\ContenuService,
 * via App\Services\Annales\SujetService) : une version fige la **structure**
 * (parties, consignes, ordre des questions) ; les questions sont relues et
 * publiées **avec leur sujet**, en un seul geste du relecteur.
 *
 * @property int $id
 * @property string $uuid
 * @property int $examen_id
 * @property int|null $serie_id
 * @property int $matiere_id
 * @property Filiere $filiere
 * @property int $session l'année de l'examen
 * @property TypeSujet $type
 * @property string $titre
 * @property int|null $duree_minutes durée imprimée sur le document
 * @property string|null $coefficient coefficient imprimé sur le document
 * @property string|null $droits référence de l'autorisation de publier (D5)
 * @property string|null $document_chemin
 * @property string|null $document_nom
 * @property string|null $document_type
 * @property int|null $document_octets
 * @property int|null $auteur_id
 * @property StatutContenu $statut
 * @property int $revision
 * @property int|null $version_publiee_id
 * @property Carbon|null $publie_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Examen $examen
 * @property-read Serie|null $serie
 * @property-read Matiere $matiere
 * @property-read User|null $auteur
 * @property-read VersionContenu|null $versionPubliee
 * @property-read Collection<int, SujetPartie> $parties
 */
#[Fillable(['uuid', 'examen_id', 'serie_id', 'matiere_id', 'filiere', 'session', 'type', 'titre', 'duree_minutes', 'coefficient', 'droits', 'document_chemin', 'document_nom', 'document_type', 'document_octets', 'auteur_id', 'statut', 'revision', 'version_publiee_id', 'publie_le', 'est_exemple'])]
class Sujet extends Model implements ContenuRelisable
{
    use EstRelisable;

    protected function casts(): array
    {
        return [
            'filiere' => Filiere::class,
            'session' => 'integer',
            'type' => TypeSujet::class,
            'duree_minutes' => 'integer',
            'document_octets' => 'integer',
            'statut' => StatutContenu::class,
            'revision' => 'integer',
            'publie_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<Examen, $this> */
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }

    /** @return BelongsTo<Serie, $this> */
    public function serie(): BelongsTo
    {
        return $this->belongsTo(Serie::class);
    }

    /** @return BelongsTo<Matiere, $this> */
    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class);
    }

    /** @return HasMany<SujetPartie, $this> */
    public function parties(): HasMany
    {
        return $this->hasMany(SujetPartie::class)->orderBy('ordre')->orderBy('id');
    }

    /** @return HasManyThrough<Question, SujetPartie, $this> */
    public function questions(): HasManyThrough
    {
        return $this->hasManyThrough(Question::class, SujetPartie::class);
    }

    /** « annale » : féminin, comme les autres contenus des messages du circuit. */
    public function nomContenu(): string
    {
        return 'annale';
    }

    /** « BEPC 2019 », « Bac SE 2019 » : ce que lit l'élève sous un exercice. */
    public function libelleSession(): string
    {
        $examen = $this->examen->code === CodeExamen::Bac ? 'Bac' : $this->examen->code->value;

        return trim($examen.' '.($this->serie?->code->value ?? '')).' '.$this->session;
    }

    /**
     * La structure, telle que la fige une version : parties dans l'ordre,
     * chacune avec ses questions (par identifiant, dans l'ordre du sujet).
     *
     * @return array{titre: string, blocs: array<string, mixed>}
     */
    public function instantane(): array
    {
        $this->load(['parties.questions']);

        return [
            'titre' => $this->titre,
            'blocs' => [
                'duree_minutes' => $this->duree_minutes,
                'coefficient' => $this->coefficient,
                'parties' => $this->parties->map(fn (SujetPartie $partie) => [
                    'uuid' => $partie->uuid,
                    'titre' => $partie->titre,
                    'bareme' => $partie->bareme === null ? null : (float) $partie->bareme,
                    'consigne' => $partie->consigne,
                    'questions' => $partie->questions->pluck('uuid')->all(),
                ])->all(),
            ],
        ];
    }

    public function erreurAvantRelecture(): ?string
    {
        $this->load(['parties.questions']);
        $questions = $this->parties->flatMap(fn (SujetPartie $partie) => $partie->questions)->values();

        if (trim($this->titre) === '' || $questions->isEmpty()) {
            return 'Une annale sans question ne part pas en relecture.';
        }

        if ($questions->contains(fn (Question $q) => $q->reponse_a_verifier)) {
            return 'Des réponses proposées par l\'IA restent à vérifier.';
        }

        foreach ($questions as $rang => $question) {
            if ($question->statut === StatutContenu::Archive) {
                return 'Question '.($rang + 1).' : elle est archivée ; retirez-la du sujet ou restaurez-la.';
            }

            if ($question->statut === StatutContenu::Brouillon && ($erreur = $question->erreurAvantRelecture()) !== null) {
                return 'Question '.($rang + 1).' : '.$erreur;
            }
        }

        return null;
    }
}
