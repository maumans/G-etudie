import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
    SESSIONS,
    THEMES,
    capturer,
    figerHorloges,
    repondreAuHasard,
} from './gabarits';

/**
 * Critère d'acceptation du lot 12 (PLAN § 12) : **signalement → masquage
 * en un geste par l'enseignant.**
 *
 * Aïssatou (01) ouvre le fil de la 10e A et signale la question de Mariam
 * (exemple) ; Fatoumata (03) la voit en tête de son fil (« 1 message
 * signalé ») et touche « Masquer » — un seul geste, sans confirmation ;
 * Aïssatou rouvre le fil : la question n'y est plus. Puis Aïssatou lance un
 * quiz de culture générale, répond aux cinq questions, et voit son bilan
 * avec « Défier mes amis ».
 *
 * Tourne après les captures ; tout ce qu'il crée est défait à la fin.
 */
const ATTENTE = { timeout: 30_000 };
const HORLOGE = new Date('2026-11-19T19:00:00Z');
const QUESTION =
    'Pour le devoir de révision, est-ce qu’on a droit à la calculatrice ?';

const TAILLES = [
    { nom: '360', largeur: 360, hauteur: 740 },
    { nom: '768', largeur: 768, hauteur: 1024 },
    { nom: '1366', largeur: 1366, hauteur: 768 },
] as const;

function tinker(code: string): string {
    return execFileSync('php', ['artisan', 'tinker', '--execute', code])
        .toString()
        .trim();
}

let avant = {
    seances: '0',
    tentatives: '0',
    points: '0',
    badges: '0',
    preparees: '',
};

// La série d'Aïssatou (le quiz compte pour elle) est gardée puis remise.
const SAUVEGARDE_SERIE =
    "$f = sys_get_temp_dir().'/nkaramogo-parcours-lot12-serie.json'; $id = App\\Models\\User::where('telephone', '+224600000001')->value('id');";

test.beforeAll(() => {
    const [seances, tentatives, points, badges] = tinker(
        'echo (int) App\\Models\\Seance::max("id"), " ", (int) App\\Models\\Tentative::max("id"), " ", (int) App\\Models\\PointEffort::max("id"), " ", (int) App\\Models\\BadgeObtenu::max("id");',
    ).split(' ');
    // Le quiz préparé d'avance (hors ligne) que « Lancer un quiz » va prendre.
    const preparees = tinker(
        `${SAUVEGARDE_SERIE} echo implode(',', App\\Models\\Seance::where('user_id', $id)->where('culture', true)->whereNull('jour')->pluck('id')->all());`,
    );
    avant = { seances, tentatives, points, badges, preparees };
    tinker(
        `${SAUVEGARDE_SERIE} file_put_contents($f, json_encode(Illuminate\\Support\\Facades\\DB::table('series_jours')->where('user_id', $id)->get()));`,
    );
});

test.afterAll(() => {
    // La question redevient visible, sans signalement d'Aïssatou ; le quiz est effacé.
    tinker(
        `$p = App\\Models\\PublicationGroupe::where('texte', '${QUESTION.replace(/'/g, "\\'")}')->first(); ` +
            `if ($p) { $p->signalements()->delete(); $p->update(['masquee_le' => null, 'masquee_par' => null, 'masquage' => null]); } ` +
            `App\\Models\\EntreeJournalAcces::where('action', 'fil.publication_masquee')->where('cible_id', $p?->id)->delete(); ` +
            `App\\Models\\Tentative::where('id', '>', ${avant.tentatives})->delete(); ` +
            `App\\Models\\Seance::where('id', '>', ${avant.seances})->delete(); ` +
            `App\\Models\\PointEffort::where('id', '>', ${avant.points})->delete(); ` +
            `App\\Models\\BadgeObtenu::where('id', '>', ${avant.badges})->delete(); ` +
            (avant.preparees
                ? `App\\Models\\Seance::whereIn('id', [${avant.preparees}])->update(['jour' => null, 'termine_le' => null]);`
                : ''),
    );
    tinker(
        `${SAUVEGARDE_SERIE} $lignes = array_map(fn ($l) => (array) $l, json_decode(file_get_contents($f))); Illuminate\\Support\\Facades\\DB::table('series_jours')->where('user_id', $id)->delete(); Illuminate\\Support\\Facades\\DB::table('series_jours')->insert($lignes); unlink($f);`,
    );
});

async function capturerPartout(page: Page, ecran: string): Promise<void> {
    for (const taille of TAILLES) {
        for (const theme of THEMES) {
            await page.setViewportSize({
                width: taille.largeur,
                height: taille.hauteur,
            });
            await page.emulateMedia({ colorScheme: theme.schema });
            await page.waitForTimeout(200);
            await capturer(page, 'lot12', ecran, taille.nom, theme.nom, {
                figerVariables: true,
            });
        }
    }
}

async function ouvrir(
    browser: Browser,
    session: keyof typeof SESSIONS,
): Promise<Page> {
    const contexte = await browser.newContext({
        storageState: SESSIONS[session],
        locale: 'fr-FR',
        timezoneId: 'Africa/Conakry',
        viewport: { width: 1366, height: 768 },
    });
    const page = await contexte.newPage();
    await figerHorloges(page, HORLOGE);

    return page;
}

test('critère du lot 12 : un élève signale, l’enseignante masque en un geste', async ({
    browser,
}) => {
    test.setTimeout(240_000);

    // 1. Aïssatou signale la question de Mariam.
    const eleve = await ouvrir(browser, 'eleve');
    await eleve.goto('/eleve/groupes');
    await eleve
        .getByRole('link', { name: /Questions du groupe 10e A/ })
        .click();
    const question = eleve
        .getByRole('listitem')
        .filter({ hasText: QUESTION })
        .first();
    await expect(question).toBeVisible(ATTENTE);
    await question.getByRole('button', { name: 'Signaler' }).first().click();
    const dialogue = eleve.getByRole('dialog', { name: 'Signaler ce message' });
    await expect(dialogue).toBeVisible();
    await dialogue.getByText('Rien à voir avec les cours').click();
    await capturerPartout(eleve, 'parcours-signaler');
    await eleve.setViewportSize({ width: 1366, height: 768 });
    await dialogue.getByRole('button', { name: 'Signaler' }).click();
    await expect(
        eleve.getByText('Merci. Ton enseignant va regarder ce message.'),
    ).toBeVisible(ATTENTE);
    await expect(question.getByText('Signalé')).toBeVisible();

    // 2. Fatoumata voit le message en tête de son fil, et le masque d'un geste.
    const enseignante = await ouvrir(browser, 'enseignant');
    await enseignante.goto('/enseignant');
    await enseignante.getByRole('link', { name: /10e A/ }).first().click();
    await expect(
        enseignante.getByText(/messages? signalés? attend/),
    ).toBeVisible(ATTENTE);
    await enseignante
        .getByRole('link', { name: /Questions de la classe/ })
        .click();
    const aModerer = enseignante.getByRole('region', {
        name: /signalés? par des élèves/,
    });
    const ligne = aModerer.getByRole('listitem').filter({ hasText: QUESTION });
    await expect(ligne).toBeVisible(ATTENTE);
    await capturerPartout(enseignante, 'parcours-a-moderer');
    await enseignante.setViewportSize({ width: 1366, height: 768 });

    await ligne.getByRole('button', { name: 'Masquer' }).click();
    await expect(
        enseignante.getByText('Message masqué : les élèves ne le voient plus.'),
    ).toBeVisible(ATTENTE);
    await expect(aModerer.getByText(QUESTION)).toHaveCount(0);

    // 3. Aïssatou rouvre le fil : la question n'y est plus.
    await eleve.reload();
    await expect(
        eleve.getByRole('heading', { level: 1, name: /du groupe/ }),
    ).toBeVisible(ATTENTE);
    await expect(eleve.getByText(QUESTION)).toHaveCount(0);

    await eleve.context().close();
    await enseignante.context().close();
});

test('quiz de culture générale : cinq questions, un bilan, « Défier mes amis »', async ({
    browser,
}) => {
    test.setTimeout(240_000);

    const eleve = await ouvrir(browser, 'eleve');
    await eleve.goto('/eleve/culture');
    await eleve.getByRole('button', { name: 'Lancer un quiz' }).click();
    await expect(eleve).toHaveURL(/\/eleve\/seances\//, ATTENTE);

    for (let rang = 0; rang < 5; rang++) {
        await repondreAuHasard(eleve);
        await eleve
            .getByRole('button', { name: /^(Continuer|Voir mon bilan)$/ })
            .click();
    }

    await expect(
        eleve.getByRole('heading', { level: 1, name: /Quiz terminé/ }),
    ).toBeVisible(ATTENTE);
    await expect(
        eleve.getByRole('button', { name: 'Défier mes amis' }),
    ).toBeVisible();
    await capturerPartout(eleve, 'parcours-quiz-bilan');

    await eleve.context().close();
});
