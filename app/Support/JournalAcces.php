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
    /** Ce que chaque action veut dire, pour l'afficher (« Mon compte › Sécurité », console). */
    public const LIBELLES = [
        'compte.cree' => 'Compte créé',
        'compte.supprime' => 'Compte supprimé',
        'mot_de_passe.change' => 'Mot de passe changé',
        'mot_de_passe.recupere' => 'Mot de passe retrouvé par SMS',
        'numero.verifie' => 'Numéro vérifié',
        'numero.change' => 'Numéro changé',
        'double_authentification.activee' => 'Double authentification activée',
        'double_authentification.desactivee' => 'Double authentification désactivée',
        'double_authentification.codes_regeneres' => 'Nouveaux codes de secours',
    ];

    public static function libelle(string $action): string
    {
        return self::LIBELLES[$action] ?? $action;
    }

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
