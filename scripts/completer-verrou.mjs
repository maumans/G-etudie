/**
 * Complète `package-lock.json` avec les dépendances facultatives qui y
 * manquent (DEVBOOK, point 35).
 *
 * npm 11 sous Windows n'inscrit pas dans le verrou les variantes des autres
 * systèmes (`@rolldown/binding-linux-x64-gnu`…). `npm ci` refuse alors
 * d'installer sur le serveur (Linux) : « package.json and package-lock.json
 * are not in sync ». Ce script lit chaque variante manquante dans le
 * registre npm (`npm view --json` : adresse, empreinte d'intégrité, système,
 * processeur, libc) et l'ajoute au verrou, à la version déjà demandée. Il
 * n'enlève ni ne change rien d'autre.
 *
 *     node scripts/completer-verrou.mjs [chemin du verrou]
 *
 * Le test `tests/js/verrou-npm.test.ts` échoue tant qu'il en manque une.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Les dépendances facultatives sans entrée dans le verrou. Une dépendance
 * se cherche comme Node la résout : à côté du paquet qui la demande, puis
 * dans chaque dossier `node_modules` parent.
 *
 * @param {{ packages: Record<string, { [champ: string]: unknown, optionalDependencies?: Record<string, string> }> }} verrou
 * @returns {{ nom: string, version: string, depuis: string }[]}
 */
export function dependancesManquantes(verrou) {
    const cles = new Set(Object.keys(verrou.packages));
    const manquantes = [];

    for (const [chemin, paquet] of Object.entries(verrou.packages)) {
        for (const [nom, version] of Object.entries(
            paquet.optionalDependencies ?? {},
        )) {
            let dossier = chemin;
            let trouvee = false;

            while (!trouvee) {
                const candidat = dossier
                    ? `${dossier}/node_modules/${nom}`
                    : `node_modules/${nom}`;
                trouvee = cles.has(candidat);

                if (dossier === '') {
                    break;
                }

                // Remonter au paquet parent : « a/node_modules/b » → « a ».
                const coupe = dossier.lastIndexOf('/node_modules/');
                dossier = coupe === -1 ? '' : dossier.slice(0, coupe);
            }

            if (!trouvee) {
                manquantes.push({ nom, version, depuis: chemin });
            }
        }
    }

    return manquantes;
}

function completer(chemin = 'package-lock.json') {
    const texte = readFileSync(chemin, 'utf8');
    const crlf = texte.includes('\r\n');
    const verrou = JSON.parse(texte);
    const manquantes = dependancesManquantes(verrou);

    for (const { nom, version, depuis } of manquantes) {
        const meta = JSON.parse(
            execSync(`npm view ${nom}@${version} --json`, { encoding: 'utf8' }),
        );
        const entree = {
            version: meta.version,
            resolved: meta.dist.tarball,
            integrity: meta.dist.integrity,
            ...(meta.cpu ? { cpu: meta.cpu } : {}),
            ...(meta.license ? { license: meta.license } : {}),
            ...(meta.libc ? { libc: meta.libc } : {}),
            optional: true,
            ...(meta.os ? { os: meta.os } : {}),
            ...(meta.engines ? { engines: meta.engines } : {}),
        };
        // À la racine si le paquet qui la demande y est, sinon à côté de lui.
        const parent = depuis.lastIndexOf('/node_modules/');
        const cle =
            parent === -1
                ? `node_modules/${nom}`
                : `${depuis.slice(0, parent)}/node_modules/${nom}`;
        verrou.packages[cle] = entree;
        console.log(`+ ${nom}@${meta.version} (${(meta.os ?? []).join(', ')})`);
    }

    // Ordre des clés, comme npm l'écrit : la racine, puis l'ordre alphabétique.
    const { '': racine, ...autres } = verrou.packages;
    verrou.packages = {
        '': racine,
        ...Object.fromEntries(
            Object.entries(autres).sort(([a], [b]) => (a < b ? -1 : 1)),
        ),
    };

    let sortie = `${JSON.stringify(verrou, null, 4)}\n`;

    if (crlf) {
        sortie = sortie.replaceAll('\n', '\r\n');
    }

    writeFileSync(chemin, sortie);
    console.log(
        manquantes.length === 0
            ? 'Rien à compléter : le verrou est complet.'
            : `${manquantes.length} entrée(s) ajoutée(s). Vérifier : npm ci --dry-run`,
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    // Facultatif : un autre fichier que package-lock.json.
    completer(process.argv[2]);
}
