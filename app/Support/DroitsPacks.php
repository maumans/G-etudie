<?php

namespace App\Support;

use App\Models\Pack;
use App\Models\PackEleve;
use App\Models\User;
use App\Support\Abonnements\SourceAbonnements;
use Carbon\CarbonImmutable;

/**
 * Seule réponse à « cet élève peut-il télécharger, ou mettre à jour, ce
 * pack ? » (HORS_LIGNE.md A.5, HL-D3, HL-D4).
 *
 *  - un pack hors de son examen, de sa série ou de sa filière n'existe pas
 *    pour lui (404, par `estDansSonCatalogue`) ;
 *  - **abonné** : tous les packs de son examen ; chacun expire à la fin de
 *    l'abonnement + 7 jours, et cette date avance à chaque synchronisation
 *    tant que l'abonnement dure ;
 *  - **gratuit** : un pack au choix (sans expiration). Pour en prendre un
 *    autre, il supprime le sien ;
 *  - un pack **expiré** n'est plus mis à jour. On protège le service (mises
 *    à jour, nouveaux packs), pas le fichier déjà sur le téléphone : aucune
 *    protection technique ne rend inviolable un contenu téléchargé (A.5).
 *
 * Les abonnements arrivent au lot 9 (`SourceAbonnements`) ; d'ici là, tout
 * élève est « gratuit ».
 */
class DroitsPacks
{
    public const GRATUITS = 1;

    public const GRACE_JOURS = 7;

    public function __construct(private SourceAbonnements $abonnements) {}

    public function estDansSonCatalogue(User $eleve, Pack $pack): bool
    {
        $profil = CatalogueEleve::profil($eleve);

        return $profil !== null
            && $pack->examen_id === $profil->examen_id
            && $pack->serie_id === $profil->serie_id
            && $pack->filiere === $profil->filiere
            && in_array($pack->matiere_id, CatalogueEleve::matieresIds($profil), true);
    }

    /** Fin des droits d'abonné (fin d'abonnement + grâce), ou `null` s'il n'est pas abonné. */
    public function expirationAbonne(User $eleve, ?CarbonImmutable $maintenant = null): ?CarbonImmutable
    {
        $fin = $this->abonnements->finAbonnement($eleve);
        $limite = $fin?->addDays(self::GRACE_JOURS);

        return $limite !== null && $limite->greaterThan($maintenant ?? CarbonImmutable::now()) ? $limite : null;
    }

    public function estAbonne(User $eleve): bool
    {
        return $this->expirationAbonne($eleve) !== null;
    }

    /** Le pack gratuit pris par l'élève (sans expiration), s'il en a un. */
    public function packGratuit(User $eleve): ?PackEleve
    {
        return PackEleve::query()->with('pack.matiere')
            ->where('user_id', $eleve->id)
            ->whereNull('retire_le')
            ->whereNull('expire_le')
            ->first();
    }

    /**
     * Peut-il **prendre** ce pack (premier téléchargement, ou le reprendre) ?
     *
     * @return array{permis: bool, motif: string|null, expire_le: CarbonImmutable|null}
     */
    public function pourPrendre(User $eleve, Pack $pack): array
    {
        $expiration = $this->expirationAbonne($eleve);

        if ($expiration !== null) {
            return ['permis' => true, 'motif' => null, 'expire_le' => $expiration];
        }

        $gratuit = $this->packGratuit($eleve);

        if ($gratuit === null || $gratuit->pack_id === $pack->id) {
            return ['permis' => true, 'motif' => null, 'expire_le' => null];
        }

        return [
            'permis' => false,
            'motif' => "Ton téléchargement gratuit est déjà pris par {$gratuit->pack->matiere->nom}. Supprime-le pour en prendre un autre.",
            'expire_le' => null,
        ];
    }

    /**
     * Peut-il **mettre à jour** (ou reprendre le téléchargement de) ce pack,
     * qu'il a déjà pris ? Un pack d'abonné voit son expiration avancer tant
     * que l'abonnement dure.
     *
     * @return array{permis: bool, motif: string|null, expire_le: CarbonImmutable|null}
     */
    public function pourMettreAJour(User $eleve, Pack $pack): array
    {
        $pris = $this->pris($eleve, $pack);

        if ($pris === null) {
            return ['permis' => false, 'motif' => 'Ce pack n\'est pas encore téléchargé sur ton compte.', 'expire_le' => null];
        }

        if ($pris->expire_le === null) {
            return ['permis' => true, 'motif' => null, 'expire_le' => null];
        }

        $expiration = $this->expirationAbonne($eleve);

        if ($expiration !== null) {
            if (! $pris->expire_le->equalTo($expiration)) {
                $pris->update(['expire_le' => $expiration]);
            }

            return ['permis' => true, 'motif' => null, 'expire_le' => $expiration];
        }

        if ($pris->estExpire()) {
            return ['permis' => false, 'motif' => 'Ton abonnement est terminé : ce pack n\'est plus mis à jour.', 'expire_le' => CarbonImmutable::instance($pris->expire_le)];
        }

        return ['permis' => true, 'motif' => null, 'expire_le' => CarbonImmutable::instance($pris->expire_le)];
    }

    /** Le pack est pris : la place gratuite est occupée, ou l'expiration posée. */
    public function prendre(User $eleve, Pack $pack): PackEleve
    {
        $verdict = $this->pourPrendre($eleve, $pack);

        if (! $verdict['permis']) {
            throw new \RuntimeException((string) $verdict['motif']);
        }

        return PackEleve::query()->updateOrCreate(
            ['user_id' => $eleve->id, 'pack_id' => $pack->id],
            ['pris_le' => CarbonImmutable::now(), 'expire_le' => $verdict['expire_le'], 'retire_le' => null],
        );
    }

    /** Supprimé du téléphone : la place gratuite se libère. */
    public function retirer(User $eleve, Pack $pack): void
    {
        PackEleve::query()->where('user_id', $eleve->id)->where('pack_id', $pack->id)
            ->update(['retire_le' => CarbonImmutable::now()]);
    }

    public function pris(User $eleve, Pack $pack): ?PackEleve
    {
        return PackEleve::query()->where('user_id', $eleve->id)->where('pack_id', $pack->id)->whereNull('retire_le')->first();
    }
}
