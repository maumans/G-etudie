<?php

namespace App\Models;

use App\Enums\Filiere;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Une matière à un examen (et une série, pour le Bac), dans une filière et
 * une année scolaire : **la table qui porte les coefficients** (PLAN § 6).
 * Coefficient et durée restent vides tant que l'équipe pédagogique ne les a
 * pas saisis (CLAUDE.md § 5). `phare` : matière prioritaire au lancement (D1).
 *
 * @property int $id
 * @property int $annee_scolaire_id
 * @property int $examen_id
 * @property int|null $serie_id
 * @property int $matiere_id
 * @property Filiere $filiere
 * @property string|null $coefficient
 * @property int|null $duree_minutes
 * @property bool $phare
 * @property string $cle_unicite
 */
#[Fillable(['annee_scolaire_id', 'examen_id', 'serie_id', 'matiere_id', 'filiere', 'coefficient', 'duree_minutes', 'phare'])]
class Epreuve extends Model
{
    protected function casts(): array
    {
        return [
            'filiere' => Filiere::class,
            'coefficient' => 'decimal:1',
            'duree_minutes' => 'integer',
            'phare' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Une seule épreuve par (année, examen, série, matière, filière),
        // série nulle comprise (voir la migration).
        static::saving(function (self $epreuve) {
            $epreuve->cle_unicite = self::cleUnicite(
                $epreuve->annee_scolaire_id,
                $epreuve->examen_id,
                $epreuve->serie_id,
                $epreuve->matiere_id,
                $epreuve->filiere,
            );
        });
    }

    public static function cleUnicite(int $annee, int $examen, ?int $serie, int $matiere, Filiere $filiere): string
    {
        return implode(':', [$annee, $examen, $serie ?? 0, $matiere, $filiere->value]);
    }

    /** @return BelongsTo<AnneeScolaire, $this> */
    public function anneeScolaire(): BelongsTo
    {
        return $this->belongsTo(AnneeScolaire::class);
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
}
