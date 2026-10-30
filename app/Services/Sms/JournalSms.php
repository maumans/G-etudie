<?php

namespace App\Services\Sms;

use App\Support\Telephone;
use Illuminate\Support\Facades\Log;

/**
 * Pilote de développement : le SMS est écrit dans storage/logs, rien ne part.
 * En production, il signale qu'aucun fournisseur n'est branché.
 */
class JournalSms implements EnvoiSms
{
    public function envoyer(string $telephone, string $message): void
    {
        if (app()->isProduction()) {
            Log::warning('SMS non envoyé : aucun fournisseur SMS configuré.', [
                'destinataire' => Telephone::masquer($telephone),
            ]);

            return;
        }

        Log::info('[SMS de développement] '.$telephone.' : '.$message);
    }
}
