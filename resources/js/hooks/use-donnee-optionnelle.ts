import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EtatDonnee } from '@/components/ui/zone-donnee';

/**
 * Charge une prop `Inertia::optional()` par un rechargement partiel, avec un
 * état explicite (CLAUDE.md § 4) : `undefined` voudrait dire à la fois « pas
 * demandée », « en cours » et « échec », et l'écran tournerait sans fin.
 *
 * - `onFinish` conclut **toujours** : la visite finit en `pret` ou en `echec` ;
 * - une réponse 200 qui ne contient pas la prop demandée est un échec ;
 * - `recharger()` relance (bouton « Réessayer » de `ZoneDonnee`).
 *
 *   const avis = useDonneeOptionnelle('avis', props.avis);
 *   <ZoneDonnee etat={avis.etat} onReessayer={avis.recharger}>…</ZoneDonnee>
 */
export function useDonneeOptionnelle<T>(
    nom: string,
    valeur: T | undefined,
): { etat: EtatDonnee; donnee: T | undefined; recharger: () => void } {
    const [etat, setEtat] = useState<EtatDonnee>(
        valeur === undefined ? 'chargement' : 'pret',
    );
    const dejaDemandee = useRef(false);

    const recharger = useCallback(() => {
        let recue = false;
        setEtat('chargement');

        router.reload({
            only: [nom],
            onSuccess: (page) => {
                recue =
                    (page.props as Record<string, unknown>)[nom] !== undefined;
            },
            onFinish: () => setEtat(recue ? 'pret' : 'echec'),
        });
    }, [nom]);

    useEffect(() => {
        if (valeur === undefined && !dejaDemandee.current) {
            dejaDemandee.current = true;
            recharger();
        }
    }, [valeur, recharger]);

    return { etat, donnee: valeur, recharger };
}
