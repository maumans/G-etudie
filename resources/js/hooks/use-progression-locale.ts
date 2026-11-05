import { useEffect, useState } from 'react';
import {
    base,
    rafraichirInstantane,
    surProgression,
    useHorsLigne,
} from '@/lib/hors-ligne';
import {
    jaugeLaPlusRecente,
    jourLocal,
    joursDesReponses,
    lireProgressionLocale,
    reponsesNonComptees,
    traceAvecLocal,
} from '@/lib/progression/locale';
import type { Jauge, Serie } from '@/lib/progression/locale';

/**
 * La jauge et la série telles que l'élève doit les voir, en ligne comme
 * hors ligne (HL4, HORS_LIGNE.md A.10) : la plus récente des jauges du
 * serveur (celle de la page ou celle gardée sur le téléphone), le nombre de
 * réponses pas encore comptées, et la série complétée des réponses faites
 * ici. En ligne, l'écran demande aussi un instantané frais (séances
 * préparées comprises) pour que le téléphone soit prêt à se couper.
 */
export function useProgressionLocale(
    auteurId: number | undefined,
    page: { jauge: Jauge; serie: Serie },
): {
    jauge: Jauge;
    serie: Serie & { provisoire: boolean };
    nonComptees: number;
} {
    const { reseau, enAttente } = useHorsLigne();
    const [gardee, setGardee] = useState<{ jauge: Jauge; serie: Serie } | null>(
        null,
    );
    const [locale, setLocale] = useState<{
        nonComptees: number;
        jours: string[];
    }>({ nonComptees: 0, jours: [] });

    useEffect(() => {
        if (auteurId === undefined) {
            return;
        }

        let actif = true;
        const lire = async () => {
            const [progression, operations] = await Promise.all([
                lireProgressionLocale(base, auteurId),
                base.operations.toArray().catch(() => []),
            ]);

            if (!actif) {
                return;
            }

            setGardee(progression);
            setLocale({
                nonComptees: reponsesNonComptees(operations, auteurId),
                jours: joursDesReponses(operations, auteurId),
            });
        };

        void lire();

        return surProgression(() => void lire());
    }, [auteurId, enAttente]);

    useEffect(() => {
        if (auteurId !== undefined && reseau === 'en_ligne') {
            void rafraichirInstantane();
        }
    }, [auteurId, reseau]);

    const jauge = jaugeLaPlusRecente(page.jauge, gardee?.jauge ?? null);
    const serieServeur =
        gardee &&
        Date.parse(gardee.serie.calcule_le) > Date.parse(page.serie.calcule_le)
            ? gardee.serie
            : page.serie;

    return {
        jauge,
        serie: traceAvecLocal(
            serieServeur,
            locale.jours,
            jourLocal(new Date()),
        ),
        nonComptees: locale.nonComptees,
    };
}
