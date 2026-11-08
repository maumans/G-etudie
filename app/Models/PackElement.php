<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un élément de pack : les props mêmes de son écran (A.4), sous la clé
 * `<type>:<identifiant>` que l'appareil range dans sa table `contenus`.
 * `props` est gardé en JSON brut : il part tel quel, sans être redécodé.
 *
 * @property int $id
 * @property int $pack_id
 * @property string $cle
 * @property string $variante `commun`, `complet` (abonnés) ou `libre` (sans les corrigés réservés)
 * @property string $type
 * @property int $version
 * @property string $empreinte
 * @property int $taille
 * @property int $morceau
 * @property string $props JSON
 */
#[Fillable(['pack_id', 'cle', 'variante', 'type', 'version', 'empreinte', 'taille', 'morceau', 'props'])]
#[Hidden(['props'])]
class PackElement extends Model
{
    public $timestamps = false;

    /** Élément identique pour tous (leçon, fiche, matière, annale au corrigé libre). */
    public const COMMUN = 'commun';

    /** Annale au corrigé réservé, avec son corrigé : pour les abonnés. */
    public const COMPLET = 'complet';

    /** La même annale sans ses corrigés détaillés : pour les autres (lot 9). */
    public const LIBRE = 'libre';

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'taille' => 'integer',
            'morceau' => 'integer',
        ];
    }

    /** @return BelongsTo<Pack, $this> */
    public function pack(): BelongsTo
    {
        return $this->belongsTo(Pack::class);
    }
}
