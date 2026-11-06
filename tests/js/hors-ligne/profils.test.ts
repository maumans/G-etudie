import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import {
    attenteApres,
    connaitreProfil,
    definirCode,
    jetonsDesProfils,
    listeProfils,
    PROFILS_MAX,
    rangerJeton,
    verifierCode,
} from '@/lib/hors-ligne/profils';
import type { ProfilLocal } from '@/lib/hors-ligne/profils';

/*
 * HL6 (HORS_LIGNE.md A.7, HL-D9) : 4 profils au plus par téléphone, chacun
 * protégé par un code local à 4 chiffres (empreinte, jamais le code), avec
 * une attente croissante après 5 erreurs.
 */

let base: BaseHorsLigne;
let nom = 0;

beforeEach(() => {
    base = new BaseHorsLigne(`profils-${++nom}`);
});

afterEach(async () => {
    await base.delete();
});

describe('profils du téléphone', () => {
    it('quatre profils au plus ; un profil connu est mis à jour, pas dupliqué', async () => {
        for (const id of [1, 2, 3, 4]) {
            expect(
                await connaitreProfil(base, {
                    id,
                    prenom: `P${id}`,
                    pseudo: `p${id}`,
                }),
            ).toBe(true);
        }

        expect(
            await connaitreProfil(base, { id: 5, prenom: 'P5', pseudo: 'p5' }),
        ).toBe(false);
        expect(
            await connaitreProfil(base, {
                id: 2,
                prenom: 'Mariama',
                pseudo: 'mari',
            }),
        ).toBe(true);

        const profils = await listeProfils(base);
        expect(profils).toHaveLength(PROFILS_MAX);
        expect(profils.find((p) => p.id === 2)?.prenom).toBe('Mariama');
    });

    it('le code n’est jamais gardé en clair, et se vérifie', async () => {
        await connaitreProfil(base, {
            id: 1,
            prenom: 'Aïssatou',
            pseudo: 'aissa',
        });
        await definirCode(base, 1, '2468');

        const profil = (await base.profils.get(1)) as ProfilLocal;
        expect(JSON.stringify(profil)).not.toContain('2468');
        expect(profil.code?.empreinte).toHaveLength(64);

        expect(await verifierCode(base, 1, '2468')).toEqual({ ok: true });
        expect(await verifierCode(base, 1, '1357')).toEqual({
            ok: false,
            attente_ms: 0,
            restants: 4,
        });
    });

    it('refuse un code qui n’a pas 4 chiffres', async () => {
        await connaitreProfil(base, { id: 1, prenom: 'A', pseudo: 'a' });

        await expect(definirCode(base, 1, '12a4')).rejects.toThrow(
            'Le code a 4 chiffres.',
        );
        await expect(definirCode(base, 1, '12345')).rejects.toThrow();
    });

    it('après 5 erreurs, une attente qui double ; le bon code ne passe pas pendant l’attente', async () => {
        await connaitreProfil(base, { id: 1, prenom: 'A', pseudo: 'a' });
        await definirCode(base, 1, '2468');
        const t0 = 1_000_000;

        for (let essai = 1; essai <= 4; essai++) {
            expect((await verifierCode(base, 1, '0000', t0)).ok).toBe(false);
        }

        expect(await verifierCode(base, 1, '0000', t0)).toEqual({
            ok: false,
            attente_ms: 30_000,
            restants: 0,
        });
        expect(await verifierCode(base, 1, '2468', t0 + 10_000)).toEqual({
            ok: false,
            attente_ms: 20_000,
            restants: 0,
        });
        expect(await verifierCode(base, 1, '0000', t0 + 31_000)).toEqual({
            ok: false,
            attente_ms: 60_000,
            restants: 0,
        });
        expect(await verifierCode(base, 1, '2468', t0 + 92_000)).toEqual({
            ok: true,
        });
        expect(((await base.profils.get(1)) as ProfilLocal).essais).toBe(0);

        expect(attenteApres(4)).toBe(0);
        expect(attenteApres(20)).toBe(15 * 60_000);
    });

    it('les jetons des profils, pour la file', async () => {
        await connaitreProfil(base, { id: 1, prenom: 'A', pseudo: 'a' });
        await connaitreProfil(base, { id: 2, prenom: 'B', pseudo: 'b' });
        await rangerJeton(base, 2, 'jeton-b');

        expect(await jetonsDesProfils(base)).toEqual({ 2: 'jeton-b' });
    });
});
