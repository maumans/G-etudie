/*
 * Service worker de N'karamögö (HORS_LIGNE.md A.3.1).
 *
 * Servi à /sw.js par App\Http\Controllers\HorsLigne\ServiceWorkerController,
 * qui injecte en tête : VERSION, PRECACHE, PAGES, REPLI, DELAI_RESEAU_MS,
 * VERSIONS_GARDEES. Script maison plutôt que Workbox : Laravel construit dans
 * public/build/, et un worker émis là ne contrôlerait que /build/*.
 *
 * Caches :
 * - build-<VERSION> : précache à l'installation, puis cache d'abord ; les
 *   trois dernières versions restent servies (un onglet ouvert avant un
 *   déploiement redemande d'anciens fragments). Un fichier identique d'une
 *   version précédente (police, fragment inchangé) est recopié, pas
 *   retéléchargé : l'élève ne paie pas deux fois le même fichier.
 * - pages-u<id> : écrans de la liste blanche, par utilisateur, réseau
 *   d'abord ; vidé à la déconnexion.
 */

/* global VERSION, PRECACHE, PAGES, REPLI, DELAI_RESEAU_MS, VERSIONS_GARDEES */

const CACHE_BUILD = `build-${VERSION}`;
const PREFIXE_BUILD = 'build-';
const CACHE_META = 'nkaramogo-meta';

/** Jamais mis en cache ni servis d'une copie : écritures, synchro, authentification, paiement. */
const JAMAIS = [
    '/sync/',
    '/api/',
    '/sw.js',
    '/login',
    '/logout',
    '/register',
    '/mot-de-passe-oublie',
    '/two-factor-challenge',
    '/user/',
    '/paiement',
];

let utilisateur = null;

// <ecran-garde> — copie conforme de resources/js/lib/hors-ligne/ecrans.ts,
// vérifiée par tests/js/hors-ligne/ecrans.test.ts.
function estEcranGarde(chemin, pages) {
    const cible = chemin.split(/[?#]/)[0].split('/').filter(Boolean);

    return pages.some((motif) => {
        const borne = motif.endsWith('$');
        const prefixe = (borne ? motif.slice(0, -1) : motif)
            .split('/')
            .filter(Boolean);

        if (
            borne
                ? cible.length !== prefixe.length
                : cible.length < prefixe.length
        ) {
            return false;
        }

        return prefixe.every((segment, rang) => segment === cible[rang]);
    });
}
// </ecran-garde>

/* ---------- Petite mémoire du worker (versions, utilisateur courant) ---------- */

async function lireMeta(cle) {
    const cache = await caches.open(CACHE_META);
    const reponse = await cache.match(`/__meta/${cle}`);

    return reponse ? reponse.json() : null;
}

async function ecrireMeta(cle, valeur) {
    const cache = await caches.open(CACHE_META);
    await cache.put(
        `/__meta/${cle}`,
        new Response(JSON.stringify(valeur), {
            headers: { 'Content-Type': 'application/json' },
        }),
    );
}

async function utilisateurCourant() {
    if (utilisateur === null) {
        utilisateur = await lireMeta('utilisateur');
    }

    return utilisateur;
}

/* ---------- Installation et activation ---------- */

async function precacher() {
    const cache = await caches.open(CACHE_BUILD);
    const restants = [...PRECACHE];

    async function suivant() {
        const adresse = restants.shift();

        if (adresse === undefined) {
            return;
        }

        const deja = await caches.match(adresse);

        if (deja) {
            await cache.put(adresse, deja);
        } else {
            // Cache HTTP permis : les noms du build sont hachés, donc
            // immuables, et ce que la page vient de charger n'est pas
            // retéléchargé.
            const reponse = await fetch(adresse);

            if (!reponse.ok) {
                throw new Error(`Précache impossible : ${adresse}`);
            }

            await cache.put(adresse, reponse);
        }

        await suivant();
    }

    // Six téléchargements à la fois : assez pour un réseau mobile, pas plus.
    await Promise.all(Array.from({ length: 6 }, suivant));
}

self.addEventListener('install', (evenement) => {
    // Pas de skipWaiting ici : la page l'autorise quand la file d'opérations
    // est vide et qu'aucun examen blanc n'est en cours (message ACTIVER).
    evenement.waitUntil(precacher());
});

self.addEventListener('activate', (evenement) => {
    evenement.waitUntil(
        (async () => {
            const versions = ((await lireMeta('versions')) ?? []).filter(
                (version) => version !== VERSION,
            );
            versions.push(VERSION);
            const gardees = versions.slice(-VERSIONS_GARDEES);
            await ecrireMeta('versions', gardees);

            for (const nom of await caches.keys()) {
                if (
                    nom.startsWith(PREFIXE_BUILD) &&
                    !gardees.includes(nom.slice(PREFIXE_BUILD.length))
                ) {
                    await caches.delete(nom);
                }
            }

            await self.clients.claim();
        })(),
    );
});

self.addEventListener('message', (evenement) => {
    const message = evenement.data ?? {};

    if (message.type === 'ACTIVER') {
        self.skipWaiting();
    } else if (message.type === 'UTILISATEUR') {
        utilisateur = message.id ?? null;
        evenement.waitUntil(ecrireMeta('utilisateur', utilisateur));
    } else if (message.type === 'DECONNEXION') {
        utilisateur = null;
        evenement.waitUntil(
            Promise.all([
                caches.delete(`pages-u${message.id}`),
                ecrireMeta('utilisateur', null),
            ]),
        );
    }
});

/* ---------- Requêtes ---------- */

self.addEventListener('fetch', (evenement) => {
    const requete = evenement.request;
    const adresse = new URL(requete.url);

    if (requete.method !== 'GET' || adresse.origin !== self.location.origin) {
        return;
    }

    if (JAMAIS.some((prefixe) => adresse.pathname.startsWith(prefixe))) {
        return;
    }

    if (adresse.pathname.startsWith('/build/')) {
        evenement.respondWith(cacheDabord(requete));

        return;
    }

    const inertia = requete.headers.get('X-Inertia') === 'true';
    const documentHtml = requete.mode === 'navigate';

    if (!inertia && !documentHtml) {
        return;
    }

    if (estEcranGarde(adresse.pathname, PAGES)) {
        evenement.respondWith(reseauDabord(evenement, adresse, inertia));
    } else {
        evenement.respondWith(
            fetch(requete).catch(() => (inertia ? Response.error() : repli())),
        );
    }
});

async function cacheDabord(requete) {
    const gardee = await caches.match(requete);

    return gardee ?? fetch(requete);
}

function repli() {
    return new Response(REPLI, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

/**
 * Clé d'une copie : un préfixe de chemin distingue la page complète (document)
 * de la réponse Inertia du même écran. Pas un fragment `#…` : l'API Cache
 * l'ignore, et les deux copies se remplaceraient.
 */
function prefixeCopie(inertia) {
    return `/__copie-${inertia ? 'inertia' : 'document'}`;
}

function cle(adresse, inertia) {
    return `${adresse.origin}${prefixeCopie(inertia)}${adresse.pathname}${adresse.search}`;
}

/**
 * Réseau d'abord : au-delà de DELAI_RESEAU_MS ou en cas d'échec, la copie
 * gardée. Sans copie, on attend encore le réseau ; s'il échoue, page de repli
 * (document) ou erreur réseau (Inertia, rattrapée par la garde de navigation).
 */
async function reseauDabord(evenement, adresse, inertia) {
    const requete = evenement.request;
    const partiel = requete.headers.has('X-Inertia-Partial-Data');
    const reseau = fetch(requete);
    let reponse;

    try {
        reponse = await Promise.race([
            reseau,
            new Promise((resoudre) =>
                setTimeout(() => resoudre('delai'), DELAI_RESEAU_MS),
            ),
        ]);
    } catch {
        reponse = 'echec';
    }

    if (reponse instanceof Response) {
        evenement.waitUntil(ranger(adresse, inertia, partiel, reponse.clone()));

        return reponse;
    }

    // Un rechargement partiel hors ligne échoue en silence (A.3.7).
    const copie = partiel ? null : await copieGardee(adresse, inertia);

    if (copie) {
        if (reponse === 'delai') {
            evenement.waitUntil(
                reseau
                    .then((tardive) =>
                        ranger(adresse, inertia, partiel, tardive),
                    )
                    .catch(() => {}),
            );
        }

        return copie;
    }

    if (reponse === 'delai') {
        try {
            const tardive = await reseau;
            evenement.waitUntil(
                ranger(adresse, inertia, partiel, tardive.clone()),
            );

            return tardive;
        } catch {
            // échec après le délai : même sort qu'un échec immédiat
        }
    }

    return inertia ? Response.error() : repli();
}

/**
 * Range une réponse complète ; fusionne un rechargement partiel dans la copie
 * complète du même écran, qui garde son heure (sans copie complète, rien
 * n'est rangé — sinon l'écran ne se rouvrirait plus hors ligne).
 */
async function ranger(adresse, inertia, partiel, reponse) {
    if (!reponse.ok || reponse.redirected || reponse.status !== 200) {
        return;
    }

    if (inertia && reponse.headers.get('X-Inertia') !== 'true') {
        return;
    }

    const corps = await reponse.text();
    let id = await utilisateurCourant();
    let page = null;

    if (inertia) {
        page = JSON.parse(corps);
        id = page?.props?.auth?.user?.id ?? null;
    }

    if (id === null || id === undefined) {
        return;
    }

    const cache = await caches.open(`pages-u${id}`);
    const cleCopie = cle(adresse, inertia);
    let heure = new Date().toISOString();
    let contenu = corps;

    if (partiel) {
        const complete = await cache.match(cleCopie);

        if (!complete) {
            return;
        }

        const pageComplete = await complete.json();
        pageComplete.props = { ...pageComplete.props, ...page.props };
        heure = complete.headers.get('X-Copie-Le') ?? heure;
        contenu = JSON.stringify(pageComplete);
    }

    await cache.put(
        cleCopie,
        new Response(contenu, {
            headers: {
                'Content-Type': inertia
                    ? 'application/json'
                    : 'text/html; charset=utf-8',
                'X-Copie-Le': heure,
                ...(inertia ? { 'X-Inertia': 'true', Vary: 'X-Inertia' } : {}),
            },
        }),
    );
}

/**
 * La copie de cette adresse, sinon celle du même écran avec d'autres
 * paramètres ; son heure y est glissée (props.copie_hors_ligne, ou une balise
 * meta pour un document).
 */
async function copieGardee(adresse, inertia) {
    const id = await utilisateurCourant();

    if (id === null || id === undefined) {
        return null;
    }

    const cache = await caches.open(`pages-u${id}`);
    let copie = await cache.match(cle(adresse, inertia));

    if (!copie) {
        const chemin = `${prefixeCopie(inertia)}${adresse.pathname}`;

        for (const requete of await cache.keys()) {
            if (new URL(requete.url).pathname === chemin) {
                copie = await cache.match(requete);
                break;
            }
        }
    }

    if (!copie) {
        return null;
    }

    const heure = copie.headers.get('X-Copie-Le') ?? '';
    const corps = await copie.text();

    if (inertia) {
        const page = JSON.parse(corps);
        page.props = { ...page.props, copie_hors_ligne: heure };

        return new Response(JSON.stringify(page), {
            headers: {
                'Content-Type': 'application/json',
                'X-Inertia': 'true',
                Vary: 'X-Inertia',
            },
        });
    }

    return new Response(
        corps.replace(
            '<head>',
            `<head><meta name="copie-hors-ligne" content="${heure}">`,
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
}
