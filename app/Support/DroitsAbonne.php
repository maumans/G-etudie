<?php

namespace App\Support;

use App\Models\Appareil;
use App\Models\ExamenBlanc;
use App\Models\Sujet;
use App\Models\User;
use App\Support\Abonnements\SourceAbonnements;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Seule réponse à « ceci est-il ouvert à cet élève ? » pour ce que
 * l'abonnement ajoute (PLAN M16, D4 ; décisions de Maurice du 2026-11-08) :
 *
 *  - **corrigé détaillé d'un sujet** : ouvert à l'abonné ; pour les autres,
 *    ouvert si l'équipe a coché « corrigé en accès libre », et d'office pour
 *    la session la plus récente de chaque épreuve. La bonne réponse reste
 *    toujours là (l'appareil corrige) ; seules les étapes du corrigé partent ;
 *  - **examens blancs** : sans limite pour l'abonné, deux par mois sinon.
 *    Le serveur n'en refuse jamais la note (rien ne se perd, HORS_LIGNE.md
 *    A.1) : la limite se tient au lancement, sur l'appareil, avec les
 *    chiffres que ce service lui donne (`pourAppareil`) ;
 *  - **appareils** (HL-D8) : un abonnement vaut pour deux appareils. Au-delà,
 *    l'élève retire ceux qu'il n'utilise plus (« Mon compte › Appareils »)
 *    pour reprendre les packs d'abonné (DroitsPacks) ; rien d'autre n'est
 *    bloqué.
 *
 * Abonné = période en cours (sans les 7 jours de grâce des packs, HL-D4).
 */
class DroitsAbonne
{
    public function __construct(private SourceAbonnements $abonnements) {}

    public function estAbonne(User $eleve): bool
    {
        $fin = $this->abonnements->finAbonnement($eleve);

        return $fin !== null && $fin->isFuture();
    }

    public function corrigeOuvert(User $eleve, Sujet $sujet): bool
    {
        return $this->estCorrigeLibre($sujet) || $this->estAbonne($eleve);
    }

    /** Corrigé ouvert à tous : coché par l'équipe, ou session la plus récente de son épreuve. */
    public function estCorrigeLibre(Sujet $sujet): bool
    {
        return $sujet->corrige_libre || $this->plusRecentId($sujet) === $sujet->id;
    }

    /** Le sujet en ligne le plus récent de la même épreuve (examen, série, filière, matière). */
    private function plusRecentId(Sujet $sujet): ?int
    {
        /** @var int|null $id */
        $id = CatalogueEleve::sujetEnLigne(Sujet::query())
            ->where('examen_id', $sujet->examen_id)
            ->where('matiere_id', $sujet->matiere_id)
            ->where('filiere', $sujet->filiere->value)
            ->where(fn (Builder $q) => $sujet->serie_id === null ? $q->whereNull('serie_id') : $q->where('serie_id', $sujet->serie_id))
            ->orderByDesc('session')
            ->orderByDesc('id')
            ->value('id');

        return $id;
    }

    /**
     * Ce que l'appareil garde pour trancher hors ligne (examens blancs,
     * étiquettes « Avec l'abonnement »). Partagé avec chaque page élève.
     *
     * @return array{abonne: bool, fin: string|null, examens_blancs: array{limite: int|null, faits: int, mois: string}}
     */
    public function pourAppareil(User $eleve, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $fin = $this->abonnements->finAbonnement($eleve);
        $abonne = $fin !== null && $fin->greaterThan($maintenant);

        return [
            'abonne' => $abonne,
            'fin' => $abonne ? $fin->toIso8601ZuluString() : null,
            'examens_blancs' => [
                'limite' => $abonne ? null : (int) config('paiements.examens_blancs_gratuits_par_mois'),
                'faits' => ExamenBlanc::query()
                    ->where('user_id', $eleve->id)
                    ->where('commence_le', '>=', $maintenant->startOfMonth())
                    ->count(),
                'mois' => $maintenant->format('Y-m'),
            ],
        ];
    }

    /**
     * Les appareils où le compte est en service (profil présent, appareil
     * non révoqué, contact récent).
     *
     * @return array{actifs: int, limite: int, depasse: bool}
     */
    public function appareils(User $eleve): array
    {
        $actifs = Appareil::query()
            ->join('appareil_profils', 'appareil_profils.appareil_id', '=', 'appareils.id')
            ->where('appareil_profils.user_id', $eleve->id)
            ->whereNull('appareil_profils.retire_le')
            ->whereNull('appareils.revoque_le')
            ->where('appareils.dernier_contact_le', '>=', CarbonImmutable::now()->subDays((int) config('paiements.jours_appareil_actif')))
            ->count();
        $limite = (int) config('paiements.appareils_abonne');

        return ['actifs' => $actifs, 'limite' => $limite, 'depasse' => $actifs > $limite];
    }
}
