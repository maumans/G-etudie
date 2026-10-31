<?php

namespace App\Models;

use App\Enums\TypeEtablissement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Un établissement scolaire. La liste est à constituer (DEVBOOK, points
 * ouverts) : tant qu'elle est vide, le parcours d'accueil saute l'étape.
 *
 * @property int $id
 * @property string $nom
 * @property TypeEtablissement $type
 * @property string|null $prefecture
 * @property string|null $commune
 * @property string|null $region
 */
#[Fillable(['nom', 'type', 'prefecture', 'commune', 'region'])]
class Etablissement extends Model
{
    protected function casts(): array
    {
        return ['type' => TypeEtablissement::class];
    }
}
