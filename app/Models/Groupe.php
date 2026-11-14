<?php

namespace App\Models;

use App\Enums\Filiere;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Le groupe (la classe) d'un enseignant (lot 11, PLAN M13-M14) : pour un
 * examen, une série et une filière — les questions de ses devoirs en
 * viennent. On le rejoint par son code, annoncé en classe.
 *
 * @property int $id
 * @property int $enseignant_id
 * @property int|null $etablissement_id
 * @property int $examen_id
 * @property int|null $serie_id
 * @property Filiere $filiere
 * @property int $classe_id
 * @property string $nom
 * @property string $code
 * @property Carbon|null $archive_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property-read int|null $eleves_count `withCount` des membres présents
 * @property-read User $enseignant
 * @property-read Etablissement|null $etablissement
 * @property-read Examen $examen
 * @property-read Serie|null $serie
 */
#[Fillable(['enseignant_id', 'etablissement_id', 'examen_id', 'serie_id', 'filiere', 'classe_id', 'nom', 'code', 'archive_le', 'est_exemple'])]
class Groupe extends Model
{
    protected function casts(): array
    {
        return ['filiere' => Filiere::class, 'archive_le' => 'datetime', 'est_exemple' => 'boolean'];
    }

    /** @param  Builder<self>  $requete */
    public function scopeOuverts(Builder $requete): void
    {
        $requete->whereNull('archive_le');
    }

    /** @return BelongsTo<User, $this> */
    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enseignant_id');
    }

    /** @return BelongsTo<Etablissement, $this> */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
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

    /** @return HasMany<MembreGroupe, $this> */
    public function membres(): HasMany
    {
        return $this->hasMany(MembreGroupe::class);
    }

    /**
     * Les élèves présents (pas partis, pas retirés).
     *
     * @return BelongsToMany<User, $this>
     */
    public function eleves(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'membres_groupes', 'groupe_id', 'eleve_id')
            ->wherePivotNull('quitte_le')
            ->withPivot('rejoint_le');
    }

    /** @return HasMany<Devoir, $this> */
    public function devoirs(): HasMany
    {
        return $this->hasMany(Devoir::class);
    }

    /**
     * Le profil d'examen type du groupe, jamais enregistré : ce qu'un élève du
     * groupe voit (CatalogueEleve), pour choisir les questions d'un devoir
     * et mesurer les notions du groupe.
     */
    public function profilType(): ProfilEleve
    {
        $profil = new ProfilEleve([
            'examen_id' => $this->examen_id,
            'serie_id' => $this->serie_id,
            'filiere' => $this->filiere,
            'classe_id' => $this->classe_id,
            'objectif_minutes' => 15,
        ]);
        $profil->user_id = 0;

        return $profil;
    }

    /** « BEPC », « Bac SE » : la même étiquette que le profil d'un élève. */
    public function libelleExamen(): string
    {
        return $this->profilType()
            ->setRelation('examen', $this->examen)
            ->setRelation('serie', $this->serie)
            ->libelleExamen();
    }
}
