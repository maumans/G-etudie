<?php

namespace App\Models\Contracts;

use App\Enums\StatutContenu;
use App\Models\VersionContenu;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Un contenu du circuit de relecture (leçon, question). Voir
 * App\Models\Concerns\EstRelisable et App\Services\ContenuService.
 */
interface ContenuRelisable
{
    /** « leçon », « question » : le nom dans les messages (tous deux féminins). */
    public function nomContenu(): string;

    /**
     * Ce que fige une version : un titre (pour les listes) et le contenu.
     *
     * @return array{titre: string, blocs: array<string, mixed>}
     */
    public function instantane(): array;

    /** Pourquoi le brouillon ne peut pas partir en relecture, ou `null`. */
    public function erreurAvantRelecture(): ?string;

    /** @return MorphMany<VersionContenu, covariant Model> */
    public function versions(): MorphMany;

    public function statutDuContenu(): StatutContenu;

    public function auteurId(): ?int;

    public function revisionCourante(): int;

    public function versionEnRelecture(): ?VersionContenu;
}
