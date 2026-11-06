import { useCallback, useEffect, useState } from 'react';
import { lirePacksLocaux, surPacks } from '@/lib/hors-ligne';
import type { PackLocal } from '@/lib/hors-ligne/packs';

/**
 * Les packs présents sur ce téléphone (HL5), relus à chaque changement :
 * téléchargement, morceau reçu, suppression, version annoncée par le
 * battement. Partagés entre les profils.
 */
export function usePacksLocaux(): {
    packs: Record<string, PackLocal>;
    pret: boolean;
} {
    const [packs, setPacks] = useState<Record<string, PackLocal>>({});
    const [pret, setPret] = useState(false);

    const lire = useCallback(async () => {
        const lignes = await lirePacksLocaux();
        setPacks(Object.fromEntries(lignes.map((pack) => [pack.cle, pack])));
        setPret(true);
    }, []);

    useEffect(() => {
        void lire();

        return surPacks(() => void lire());
    }, [lire]);

    return { packs, pret };
}
