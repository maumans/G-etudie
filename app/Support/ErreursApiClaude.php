<?php

namespace App\Support;

/**
 * Ce que veut dire un refus de l'API Claude (tuteur, import des sujets).
 *
 * Un compte sans crédit répond `400 invalid_request_error`, comme une
 * demande mal formée : le SDK n'a pas de classe à part pour ce cas. Sans
 * cette distinction, l'élève lisait « Reformule ta demande plus court » et
 * le rédacteur « format ou taille refusés » alors que c'était la
 * facturation (vu le 2026-11-13, première clé branchée).
 */
final class ErreursApiClaude
{
    public static function creditEpuise(string $message): bool
    {
        return str_contains(mb_strtolower($message), 'credit balance');
    }
}
