<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Un mot refusé à l'envoi dans le fil d'un groupe (lot 12, PLAN M13). La
 * liste est tenue par le responsable pédagogique (back-office › Modération).
 *
 * @property int $id
 * @property string $mot en minuscules, sans accents
 * @property int|null $ajoute_par
 */
#[Fillable(['mot', 'ajoute_par'])]
class MotInterdit extends Model
{
    protected $table = 'mots_interdits';

    /**
     * Tous les mots, pour le filtre du fil (FiltreFil).
     *
     * @return list<string>
     */
    public static function liste(): array
    {
        return array_values(self::query()->orderBy('mot')->get(['mot'])->map(fn (self $m): string => $m->mot)->all());
    }
}
