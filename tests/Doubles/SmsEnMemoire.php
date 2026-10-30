<?php

namespace Tests\Doubles;

use App\Services\Sms\EnvoiSms;
use PHPUnit\Framework\Assert;

/** Garde les SMS « envoyés » pour que les tests lisent le code reçu. */
class SmsEnMemoire implements EnvoiSms
{
    /** @var list<array{telephone: string, message: string}> */
    public array $envoyes = [];

    public function envoyer(string $telephone, string $message): void
    {
        $this->envoyes[] = ['telephone' => $telephone, 'message' => $message];
    }

    /** Le code à 6 chiffres du dernier SMS envoyé à ce numéro. */
    public function dernierCode(string $telephone): string
    {
        $messages = array_values(array_filter(
            $this->envoyes,
            fn (array $sms): bool => $sms['telephone'] === $telephone,
        ));

        Assert::assertNotEmpty($messages, "Aucun SMS envoyé au {$telephone}.");
        preg_match('/\b(\d{6})\b/', end($messages)['message'], $trouve);

        return $trouve[1];
    }

    public function nombreEnvoyes(): int
    {
        return count($this->envoyes);
    }
}
