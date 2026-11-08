<?php

namespace App\Models;

use App\Enums\FormuleAbonnement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Un lot de codes prépayés (PLAN M16) : une formule, une quantité, un
 * revendeur. Les codes en clair attendent, chiffrés, que l'administrateur
 * les ait imprimés et remis ; ensuite seule leur empreinte reste
 * (App\Services\CodeAccesService).
 *
 * @property int $id
 * @property string $uuid
 * @property string $libelle
 * @property FormuleAbonnement $formule
 * @property int $quantite
 * @property string|null $revendeur
 * @property int|null $cree_par
 * @property list<string>|null $codes_en_attente
 * @property Carbon|null $codes_remis_le
 * @property Carbon|null $desactive_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property-read User|null $auteur
 */
#[Fillable(['uuid', 'libelle', 'formule', 'quantite', 'revendeur', 'cree_par', 'codes_en_attente', 'codes_remis_le', 'desactive_le', 'est_exemple'])]
#[Hidden(['codes_en_attente'])]
class LotCodes extends Model
{
    protected $table = 'lots_codes';

    protected function casts(): array
    {
        return [
            'formule' => FormuleAbonnement::class,
            'quantite' => 'integer',
            'codes_en_attente' => 'encrypted:array',
            'codes_remis_le' => 'datetime',
            'desactive_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return HasMany<CodeAcces, $this> */
    public function codes(): HasMany
    {
        return $this->hasMany(CodeAcces::class, 'lot_id');
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par');
    }

    public function estDesactive(): bool
    {
        return $this->desactive_le !== null;
    }
}
