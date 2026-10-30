import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { estEcranGarde } from '@/lib/hors-ligne/ecrans';

/**
 * n° 17 : la règle de la liste blanche est la même dans le service worker
 * et dans l'application. On extrait la fonction de sw.js (entre ses
 * marqueurs) et on compare les réponses sur une série d'adresses.
 */
function estEcranGardeDuServiceWorker(): (
    chemin: string,
    pages: string[],
) => boolean {
    const source = readFileSync('resources/service-worker/sw.js', 'utf8');
    const bloc = source.match(
        /\/\/ <ecran-garde>[\s\S]*?\n(function estEcranGarde[\s\S]*?)\n\/\/ <\/ecran-garde>/,
    );

    if (!bloc) {
        throw new Error('Bloc <ecran-garde> introuvable dans sw.js');
    }

    return runInNewContext(`${bloc[1]}\nestEcranGarde;`) as (
        chemin: string,
        pages: string[],
    ) => boolean;
}

const PAGES = ['/eleve$', '/lecons', '/annales$', '/compte/affichage$'];

const CAS: [string, boolean][] = [
    ['/eleve', true],
    ['/eleve/', true],
    ['/eleve?onglet=jauge', true],
    ['/eleve/progression', false],
    ['/lecons', true],
    ['/lecons/12', true],
    ['/lecons/12/fiche', true],
    ['/lecons-admin', false],
    ['/annales', true],
    ['/annales/2019', false],
    ['/compte/affichage', true],
    ['/compte/profil', false],
    ['/contenu', false],
    ['/', false],
];

describe('liste blanche des écrans', () => {
    const duServiceWorker = estEcranGardeDuServiceWorker();

    it.each(CAS)('%s → %s', (chemin, attendu) => {
        expect(estEcranGarde(chemin, PAGES)).toBe(attendu);
        expect(duServiceWorker(chemin, PAGES)).toBe(attendu);
    });

    it('les deux copies du code sont identiques', () => {
        const source = readFileSync('resources/service-worker/sw.js', 'utf8');
        const application = readFileSync(
            'resources/js/lib/hors-ligne/ecrans.ts',
            'utf8',
        );
        const corps = (texte: string) =>
            texte
                .slice(texte.indexOf('const cible'))
                .split('\n')
                .slice(0, 18)
                .map((ligne) => ligne.trim())
                .join('\n');

        expect(corps(source)).toBe(corps(application));
    });
});
