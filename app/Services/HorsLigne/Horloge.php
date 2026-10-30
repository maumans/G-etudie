<?php

namespace App\Services\HorsLigne;

use Carbon\CarbonImmutable;

/**
 * Les deux horloges (HORS_LIGNE.md A.3.6). Le décalage est `heure du serveur −
 * heure de l'appareil`, mesuré au dernier contact : l'heure corrigée d'un
 * geste est son heure d'appareil plus ce décalage.
 *
 * Suspecte si le décalage n'a jamais été mesuré, s'il dépasse 10 min, si
 * l'heure corrigée est dans le futur, ou si l'horloge de l'appareil a reculé
 * depuis la mesure (`envoye_le` antérieur à `mesure_le`, deux heures lues sur
 * la même horloge). L'âge d'une saisie n'est pas un décalage : une réponse de
 * la veille restée en file n'est pas suspecte.
 */
final class Horloge
{
    public const DECALAGE_MAX_MS = 10 * 60 * 1000;

    /** Tolérance sur « dans le futur » : le temps de l'aller-retour réseau. */
    public const TOLERANCE_FUTUR_MS = 60 * 1000;

    public function __construct(
        public readonly ?int $decalageMs,
        public readonly ?CarbonImmutable $mesureLe,
        public readonly ?CarbonImmutable $envoyeLe,
    ) {}

    public function corriger(CarbonImmutable $saisiLe): CarbonImmutable
    {
        return $this->decalageMs === null ? $saisiLe : $saisiLe->addMilliseconds($this->decalageMs);
    }

    public function estSuspecte(CarbonImmutable $saisiLe, CarbonImmutable $recuLe): bool
    {
        if ($this->decalageMs === null || abs($this->decalageMs) > self::DECALAGE_MAX_MS) {
            return true;
        }

        if ($this->corriger($saisiLe)->greaterThan($recuLe->addMilliseconds(self::TOLERANCE_FUTUR_MS))) {
            return true;
        }

        return $this->mesureLe !== null && $this->envoyeLe !== null && $this->envoyeLe->lessThan($this->mesureLe);
    }

    public function decalageSecondes(): ?int
    {
        return $this->decalageMs === null ? null : intdiv($this->decalageMs, 1000);
    }
}
