# DEMARRAGE.md — Lancer Claude Code sur N'karamögö

À faire une seule fois, dans l'ordre.

---

## 1. Déposer les fichiers dans le projet

À la **racine** du projet Laravel :

```
CLAUDE.md               ← règles de travail (lu automatiquement par Claude Code)
PLAN_NKARAMOGO.md       ← cahier des charges complet
DESIGN.md               ← design system « Ardoise »
HORS_LIGNE.md           ← mode hors ligne : spécification + suivi
DEVBOOK.md              ← état du projet et historique des décisions
DEMARRAGE.md            ← ce fichier
```

Ces six fichiers sont la seule référence du projet : rien d'autre à fournir.

## 2. Installer l'outil de captures d'écran (Playwright)

Playwright est un navigateur piloté par Claude Code : il ouvre l'application,
clique, et prend des captures qu'il regarde lui-même pour corriger le visuel.

Dans un terminal, à la racine du projet :

```bash
claude mcp add --scope project playwright npx @playwright/mcp@latest
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

Redémarre Claude Code, puis tape `/mcp` : `playwright` doit apparaître connecté.

## 3. Le premier message à coller dans Claude Code

Passe en **mode plan** (Maj + Tab), puis colle :

---

```
Tu travailles sur N'karamögö · G-Étudie, une plateforme d'apprentissage pour les
élèves guinéens en classe d'examen (CEE, BEPC, Baccalauréat unique SM/SE/SS).

Lis en entier, dans cet ordre : CLAUDE.md, DEVBOOK.md, PLAN_NKARAMOGO.md,
DESIGN.md, HORS_LIGNE.md. Ce sont les seules références du projet.

Ensuite, SANS ÉCRIRE DE CODE :

1. Audite le projet Laravel existant : versions de Laravel, PHP, Inertia, React,
   Tailwind, Vite (composer.json, package.json), kit de démarrage utilisé,
   authentification en place, base de données configurée, tests présents.
   Dis-moi ce qui diverge de PLAN_NKARAMOGO.md § 8 et ce que tu proposes.

2. Vérifie que le serveur MCP Playwright est disponible : ouvre la page
   d'accueil actuelle du projet et fais-en une capture en 360×740. Si ça ne
   marche pas, dis-moi exactement quoi corriger.

3. Propose le plan détaillé du LOT 0 (PLAN_NKARAMOGO.md § 12, avec HL0 de
   HORS_LIGNE.md) : fichiers, migrations, packages (versions alignées sur le
   projet), composants de DESIGN.md § 11, éléments de CLAUDE.md § 4 à mettre en
   place, ordre de réalisation, tests prévus. Le lot 0 commence par la page
   /dev/composants, capturée en 4 gabarits × 2 thèmes.

4. Liste les décisions qui bloquent les lots 0 et 1 — PLAN_NKARAMOGO.md § 13
   (D1–D12) et HORS_LIGNE.md A.12 (HL-D1–HL-D12) — avec ta recommandation pour
   chacune. J'y réponds avant que tu commences.

5. Les seuls fichiers que tu peux écrire à cette étape : DEVBOOK.md (complète
   la section 2 « Stack technique » avec les versions réelles trouvées à l'audit,
   et la section 0 « Reprise ») et A_TESTER.md (à créer, vide, avec ses titres).
```

---

## 4. Ensuite, lot après lot

```
Lot N de PLAN_NKARAMOGO.md (et le lot HL correspondant de HORS_LIGNE.md).
Propose le plan, attends mon accord, puis réalise-le. Vérifie chaque écran avec
Playwright (CLAUDE.md § 6) et montre-moi les captures clés. Termine par : tests
verts, build OK, DEVBOOK.md et HORS_LIGNE.md (partie B) mis à jour, commit.
```

À la fin d'un lot visuel :

```
Montre-moi les captures 360×740 clair et sombre des écrans du lot, et dis-moi
ce que tu as corrigé après les avoir regardées.
```

## 5. Avant de montrer le projet à un partenaire

- Corriger la plaquette : **CEE** (et non CEPE), **BEPC** (et non BEPE),
  statistiques sourcées DGECS (`PLAN_NKARAMOGO.md` § 2).
- Avoir tranché D5 (droits sur les annales).
