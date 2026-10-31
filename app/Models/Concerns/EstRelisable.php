<?php

namespace App\Models\Concerns;

use App\Enums\DecisionRelecture;
use App\Enums\StatutContenu;
use App\Models\User;
use App\Models\VersionContenu;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Ce qu'ont en commun les contenus qui suivent le circuit de relecture
 * (leçons, questions — PLAN M17) : un auteur, un historique de versions
 * figées, une version publiée. Les transitions ne passent que par
 * App\Services\ContenuService.
 *
 * Le modèle porte `auteur_id`, `statut`, `revision`, `version_publiee_id`
 * et `publie_le`.
 */
trait EstRelisable
{
    public function statutDuContenu(): StatutContenu
    {
        return $this->statut;
    }

    public function auteurId(): ?int
    {
        return $this->auteur_id;
    }

    public function revisionCourante(): int
    {
        return $this->revision;
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    /** @return MorphMany<VersionContenu, $this> */
    public function versions(): MorphMany
    {
        return $this->morphMany(VersionContenu::class, 'contenu')->orderByDesc('numero');
    }

    /** @return BelongsTo<VersionContenu, $this> */
    public function versionPubliee(): BelongsTo
    {
        return $this->belongsTo(VersionContenu::class, 'version_publiee_id');
    }

    /** La version qui attend le relecteur (`null` hors relecture). */
    public function versionEnRelecture(): ?VersionContenu
    {
        if ($this->statut !== StatutContenu::EnRelecture) {
            return null;
        }

        return $this->versions()->whereNull('decision')->first();
    }

    /** Dernière version renvoyée, si c'est la dernière décision (pour afficher le commentaire). */
    public function dernierRenvoi(): ?VersionContenu
    {
        $derniere = $this->versions()->whereNotNull('decision')->first();

        return $derniere?->decision === DecisionRelecture::Renvoyee ? $derniere : null;
    }
}
