<?php

namespace App\Models;

use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Models\Concerns\EstRelisable;
use App\Models\Contracts\ContenuRelisable;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une question (PLAN M5), de l'un des neuf types de TypeQuestion ; format
 * vérifié par App\Support\FormatQuestion.
 *
 * Même circuit que les leçons (M17, App\Services\ContenuService) : les
 * colonnes portent le **brouillon** ; chaque envoi en relecture fige une
 * version (énoncé, données, réponse, indices et corrigé **ensemble**) ;
 * l'élève voit `version_publiee_id`. Une tentative garde le numéro de la
 * version vue, et le serveur la corrige contre celle-là (HORS_LIGNE.md A.9).
 *
 * @property int $id
 * @property string $uuid
 * @property int $notion_id
 * @property int|null $sujet_partie_id partie d'annale (lot 4), sinon `null`
 * @property int $ordre_sujet
 * @property int|null $auteur_id
 * @property TypeQuestion $type
 * @property string $extrait le début de l'énoncé, en texte (listes, recherche)
 * @property array<string, mixed> $enonce document de blocs
 * @property array<string, mixed> $donnees
 * @property array<string, mixed> $reponse_attendue
 * @property list<array<string, mixed>>|null $indices documents de blocs
 * @property list<array{titre: string, blocs: array<string, mixed>}>|null $corrige étapes
 * @property bool $reponse_a_verifier réponse et corrigé proposés par l'IA, pas encore vérifiés
 * @property int $difficulte
 * @property string $source
 * @property StatutContenu $statut
 * @property int $revision
 * @property int|null $version_publiee_id
 * @property Carbon|null $publie_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Notion $notion
 * @property-read User|null $auteur
 * @property-read VersionContenu|null $versionPubliee
 * @property-read SujetPartie|null $partie
 */
#[Fillable(['uuid', 'notion_id', 'sujet_partie_id', 'ordre_sujet', 'auteur_id', 'type', 'extrait', 'enonce', 'donnees', 'reponse_attendue', 'indices', 'corrige', 'reponse_a_verifier', 'difficulte', 'source', 'statut', 'revision', 'version_publiee_id', 'publie_le', 'est_exemple'])]
class Question extends Model implements ContenuRelisable
{
    use EstRelisable;

    protected function casts(): array
    {
        return [
            'type' => TypeQuestion::class,
            'enonce' => 'array',
            'donnees' => 'array',
            'reponse_attendue' => 'array',
            'indices' => 'array',
            'corrige' => 'array',
            'reponse_a_verifier' => 'boolean',
            'ordre_sujet' => 'integer',
            'difficulte' => 'integer',
            'statut' => StatutContenu::class,
            'revision' => 'integer',
            'publie_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<Notion, $this> */
    public function notion(): BelongsTo
    {
        return $this->belongsTo(Notion::class);
    }

    /** @return BelongsTo<SujetPartie, $this> */
    public function partie(): BelongsTo
    {
        return $this->belongsTo(SujetPartie::class, 'sujet_partie_id');
    }

    public function nomContenu(): string
    {
        return 'question';
    }

    /**
     * Le brouillon, sous la forme que fige une version.
     *
     * @return array{type: string, enonce: array<string, mixed>, donnees: array<string, mixed>, attendue: array<string, mixed>, indices: list<array<string, mixed>>, corrige: list<array{titre: string, blocs: array<string, mixed>}>, difficulte: int}
     */
    public function contenuDuBrouillon(): array
    {
        return [
            'type' => $this->type->value,
            'enonce' => $this->enonce,
            'donnees' => $this->donnees,
            'attendue' => $this->reponse_attendue,
            'indices' => $this->indices ?? [],
            'corrige' => $this->corrige ?? [],
            'difficulte' => $this->difficulte,
        ];
    }

    public function instantane(): array
    {
        return [
            'titre' => self::titreDe($this->enonce) ?: 'Question sans texte',
            'blocs' => $this->contenuDuBrouillon(),
        ];
    }

    /**
     * Ce que montre une liste : le début de l'énoncé.
     *
     * @param  array<string, mixed>  $enonce
     */
    public static function titreDe(array $enonce): string
    {
        return BlocsContenu::extrait($enonce, 160);
    }

    public function erreurAvantRelecture(): ?string
    {
        if (($this->enonce['content'] ?? []) === []) {
            return 'Une question sans énoncé ne part pas en relecture.';
        }

        return FormatQuestion::erreur($this->type, $this->enonce, $this->donnees, $this->reponse_attendue)
            ?? FormatQuestion::erreurAides($this->indices ?? [], $this->corrige ?? [])
            ?? (($this->corrige ?? []) === [] ? 'Le corrigé pas à pas a au moins une étape.' : null);
    }

    /** La version publiée : ce que voit l'élève (`null` si jamais publiée). */
    public function numeroPublie(): ?int
    {
        return $this->versionPubliee?->numero;
    }
}
