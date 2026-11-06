<?php

namespace App\Models;

use App\Enums\Filiere;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Un pack (HORS_LIGNE.md A.5) : tout le contenu **publié** d'une matière pour
 * un examen, une série et une filière — « Maths · BEPC ». Composé par
 * App\Services\PackService seulement ; aucune donnée personnelle.
 *
 * @property int $id
 * @property string $cle
 * @property int $examen_id
 * @property int|null $serie_id
 * @property Filiere $filiere
 * @property int $matiere_id
 * @property string|null $version empreinte de ses éléments ; null tant qu'il n'a pas été généré
 * @property int $taille_octets
 * @property int $taille_sans_images
 * @property int $morceaux
 * @property array{lecons?: int, fiches?: int, annales?: int, questions?: int}|null $compte
 * @property bool $est_exemple
 * @property Carbon|null $genere_le
 * @property-read Examen $examen
 * @property-read Serie|null $serie
 * @property-read Matiere $matiere
 */
#[Fillable(['cle', 'examen_id', 'serie_id', 'filiere', 'matiere_id', 'version', 'taille_octets', 'taille_sans_images', 'morceaux', 'compte', 'est_exemple', 'genere_le'])]
class Pack extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'filiere' => Filiere::class,
            'compte' => 'array',
            'est_exemple' => 'boolean',
            'genere_le' => 'datetime',
            'taille_octets' => 'integer',
            'taille_sans_images' => 'integer',
            'morceaux' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'cle';
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

    /** @return HasMany<PackElement, $this> */
    public function elements(): HasMany
    {
        return $this->hasMany(PackElement::class);
    }

    /** « Mathématiques · BEPC », « Physique-Chimie · Bac SE ». */
    public function titre(): string
    {
        $examen = $this->examen->code->value === 'BAC' ? 'Bac' : $this->examen->code->value;
        $serie = $this->serie ? ' '.$this->serie->code->value : '';

        return "{$this->matiere->nom} · {$examen}{$serie}";
    }

    public function estGenere(): bool
    {
        return $this->version !== null;
    }
}
