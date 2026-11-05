<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Un badge du catalogue (PLAN M9), semé par BadgeSeeder. La règle qui
 * l'accorde vit dans App\Services\MotivationService (clé `cle`).
 *
 * @property int $id
 * @property string $cle
 * @property string $nom
 * @property string $description
 * @property string $icone nom d'icône Lucide (lib/motivation.ts)
 * @property int $points
 * @property int $ordre
 */
#[Fillable(['cle', 'nom', 'description', 'icone', 'points', 'ordre'])]
class Badge extends Model
{
    protected function casts(): array
    {
        return ['points' => 'integer', 'ordre' => 'integer'];
    }
}
