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
        'profil.bascule' => 'Profil ouvert sur un téléphone partagé (code local)',
        'appareil.retire' => 'Profil retiré d\'un appareil',
        'compte.supprime' => 'Compte supprimé',
        'mot_de_passe.change' => 'Mot de passe changé',
        'mot_de_passe.recupere' => 'Mot de passe retrouvé par SMS',
        'numero.verifie' => 'Numéro vérifié',
        'numero.change' => 'Numéro changé',
        'double_authentification.activee' => 'Double authentification activée',
        'double_authentification.desactivee' => 'Double authentification désactivée',
        'double_authentification.codes_regeneres' => 'Nouveaux codes de secours',
        'abonnement.active' => 'Abonnement ouvert ou prolongé',
        'code.utilise' => 'Code prépayé utilisé',
        'lot_codes.cree' => 'Lot de codes prépayés créé',
        'lot_codes.remis' => 'Codes d\'un lot remis (effacés de l\'écran)',
        'lot_codes.desactive' => 'Lot de codes prépayés désactivé',
        // Lot 11.
        'parent.lie' => 'Parent lié à un élève (code de liaison)',
        'parent.delie' => 'Lien parent retiré',
        'etablissement.cree' => 'Établissement créé',
        'etablissement.rattache' => 'Compte rattaché à un établissement',
        'etablissement.retire' => 'Compte retiré d\'un établissement',
        'compte.ouvert_par_etablissement' => 'Compte du personnel ouvert (mot de passe provisoire)',
        'licence.accordee' => 'Licence d\'établissement accordée',
        'licence.attribuee' => 'Place de licence attribuée à un élève',
        'licence.reprise' => 'Place de licence reprise',
        'groupe.eleve_retire' => 'Élève retiré d\'un groupe',
        // Lot 12.
        'fil.publication_masquee' => 'Publication du fil masquée',
        'fil.publication_gardee' => 'Publication du fil gardée malgré des signalements',
        'fil.parole_retiree' => 'Parole retirée à un élève dans le fil',
        'fil.parole_rendue' => 'Parole rendue à un élève dans le fil',
        'fil.ferme' => 'Fil du groupe fermé',
        'fil.ouvert' => 'Fil du groupe rouvert',
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
