// Présentation N'karamögö pour le ministère (16:9), à partir des captures
// de docs/presentation-ministere/diapos. Construite sur des dispositions
// (layouts) et un thème, éditable dans PowerPoint.
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const { applyTheme } = require(process.env.SKILL_PPTX + '/scripts/apply_theme.js');

const DOSSIER = process.argv[2];
const SORTIE = process.argv[3];
const img = (n) => path.join(DOSSIER, 'diapos', n);

function taille(fichier) {
    const b = fs.readFileSync(fichier);
    return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const THEME = {
    name: "N'karamögö",
    headFontFace: 'Calibri',
    bodyFontFace: 'Calibri',
    colors: {
        dk1: '1E1814', lt1: 'FFFFFF', dk2: '655C55', lt2: 'FCF7F4',
        accent1: 'F6641B', accent2: 'D04904', accent3: 'A63D02', accent4: 'FFC21A',
        accent5: '15803D', accent6: 'FEEAE2', hlink: 'A63D02', folHlink: '702905',
    },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13,333 × 7,5 pouces
pres.title = "N'karamögö · G-Étudie — présentation";
pres.author = 'VISION FUTURE – ENTREPRISES Sarlu';
pres.company = 'VISION FUTURE – ENTREPRISES Sarlu';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const PIED = "N'karamögö · G-Étudie — VISION FUTURE – ENTREPRISES Sarlu";
for (const [nom, fond] of [['CONTENU', C.background1], ['CONTENU_CREME', C.background2]]) {
    pres.defineSlideMaster({
        title: nom,
        background: { color: fond },
        objects: [
            { placeholder: { options: { name: 'rubrique', type: 'body', x: 0.6, y: 0.38, w: 9, h: 0.32, fontSize: 12, bold: true, color: C.accent3, margin: 0, valign: 'middle' }, text: '' } },
            { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.72, w: 12.1, h: 0.85, fontSize: 32, color: C.text1, margin: 0, valign: 'top', align: 'left' }, text: '' } },
            { text: { text: PIED, options: { x: 0.6, y: 7.02, w: 8, h: 0.28, fontSize: 9, color: C.text2, margin: 0 } } },
        ],
        slideNumber: { x: 12.3, y: 7.02, w: 0.45, h: 0.28, fontSize: 9, color: C.text2, align: 'right' },
    });
}
pres.defineSlideMaster({ title: 'COUVERTURE', background: { color: C.background2 }, objects: [] });

/** Titre en contraste : la phrase en normal, la fin en gras. */
function titre(slide, debut, fort) {
    slide.addText([{ text: debut, options: { bold: false } }, { text: fort, options: { bold: true } }], { placeholder: 'title' });
}
function rubrique(slide, texte) {
    slide.addText(texte, { placeholder: 'rubrique' });
}

/** Un téléphone de hauteur h (pouces), centré sur cx. */
function telephone(slide, nom, cx, y, h, legende) {
    const t = taille(img(`tel-${nom}.png`));
    const w = (h * t.l) / t.h;
    slide.addImage({ path: img(`tel-${nom}.png`), x: cx - w / 2, y, w, h, altText: legende ?? nom, objectName: `tel-${nom}` });
    if (legende) {
        slide.addText(legende, { x: cx - 1.6, y: y + h - 0.02, w: 3.2, h: 0.3, fontSize: 11, color: C.text2, align: 'center', margin: 0, isTextBox: true });
    }
    return w;
}
function ordinateur(slide, nom, x, y, w, legende) {
    const t = taille(img(`ordi-${nom}.png`));
    const h = (w * t.h) / t.l;
    slide.addImage({ path: img(`ordi-${nom}.png`), x, y, w, h, altText: legende ?? nom, objectName: `ordi-${nom}` });
    if (legende) {
        slide.addText(legende, { x, y: y + h - 0.05, w, h: 0.3, fontSize: 11, color: C.text2, align: 'center', margin: 0, isTextBox: true });
    }
    return h;
}

/** Une liste de points : [titre, texte]. */
function points(slide, items, x, y, w, h, numerotes = false) {
    const runs = [];
    items.forEach(([fort, texte], i) => {
        runs.push({ text: `${fort} `, options: { bold: true, color: C.text1, bullet: numerotes ? { type: 'number' } : { code: '25CF' }, paraSpaceAfter: 10, breakLine: false } });
        runs.push({ text: texte, options: { color: C.text2, breakLine: i < items.length - 1 } });
    });
    slide.addText(runs, { x, y, w, h, fontSize: 15, valign: 'top', margin: 0, isTextBox: true, objectName: 'points' });
}

/** Une carte : fond, titre, texte. */
function carte(slide, x, y, w, h, titreCarte, texte, style = 'blanc') {
    const fonds = { blanc: C.background1, teinte: C.accent6, encre: C.text1 };
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w, h, rectRadius: 0.12, fill: { color: fonds[style] },
        line: style === 'blanc' ? { color: 'E9E0D9', width: 0.75 } : { type: 'none' }, objectName: `carte-${titreCarte}`,
    });
    const clair = style === 'encre';
    slide.addText([
        { text: titreCarte, options: { bold: true, fontSize: 19, color: clair ? C.background2 : C.text1, breakLine: true, paraSpaceAfter: 6 } },
        { text: texte, options: { fontSize: 15, color: clair ? 'E5DDD6' : C.text2 } },
    ], { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: h - 0.4, valign: 'top', margin: 0, isTextBox: true });
}

// ---------- 1. Couverture ----------
pres.addSection({ title: 'Ouverture' });
let s = pres.addSlide({ masterName: 'COUVERTURE', sectionTitle: 'Ouverture' });
s.addImage({ path: img('illus-heros.png'), x: 0, y: 4.15, w: 13.333, h: 3.35, sizing: { type: 'cover', w: 13.333, h: 3.35 }, altText: 'Illustration', objectName: 'illustration' });
s.addImage({ path: img('illus-favicon.png'), x: 0.7, y: 0.55, w: 0.55, h: 0.55, altText: 'Logo', objectName: 'logo' });
s.addText([{ text: "N'karamögö", options: { bold: true, fontSize: 18, breakLine: true } }, { text: 'G-Étudie · la Guinée étudie', options: { fontSize: 11, color: C.text2 } }], { x: 1.35, y: 0.5, w: 4, h: 0.65, margin: 0, color: C.text1, isTextBox: true });
s.addText([{ text: 'Tout pour réussir ', options: {} }, { text: 'le CEE, le BEPC et le Bac.', options: { bold: true } }], { x: 0.7, y: 1.45, w: 7.0, h: 1.6, fontSize: 44, color: C.text1, margin: 0, valign: 'top', isTextBox: true, fontFace: 'Calibri' });
s.addText('Une application pour les élèves guinéens en classe d’examen : cours, annales corrigées, séance du soir, examens blancs, suivi des progrès — même sans connexion.', { x: 0.7, y: 3.05, w: 6.4, h: 0.9, fontSize: 16, color: C.text2, margin: 0, isTextBox: true });
telephone(s, 'accueil', 9.0, 0.45, 4.35);
telephone(s, 'progression', 11.45, 0.85, 4.35);
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 6.15, w: 4.7, h: 0.82, rectRadius: 0.1, fill: { color: C.background1 }, line: { type: 'none' }, objectName: 'porteur' });
s.addText([{ text: 'VISION FUTURE – ENTREPRISES Sarlu', options: { bold: true, fontSize: 14, breakLine: true } }, { text: 'Kountya, Coyah — République de Guinée', options: { fontSize: 12, color: C.text2 } }], { x: 0.9, y: 6.22, w: 4.4, h: 0.68, margin: 0, color: C.text1, isTextBox: true });
s.addNotes("Présentez-vous au nom de VISION FUTURE – ENTREPRISES. Une phrase : N'karamögö veut dire « mon maître » ; c'est une application qui accompagne l'élève guinéen jusqu'à son examen, sur le téléphone de la famille, même sans connexion. Le but du rendez-vous : proposer un partenariat au ministère.");

// ---------- 2. Le constat ----------
pres.addSection({ title: 'Le projet' });
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'Le projet' });
rubrique(s, 'Le projet');
titre(s, 'Un soir, quinze minutes, ', 'et l’élève sait où il en est');
carte(s, 0.6, 1.85, 5.95, 3.1, 'Le constat', '• Révisions le soir, sur un téléphone partagé, avec peu de données et un réseau qui coupe.\n• Annales corrigées et exercices de qualité difficiles à trouver.\n• L’élève ne sait pas s’il est prêt, ni par quoi commencer.');
carte(s, 6.78, 1.85, 5.95, 3.1, 'Notre réponse', '• Cours et annales corrigées pas à pas, sur le programme guinéen.\n• Une séance du jour de 10 à 30 minutes, choisie là où l’élève est faible.\n• Examens blancs en conditions réelles et jauge de préparation honnête.\n• Application installable, utilisable hors ligne.', 'teinte');
carte(s, 0.6, 5.2, 3.85, 1.55, 'Aujourd’hui', 'L’application fonctionne : élèves, équipe pédagogique, hors ligne.');
carte(s, 4.74, 5.2, 3.85, 1.55, 'Ce qui manque', 'Le contenu officiel. Les écrans montrés ici utilisent un contenu fictif.');
carte(s, 8.88, 5.2, 3.85, 1.55, 'Notre demande', 'Un partenariat avec le ministère.', 'encre');
s.addNotes("Le constat que tout le monde connaît : les élèves révisent le soir, souvent sur le téléphone d'un parent, avec un petit forfait. Notre réponse en quatre points. Insistez sur l'honnêteté : l'outil est construit, mais tout le contenu montré est un EXEMPLE fictif ; les vrais sujets et les données officielles relèvent du ministère. C'est l'objet de notre demande.");

// ---------- 3. Les examens ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'Le projet' });
rubrique(s, 'Le périmètre');
titre(s, 'Les trois examens nationaux, ', 'avec leurs vrais noms');
[['cee', 'CEE', 'Certificat d’études élémentaires, fin de la 6e année.'],
 ['bepc', 'BEPC', 'Brevet d’études du premier cycle, fin de la 10e année.'],
 ['bac', 'Baccalauréat unique', 'Terminale : séries SM, SE et SS.']].forEach(([fichier, nom, texte], i) => {
    const x = 0.6 + i * 4.14;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: 3.9, h: 3.55, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: 'E9E0D9', width: 0.75 }, objectName: `examen-${nom}` });
    s.addImage({ path: img(`illus-${fichier}.png`), x: x + 0.35, y: 2.05, w: 3.2, h: 2.08, altText: nom, objectName: `illus-${fichier}` });
    s.addText([{ text: nom, options: { bold: true, fontSize: 18, breakLine: true } }, { text: texte, options: { fontSize: 13, color: C.text2 } }], { x: x + 0.25, y: 4.25, w: 3.4, h: 1.0, align: 'center', margin: 0, color: C.text1, isTextBox: true });
});
points(s, [
    ['Filière franco-arabe', 'prévue dans le modèle, contenu dans un second temps.'],
    ['Coefficients, durées, dates de session', 'saisis par l’équipe pédagogique, jamais devinés.'],
], 0.6, 5.7, 12.1, 1.1);
s.addNotes("L'application emploie les noms exacts : CEE, BEPC, Baccalauréat unique avec ses trois séries. Point important pour le ministère : aucun coefficient, aucune durée, aucune date n'est inventé. Tant que l'équipe ne les a pas saisis, l'écran le dit (« date pas encore annoncée »).");

// ---------- 4. Accueil ----------
pres.addSection({ title: 'L’élève' });
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 1');
titre(s, 'L’accueil : ', 'trois réponses d’un coup d’œil');
telephone(s, 'accueil', 2.25, 1.75, 4.95, 'La séance du jour en premier');
telephone(s, 'accueil-suite', 5.45, 1.75, 4.95, 'La jauge et les matières');
points(s, [
    ['Que faire ce soir ?', 'La séance du jour : un seul bouton, « Commencer ».'],
    ['Suis-je prêt ?', 'La jauge de préparation, par matière. Rien de fait : 0 %.'],
    ['Combien de temps ?', 'Le compte à rebours jusqu’à la session officielle.'],
    ['Et pour tenir', 'Une série de jours, un défi, des badges — sans classement entre élèves.'],
], 7.6, 2.0, 5.1, 4.6, true);
s.addNotes("Montrez l'accueil sur le téléphone si possible. Trois questions, trois réponses : que faire ce soir, suis-je prêt, combien de temps reste-t-il. La jauge ne flatte pas : un élève qui n'a rien fait voit 0 %.");

// ---------- 5. Cours ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 2');
titre(s, 'Les cours, ', 'chapitre par chapitre');
telephone(s, 'cours', 2.3, 1.75, 4.95, 'Mes cours');
telephone(s, 'matiere', 5.2, 1.75, 4.95, 'Une matière');
telephone(s, 'lecon', 8.1, 1.75, 4.95, 'Une leçon');
points(s, [
    ['Courtes,', 'sur le programme, avec formules et « À retenir ».'],
    ['Légères,', 'quelques kilo-octets, lisibles hors ligne.'],
    ['Corrigeables :', '« Signaler une erreur » sur chaque leçon.'],
], 9.95, 2.2, 2.8, 4.2);
s.addNotes("Chaque leçon suit le programme, avec ses formules propres sur un petit écran. Une fiche de révision imprimable par chapitre. L'élève note lui-même « compris » ou « à revoir ».");

// ---------- 6. Séance ----------
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 3');
titre(s, 'La séance du jour : ', 's’entraîner là où ça compte');
telephone(s, 'seance-question', 2.25, 1.75, 4.95, 'La question');
telephone(s, 'seance-verdict', 5.45, 1.75, 4.95, 'Le verdict et le corrigé');
points(s, [
    ['D’abord', 'les notions à revoir (après 1, 3, 7, 14, 30 jours).'],
    ['Puis', 'les notions commencées mais pas maîtrisées.'],
    ['Puis', 'les nouvelles, la matière qui rapporte le plus en premier.'],
    ['Neuf types d’exercices,', 'indices à la demande, corrigé pas à pas.'],
    ['Le serveur recorrige tout :', 'impossible de tricher sur sa note.'],
], 7.6, 2.0, 5.1, 4.6);
s.addNotes("La séance n'est pas tirée au hasard : l'application reprend d'abord ce que l'élève risque d'oublier, puis ce qu'il ne maîtrise pas encore, en commençant par la matière qui compte le plus à l'examen. Le corrigé arrive tout de suite, étape par étape.");

// ---------- 7. Annales ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 4');
titre(s, 'Les annales : ', 'les vrais sujets, corrigés pas à pas');
telephone(s, 'annales', 2.25, 1.75, 4.95, 'Par matière et par session');
telephone(s, 'annale', 5.45, 1.75, 4.95, 'Un sujet en lecture');
points(s, [
    ['Objectif :', 'les sujets du CEE, du BEPC et du Bac depuis 2010.'],
    ['Trois modes :', 'lecture, entraînement, examen.'],
    ['Par chapitre :', 'tous les exercices d’annales sur une notion.'],
    ['Le document original', 'reste consultable à côté.'],
], 7.6, 2.0, 5.1, 3.4);
carte(s, 7.6, 5.4, 5.1, 1.35, 'Avec l’accord du ministère', 'Cette bibliothèque ne sera publiée qu’après convention.', 'teinte');
s.addNotes("C'est le cœur de la valeur pour l'élève, et c'est là que nous avons besoin du ministère : les sujets appartiennent à l'État. Nous ne publierons rien sans convention. Les sujets montrés ici sont fictifs.");

// ---------- 8. Examen blanc ----------
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 5');
titre(s, 'L’examen blanc, ', 'comme le jour de l’examen');
telephone(s, 'examen-blanc-lancement', 2.3, 1.75, 4.95, 'Avant de commencer');
telephone(s, 'examen-blanc-passage', 5.2, 1.75, 4.95, 'Pendant l’épreuve');
telephone(s, 'examen-blanc-resultat', 8.1, 1.75, 4.95, 'La note et le corrigé');
points(s, [
    ['Vraie durée,', 'sans indice ni corrigé.'],
    ['Une coupure', 'ne fait rien perdre.'],
    ['Note sur 20', 'recalculée par le serveur.'],
], 9.95, 2.2, 2.8, 4.2);
s.addNotes("Un vrai sujet, sa vraie durée. Si la batterie lâche ou si l'élève ferme l'application, l'examen reprend à la bonne question ; le chronomètre, lui, continue. À la fin : une note sur 20, partie par partie, puis le corrigé.");

// ---------- 9. Progression ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'L’élève' });
rubrique(s, 'Manuel · l’élève · 6');
titre(s, 'Ma progression : ', 'notion par notion');
telephone(s, 'progression', 2.25, 1.75, 4.95, 'Ce qui revient aujourd’hui');
telephone(s, 'progression-notions', 5.45, 1.75, 4.95, 'La maîtrise de chaque notion');
points(s, [
    ['Honnête :', 'les réponses récentes comptent plus ; il faut trois bonnes réponses pour 100 %.'],
    ['Maîtrisée', 'à partir de 80 %.'],
    ['Sans pression :', 'un jour pardonné par semaine — une coupure de courant ne punit pas l’élève.'],
    ['Aucun classement', 'nominatif entre élèves.'],
], 7.6, 2.0, 5.1, 4.6);
s.addNotes("L'élève voit sa maîtrise de chaque notion du programme et ce qu'il doit revoir aujourd'hui. Pour un enseignant ou un inspecteur, c'est aussi la base d'indicateurs futurs : quelles notions posent problème.");

// ---------- 10. Terrain ----------
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'L’élève' });
rubrique(s, 'Pensé pour la Guinée');
titre(s, 'Peu de données, un réseau qui coupe : ', 'l’application tient');
[['Réseau instable', 'Chaque réponse est gardée sur le téléphone, puis envoyée une seule fois au retour du réseau.'],
 ['Forfaits chers', 'Écrans et contenus légers, gardés sur le téléphone.'],
 ['Coupures de courant', 'Sauvegarde continue des séances et des examens.'],
 ['Petits Android', 'Conçu et vérifié sur un écran de 360 pixels.'],
 ['Téléphone partagé', 'Profils séparés ; code à 4 chiffres prévu.'],
 ['Sans magasin d’applications', 'Installable depuis le navigateur ; Play Store ensuite.']].forEach(([t, x], i) => {
    carte(s, 0.6 + (i % 2) * 4.15, 1.85 + Math.floor(i / 2) * 1.68, 3.95, 1.5, t, x);
});
telephone(s, 'vitrine-mobile', 11.0, 1.75, 4.95, 'La page publique');
s.addNotes("Ces contraintes sont des exigences testées, pas des promesses. La séance complète a été jouée en mode avion dans nos tests ; les essais sur de vrais téléphones font partie de l'essai pilote que nous proposons.");

// ---------- 11. Équipe pédagogique ----------
pres.addSection({ title: 'Le contenu' });
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'Le contenu' });
rubrique(s, 'Manuel · l’équipe pédagogique');
titre(s, 'Un contenu ', 'sous contrôle humain');
const hOrdi = ordinateur(s, 'equipe-editeur', 0.55, 1.75, 7.4, 'L’éditeur de leçons, avec formules');
points(s, [
    ['Rédaction', 'par un enseignant, dans un éditeur dédié.'],
    ['Relecture', 'par un second enseignant : l’auteur ne peut pas se relire.'],
    ['Import des sujets scannés :', 'l’intelligence artificielle propose, un enseignant vérifie chaque réponse.'],
    ['Signalements', 'des élèves : corrigés et tracés.'],
], 8.3, 2.0, 4.45, 4.6, true);
s.addNotes("Point clé pour un ministère : rien n'est publié sans la relecture d'un second enseignant. Pour les quelque 500 sujets depuis 2010, l'outil d'import lit un sujet scanné et propose une version structurée ; il ne publie jamais seul.");

// ---------- 12. Équipe 2 ----------
s = pres.addSlide({ masterName: 'CONTENU', sectionTitle: 'Le contenu' });
rubrique(s, 'Manuel · l’équipe pédagogique');
titre(s, 'Du sujet scanné ', 'à l’annale publiée');
ordinateur(s, 'equipe-import', 0.55, 1.75, 6.05, 'Importer un sujet (PDF ou photo)');
ordinateur(s, 'equipe-programme', 6.75, 1.75, 6.05, 'Le référentiel : programme, épreuves, coefficients');
s.addNotes("À gauche, l'import d'un sujet. À droite, le référentiel où l'équipe saisit le programme officiel, les épreuves et les coefficients : c'est exactement ce que le ministère pourrait valider.");

// ---------- 13. Mineurs ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'Le contenu' });
rubrique(s, 'Protection des élèves');
titre(s, 'Des utilisateurs mineurs : ', 'la prudence par défaut');
[['Données minimales', 'Prénom, pseudo, téléphone, classe. Ni photo, ni date de naissance, ni position.'],
 ['Pas de messagerie privée', 'Échanges futurs en groupes encadrés par un enseignant.'],
 ['Comptes protégés', 'Mots de passe jamais stockés en clair, tentatives limitées.'],
 ['Chacun voit ce qui le concerne', 'Un enseignant ses groupes, un parent ses enfants.'],
 ['IA encadrée', 'Rien de personnel n’est envoyé au futur tuteur.'],
 ['Cadre légal', 'Consentement parental fixé selon la loi guinéenne.']].forEach(([t, x], i) => {
    carte(s, 0.6 + (i % 3) * 4.07, 1.9 + Math.floor(i / 3) * 2.45, 3.85, 2.2, t, x);
});
s.addNotes("La plupart des élèves sont mineurs. Ces règles sont dans le cahier des charges dès le départ et vérifiées par des tests automatiques.");

pres.addSection({ title: 'La suite' });
// ---------- 15. La demande ----------
s = pres.addSlide({ masterName: 'CONTENU_CREME', sectionTitle: 'La suite' });
rubrique(s, 'Notre proposition');
titre(s, 'Un partenariat avec le ministère, ', 'au service des élèves');
carte(s, 0.6, 1.85, 6.0, 4.9, 'Ce que nous sollicitons', '1. Une convention sur les sujets d’examens depuis 2010.\n\n2. La validation des données officielles : programmes, coefficients, durées, dates de session.\n\n3. Un essai pilote dans quelques établissements, à Conakry et dans une préfecture.\n\n4. L’accès aux résultats officiels publiés, pour mesurer l’effet.', 'teinte');
carte(s, 6.8, 1.85, 5.95, 4.9, 'Ce que le projet apporte', '• Les annales corrigées sur le téléphone de chaque famille, même hors connexion.\n\n• Des corrigés rédigés et relus par des enseignants guinéens.\n\n• Une erreur signalée est corrigée et tracée.\n\n• À terme, des indicateurs anonymes sur les notions difficiles.\n\n• Du travail rémunéré pour des enseignants.');
s.addNotes("Concluez sur la demande, concrète et graduelle : une convention sur les sujets, la validation des données officielles, un essai pilote. Proposez de montrer l'application en direct sur le téléphone.");

// ---------- 16. Fin ----------
s = pres.addSlide({ masterName: 'COUVERTURE', sectionTitle: 'La suite' });
s.addImage({ path: img('illus-soir.png'), x: 6.2, y: 0, w: 7.133, h: 7.5, sizing: { type: 'cover', w: 7.133, h: 7.5 }, altText: 'Illustration', objectName: 'illustration' });
s.addImage({ path: img('illus-favicon.png'), x: 0.7, y: 0.55, w: 0.55, h: 0.55, altText: 'Logo', objectName: 'logo' });
s.addText([{ text: 'Un soir, quinze minutes, ', options: {} }, { text: 'et je sais où j’en suis.', options: { bold: true } }], { x: 0.7, y: 1.8, w: 5.2, h: 2.4, fontSize: 40, color: C.text1, margin: 0, valign: 'top', isTextBox: true });
s.addText('Merci de votre attention. Démonstration en direct sur téléphone ou ordinateur.', { x: 0.7, y: 4.35, w: 5.1, h: 0.8, fontSize: 16, color: C.text2, margin: 0, isTextBox: true });
s.addText([{ text: 'VISION FUTURE – ENTREPRISES Sarlu', options: { bold: true, fontSize: 14, breakLine: true } }, { text: 'Kountya, Coyah — République de Guinée', options: { fontSize: 12, color: C.text2 } }], { x: 0.7, y: 5.8, w: 5.2, h: 0.7, margin: 0, color: C.text1, isTextBox: true });
s.addNotes("Remerciez, puis passez à la démonstration en direct (compte élève de démonstration).\n\nSi l'on vous demande ce qui reste à faire ou quand ce sera disponible, réponse courte et honnête : « L'outil élève et l'outil de l'équipe pédagogique fonctionnent, vous venez de les voir. Ce qui reste dépend en grande partie de vous : le contenu officiel. Viendront ensuite la mise en ligne publique, le paiement par mobile money et un tuteur qui explique les corrigés. Nous proposons de commencer par un essai pilote dans quelques établissements. » Ne donnez pas de date ferme.");

(async () => {
    await pres.writeFile({ fileName: SORTIE });
    await applyTheme(SORTIE, THEME);
    console.log('écrit', SORTIE);
})();
