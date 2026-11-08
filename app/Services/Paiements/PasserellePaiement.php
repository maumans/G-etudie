<?php

namespace App\Services\Paiements;

use App\Enums\StatutPaiement;
use App\Models\Paiement;
use Illuminate\Http\Request;

/**
 * Ce que le reste de l'application attend d'un fournisseur de paiement
 * mobile (Orange Money, MTN MoMo, ou un agrégateur). Seul PaiementService
 * l'appelle ; il décide, la passerelle ne fait que parler à l'opérateur.
 */
interface PasserellePaiement
{
    /** Le nom de la passerelle, dans l'adresse de son webhook (`/paiements/notifications/{nom}`). */
    public function nom(): string;

    /**
     * Demande le paiement à l'opérateur. Selon l'opérateur, le payeur reçoit
     * une demande sur son téléphone (code secret), ou suit une adresse.
     *
     * @throws PasserelleIndisponible
     */
    public function initier(Paiement $paiement, string $numero): InitiationPaiement;

    /**
     * Lit un webhook : la **signature** est vérifiée avant toute lecture.
     *
     * @throws NotificationInvalide
     */
    public function lireNotification(Request $requete): NotificationLue;

    /**
     * Demande à l'opérateur où en est un paiement (webhook perdu). `null` :
     * il ne sait pas, ou la passerelle ne sait pas demander.
     */
    public function consulter(Paiement $paiement): ?StatutPaiement;
}
