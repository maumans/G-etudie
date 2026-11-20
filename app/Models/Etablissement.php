<?php

namespace App\Models;

use App\Enums\TypeEtablissement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
 * @property bool $est_exemple
 * @property-read int|null $groupes_count `withCount`, console (lot 11)
 * @property-read int|null $gestionnaires_count `withCount`, console (lot 11)
 */
#[Fillable(['nom', 'type', 'prefecture', 'commune', 'region', 'est_exemple'])]
class Etablissement extends Model
{
    protected function casts(): array
    {
        return ['type' => TypeEtablissement::class, 'est_exemple' => 'boolean'];
    }

    /** @return HasMany<RattachementEtablissement, $this> */
    public function rattachements(): HasMany
    {
        return $this->hasMany(RattachementEtablissement::class);
    }

    /** @return HasMany<Groupe, $this> */
    public function groupes(): HasMany
    {
        return $this->hasMany(Groupe::class);
    }

    /** @return HasMany<ProfilEleve, $this> lot 13 : les élèves qui l'ont choisi (filtres de l'impact) */
    public function profils(): HasMany
    {
        return $this->hasMany(ProfilEleve::class);
    }

    /** @return HasMany<LicenceEtablissement, $this> */
    public function licences(): HasMany
    {
        return $this->hasMany(LicenceEtablissement::class);
    }
}
