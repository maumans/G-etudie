import { afterEach, describe, expect, it, vi } from 'vitest';
import { formaterDollars } from '@/lib/tuteur/couts';
import {
    decouperSse,
    demanderAuTuteur,
    MESSAGE_COUPURE,
    MESSAGE_RESEAU,
} from '@/lib/tuteur/flux';
import type { EvenementTuteur } from '@/lib/tuteur/flux';

const sse = (evenement: string, donnees: unknown) =>
    `event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`;

/** Une réponse en flux, découpée n'importe où (comme le réseau le fait). */
function reponseFlux(texte: string, taille = 7): Response {
    const octets = new TextEncoder().encode(texte);
    let position = 0;

    return new Response(
        new ReadableStream({
            pull(controleur) {
                if (position >= octets.length) {
                    controleur.close();

                    return;
                }

                controleur.enqueue(octets.slice(position, position + taille));
                position += taille;
            },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
}

const FIN = {
    message: 'm1',
    statut: 'complete',
    depuis_cache: false,
    quota_restant: 2,
    relances_restantes: 5,
};

afterEach(() => vi.unstubAllGlobals());

describe('decouperSse', () => {
    it('rend les événements complets et garde le reste', () => {
        const { evenements, reste } = decouperSse(
            sse('texte', { t: 'Bon' }) +
                sse('texte', { t: 'jour' }) +
                'event: fin\ndata: {"sta',
        );

        expect(evenements).toEqual([
            { type: 'texte', t: 'Bon' },
            { type: 'texte', t: 'jour' },
        ]);
        expect(reste).toBe('event: fin\ndata: {"sta');
    });

    it('ignore un bloc illisible', () => {
        expect(
            decouperSse(': battement\n\n' + sse('texte', { t: 'a' }))
                .evenements,
        ).toEqual([{ type: 'texte', t: 'a' }]);
    });
});

describe('demanderAuTuteur', () => {
    it('livre chaque événement, même coupé au milieu d’un caractère', async () => {
        const corps =
            sse('debut', {
                conversation: 'c1',
                demande: 'Explique-moi cette question.',
            }) +
            sse('texte', { t: 'L’hypoténuse ' }) +
            sse('texte', { t: 'mesure $5$ cm. Ça va ? 🙂' }) +
            sse('fin', FIN);
        const fetch = vi.fn().mockResolvedValue(reponseFlux(corps, 5));
        vi.stubGlobal('fetch', fetch);
        const recus: EvenementTuteur[] = [];

        const issue = await demanderAuTuteur(
            '/eleve/tuteur/demandes',
            { demande: 'expliquer', question: 'q', version: 1 },
            (e) => recus.push(e),
        );

        expect(issue).toEqual({ ok: true });
        expect(recus.map((e) => e.type)).toEqual([
            'debut',
            'texte',
            'texte',
            'fin',
        ]);
        expect(
            recus
                .filter((e) => e.type === 'texte')
                .map((e) => (e as { t: string }).t)
                .join(''),
        ).toBe('L’hypoténuse mesure $5$ cm. Ça va ? 🙂');

        const [, init] = fetch.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body as string)).toMatchObject({
            demande: 'expliquer',
            question: 'q',
        });
    });

    it('un refus avant le flux est rendu tel quel (quota)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: 'Tu as demandé tes 3 explications gratuites.',
                        raison: 'quota',
                    }),
                    { status: 429 },
                ),
            ),
        );
        const recus: EvenementTuteur[] = [];

        expect(
            await demanderAuTuteur('/x', { demande: 'expliquer' }, (e) =>
                recus.push(e),
            ),
        ).toEqual({
            ok: false,
            raison: 'quota',
            message: 'Tu as demandé tes 3 explications gratuites.',
        });
        expect(recus).toEqual([]);
    });

    it('une erreur de validation donne son premier message', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: 'x',
                        errors: {
                            texte: [
                                'Ta question est trop longue : 400 caractères au plus.',
                            ],
                        },
                    }),
                    { status: 422 },
                ),
            ),
        );

        expect(
            await demanderAuTuteur('/x', { demande: 'question' }, () => {}),
        ).toEqual({
            ok: false,
            raison: 'validation',
            message: 'Ta question est trop longue : 400 caractères au plus.',
        });
    });

    it('sans réseau : un message clair, rien d’autre', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
        );

        expect(
            await demanderAuTuteur('/x', { demande: 'expliquer' }, () => {}),
        ).toEqual({ ok: false, raison: 'reseau', message: MESSAGE_RESEAU });
    });

    it('un flux qui se tait sans « fin » est une coupure', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    reponseFlux(
                        sse('debut', { conversation: 'c', demande: 'd' }) +
                            sse('texte', { t: 'Début' }),
                    ),
                ),
        );
        const recus: EvenementTuteur[] = [];

        expect(
            await demanderAuTuteur('/x', { demande: 'expliquer' }, (e) =>
                recus.push(e),
            ),
        ).toMatchObject({ ok: false, raison: 'coupure' });
        expect(recus.at(-1)).toEqual({
            type: 'erreur',
            message: MESSAGE_COUPURE,
        });
    });

    it('un recentrage (hors sujet) arrive comme un événement du flux', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                reponseFlux(
                    sse('debut', { conversation: 'c', demande: 'd' }) +
                        sse('refus', {
                            texte: 'Je suis là pour t’aider à réviser.',
                            statut: 'hors_sujet',
                        }) +
                        sse('fin', { ...FIN, statut: 'hors_sujet' }),
                ),
            ),
        );
        const recus: EvenementTuteur[] = [];

        expect(
            await demanderAuTuteur('/x', { demande: 'question' }, (e) =>
                recus.push(e),
            ),
        ).toEqual({ ok: true });
        expect(recus[1]).toEqual({
            type: 'refus',
            texte: 'Je suis là pour t’aider à réviser.',
            statut: 'hors_sujet',
        });
    });
});

describe('formaterDollars', () => {
    it.each([
        [0, '0,00 $'],
        [7100, '0,0071 $'],
        [420_000, '0,420 $'],
        [12_400_000, '12,40 $'],
    ])('%i micro-dollars → %s', (micro, attendu) => {
        expect(formaterDollars(micro).replace(/\s/g, ' ')).toBe(attendu);
    });
});
