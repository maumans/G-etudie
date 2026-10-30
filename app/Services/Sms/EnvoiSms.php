<?php

namespace App\Services\Sms;

/**
 * Envoi d'un SMS. Le fournisseur réel sera choisi avant le lot 8 (D3) ; en
 * développement et en test, `JournalSms` écrit le message dans le journal
 * Laravel au lieu de l'envoyer — un numéro de démonstration peut appartenir à
 * un vrai abonné.
 */
interface EnvoiSms
{
    public function envoyer(string $telephone, string $message): void;
}
