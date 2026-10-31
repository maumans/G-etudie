<?php

namespace App\Models;

use App\Enums\CodeExamen;
use App\Enums\Filiere;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ce que l'élève prépare (PLAN M2, parcours d'accueil) : examen, série (Bac
 * seulement), filière, classe d'examen, établissement facultatif, objectif
 * du soir. Écrit par App\Services\ProfilEleveService seulement ; c'est le
 * rattachement qui dit quels contenus il voit (App\Support\CatalogueEleve).
 *
 * @property int $id
 * @property int $user_id
 * @property int $examen_id
 * @property int|null $serie_id
 * @property Filiere $filiere
 * @property int $classe_id
 * @property int|null $etablissement_id
 * @property int $objectif_minutes
 * @property-read Examen $examen
 * @property-read Serie|null $serie
 */
#[Fillable(['user_id', 'examen_id', 'serie_id', 'filiere', 'classe_id', 'etablissement_id', 'objectif_minutes'])]
class ProfilEleve extends Model
{
    protected $table = 'profils_eleves';

    /** Objectifs du soir proposés (PLAN M2), en minutes. */
    public const OBJECTIFS = [10, 15, 30];

    protected function casts(): array
    {
        return [
            'filiere' => Filiere::class,
            'objectif_minutes' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    /** @return BelongsTo<Classe, $this> */
    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class);
    }

    /** @return BelongsTo<Etablissement, $this> */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /** « BEPC », « Bac SE » : le nom court de ce que l'élève prépare. */
    public function libelleExamen(): string
    {
        $court = $this->examen->code === CodeExamen::Bac ? 'Bac' : $this->examen->code->value;

        return $this->serie !== null ? "{$court} {$this->serie->code->value}" : $court;
    }
}
