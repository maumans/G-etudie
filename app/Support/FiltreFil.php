<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Le filtre à l'envoi du fil d'un groupe (lot 12, PLAN M13 ; les
 * utilisateurs sont des mineurs, CLAUDE.md § 9) : seule règle, appelée par
 * FilGroupeService. Refusés, avec une phrase qui dit pourquoi :
 *
 *  - un **numéro de téléphone** (9 chiffres ou plus, espaces, points ou
 *    tirets compris) : pas de contact privé entre élèves ;
 *  - un **lien** ou une **adresse e-mail** : on ne sort pas du groupe par
 *    le fil ;
 *  - un **mot interdit** de la liste du back-office, comparé sans casse ni
 *    accents, en mot entier (« con » ne bloque pas « conjugaison »), et aussi
 *    écrit avec des lettres répétées ou séparées par des points.
 */
class FiltreFil
{
    /**
     * @param  list<string>  $motsInterdits
     * @return string|null le motif du refus, ou `null` si le texte passe
     */
    public static function refus(string $texte, array $motsInterdits): ?string
    {
        // Un numéro guinéen a 9 chiffres (12 avec +224) ; une date
        // (18.11.2026) en a 8 et passe.
        if (preg_match('/(?:\+?\d[\s.\-]?){9,}/u', $texte) === 1) {
            return 'Pas de numéro de téléphone dans le fil : il est lu par tout le groupe.';
        }

        if (preg_match('/[\w.+-]+@[\w-]+\.[a-z]{2,}/iu', $texte) === 1) {
            return 'Pas d’adresse e-mail dans le fil : il est lu par tout le groupe.';
        }

        if (preg_match('~(https?://|www\.|\b[a-z0-9-]{2,}\.(?:com|net|org|gn|fr|io|me|ly|info|xyz|app|tv)\b)~iu', $texte) === 1) {
            return 'Pas de lien dans le fil. Pose ta question avec tes mots.';
        }

        $normalise = self::normaliser($texte);

        foreach ($motsInterdits as $mot) {
            $mot = self::normaliser($mot);

            if ($mot !== '' && preg_match('/(?<![a-z0-9])'.preg_quote($mot, '/').'(?![a-z0-9])/u', $normalise) === 1) {
                return 'Ce message contient un mot qui n’a pas sa place ici. Reformule-le poliment.';
            }
        }

        return null;
    }

    /**
     * Minuscules, sans accents, lettres répétées réduites (« nuuuul » →
     * « nul »), points et tirets entre lettres retirés (« n.u.l » → « nul »).
     */
    public static function normaliser(string $texte): string
    {
        $texte = Str::lower(Str::ascii($texte));
        $texte = (string) preg_replace('/(?<=[a-z])[.\-_*](?=[a-z])/u', '', $texte);

        return (string) preg_replace('/([a-z])\1{2,}/u', '$1', $texte);
    }
}
