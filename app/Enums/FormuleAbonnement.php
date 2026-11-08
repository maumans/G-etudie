<?php

namespace App\Enums;

/**
 * Les formules d'abonnement (PLAN M16, D4). Le **prix** et la **durée** ne
 * vivent qu'à un endroit, `config('vitrine.tarifs.formules')`, que la
 * vitrine affiche et que le paiement lit : jamais le montant envoyé par le
 * téléphone.
 */
enum FormuleAbonnement: string
{
    case Mensuel = 'mensuel';
    case Annee = 'annee';

    /** @return array{cle: string, nom: string, prix_gnf: int, periode: string, mois: int} */
    private function reglage(): array
    {
        /** @var list<array{cle: string, nom: string, prix_gnf: int, periode: string, mois: int}> $formules */
        $formules = config('vitrine.tarifs.formules', []);

        foreach ($formules as $formule) {
            if ($formule['cle'] === $this->value) {
                return $formule;
            }
        }

        throw new \RuntimeException("Formule absente de config/vitrine.php : {$this->value}");
    }

    public function nom(): string
    {
        return $this->reglage()['nom'];
    }

    public function prixGnf(): int
    {
        return (int) $this->reglage()['prix_gnf'];
    }

    public function mois(): int
    {
        return (int) $this->reglage()['mois'];
    }

    /** « 1 mois », « 10 mois ». */
    public function duree(): string
    {
        return $this->mois().' mois';
    }

    /** @return array{cle: string, nom: string, prix_gnf: int, mois: int, duree: string} */
    public function pourEcran(): array
    {
        return [
            'cle' => $this->value,
            'nom' => $this->nom(),
            'prix_gnf' => $this->prixGnf(),
            'mois' => $this->mois(),
            'duree' => $this->duree(),
        ];
    }
}
