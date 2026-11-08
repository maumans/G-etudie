<?php

namespace App\Services\Paiements;

/**
 * Les passerelles connues, par nom. Un vrai fournisseur s'ajoute ici (son
 * pilote implémente PasserellePaiement), puis `PAIEMENT_PASSERELLE` le
 * désigne dans `.env`.
 */
class Passerelles
{
    /** @var array<string, class-string<PasserellePaiement>> */
    public const PILOTES = [
        PasserelleSimulee::NOM => PasserelleSimulee::class,
    ];

    /** Celle qui reçoit les nouveaux paiements. */
    public function courante(): PasserellePaiement
    {
        return $this->pour((string) config('paiements.passerelle')) ?? throw new PasserelleIndisponible('Aucune passerelle de paiement configurée.');
    }

    /** Une passerelle par son nom (webhook, vérification d'un ancien paiement), ou `null`. */
    public function pour(string $nom): ?PasserellePaiement
    {
        $classe = self::PILOTES[$nom] ?? null;

        return $classe === null ? null : app($classe);
    }

    /**
     * Le paiement mobile est-il ouvert ? Non en production tant que seule la
     * passerelle simulée existe : l'écran le dit, les codes prépayés restent.
     */
    public function ouvertes(): bool
    {
        $nom = (string) config('paiements.passerelle');

        if ($nom === PasserelleSimulee::NOM) {
            return PasserelleSimulee::estOuverte();
        }

        return $this->pour($nom) !== null;
    }
}
