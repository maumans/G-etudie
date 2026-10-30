<?php

namespace App\Support;

use App\Models\EntreeJournalAcces;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Seule porte d'écriture du journal des accès sensibles (CLAUDE.md § 9) :
 * action, auteur, cible, IP, agent, horodatage. Ne jamais y mettre de mot de
 * passe, de code ni de numéro complet.
 */
class JournalAcces
{
    /**
     * @param  array<string, scalar|null>  $details
     */
    public static function consigner(
        string $action,
        ?Model $cible = null,
        array $details = [],
        ?User $auteur = null,
    ): EntreeJournalAcces {
        $requete = request();
        $auteur ??= $requete->user();

        return EntreeJournalAcces::create([
            'action' => $action,
            'auteur_id' => $auteur?->getKey(),
            'cible_type' => $cible ? class_basename($cible) : null,
            'cible_id' => $cible?->getKey(),
            'ip' => $requete->ip(),
            'agent' => Str::limit((string) $requete->userAgent(), 250, ''),
            'details' => $details === [] ? null : $details,
        ]);
    }
}
