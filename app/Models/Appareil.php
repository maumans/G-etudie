<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * Un téléphone, une tablette ou un navigateur (HORS_LIGNE.md A.7), enregistré
 * automatiquement au premier contact après connexion. Plusieurs profils
 * (élèves d'une même famille) peuvent y être rattachés.
 *
 * @property int $id
 * @property string $uuid
 * @property string $jeton_hache
 * @property string $libelle
 * @property Carbon $premier_contact_le
 * @property Carbon $dernier_contact_le
 * @property Carbon|null $revoque_le
 */
#[Fillable(['uuid', 'jeton_hache', 'libelle', 'premier_contact_le', 'dernier_contact_le'])]
#[Hidden(['jeton_hache'])]
class Appareil extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'premier_contact_le' => 'datetime',
            'dernier_contact_le' => 'datetime',
            'revoque_le' => 'datetime',
        ];
    }

    /** @return BelongsToMany<User, $this> */
    public function profils(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'appareil_profils')->withPivot('ajoute_le');
    }

    public function estRevoque(): bool
    {
        return $this->revoque_le !== null;
    }

    public function aPourProfil(User $user): bool
    {
        return $this->profils()->whereKey($user->getKey())->exists();
    }
}
