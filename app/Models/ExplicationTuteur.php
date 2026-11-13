<?php

namespace App\Models;

use App\Enums\DemandeTuteur;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Une explication du tuteur gardée pour être servie de nouveau (PLAN M11 :
 * « mise en cache des explications identiques ») : la première explication
 * d'une question (ou d'une étape de son corrigé), à une version donnée.
 * Jamais une réponse à une phrase tapée par un élève.
 *
 * @property int $id
 * @property string $cle
 * @property int $question_id
 * @property int $version
 * @property DemandeTuteur $demande
 * @property int|null $etape
 * @property string $texte
 * @property string $modele
 * @property int $servie
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Table('explications_tuteur')]
#[Fillable(['cle', 'question_id', 'version', 'demande', 'etape', 'texte', 'modele', 'servie'])]
class ExplicationTuteur extends Model
{
    protected function casts(): array
    {
        return [
            'demande' => DemandeTuteur::class,
            'version' => 'integer',
            'etape' => 'integer',
            'servie' => 'integer',
        ];
    }
}
