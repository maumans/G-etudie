import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { repondreAuHasard } from './gabarits';

/**
 * Critère du lot 7 (PLAN § 12, HORS_LIGNE.md HL5 et HL6), par les vrais
 * écrans, sur des élèves neufs :
 *
 * 1. **Mode avion : séance complète, rechargement, retour du réseau → un
 *    seul envoi** — avec un contenu jamais ouvert en ligne : la matière est
 *    téléchargée, puis, sans réseau, sa page, une leçon, une fiche et une
 *    annale s'ouvrent depuis le pack, et une séance de la matière se fait
 *    jusqu'au bout ; la leçon rechargée hors ligne se rouvre depuis le pack.
 * 2. **Deux profils sur un téléphone** (A.15 n° 4) : chacun répond hors
 *    ligne, on passe de l'un à l'autre par le code local, sans réseau ; au
 *    retour du réseau, chaque réponse part une fois, au nom de son auteur.
 */

const ATTENTE = { timeout: 30_000 };

type Envoi = { uuid: string; type: string; auteur_id: number };

/** Ce que le serveur reçoit de la file et ce qu'il répond, geste par geste. */
function espionnerLaFile(page: Page) {
    const envois: Envoi[] = [];
    const verdicts: { uuid: string; verdict: string }[] = [];
    const profils: Record<string, string>[] = [];

    // Seuls les lots que le serveur a reçus (réponse 200) : hors ligne,
    // les envois tentés échouent et ne comptent pas.
    page.on('response', async (reponse) => {
        if (reponse.url().endsWith('/sync/operations') && reponse.ok()) {
            const envoye = reponse.request().postDataJSON() as {
                operations: Envoi[];
                profils?: Record<string, string>;
            };
            const corps = (await reponse.json()) as {
                resultats: { uuid: string; verdict: string }[];
            };
            envois.push(
                ...envoye.operations.map(({ uuid, type, auteur_id }) => ({
                    uuid,
                    type,
                    auteur_id,
                })),
            );

            if (envoye.profils) {
                profils.push(envoye.profils);
            }

            verdicts.push(...corps.resultats);
        }
    });

    return { envois, verdicts, profils };
}

/** Le profil choisi hors ligne dont la session n'a pas encore suivi. */
async function basculeEnAttente(page: Page): Promise<number | null> {
    return page.evaluate(async () => {
        const ouverture = indexedDB.open('nkaramogo');
        const base: IDBDatabase = await new Promise(
            (resoudre) =>
                (ouverture.onsuccess = () => resoudre(ouverture.result)),
        );

        return new Promise<number | null>((resoudre) => {
            const requete = base
                .transaction('meta')
                .objectStore('meta')
                .get('bascule_en_attente');
            requete.onsuccess = () =>
                resoudre((requete.result?.valeur as number | null) ?? null);
        });
    });
}

/** Gestes encore dans la file de l'appareil (tous profils). */
async function gestesEnFile(page: Page): Promise<number> {
    return page.evaluate(async () => {
        const ouverture = indexedDB.open('nkaramogo');
        const base: IDBDatabase = await new Promise(
            (resoudre) =>
                (ouverture.onsuccess = () => resoudre(ouverture.result)),
        );

        return new Promise<number>((resoudre) => {
            const requete = base
                .transaction('operations')
                .objectStore('operations')
                .count();
            requete.onsuccess = () => resoudre(requete.result);
        });
    });
}

/** Les profils gardés sur l'appareil : code choisi ? jeton reçu ? */
async function profilsGardes(
    page: Page,
): Promise<{ code: boolean; jeton: boolean }[]> {
    return page.evaluate(async () => {
        const ouverture = indexedDB.open('nkaramogo');
        const base: IDBDatabase = await new Promise(
            (resoudre) =>
                (ouverture.onsuccess = () => resoudre(ouverture.result)),
        );
        const profils: { code: unknown; jeton: unknown }[] = await new Promise(
            (resoudre) => {
                const requete = base
                    .transaction('profils')
                    .objectStore('profils')
                    .getAll();
                requete.onsuccess = () => resoudre(requete.result);
            },
        );

        return profils.map((p) => ({
            code: p.code !== null,
            jeton: Boolean(p.jeton),
        }));
    });
}

/** Séances préparées d'une matière gardées sur l'appareil (table `seances`). */
async function seancesDeLaMatiere(
    page: Page,
    matiere: string,
): Promise<number> {
    return page.evaluate(async (slug) => {
        const ouverture = indexedDB.open('nkaramogo');
        const base: IDBDatabase = await new Promise(
            (resoudre) =>
                (ouverture.onsuccess = () => resoudre(ouverture.result)),
        );
        const toutes: { matiere?: string }[] = await new Promise((resoudre) => {
            const requete = base
                .transaction('seances')
                .objectStore('seances')
                .getAll();
            requete.onsuccess = () => resoudre(requete.result);
        });

        return toutes.filter((seance) => seance.matiere === slug).length;
    }, matiere);
}

function suffixe(): string {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

/** Un élève neuf (BEPC, 10 minutes), jusqu'à son premier exercice. */
async function inscrire(page: Page, prenom: string): Promise<void> {
    const fin = suffixe();

    await page.goto('/register');
    await page.getByLabel('Prénom').fill(prenom);
    await page.getByLabel('Pseudo').fill(`${prenom.toLowerCase()}_${fin}`);
    await page.getByLabel('Numéro de téléphone').fill(`602${fin}`);
    await page
        .getByLabel('Mot de passe', { exact: true })
        .fill('parcours-2027');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.getByRole('link', { name: 'Plus tard' }).click(ATTENTE);
    await page.getByRole('radio', { name: /^BEPC/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('radio', { name: /10 min/ }).click();
    await page
        .getByRole('button', { name: 'Faire mon premier exercice' })
        .click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);
}

async function serviceWorkerPret(page: Page): Promise<void> {
    await page.waitForFunction(
        () => navigator.serviceWorker?.controller !== null,
        null,
        ATTENTE,
    );
}

/** Répond à toutes les questions de la séance affichée, jusqu'au bilan. */
async function faireLaSeance(page: Page): Promise<number> {
    let repondues = 0;

    for (;;) {
        await repondreAuHasard(page);
        repondues++;
        const suite = page.getByRole('button', {
            name: /^(Continuer|Voir mon bilan)$/,
        });
        const fin = (await suite.textContent()) === 'Voir mon bilan';
        await suite.click();

        if (fin) {
            break;
        }
    }

    await expect(
        page.getByRole('heading', { name: /Séance terminée/ }),
    ).toBeVisible(ATTENTE);

    return repondues;
}

/** « Commencer », ou « Reprendre » la séance du jour déjà commencée. */
function boutonSeance(page: Page) {
    return page
        .getByRole('button', { name: /^(Commencer|Une autre séance)$/ })
        .or(page.getByRole('link', { name: /^Reprendre$/ }))
        .first();
}

/** Ouvre « Qui révise ? » (pastille du profil). */
async function quiRevise(page: Page): Promise<void> {
    await page
        .getByRole('button', { name: /Qui révise/ })
        .first()
        .click();
    await expect(page.getByRole('dialog')).toBeVisible();
}

async function choisirSonCode(page: Page, code: string): Promise<void> {
    await quiRevise(page);
    await page.getByRole('button', { name: /Garde ton profil ici/ }).click();
    await page.getByLabel('Ton code à 4 chiffres').pressSequentially(code);
    await page.getByLabel('Confirme ton code').pressSequentially(code);
    await expect(
        page.getByRole('button', { name: /Garde ton profil ici/ }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
}

async function hors(
    context: BrowserContext,
    page: Page,
    horsLigne: boolean,
): Promise<void> {
    await context.setOffline(horsLigne);
    await page.waitForTimeout(200);
}

test('lot 7 — un pack téléchargé : mode avion, séance complète, rechargement, retour du réseau → un seul envoi', async ({
    page,
    context,
}) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 360, height: 740 });
    const { envois, verdicts } = espionnerLaFile(page);

    await inscrire(page, 'Kadiatou');
    await serviceWorkerPret(page);

    // Le téléchargement : poids affiché avant, puis « Sur le téléphone ».
    await page.goto('/eleve/telechargements');
    const ligne = page
        .getByRole('listitem')
        .filter({ hasText: 'Mathématiques' });
    await expect(ligne).toContainText(/Ko|Mo/);
    await ligne.getByRole('button', { name: 'Télécharger' }).click();
    await expect(ligne.getByText('Sur le téléphone')).toBeVisible(ATTENTE);
    // Les séances de la matière sont arrivées avec l'instantané.
    await expect
        .poll(() => seancesDeLaMatiere(page, 'maths'), ATTENTE)
        .toBeGreaterThan(0);

    // Mode avion. Rien de la matière n'a été ouvert en ligne.
    await hors(context, page, true);
    await ligne.getByRole('link', { name: 'Mathématiques' }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'Mathématiques' }),
    ).toBeVisible(ATTENTE);
    await expect(page.getByText(/Lu depuis ton téléchargement/)).toBeVisible();

    // Une leçon, depuis le pack.
    const lecon = page.locator('a[href^="/eleve/lecons/"]').first();
    await lecon.click();
    await expect(page.getByText('Lue depuis ton téléchargement')).toBeVisible(
        ATTENTE,
    );
    const adresseLecon = new URL(page.url()).pathname;

    // Rechargée sans réseau : rouverte depuis le pack (coquille de l'accueil).
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${adresseLecon}$`), ATTENTE);
    await expect(page.getByText('Lue depuis ton téléchargement')).toBeVisible(
        ATTENTE,
    );

    // La fiche du chapitre et une annale, depuis le pack.
    // Adresse tapée hors ligne : la page de la matière, depuis le pack.
    await page.goto('/eleve/cours/maths');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Mathématiques' }),
    ).toBeVisible(ATTENTE);
    await page.getByRole('link', { name: 'Fiche de révision' }).first().click();
    await expect(page).toHaveURL(/\/fiche$/, ATTENTE);
    await page.goBack();
    await page.locator('a[href^="/eleve/annales/"]').first().click();
    await expect(page).toHaveURL(/\/eleve\/annales\//, ATTENTE);
    await page.goBack();

    // Une séance de la matière, faite jusqu'au bout sans réseau.
    await page
        .getByRole('button', { name: 'M’entraîner' })
        .or(page.getByRole('button', { name: "M'entraîner" }))
        .click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);
    const repondues = await faireLaSeance(page);
    expect(
        envois.filter((e) => e.type === 'tentative.enregistrer'),
    ).toHaveLength(0);

    // Rechargement, toujours sans réseau : rien n'est perdu.
    await page.goto('/eleve/telechargements').catch(() => undefined);
    await page.reload();
    await expect(
        page.getByRole('heading', { level: 1, name: /sans réseau/ }),
    ).toBeVisible(ATTENTE);
    const enFile = await page.evaluate(async () => {
        const ouverture = indexedDB.open('nkaramogo');
        const base: IDBDatabase = await new Promise(
            (resoudre) =>
                (ouverture.onsuccess = () => resoudre(ouverture.result)),
        );

        return new Promise<number>((resoudre) => {
            const requete = base
                .transaction('operations')
                .objectStore('operations')
                .count();
            requete.onsuccess = () => resoudre(requete.result);
        });
    });
    expect(enFile).toBeGreaterThanOrEqual(repondues + 1);

    // Retour du réseau : chaque geste part une fois.
    await hors(context, page, false);
    await expect.poll(() => gestesEnFile(page), { timeout: 90_000 }).toBe(0);

    const uuids = envois.map((e) => e.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
    expect(
        envois.filter((e) => e.type === 'tentative.enregistrer'),
    ).toHaveLength(repondues);
    expect(envois.filter((e) => e.type === 'seance.terminer')).toHaveLength(1);
    expect(verdicts.every((v) => v.verdict === 'acceptee')).toBe(true);
});

test('lot 7 — deux profils sur un téléphone : chacun ses réponses, hors ligne, au bon nom', async ({
    page,
    context,
}) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 360, height: 740 });
    const { envois, verdicts, profils } = espionnerLaFile(page);

    // L'aînée s'inscrit, garde son profil avec un code.
    await inscrire(page, 'Mariama');
    await serviceWorkerPret(page);
    // La séance du jour rechargée en ligne : sa copie est gardée.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible(
        ATTENTE,
    );
    await page.goto('/eleve');
    await expect(boutonSeance(page)).toBeVisible(ATTENTE);
    await page.waitForTimeout(1500);
    await choisirSonCode(page, '1357');
    // Son profil est gardé ici, avec le jeton remis par le serveur.
    await expect
        .poll(() => profilsGardes(page), ATTENTE)
        .toEqual([{ code: true, jeton: true }]);

    // « Ajouter un profil » : le cadet s'inscrit sur le même téléphone.
    await quiRevise(page);
    await page.getByRole('button', { name: 'Ajouter un profil' }).click();
    await expect(page).toHaveURL(/\/login$/, ATTENTE);
    await expect(page.getByText('Déjà sur ce téléphone')).toBeVisible(ATTENTE);
    await inscrire(page, 'Sekou');
    await serviceWorkerPret(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible(
        ATTENTE,
    );
    // L'accueil, en ligne : sa copie, et les séances préparées d'avance.
    await page.goto('/eleve');
    await expect(boutonSeance(page)).toBeVisible(ATTENTE);
    await page.waitForTimeout(1500);

    // Sans réseau, le cadet commence une séance et répond à une question.
    await hors(context, page, true);
    await boutonSeance(page).click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);
    await repondreAuHasard(page);
    await page.getByRole('link', { name: 'Quitter la séance' }).click();
    await expect(page).toHaveURL(/\/eleve$/, ATTENTE);

    // Il passe la main à son aînée, toujours sans réseau, par son code.
    await quiRevise(page);
    await page.getByRole('button', { name: /^Mariama/ }).click();
    await page.getByLabel('Code de Mariama').pressSequentially('1357');
    await expect(page).toHaveURL(/\/eleve$/, ATTENTE);
    await expect(page.getByText('Mariama').first()).toBeVisible(ATTENTE);

    // Elle commence une séance (préparée d'avance) et répond.
    await boutonSeance(page).click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);
    await repondreAuHasard(page);
    expect(envois).toHaveLength(0);

    // Retour du réseau : la session suit le profil choisi, et la file part.
    await hors(context, page, false);
    await expect.poll(() => gestesEnFile(page), { timeout: 90_000 }).toBe(0);

    const auteurs = new Set(envois.map((e) => e.auteur_id));
    const uuids = envois.map((e) => e.uuid);
    expect(auteurs.size).toBe(2);
    expect(new Set(uuids).size).toBe(uuids.length);
    expect(
        verdicts
            .filter((v) => v.verdict === 'acceptee')
            .map((v) => v.uuid)
            .sort(),
    ).toEqual([...uuids].sort());
    // Les gestes de l'autre profil sont partis avec son jeton.
    expect(profils.length).toBeGreaterThan(0);

    // L'aînée est bien la session du serveur, une fois le changement de
    // session fini (une visite pendant ce changement partirait avec
    // l'ancien cookie).
    await expect.poll(() => basculeEnAttente(page), ATTENTE).toBeNull();
    await page.waitForLoadState('networkidle');
    await page.goto('/compte/profil');
    await expect(page.getByLabel('Prénom')).toHaveValue('Mariama', ATTENTE);
});
