<?php

namespace App\Models;

use App\Enums\Filiere;
use App\Enums\StatutImport;
use App\Enums\TypeSujet;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un import assisté (PLAN M17) : le document téléversé, ce qu'il doit devenir
 * (examen, série, matière, session) et ce qu'en a tiré l'extracteur
 * (App\Services\Annales\ImportSujetService). Le sujet créé est un brouillon :
 * rien n'est publié sans relecture humaine.
 *
 * @property int $id
 * @property string $uuid
 * @property int $auteur_id
 * @property int $examen_id
 * @property int|null $serie_id
 * @property int $matiere_id
 * @property Filiere $filiere
 * @property int $session
 * @property TypeSujet $type
 * @property string $document_chemin
 * @property string $document_nom
 * @property string $document_type
 * @property int $document_octets
 * @property StatutImport $statut
 * @property string $extracteur
 * @property string|null $modele
 * @property string|null $erreur
 * @property list<string>|null $avertissements
 * @property int|null $jetons_entree
 * @property int|null $jetons_sortie
 * @property int|null $sujet_id
 * @property Carbon|null $commence_le
 * @property Carbon|null $termine_le
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read User $auteur
 * @property-read Examen $examen
 * @property-read Serie|null $serie
 * @property-read Matiere $matiere
 * @property-read Sujet|null $sujet
 */
#[Fillable(['uuid', 'auteur_id', 'examen_id', 'serie_id', 'matiere_id', 'filiere', 'session', 'type', 'document_chemin', 'document_nom', 'document_type', 'document_octets', 'statut', 'extracteur', 'modele', 'erreur', 'avertissements', 'jetons_entree', 'jetons_sortie', 'sujet_id', 'commence_le', 'termine_le'])]
class ImportSujet extends Model
{
    protected $table = 'imports_sujets';

    protected function casts(): array
    {
        return [
            'filiere' => Filiere::class,
            'session' => 'integer',
            'type' => TypeSujet::class,
            'document_octets' => 'integer',
            'statut' => StatutImport::class,
            'avertissements' => 'array',
            'jetons_entree' => 'integer',
            'jetons_sortie' => 'integer',
            'commence_le' => 'datetime',
            'termine_le' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
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

    /** @return BelongsTo<Sujet, $this> */
    public function sujet(): BelongsTo
    {
        return $this->belongsTo(Sujet::class);
    }
}
