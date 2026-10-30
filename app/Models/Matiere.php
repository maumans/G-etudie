<?php

namespace App\Models;

use App\Enums\TeinteMatiere;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Matière, ajoutée et modifiée par le responsable pédagogique. Sa teinte
 * (couleur et icône) est choisie parmi celles du design system
 * (TeinteMatiere) : l'interface l'affiche toujours avec son nom.
 *
 * @property int $id
 * @property string $nom
 * @property string $slug
 * @property TeinteMatiere $teinte
 * @property int $ordre
 */
#[Fillable(['nom', 'slug', 'teinte', 'ordre'])]
class Matiere extends Model
{
    protected function casts(): array
    {
        return ['teinte' => TeinteMatiere::class];
    }

    /** @return HasMany<Epreuve, $this> */
    public function epreuves(): HasMany
    {
        return $this->hasMany(Epreuve::class);
    }

    /** @return HasMany<Chapitre, $this> */
    public function chapitres(): HasMany
    {
        return $this->hasMany(Chapitre::class);
    }

    /** Une matière qui porte déjà une épreuve ou un chapitre ne se supprime pas. */
    public function estUtilisee(): bool
    {
        return $this->epreuves()->exists() || $this->chapitres()->exists();
    }
}
