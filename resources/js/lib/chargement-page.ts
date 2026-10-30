/**
 * Chargement des pages Inertia, avec rattrapage de l'échec d'import
 * (HORS_LIGNE.md A.3.3, défaut 1).
 *
 * Chaque build remplace les fichiers JS (noms hachés). Un onglet ouvert avant
 * un déploiement demande, au clic suivant, un fragment qui n'existe plus :
 * l'import échoue, aucune page n'est posée et rien ne le signale. Ici :
 * - en ligne, et pas encore tenté → recharger la page une fois ;
 * - hors ligne → ne pas recharger (le même document redemanderait le même
 *   fragment absent) : écran de secours tout de suite, rechargement seul au
 *   retour du réseau ;
 * - l'échec persiste après le rechargement → écran de dernier recours.
 *
 * L'écran de secours n'utilise ni layout ni composant du design system :
 * c'est justement leur chargement qui échoue.
 *
 * « Hors ligne » : `navigator.onLine` croisé avec l'état du moteur hors ligne
 * (HORS_LIGNE.md A.3.9).
 */

import { moteur } from '@/lib/hors-ligne';

export const CLE_RECHARGEMENT = 'nkaramogo:rechargement-apres-echec-import';

export type DecisionEchec =
    | 'recharger'
    | 'secours_hors_ligne'
    | 'dernier_recours';

export function deciderApresEchec(etat: {
    enLigne: boolean;
    dejaRecharge: boolean;
}): DecisionEchec {
    if (!etat.enLigne) {
        return 'secours_hors_ligne';
    }

    return etat.dejaRecharge ? 'dernier_recours' : 'recharger';
}

type ModulePage = { default?: unknown };
export type Importeurs = Record<string, () => Promise<unknown>>;

export type Environnement = {
    enLigne: () => boolean;
    lire: (cle: string) => string | null;
    ecrire: (cle: string, valeur: string) => void;
    effacer: (cle: string) => void;
    recharger: () => void;
    auRetourDuReseau: (rappel: () => void) => void;
    afficherSecours: (motif: 'hors_ligne' | 'dernier_recours') => void;
};

/** Une promesse qui ne se résout jamais : Inertia attend sans lever d'erreur. */
const attendreIndefiniment = () => new Promise<never>(() => {});

function stockage(): Storage | null {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

const environnementNavigateur = (): Environnement => ({
    // `navigator.onLine` à faux est fiable ; à vrai, il ment souvent : on
    // croise avec l'état du moteur, décidé par l'échec des requêtes.
    enLigne: () => navigator.onLine && moteur.etat.reseau !== 'hors_ligne',
    lire: (cle) => stockage()?.getItem(cle) ?? null,
    ecrire: (cle, valeur) => stockage()?.setItem(cle, valeur),
    effacer: (cle) => stockage()?.removeItem(cle),
    recharger: () => window.location.reload(),
    auRetourDuReseau: (rappel) =>
        window.addEventListener('online', rappel, { once: true }),
    afficherSecours,
});

/**
 * Le `resolve` de createInertiaApp : `name` → module de la page, à partir des
 * importeurs d'`import.meta.glob('./pages/**\/*.tsx')`.
 */
export async function chargerPage<Composant = unknown>(
    nom: string,
    importeurs: Importeurs,
    env: Environnement = environnementNavigateur(),
): Promise<Composant> {
    const importer = importeurs[`./pages/${nom}.tsx`];

    if (!importer) {
        throw new Error(`Page introuvable : ${nom}`);
    }

    let module: ModulePage;

    try {
        module = (await importer()) as ModulePage;
    } catch {
        const decision = deciderApresEchec({
            enLigne: env.enLigne(),
            dejaRecharge: env.lire(CLE_RECHARGEMENT) !== null,
        });

        if (decision === 'recharger') {
            env.ecrire(CLE_RECHARGEMENT, String(Date.now()));
            env.recharger();
        } else if (decision === 'secours_hors_ligne') {
            env.afficherSecours('hors_ligne');
            env.auRetourDuReseau(() => env.recharger());
        } else {
            env.effacer(CLE_RECHARGEMENT);
            env.afficherSecours('dernier_recours');
        }

        return attendreIndefiniment();
    }

    env.effacer(CLE_RECHARGEMENT);

    return (module.default ?? module) as Composant;
}

const MESSAGES = {
    hors_ligne: {
        titre: "La nouvelle version n'est pas encore sur ce téléphone",
        texte: 'Tes réponses déjà faites sont gardées sur ce téléphone. La page se rechargera toute seule dès que le réseau revient.',
    },
    dernier_recours: {
        titre: "Cette page n'a pas pu se charger",
        texte: "Cause probable : l'application vient d'être mise à jour, ou la connexion a coupé pendant le chargement. Tes réponses déjà faites sont gardées.",
    },
} as const;

/**
 * Écran de secours en DOM pur, styles en ligne (aucune feuille de style ni
 * composant : ils peuvent eux aussi manquer).
 */
export function afficherSecours(motif: 'hors_ligne' | 'dernier_recours'): void {
    document.getElementById('ecran-secours')?.remove();

    const sombre = document.documentElement.classList.contains('dark');
    const ecran = document.createElement('div');
    ecran.id = 'ecran-secours';
    ecran.setAttribute('role', 'alert');
    ecran.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'gap:16px',
        'padding:24px',
        'text-align:center',
        'font-family:system-ui,sans-serif',
        `background:${sombre ? '#110E0B' : '#FCF7F4'}`,
        `color:${sombre ? '#F8F4F1' : '#1E1814'}`,
    ].join(';');

    const titre = document.createElement('p');
    titre.textContent = MESSAGES[motif].titre;
    titre.style.cssText =
        'margin:0;font-size:20px;font-weight:700;max-width:28rem';

    const texte = document.createElement('p');
    texte.textContent = MESSAGES[motif].texte;
    texte.style.cssText =
        'margin:0;font-size:15px;line-height:1.5;max-width:28rem';

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = 'Recharger';
    bouton.style.cssText =
        'min-height:44px;padding:0 20px;border:0;border-radius:9999px;background:#D04904;color:#fff;font-size:14px;font-weight:600;cursor:pointer';
    bouton.addEventListener('click', () => window.location.reload());

    ecran.append(titre, texte, bouton);
    document.body.appendChild(ecran);
}
