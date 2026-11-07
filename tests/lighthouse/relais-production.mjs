/**
 * Relais « comme en production » pour la mesure Lighthouse (lot 8).
 *
 * `php artisan serve` ne compresse rien et ne pose aucun en-tête de cache :
 * mesurée derrière lui, la vitrine paraît deux fois plus lourde que chez
 * l'élève. Ce relais reproduit les deux règles du bloc Nginx de
 * `MISE_EN_PRODUCTION.md` (étape 10) qui comptent pour le poids :
 *  - gzip niveau 6 sur JS, CSS, JSON, SVG, HTML, manifeste, au-delà de 512 octets ;
 *  - `/build/*` en `Cache-Control: public, max-age=31536000, immutable`.
 * Rien d'autre : il ne réécrit aucune réponse.
 *
 *     node tests/lighthouse/relais-production.mjs   # 127.0.0.1:8080 → 127.0.0.1:8000
 */
import { request, createServer } from 'node:http';
import { gzipSync } from 'node:zlib';

const amont = { host: '127.0.0.1', port: Number(process.env.AMONT ?? 8000) };
const port = Number(process.env.PORT ?? 8080);
const compressibles =
    /^(application\/(json|javascript|manifest\+json)|text\/(css|html|plain|javascript)|image\/svg\+xml)/;

createServer((entree, sortie) => {
    // L'hôte d'origine est gardé : Laravel écrit alors les adresses du build
    // vers le relais (sinon elles le contourneraient, sans compression).
    const enTetes = { ...entree.headers };
    delete enTetes['accept-encoding'];

    const requete = request(
        { ...amont, method: entree.method, path: entree.url, headers: enTetes },
        (reponse) => {
            const morceaux = [];
            reponse.on('data', (m) => morceaux.push(m));
            reponse.on('end', () => {
                let corps = Buffer.concat(morceaux);
                const h = { ...reponse.headers };
                const type = String(h['content-type'] ?? '');
                const accepte = String(
                    entree.headers['accept-encoding'] ?? '',
                ).includes('gzip');

                if (entree.url?.startsWith('/build/')) {
                    h['cache-control'] = 'public, max-age=31536000, immutable';
                }

                if (accepte && compressibles.test(type) && corps.length > 512) {
                    corps = gzipSync(corps, { level: 6 });
                    h['content-encoding'] = 'gzip';
                    h.vary = 'Accept-Encoding';
                }

                delete h['transfer-encoding'];
                h['content-length'] = String(corps.length);
                sortie.writeHead(reponse.statusCode ?? 502, h);
                sortie.end(corps);
            });
        },
    );

    requete.on('error', () => {
        sortie.writeHead(502);
        sortie.end('Relais : application injoignable sur le port amont.');
    });
    entree.pipe(requete);
}).listen(port, '127.0.0.1', () => {
    console.log(`Relais production : http://127.0.0.1:${port} → ${amont.port}`);
});
