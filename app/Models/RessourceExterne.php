<?php

namespace App\Models;

use App\Enums\StatutRessource;
use App\Enums\TypeRessource;
use App\Services\RessourceService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un lien vers une ressource libre et sûre, rattaché à une notion (lot 12,
 * PLAN M19) : proposé par un rédacteur, **vérifié par un relecteur
 * différent**, retiré s'il casse ou change. Seul un lien vérifié arrive chez
 * l'élève, signalé comme sortant et consommateur de données.
 *
 * @property int $id
 * @property string $uuid
 * @property int $notion_id
 * @property string $url
 * @property string $domaine
 * @property string $titre
 * @property TypeRessource $type
 * @property string|null $description
 * @property int|null $poids_ko estimé par le rédacteur
 * @property int|null $duree_minutes vidéo
 * @property StatutRessource $statut
 * @property int|null $auteur_id
 * @property int|null $verifiee_par_id
 * @property Carbon|null $verifiee_le
 * @property string|null $motif_retrait
 * @property Carbon|null $lien_casse_le dernier contrôle en échec (ressources:verifier)
 * @property Carbon|null $controle_le dernier contrôle
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property-read Notion $notion
 * @property-read User|null $auteur
 * @property-read User|null $verifieePar
 */
#[Fillable(['uuid', 'notion_id', 'url', 'domaine', 'titre', 'type', 'description', 'poids_ko', 'duree_minutes', 'statut', 'auteur_id', 'verifiee_par_id', 'verifiee_le', 'motif_retrait', 'lien_casse_le', 'controle_le', 'est_exemple'])]
class RessourceExterne extends Model
{
    protected $table = 'ressources_externes';

    protected function casts(): array
    {
        return [
            'type' => TypeRessource::class,
            'statut' => StatutRessource::class,
            'poids_ko' => 'integer',
            'duree_minutes' => 'integer',
            'verifiee_le' => 'datetime',
            'lien_casse_le' => 'datetime',
            'controle_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @param Builder<RessourceExterne> $requete */
    public function scopeVerifiees(Builder $requete): void
    {
        $requete->where('statut', StatutRessource::Verifiee->value);
    }

    /** @return BelongsTo<Notion, $this> */
    public function notion(): BelongsTo
    {
        return $this->belongsTo(Notion::class);
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    /** @return BelongsTo<User, $this> */
    public function verifieePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verifiee_par_id');
    }

    /** Le poids annoncé à l'élève : celui saisi, sinon l'estimation du type. */
    public function poidsAnnonceKo(): int
    {
        return $this->poids_ko ?? $this->type->poidsParDefautKo($this->duree_minutes);
    }

    /**
     * Ce que voit l'élève (leçon, pack) : jamais l'auteur ni le relecteur.
     *
     * @return array{uuid: string, titre: string, url: string, domaine: string, type: string, type_libelle: string, description: string|null, poids_ko: int, duree_minutes: int|null, avec_suggestions: bool, site: string, est_exemple: bool}
     */
    public function pourEleve(): array
    {
        return [
            'uuid' => $this->uuid,
            'titre' => $this->titre,
            'url' => $this->url,
            'domaine' => $this->domaine,
            'type' => $this->type->value,
            'type_libelle' => $this->type->libelle(),
            'description' => $this->description,
            'poids_ko' => $this->poidsAnnonceKo(),
            'duree_minutes' => $this->duree_minutes,
            // Le site affiche ses suggestions et sa publicité (YouTube) : le
            // dialogue de sortie le dit (config/ressources.php).
            'avec_suggestions' => RessourceService::avecSuggestions($this->domaine),
            // Pas de notation pointée : le domaine contient des points.
            'site' => (string) (config('ressources.domaines')[$this->domaine] ?? $this->domaine),
            'est_exemple' => $this->est_exemple,
        ];
    }
}
