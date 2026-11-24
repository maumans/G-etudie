import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dependancesManquantes } from '../../scripts/completer-verrou.mjs';

/**
 * `npm ci` (Laravel Cloud, la CI, le serveur) refuse un `package-lock.json`
 * où une dépendance facultative n'a pas son entrée. npm 11 sous Windows
 * n'y inscrit pas les variantes des autres systèmes (les `@rolldown/binding-*`
 * de Linux, par exemple) : le déploiement échouait (DEVBOOK, point 35).
 * Réparation : `node scripts/completer-verrou.mjs`.
 */

const verrou = JSON.parse(readFileSync('package-lock.json', 'utf8'));

describe('package-lock.json', () => {
    it('contient chaque dépendance facultative, pour tous les systèmes', () => {
        expect(
            dependancesManquantes(verrou).map(
                ({ nom, depuis }) => `${nom} (pour ${depuis || 'la racine'})`,
            ),
            'Lancer : node scripts/completer-verrou.mjs',
        ).toEqual([]);
    });

    it('repère une variante absente, cherchée à côté du paquet puis en remontant', () => {
        const exemple = {
            packages: {
                '': {},
                'node_modules/a': {
                    optionalDependencies: {
                        'b-linux': '1.0.0',
                        'b-win': '1.0.0',
                    },
                },
                'node_modules/b-win': { version: '1.0.0' },
                'node_modules/c': {},
                'node_modules/c/node_modules/d': {
                    optionalDependencies: { 'e-linux': '2.0.0' },
                },
                'node_modules/c/node_modules/e-linux': { version: '2.0.0' },
            },
        };

        expect(dependancesManquantes(exemple)).toEqual([
            { nom: 'b-linux', version: '1.0.0', depuis: 'node_modules/a' },
        ]);
    });
});
