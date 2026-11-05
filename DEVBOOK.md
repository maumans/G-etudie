# DEVBOOK : N'karamögö · G-Étudie

## 0. Reprise — où en est le projet (mis à jour le 2026-11-05, lot 5)

> À lire en premier. Le reste du document décrit le système ; cette section dit
> **ce qui est fait, ce qui n'est pas encore sûr, et par quoi reprendre**.
> Claude Code la réécrit à la fin de chaque lot.

### Documents du dépôt

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Règles de travail de Claude Code : conventions, pièges techniques connus, définition de « terminé » (lu à chaque session). |
| `PLAN_NKARAMOGO.md` | Spécification fonctionnelle : modules, données, lots, décisions D1–D12. **Source de vérité fonctionnelle.** |
| `DESIGN.md` | Design system « Ardoise », contrats des composants, protocole de vérification visuelle Playwright. |
| `HORS_LIGNE.md` | Mode hors ligne : spécification complète (partie A), suivi (partie B), décisions HL-D1–HL-D12. |
| `DEVBOOK.md` | Ce fichier : état du code, historique numéroté des décisions (section 8). |
| `A_TESTER.md` | Tous les contrôles manuels en attente (vrais téléphones, coupures réelles, paiements réels). Créé à l'audit (2026-10-30), vide. |
| `DEMARRAGE.md` | Installation de Playwright et premiers messages pour Claude Code. |
| `AGENTS.md` | Consignes Laravel Boost générées par le kit (en anglais). En cas de conflit, `CLAUDE.md` prévaut. |

### État au 2026-11-05 (lot 5 fait ; lot 0 en attente de D11)

- **Dépôt git** : `main` porte les lots 0 à 5. Les lots 3, 4 et 5 ont été
  faits **directement sur `main`**, à la demande de Maurice. Pas de dépôt
  distant (DA6).
- **Lot 5 fait** (point 19) : **examen blanc** sur une annale publiée (3ᵉ
  mode « Conditions réelles » de la fiche d'annale) : durée imprimée,
  sinon celle de l'épreuve, sinon choisie par l'élève ; passage plein
  écran sans indice ; **sauvegarde continue sur l'appareil** (Dexie, à
  chaque geste) et reprise à la bonne question ; **chronomètre calculé
  depuis l'heure de début** (le temps court application fermée, l'examen
  se termine seul) ; horloge douteuse signalée ; auto-évaluation des
  rédactions ; note affichée tout de suite puis `examen_blanc.terminer`
  (priorité 0), **recorrigée par le serveur** ; « Mes examens blancs »,
  résultat détaillé, évolution, carte de partage (prénom seul). **Note sur
  20 seule** : la moyenne pondérée attend la session complète ; le verdict
  compare à la **moyenne d'admission saisie par l'équipe** (vide = aucun
  verdict). HL3 terminé. **Critère tenu** : `parcours-lot5.spec.ts`
  (onglet fermé en plein examen, repris, une seule note) ;
  `ExamenBlancHorsLigneTest` (A.14 n° 7).
- **Lot 4 fait** (point 18) : **annales** (sujets découpés en parties, dont
  les questions sont des questions ordinaires, `source = annale`) ;
  **import assisté** : un PDF ou une photo → l'API Claude (Opus 5.5, en
  file) transcrit l'énoncé et **propose** réponse et corrigé → annale en
  brouillon, chaque réponse « à vérifier » → le rédacteur vérifie à côté du
  document original → un autre enseignant publie l'annale **et toutes ses
  questions** d'un geste ; côté élève : liste par matière et session,
  **« Exercices par chapitre »**, fiche en deux modes (**Lecture**,
  **Entraînement** par la file), document original à la demande ;
  **« Signaler une erreur »** sur chaque question, leçon et annale, par la
  file (`signalement.creer`), file des signalements au back-office, réponse
  lue dans « Mes signalements ». **Critère tenu** : `ImportAssisteTest`
  et le parcours Playwright `parcours-lot4.spec.ts`. ⚠ **Sans clé
  `ANTHROPIC_API_KEY`, la lecture est simulée** (sujet fictif marqué
  « Exemple ») : le vrai appel est à essayer (`A_TESTER.md`).
- **Lot 3 fait** (point 17) : **moteur de questions, neuf types** (QCM à
  une ou plusieurs réponses, vrai/faux, numérique avec tolérance et unité,
  réponse courte, texte à trous, appariement, remise en ordre, question
  ouverte auto-évaluée au barème), score de 0 à 100 avec « En partie
  juste » ; **indices** progressifs (ils ne retirent rien) ; **corrigé pas
  à pas** ; **versions de questions** (même circuit de relecture que les
  leçons, la version vue fait foi, `HORS_LIGNE.md` A.9) ; **écran de
  saisie** des questions au back-office (liste, création, saisie par type
  avec aperçu jouable, fiche de relecture) ; **mini-questions** dans les
  leçons ; **séance complète en mode avion** vérifiée (A.14 n° 24). HL2
  terminé. Format et correction : `App\Support\FormatQuestion` et
  `lib/contenu/questions.ts`, un même jeu d'exemples.
- **Lot 2 fait** (point 16) : profil d'examen et **parcours d'accueil**
  (examen → série → établissement si la liste existe → objectif, puis le
  premier exercice) ; **cours côté élève** (mes cours, matière, leçon avec
  « Compris / À revoir » et reprise, fiche de révision imprimable) ;
  **accueil élève réel** (compte à rebours sur la date saisie par l'équipe,
  jauge, séance du jour, mes matières, reprendre, série, premiers pas) ;
  **premiers gestes élève par la file** (`tentative.enregistrer` en QCM,
  `seance.terminer`, `lecon.progression`), corrigés par le serveur ; HL1
  terminé (leçon affichable depuis un pack). **Critère tenu** : premier
  exercice 4 à 7 s après l'inscription (`parcours-lot2.spec.ts`). Qui voit
  quoi : `App\Support\CatalogueEleve`, seule autorité.
- **Lot 1 fait** (point 15) : référentiel pédagogique (matières, épreuves
  avec coefficient et durée **vides tant que l'équipe ne les a pas
  saisis**, matières phares D1, programme en chapitres et notions, années
  scolaires) et back-office contenu (tableau de bord, liste et file de
  relecture, éditeur TipTap avec formules et encadrés, aperçu « comme
  l'élève la verra », circuit brouillon → relecture → publication avec
  renvoi commenté et versions). **Critère d'acceptation tenu** : un
  rédacteur crée une leçon avec formules, un autre la relit et la publie,
  l'auteur ne peut pas se relire — `CircuitRelectureTest`,
  `EcransLeconsTest`, parcours Playwright `parcours-lot1.spec.ts`. Format
  des blocs et `ContenuBlocs` posés dès ce lot (`HORS_LIGNE.md` B.3, écart
  n° 15).
- **Décisions** : D1–D12, HL-D1–HL-D12 et DA1–DA9 **tranchées** (point 2).
  Attendus de Maurice : domaine et hébergement (D11), logo vectoriel,
  confirmation des matières phares (D1, choisies au lot 1 à sa demande).
- **Étape 0 faite** (point 3) : bases MySQL `g_etudie` et `g_etudie_test`,
  application en français, tests sur MySQL avec garde « base `_test` »,
  CI, MCP Playwright figé.
- **Étape 1 faite** (point 4) : design system Ardoise dans `app.css`, polices
  Sora et Lexend auto-hébergées, 20 primitives dans `components/ui/`, page
  `/dev/composants` (404 en production), format `100 000 GNF` en TS et en PHP.
  Vue avec Playwright : 4 gabarits × 2 thèmes, axe sans violation sérieuse,
  aucun débordement ; captures de référence dans `tests/visuel/captures/lot0/`.
- **Étape 2 faite** (point 5) : barre de progression maison, `resolve` maison
  qui rattrape l'échec d'import, `version()` à `null` sous `public/hot`,
  `useDonneeOptionnelle` et l'outil de test `VerifiePropsOptionnelles`,
  pages d'erreur et messages de validation en français.
- **Étape 3 faite** (point 6) : quatre habillages (vitrine, élève,
  back-office, console) et leurs pages d'entrée `/`, `/eleve`, `/contenu`,
  `/console` ; pages `welcome` et `dashboard` du kit retirées ; après
  connexion, on arrive sur `/eleve`.
- **Étape 4 faite** (point 7) : connexion par téléphone et mot de passe,
  inscription (prénom, pseudo, téléphone, mot de passe), vérification du
  numéro par SMS proposée sans être imposée, mot de passe oublié par SMS,
  « Mon compte » (profil, mot de passe, numéro, affichage, suppression),
  journal des accès sensibles. Écrans de connexion et de réglages du kit
  retirés, passkeys et vérification d'e-mail aussi.
- **Design « Ardoise » v4 fait** (point 10, après la v3 du point 9 et la v2
  refusée du point 8) : mandarine chaude, crème et encre, **Bricolage
  Grotesque** (77 Ko), titres en contraste 350 / 600, **boutons à 10 px**
  sans halo ni flèche, **tableau de bord élève complet en données
  d'exemple** (`TableauDeBordExemple`, bandeau « EXEMPLE »), **vitrine
  illustrée** (cinq dessins par défaut remplaçables dans
  `config/vitrine.php`). Titre de la vitrine : « Tout pour réussir le CEE,
  le BEPC et le Bac. » (point 11). **Avant tout écran : `DESIGN.md` § 0 et
  § 0.1, la compétence `design-ardoise`, `CLAUDE.md` § 3 bis.**
- **Étape 5 faite** (point 12) : rôles et permissions (spatie 8.3.2),
  énumérations `Role`, `Permission`, `Espace`, `Perimetre` ; chaque espace
  porte son `can:` et `AccesParRoleTest` garde le routeur ; après connexion,
  `/accueil` envoie chaque compte dans son espace ; un compte de démo par
  rôle ; « Mon compte » dans l'habillage de l'espace ; double
  authentification proposée au personnel (onglet « Sécurité ») ; session de
  12 h pour le personnel.
- **Étape 6 faite** (point 13) : socle hors ligne HL0 — service worker
  maison à `/sw.js`, copies des écrans gardés, file d'opérations (Dexie,
  UUID v7, moteur), `POST /sync/operations` et `GET /sync/etat`, appareils
  enregistrés, garde de navigation, pastille, bandeaux, page de repli,
  application installable. **Tout geste élève passe par `enregistrer()`**
  (`resources/js/lib/hors-ligne`) ; un type d'opération se branche dans
  `RegistreOperations::TYPES` et `libelles.ts`. Suivi : `HORS_LIGNE.md` B.2.
- **Images de la vitrine** : dessins par défaut en place ; Maurice peut les
  remplacer (`config('vitrine.illustrations')`, mêmes proportions) et, s'il le
  souhaite, ajouter la photo détourée d'une personne majeure avec
  autorisation écrite (`public/images/vitrine/heros.webp`), posée devant
  l'illustration du héros.
- **Tests** : 456 Pest (MySQL `g_etudie_test`, rôles semés une fois par
  `TestCase`), 313 Vitest, Playwright (sessions par compte, écrans des
  lots 0 à 5, parcours d'inscription, parcours des critères des lots 1, 2,
  4 et 5, séance en mode avion du lot 3, socle hors ligne ; 426 tests) —
  verts. `tsc`,
  `vp check`, Pint, Larastan (niveau 7) et `npm run build` passent.
- **File d'attente** : l'import assisté tourne en file (`database`). En
  développement, lancer aussi `php artisan queue:work` (configuration
  `file` de `.claude/launch.json`) ; sans lui, un import reste « En file ».
- **⚠ Pas de HTTPS tant que le domaine n'existe pas** (D11) : hors
  `localhost`, le service worker ne s'inscrit pas, donc pas de hors ligne.
- **⚠ Aucun SMS ne part** : le pilote `JournalSms` écrit le code dans
  `storage/logs/laravel.log` (en production, il signale seulement l'absence
  de fournisseur). Fournisseur SMS à choisir avant le lot 8 (D3).
- **Clôture du lot 0** (point 14) : tout le lot est fait et audité ; il ne
  manque que D11 (domaine, hébergement, HTTPS). `lot-0` est fusionné dans
  `main`. Liste de mise en production : section 12.
- **Fabrique** : un élève de `User::factory()` a fini son parcours (BEPC,
  15 min) ; `->sansProfil()` pour un élève qui vient de s'inscrire.
- **Comptes sans espace** : parent, enseignant et gestionnaire n'ouvrent que
  « Mon compte » jusqu'au lot 11.
- **Lancer l'application** : `.claude/launch.json` déclare `laravel`
  (`php artisan serve`, port 8000) et `vite` (`npm run dev`, port 5173).
  Base : `php artisan migrate:fresh` puis `php artisan db:seed` — rôles et
  permissions, puis un compte de démonstration par rôle (+224 600 00 00 01
  élève BEPC … 08 administrateur plateforme, **09 second élève, Bac SE**,
  `DemoSeeder::COMPTES`) avec le mot
  de passe `DEMO_MOT_DE_PASSE` de `.env`. **MySQL** : celui de Laragon
  (`D:\Applications\laragon`), à démarrer s'il ne tourne pas — sans lui,
  chaque requête attend la base puis échoue. Les captures de référence se prennent sur le
  build : arrêter `npm run dev` et vérifier l'absence de `public/hot` avant
  `npm run test:visuel`.

### Prochaines étapes, par ordre de priorité

1. **Maurice : D11** (domaine `nkaramogo.*`, hébergement VPS + CDN) ; puis
   préproduction en HTTPS en suivant la section 12, et contrôles bloqués de
   `A_TESTER.md` (installation, mode avion, déploiement pendant une coupure,
   double authentification, session de 12 h).
2. **Maurice : clé de l'API Claude** — créer une clé sur
   console.anthropic.com, la mettre dans `.env` (`ANTHROPIC_API_KEY=…`,
   jamais dans le dépôt), relancer `php artisan queue:work`, puis importer
   un **vrai** sujet scanné (`A_TESTER.md`, « Import d'un vrai sujet »).
3. **Maurice : essayer le lot 4** — au back-office (04 rédacteur :
   « Annales », l'annale BEPC 2022 en brouillon : comparer au document,
   « J'ai vérifié », envoyer ; « Importer un sujet » ; 05 relectrice ou
   06 responsable pédagogique : « Relecture › Annales », « Signalements »),
   puis côté élève (01 Aïssatou : « Annales », BEPC 2024 en lecture et en
   entraînement, « Exercices par chapitre », « Signaler une erreur »).
4. **Équipe pédagogique** : saisir la **date de la prochaine session** de
   chaque examen (Référentiel › Épreuves) pour le compte à rebours ; **la
   convention D5** avant toute publication publique des annales (le champ
   « Droits de publication » de chaque annale l'attend).
5. **Maurice : essayer le lot 5** — 01 Aïssatou : une annale, « Conditions
   réelles », commencer, répondre, fermer l'onglet, rouvrir (l'accueil
   annonce l'examen), terminer ; « Examens blancs ». Équipe : saisir la
   **moyenne d'admission** de chaque examen (Référentiel › Épreuves) pour
   le verdict.
6. **Lot 6** : progression, maîtrise par notion, révision espacée, jauge,
   motivation ; jauge et séances pré-calculées hors ligne (HL4).
7. **Équipe pédagogique** : saisir dans le référentiel le programme
   (chapitres, notions), les coefficients et les durées des matières
   phares ; confirmer la liste des phares.
8. **Hors code, à lancer en parallèle** (sinon l'application sera vide) :
   recrutement des rédacteurs et relecteurs des matières phares, convention avec
   le ministère / la DGECS sur les annales (D5), correction de la plaquette (CEE,
   BEPC, chiffres sourcés), logo vectoriel pour les icônes de l'application,
   fournisseur SMS (D3).

### Règles à ne pas casser (détail dans `CLAUDE.md`)

- Code en français ; GNF au format `100 000 GNF`.
- **Toute route authentifiée porte un `can:`** ou figure, avec sa raison, dans
  `AccesParRoleTest::OUVERTES_A_TOUS`.
- Policies : **404, pas 403** ; les fiches de détail sont gardées, pas seulement
  les listes.
- **Aucun contenu officiel inventé** (sujet, corrigé, coefficient, durée,
  programme). Le contenu de démo porte `est_exemple = true` et le bandeau
  « EXEMPLE — contenu fictif ».
- **Le serveur recorrige toute réponse** ; la correction de l'appareil n'est
  qu'un affichage (`HORS_LIGNE.md` A.6).
- **Tout geste élève passe par la file d'opérations**, en ligne comme hors ligne
  (`HORS_LIGNE.md` A.3.5).
- Le rendu d'un contenu ne dépend pas de sa source, serveur ou pack (`HORS_LIGNE.md` A.4).
- Pas de messagerie privée libre entre élèves ; données personnelles minimales.
- Aucun écran déclaré terminé sans captures Playwright (`DESIGN.md` § 12).

## 1. Contexte & vision

Plateforme d'apprentissage pour les élèves guinéens en classe d'examen
(**CEE**, **BEPC**, **Baccalauréat unique** séries **SM / SE / SS**, filière
franco-arabe prévue) : cours, exercices, annales corrigées depuis 2010, examens
blancs chronométrés, jauge de préparation, tuteur IA. Porteur : VISION FUTURE –
ENTREPRISES Sarlu (Kountya, Coyah).

Thèse du produit : *« Un soir, quinze minutes, et je sais où j'en suis. »*

Contraintes de terrain : forfaits de données chers, Android d'entrée de gamme,
téléphone partagé par la famille, coupures de courant et de réseau, révisions
le soir. Utilisateurs principaux : **des mineurs**.

## 2. Stack technique

> Versions **réellement installées**, relevées à l'audit du 2026-10-30
> (`composer.lock`, `node_modules/*/package.json`, `php -v`, `node -v`).
> Kit de départ : **`laravel/react-starter-kit`** (kit officiel Laravel + React,
> non modifié). Une version ne se monte pas sans le dire (`CLAUDE.md` § 3).

### Environnement

| Outil | Version | Remarque |
|---|---|---|
| PHP (local) | 8.4.14 (ZTS, x64, Windows) | `composer.json` exige `^8.3` ; la CI utilise 8.4 |
| Composer | 2.10.3 | |
| Node / npm (local) | 26.11.1 / 11.5.2 | ⚠ la CI GitHub utilise Node 22 → à aligner (DA9) |
| Gestionnaire de paquets JS | npm (`package-lock.json`) | `pnpm-workspace.yaml` du kit présent mais inutilisé ; `.npmrc` : `ignore-scripts=true` |
| MySQL (développement) | serveur local joignable, **base `g_etudie` absente** | voir § 0 |

### Serveur

| Couche | Prévu (`PLAN` § 8) | Installé | Écart / décision |
|---|---|---|---|
| Framework | Laravel | **laravel/framework 13.39.0** | — |
| Pont Inertia | Inertia | **inertiajs/inertia-laravel 3.5.2** (Inertia **v3**) | v3 : `Inertia::optional()`, pas d'Axios, événements `httpException` / `networkError`, `router.cancelAll()` |
| Authentification | téléphone + mot de passe (D3) | **laravel/fortify 1.41.0** : connexion par **e-mail**, inscription, réinitialisation par lien e-mail, vérification d'e-mail, 2FA TOTP, **passkeys** (laravel/passkeys 0.2.1) | ✅ (étape 4) identifiant `telephone` normalisé, inscription maison, récupération et vérification par code SMS hors Fortify ; réinitialisation par e-mail, vérification d'e-mail et passkeys retirées (`@laravel/passkeys` désinstallé) ; 2FA gardée pour le personnel (DA4) |
| Routes typées | — | **laravel/wayfinder 0.1.23** (+ `@laravel/vite-plugin-wayfinder` 0.1.11) | conservé : fonctions TS générées pour chaque route |
| Permissions | `spatie/laravel-permission` | **absent** | à ajouter : **^8.3** (8.3.2 accepte `illuminate/* ^12\|^13`, PHP ^8.3) |
| Files d'attente | réelles (Redis ou base) | `QUEUE_CONNECTION=database` | conforme ; tests en `sync` (phpunit.xml) |
| Cache / sessions | — | `database` / `database` (120 min) | durée de session : HL-D10 |
| Base de données | MySQL | MySQL `g_etudie` (`.env`) | ✅ créée (`utf8mb4_unicode_ci`) et migrée, étape 0 |
| Langue / fuseau | français | `APP_LOCALE=en`, `faker en_US`, fuseau `UTC` | ✅ `fr` / `fr_FR` (étape 0) ; UTC conservé en base (Conakry = UTC+0, sans heure d'été) |
| Outillage dev | — | laravel/boost 2.10.4 (MCP + skills), laravel/mcp 1.1.2, laravel/pail 1.2.7, laravel/pao 1.1.5, laravel/chisel 0.1.1, laravel/sail 1.69.0, laravel/tinker 3.0.2, laravel/pint, larastan/larastan 3.13.2 (niveau 7) | — |

### Interface

| Couche | Prévu | Installé | Écart / décision |
|---|---|---|---|
| React | React | **react / react-dom 19.3.1**, React Compiler (`babel-plugin-react-compiler` 1.0.0) | — |
| Inertia (client) | Inertia | **@inertiajs/react 3.9.1**, @inertiajs/vite 3.9.1 | le plugin Vite résout les pages lui-même : un `resolve` maison sera nécessaire pour rattraper l'échec d'import (`HORS_LIGNE.md` A.3.3) |
| Langage | `.js` / `.jsx` (textes de `CLAUDE.md`, `HORS_LIGNE.md`) | **TypeScript 5.9.3** (`.ts` / `.tsx`, `tsc --noEmit` en CI) | DA1 : conserver TypeScript |
| CSS | Tailwind (+ `tailwind.config`) | **tailwindcss 4.3.3** (`@tailwindcss/vite`), configuration **dans `app.css`** (`@theme`, `@source`), **sans `tailwind.config`** | règle « classes seulement dans le JS/TS » maintenue ; jetons Ardoise dans `@theme` ; variante `dark:` redéfinie pour exclure un sous-arbre `.clair` (étape 1) |
| Bundler | Vite | **Vite+ 1.4.0** (`vite` remplacé par `@voidzero-dev/vite-plus-core` 1.4.0, Rolldown 1.2.16), commandes `vp dev / build / check / test`, `vite.config.ts` | `optimizeDeps.include` à vérifier sous Vite+ ; laravel-vite-plugin 3.2.0 |
| Primitives UI | shadcn/Radix + CVA + tailwind-merge | shadcn « new-york » (`components.json`), 13 paquets `@radix-ui/react-*`, class-variance-authority 0.7.1, tailwind-merge 3.7.0, clsx, lucide-react 0.475.0, sonner 2.0.8, input-otp 1.4.2 | dossier `resources/js/components/ui/` en **minuscules et kebab-case** (DA7) ; `@radix-ui/react-tabs` 1.2.1 ajouté (étape 1) ; `tailwind-merge` étendu aux jetons Ardoise |
| Polices | Bricolage Grotesque, KaTeX auto-hébergées (v4) | Instrument Sans via l'option `fonts` de laravel-vite-plugin : **téléchargée au build et servie depuis `public/build/assets`** (auto-hébergée) | ✅ v4 : `@fontsource-variable/bricolage-grotesque` 5.3.0 (fichier `opsz`) importé dans `app.css` (Sora et Lexend retirés au point 8, Geist et Instrument Serif au point 9, Plus Jakarta Sans au point 10) ; option `fonts` du plugin retirée (elle faisait télécharger le WOFF) — `DESIGN.md` § 13 |
| Formules | KaTeX | absent | ✅ `katex` 0.19.1 (types inclus), composant `Formule`, pré-optimisé dans `vite.config.ts` |
| Hors ligne | SW maison, Dexie, UUID v7 | absent | `dexie` 4.4.7 au lot 0 ; UUID v7 écrit à la main (`lib/hors-ligne/uuid7.ts`) |
| Graphiques / éditeur | Recharts / TipTap | absents | lots 1 (TipTap) et 6 (Recharts) |

### Tests

| Outil | Prévu | Installé | Remarque |
|---|---|---|---|
| Tests PHP | PHPUnit | **Pest 5.3.4** sur **PHPUnit 13.4.5**, pest-plugin-laravel 5.0.1 | DA2 ; `TestCase` appelle `withoutVite()` (un test ne dépend pas d'un build) |
| Base de test | dédiée | **SQLite en mémoire** (`phpunit.xml`) | ✅ MySQL `g_etudie_test` (DA3) ; `TestCase` refuse toute base sans suffixe `_test` |
| Tests JS | Vitest + fake-indexeddb | **Vitest 5.0.5** (fourni par Vite+) | ✅ `npm run test:js` (`vp test run`), tests dans `tests/js/`, environnement happy-dom 21, @testing-library/react 16 ; `fake-indexeddb` à l'étape 6 |
| Bout en bout / visuel | Playwright + axe | **@playwright/test 1.64.1**, **@axe-core/playwright 4.14.0**, navigateurs installés | ✅ `playwright.config.ts`, `tests/visuel/ecrans.spec.ts`, `npm run test:visuel` ; captures de référence prises sous Windows |
| MCP Playwright | `@playwright/mcp` | déclaré dans `.mcp.json` en `@latest` (0.0.83 au 2026-10-30), **opérationnel** | ✅ figé en 0.0.83 |
| CI | — | `.github/workflows/tests.yml` : `composer setup` puis `composer ci:check` (oxlint/oxfmt via `vp check`, `tsc`, Pint, Larastan, Pest) | ✅ service MySQL, Node 26, `test:js` ; tests visuels pas encore en CI (captures de référence propres à Windows) |

### Poids de départ (kit non modifié)

Build de production : JS + CSS ≈ **233 Ko compressés (gzip)** au total ; le
fragment partagé (React, Inertia, utilitaires — nommé `wayfinder-*.js` par
Rolldown) pèse 344 Ko bruts / 106 Ko gzip. Page d'accueil du kit : 14 requêtes,
764 Ko décodés (`php artisan serve` ne compresse pas). Budget de la coquille
(`HORS_LIGNE.md` A.11) : < 500 Ko transférés.

### Choix confirmés pour la suite

- **UI** : primitives shadcn/Radix du kit **restylées** en « Ardoise » (`DESIGN.md` § 11) — pas de second jeu de contrôles.
- **Formules** : KaTeX. **Éditeur back-office** : TipTap + extension mathématique (lot 1).
- **Graphiques** : Recharts (lot 6).
- **Hors ligne** : service worker maison servi à `/sw.js`, Dexie, UUID v7 (`HORS_LIGNE.md` A.3).
- **IA** : API Claude (tuteur, import d'annales assisté) — modèle et prix vérifiés au moment du lot.

## 3. Architecture des données (prévue)

Détail dans `PLAN_NKARAMOGO.md` § 6.

| Groupe | Tables | État |
|---|---|---|
| Référentiel | `annees_scolaires`, `examens`, `series`, `classes`, `matieres`, `epreuves`, `chapitres`, `notions` (la filière est une énumération, pas une table) | ✅ lot 1 (point 15) |
| Contenu | `lecons`, `versions_contenu` ✅ lot 1 ; `questions`, `indices`, `corriges`, `sujets`, `sujet_parties`, `ressources_externes`, `signalements`, `packs_hors_ligne` | 🟡 lots 3, 4, 7 |
| Comptes | `users` (téléphone, prénom, pseudo, nom et e-mail facultatifs, `telephone_verifie_le`, `desactive_le`), `codes_sms` | ✅ lot 0, étape 4 |
| Élève | `profils_eleves`, `progressions_lecons`, `seances`, `tentatives` ✅ lot 2 ; `liens_parents`, `maitrises`, `examens_blancs`, `series_jours`, badges, défis | 🟡 lots 5, 6, 11 |
| Contenu (élève) | `questions` (QCM à une réponse au lot 2, conçue pour tous les types), `examens.date_prochaine_session`, `etablissements` (vide) | ✅ lot 2 |
| Organisation | `etablissements`, `groupes`, `devoirs`, `abonnements`, `paiements`, `codes_acces`, `conversations_tuteur` | ⬜ prévu (lots 9 à 11) |
| Audit | `journal_acces_plateforme` (écrit par `App\Support\JournalAcces`) | ✅ lot 0, étape 4 |
| Hors ligne | `appareils`, `appareil_profils`, `operations_synchronisees` | ✅ lot 0, étape 6 |

**Une seule plateforme, pas de multi-entreprise.** Les établissements, groupes
et liens parent-enfant sont des **rattachements**, qui disent sur quoi une
permission s'exerce (section 7).

## 4. État d'avancement — backend

| Service | Rôle | État |
|---|---|---|
| `ReferentielService` | slug des matières, suppressions gardées, ordre des chapitres et notions, année courante unique | ✅ lot 1 |
| `ContenuService` + workflow de relecture | seule porte du statut, **leçons et questions** (`ContenuRelisable`) : brouillon → relecture → publication / renvoi commenté / reprise → archivage ; versions figées ; verrou optimiste ; l'auteur ne se relit jamais | ✅ lots 1 et 3 |
| `Annales\ImportSujetService` + `ExtracteurClaude` / `ExtracteurSimule` | document → lecture en file (job `TraiterImportSujet`) → annale en brouillon, réponses « à vérifier » ; proposition vérifiée (`PropositionEnQuestion`, `TexteEnBlocs`) | ✅ lot 4 |
| `Annales\SujetService` | parties, questions d'une annale ; circuit du sujet **et** de ses questions en un geste | ✅ lot 4 |
| `SignalementService` | `signalement.creer` (10 par jour, cible visible, idempotent), réponse de l'équipe, réponses non lues | ✅ lot 4 |
| `TentativeService` | enregistrement (ajout seulement), **correction serveur contre la version vue**, neuf types, score 0–100, indices comptés, auto-évaluation ; maîtrise au lot 6 | ✅ lot 3 |
| `SeanceService` | séance du jour minimale (jamais vues, ratées, réussies, matières alternées, ordre stable), fin de séance ; séances pré-calculées au lot 6 | 🟡 lot 2 |
| `ProfilEleveService` | seule porte du profil d'examen (classe déduite, série exigée au Bac, filière gardée) | ✅ lot 2 |
| `ProgressionService` | « compris / à revoir », position ; la saisie la plus récente gagne | ✅ lot 2 |
| `TableauDeBordEleveService` | met en forme l'accueil élève depuis les services qui font autorité | ✅ lot 2 |
| `ExamenBlancService` | `examen_blanc.terminer` : recorrection contre les versions vues, note sur 20 (`NoteExamen`), horloge signalée, idempotent ; moyenne pondérée avec la session complète | ✅ lot 5 |
| `MaitriseService` | jauge (lot 2 : part des questions réussies par matière, pondérée seulement si tous les coefficients sont saisis) ; maîtrise par notion et révision espacée au lot 6 | 🟡 lot 2 |
| `PackService` | génération, empreintes, différentiel, droits | ⬜ |
| `SynchroService` | file d'opérations (`HORS_LIGNE.md` A.3.6) : cinq verdicts, idempotence par la base, `enTantQue`, horloge ; quatre types d'opération élève au lot 3 | ✅ étape 6 |
| `TuteurService` | API Claude, quotas, journal, coûts | ⬜ |
| `PaiementService` | Orange Money, MTN MoMo, codes prépayés | ⬜ |
| `PlateformeService` | console : activité, contenu, revenus, impact | ⬜ |

## 5. État d'avancement — frontend

| Habillage / écran | État |
|---|---|
| Page `/dev/composants` (catalogue Ardoise) | ✅ lot 0, étape 1 (point 4) |
| Habillages vitrine, élève, back-office, console (coquilles et pages d'entrée) | ✅ lot 0, étape 3 (point 6) |
| Vitrine finale (démo jouable, compte à rebours, tarifs) | ⬜ lot 8 |
| Connexion / inscription par téléphone, vérification du numéro, mot de passe oublié, « Mon compte » | ✅ lot 0, étape 4 (point 7) |
| « Mon compte » dans l'habillage de chaque espace, onglet « Sécurité » du personnel (double authentification, session, activité), page 403 | ✅ lot 0, étape 5 (point 12) |
| Socle hors ligne : pastille et feuille « Tes réponses », bandeaux (hors ligne, session expirée, copie datée, iPhone), dialogue « écran indisponible », navigation estompée, installation, page de repli, filet de démarrage | ✅ lot 0, étape 6 (point 13) |
| Parcours d'accueil (examen, série, établissement, objectif) | ✅ lot 2 |
| Accueil élève (compte à rebours, jauge, séance du jour, matières, reprendre, série, premiers pas) | ✅ lot 2 |
| Cours : mes cours, matière, leçon, fiche de révision | ✅ lot 2 |
| Lecteur d'exercice (« l'ardoise ») | ✅ lot 3 : neuf types, indices, verdict (juste / en partie / pas encore / à toi d'évaluer), corrigé pas à pas, auto-évaluation, reprise, bilan |
| Mini-question dans une leçon | ✅ lot 3 |
| Annales (liste, exercices par chapitre, fiche en lecture et en entraînement, document original), « Mes signalements », « Signaler une erreur » | ✅ lot 4 (« Conditions réelles » au lot 5) |
| Examen blanc (lancement, passage plein écran, auto-évaluation, résultat, « Mes examens blancs », carte de partage) | ✅ lot 5 |
| Progression, profil, téléchargements | ⬜ |
| Back-office contenu : tableau de bord, référentiel (matières, épreuves, programme, années), leçons (liste, relecture, création, éditeur TipTap, fiche, historique) | ✅ lot 1 (point 15) ; **questions** ✅ lot 3 (liste, création, saisie par type avec aperçu jouable, fiche, relecture) ; **annales** (liste, import, fiche à côté du document, relecture) et **signalements** (file, fiche, réponse) ✅ lot 4 |
| Console plateforme | ⬜ |

Infrastructure d'interface à construire au lot 0 : primitives de `DESIGN.md`
§ 11, barre de progression de navigation et garde-fous Inertia (`CLAUDE.md` § 4),
composants hors ligne (`HORS_LIGNE.md` A.3.7 à A.3.9), formatage GNF dans
`lib/utils.js`.

## 6. Données de démonstration (seeders)

| Seeder | Rôle | État |
|---|---|---|
| `RolesEtPermissionsSeeder` | recopie `App\Enums\Role` et `App\Enums\Permission` en base (`syncPermissions`, permissions inconnues supprimées) ; lancé aussi en production | ✅ étape 5 |
| `ReferentielSeeder` | examens, séries, classes d'examen (recopiés à chaque passage) ; année 2026-2027, dix matières, épreuves des matières phares (D1) semées **une fois**, sur table vide — **coefficients et durées vides**, programme non semé ; lancé aussi en production | ✅ lot 1 |
| `DemoSeeder` | un compte de démo par rôle (+224 600 00 00 01 à 09, `DemoSeeder::COMPTES`, deux élèves) ✅ étape 5 ; puis `DemoContenuSeeder` ✅ lot 1 : chapitres, notions et cinq leçons **fictifs** (`est_exemple`), une par statut, passés par `ContenuService` (vrai historique) ; `DemoCoursSeeder` ✅ lots 2 et 3 : neuf leçons publiées (dont une avec mini-question) et 30 questions fictives des neuf types (BEPC, Bac SE), avec indices et corrigés, passées par `ContenuService` — 28 publiées, une en brouillon, une en relecture ; `DemoEleveSeeder` ✅ lot 2 : profils (Aïssatou BEPC avec trois soirs de réponses et deux leçons ouvertes, Ousmane Bac SE sans rien) ; `DemoAnnalesSeeder` ✅ lot 4 : quatre annales **fictives** passées par le chemin d'un vrai import (BEPC maths 2024 et 2023, Bac SE chimie 2024 publiées ; BEPC 2022 en brouillon, réponses à vérifier, un « [illisible] »), PDF d'exemple, deux signalements d'Aïssatou (un ouvert, un répondu et lu) | ✅ |

⚠ Les permissions ne viennent que des seeders : un déploiement lance `migrate`
**puis** `db:seed`. Comptes créés en `firstOrCreate` (un re-seed ne réinitialise
jamais un mot de passe).

Comptes de démo (mot de passe `DEMO_MOT_DE_PASSE` du `.env` de développement,
jamais en production — `DatabaseSeeder` n'appelle `DemoSeeder` que hors
production) : 01 élève (Aïssatou), 02 parent, 03 enseignante, 04 rédacteur,
05 relectrice, 06 responsable pédagogique, 07 gestionnaire d'établissement,
08 administrateur plateforme, 09 Ousmane (second élève, Bac SE, lot 2).

## 7. Rôles et périmètres

Rôles : `eleve`, `parent`, `enseignant`, `redacteur`, `relecteur`,
`admin_contenu`, `gestionnaire_etablissement`, `superadmin`
(`PLAN_NKARAMOGO.md` § 4).

Une permission dit ce que le compte peut faire ; le rattachement dit sur quoi :

| Rattachement | Qui le porte | Ce qu'il ouvre |
|---|---|---|
| profil élève (examen, série) | élève | ses contenus, ses packs |
| lien parent ↔ enfant | parent | la progression de cet enfant seulement |
| membre d'un groupe | enseignant, élève | ce groupe seulement |
| établissement | gestionnaire, enseignant | les comptes de cet établissement |

**Une seule autorité** : `App\Support\Perimetre` répond à « sur quels élèves /
groupes / établissements ce compte peut-il agir ? ». Aucun contrôleur ne refait
cette question à sa façon. Elle distingue deux notions :
- le **périmètre** — ce qu'on peut **consulter** ;
- les **rattachements** — là où l'on **agit** ; les gardes d'écriture exigent un
  rattachement, jamais le seul périmètre de consultation.

## 8. Historique des décisions

1. [x] **Cadrage du projet** (2026-10-29 / 30), à partir de la plaquette
   « N'KARAMÖGÖ – G-ÉTUDIE » :
   - **Corrections de la plaquette** : l'examen de fin de primaire est le
     **CEE** (Certificat d'Études Élémentaires), pas le CEPE ; « BEPE » est une
     coquille pour **BEPC** ; « les trois dernières années de 2022 à 2019 »
     couvre quatre ans et les taux cités ne sont pas sourcés ; la filière
     franco-arabe et les trois séries du Bac (SM, SE, SS) n'y figurent pas.
   - **Risques identifiés** : droits sur les annales (propriété de l'État →
     convention, D5) ; volume de contenu (~500 sujets depuis 2010) ; utilisateurs
     mineurs (pas de messagerie libre, D7).
   - **Documents créés** : `PLAN_NKARAMOGO.md`, `DESIGN.md` (« Ardoise »),
     `HORS_LIGNE.md`, `CLAUDE.md`, `DEMARRAGE.md`, ce DEVBOOK.
   - **Choix structurants** : Laravel + Inertia + React ; service worker maison ;
     contenu hors ligne en **packs de données** et non en pages gardées ; tout
     geste élève par la file d'opérations dès le lot 3 ; Playwright obligatoire
     pour toute interface.

2. [x] **Audit du projet et arbitrages** (2026-10-30)
   - **Constat** : le projet est le kit `laravel/react-starter-kit` non modifié
     (versions en section 2). Écarts avec le plan : TypeScript au lieu de JS,
     Pest au lieu de PHPUnit, Tailwind 4 sans `tailwind.config`, Vite+ au lieu
     de Vite, Inertia v3, Fortify par e-mail ; base `g_etudie` absente (toutes
     les pages en 500) ; pas de dépôt git, et un `.gitignore` qui excluait
     `CLAUDE.md` et `.mcp.json`. Playwright MCP opérationnel.
   - **Décision** : Maurice retient **toutes** les recommandations :
     - D1–D12 et HL-D1–HL-D12 : propositions du plan, avec les précisions
       consignées dans `PLAN_NKARAMOGO.md` § 13 et `HORS_LIGNE.md` B.1.
     - **DA1** TypeScript conservé · **DA2** Pest conservé (classe PHPUnit quand
       une constante est utile) · **DA3** base de test MySQL `g_etudie_test` ·
       **DA4** vérification d'e-mail et passkeys retirées, 2FA TOTP proposée
       seulement aux rôles back-office et console · **DA5** suppression du
       compte par l'utilisateur conservée (confirmation, mot de passe, journal)
       · **DA6** dépôt git local, `.gitignore` corrigé (pas de dépôt distant
       tant que Maurice n'en donne pas) · **DA7** fichiers d'interface en
       kebab-case (`zone-donnee.tsx` exporte `ZoneDonnee`) · **DA8** pas de logo
       vectoriel fourni → monogramme « N' » provisoire · **DA9** Node 26 en
       local et en CI.
     - Documents mis à jour en conséquence : `CLAUDE.md` § 3 et § 4,
       `DESIGN.md` § 11, `HORS_LIGNE.md` B.5 (journal des écarts).
   - **Preuve** : 40 tests Pest du kit verts avant toute modification ;
     captures de l'audit dans `.playwright-mcp/`.

3. [x] **Lot 0, étape 0 — prérequis** (2026-10-30, commit `c0ec836`)
   - **Constat** : base de développement absente, application en anglais,
     tests sur SQLite en mémoire, MCP Playwright en `@latest`, CI sans base.
   - **Décision** : bases MySQL `g_etudie` et `g_etudie_test`
     (`utf8mb4_unicode_ci`) ; `phpunit.xml` force `g_etudie_test` ;
     `Tests\TestCase::setUpTraits()` refuse toute base sans suffixe `_test`
     (le crochet `beforeRefreshingDatabase()` ne convient pas : défini dans
     `TestCase`, il est masqué par celui, vide, du trait `RefreshDatabase`) ;
     `.env` en `fr` / `fr_FR`, `APP_NAME` « N'karamögö » ; CI avec service
     MySQL et Node 26 ; scripts `test:js` et `test:visuel`.
   - **Preuve** : 40 tests Pest du kit verts sur MySQL ; garde vérifiée en
     pointant volontairement la suite sur `g_etudie` — refusée, base intacte
     (10 tables).
4. [x] **Lot 0, étape 1 — design system Ardoise et `/dev/composants`**
   (2026-10-30)
   - **Constat** : thème shadcn neutre du kit ; polices Instrument Sans
     téléchargées en WOFF ; aucune primitive de `DESIGN.md` § 11.
   - **Décision** :
     - jetons dans `resources/css/app.css` : palettes fixes dans `@theme`,
       neutres qui basculent en sombre sur `:root, .clair` / `.dark`, variables
       shadcn rebranchées sur Ardoise ; échelle typographique, rayons, ombres ;
     - polices Sora et Lexend par Fontsource (72,5 Ko en latin) ;
     - primitives dans `resources/js/components/ui/` : restylées `button`
       (`variant` × `ton` × `taille`), `input`, `label`, `badge`, `dialog`,
       `card`, `checkbox`, `skeleton`, `spinner`, `sonner`, `input-otp` ;
       créées `champ`, `textarea`, `search-input`, `telephone-input`,
       `code-input`, `date-input`, `number-input`, `choix`, `feuille`,
       `confirm-provider` (`confirmer()`, monté dans `app.tsx`), `tabs`,
       `pagination`, `zone-donnee`, `etat-vide`, `formule`, `bandeau-exemple` ;
     - `lib/utils.ts` : `formaterGnf()`, `formaterNombre()`, `lireNombre()`,
       `tailwind-merge` étendu ; `App\Support\Gnf` ; `lib/telephone.ts` et
       `lib/matieres.ts` ;
     - route `dev.composants` gardée par `SeulementEnDeveloppement` (404 hors
       `local` / `testing`) ;
     - les variantes `secondary` et `size` du bouton du kit sont remplacées
       dans ses écrans (`outline`, `taille`).
   - **Vu avec Playwright** (captures découpées et relues) et corrigé :
     texte des boutons pleins effacé par `tailwind-merge` ; options de QCM
     sans nom accessible ; erreur KaTeX illisible en sombre ; formule
     défilante inatteignable au clavier ; code à 6 cases qui débordait à
     360 px puis sur la colonne voisine à 1366 ; onglets et pagination trop
     larges à 360 px ; « Mathématiques » coupé dans sa tuile ; champs
     décalés dans une rangée ; bouton « Recharger la page » hors de son cadre.
     Détail dans `DESIGN.md` § 13.
   - **Preuve** : 56 tests Pest (dont `DevComposantsTest`, `GnfTest` sur
     `tests/fixtures/gnf.json`), 92 tests Vitest (`gnf`, `telephone` sur
     `tests/fixtures/telephones.json`, `contrastes`, `search-input`,
     `composants`), 8 tests Playwright (4 gabarits × 2 thèmes : pas de
     débordement de page ni de cadre, axe sans violation sérieuse ou
     critique, capture de référence). `tsc`, `vp check`, Pint, Larastan et
     build verts.
   - **Reste** : `App\Support\Telephone` (jumeau PHP de `lib/telephone.ts`)
     arrive à l'étape 4 avec la connexion par téléphone ; contrôles sur vrai
     téléphone inscrits dans `A_TESTER.md`.

5. [x] **Lot 0, étape 2 — garde-fous Inertia** (2026-10-30)
   - **Constat** : barre de progression d'Inertia ; pages résolues par le
     plugin `@inertiajs/vite`, sans rattrapage d'un fragment supprimé par un
     déploiement ; `version()` active sous `npm run dev` ; pages d'erreur et
     messages de validation de Laravel en anglais.
   - **Décision** :
     - `resources/js/lib/barre-navigation.ts` + `progress: false` : départ sur
       `before` (préchargements, visites sans progression et visites déjà
       annulées par un écouteur antérieur ignorés), rien sous 80 ms,
       animation `transform`, fin après `finish` + double
       `requestAnimationFrame`, avec une **fin de secours à 1 s** — vue au
       navigateur : une fenêtre qui ne peint pas laissait la barre affichée ;
       effacement sans aller au bout sur annulation ou erreur ;
     - `resources/js/lib/chargement-page.ts` : `resolve` fourni à
       `createInertiaApp` (le plugin n'injecte alors pas le sien) ; échec
       d'import → rechargement une fois en ligne, écran de secours hors ligne
       avec rechargement au retour du réseau, dernier recours sinon ; écran
       en DOM pur, sans CSS ni composant ; `window.__nkaramogoPret` posé au
       démarrage. « Hors ligne » vient de `navigator.onLine` jusqu'à
       l'étape 6 (`useHorsLigne`) ;
     - `HandleInertiaRequests::version()` → `null` si `public/hot` existe ;
     - `hooks/use-donnee-optionnelle.ts` (états `chargement` / `echec` /
       `pret`, `onFinish` conclut toujours, 200 sans la prop = échec) et
       `tests/Concerns/VerifiePropsOptionnelles` (en-têtes Inertia réels,
       version en chaîne) ;
     - `Inertia::handleExceptionsUsing()` → page `erreur` (403, 404, 419, 429,
       500, 503), 500 laissée à la page de débogage sous `APP_DEBUG` ;
       `lang/fr` (validation complète, noms de champs lisibles, auth, mots
       de passe, pagination) ; fichiers `lang/en` publiés puis retirés.
   - **Preuve** : Vitest `barre-navigation` (7), `chargement-page` (8, dont
     le test 19 de `HORS_LIGNE.md` A.14), `use-donnee-optionnelle` (5) ;
     Pest `VersionInertiaTest` (3, dossier public jetable : le vrai
     `public/hot` n'est jamais touché), `PropsOptionnellesTest` (2, la
     fermeture n'est pas évaluée au chargement complet), `PagesErreurTest`
     (5), `TraductionsTest` (3, chaque règle de Laravel a sa traduction).
     Page d'erreur 404 capturée en 4 gabarits × 2 thèmes, axe propre.
     Navigation Inertia réelle (lien de pagination) vérifiée au navigateur :
     page rendue, aucun écran de secours, aucune erreur console.
     Totaux : 69 Pest, 112 Vitest, 16 Playwright.
   - **Reste** : `prefetch` sur les liens de navigation, à poser avec les
     habillages (étape 3).

6. [x] **Lot 0, étape 3 — les quatre habillages** (2026-10-30)
   - **Constat** : un seul habillage du kit (barre latérale anglaise,
     « Dashboard »), une page d'accueil Laravel, aucun espace par public.
   - **Décision** :
     - `components/marque.tsx` (monogramme « N' » provisoire, DA8) ;
       `components/lien-navigation.tsx` : une entrée, trois variantes
       (onglet, latéral 48 px, dense 40 px), `prefetch`, `aria-current` ;
       une entrée d'un lot à venir reste visible avec « bientôt » et, touchée,
       le dit par une notification (jamais de clic mort) ;
       `lib/navigation.ts` : les entrées des trois espaces ;
     - `layouts/vitrine-layout.tsx` (vouvoiement, « Se connecter » / « Créer
       un compte ») ; `layouts/eleve-layout.tsx` (onglets en bas sur mobile,
       barre latérale à partir de 1024 px, marge pour la barre et la zone
       sûre) ; `components/coque-personnel.tsx` commun à
       `layouts/contenu-layout.tsx` et `layouts/console-layout.tsx` (barre
       latérale dense, menu en feuille sur mobile, déconnexion qui vide le
       cache de préchargement) ; console : barre **toujours sombre** ;
     - routes `home` (`vitrine/accueil`), `eleve.accueil`, `contenu.accueil`,
       `console.accueil` (sous `auth` seulement jusqu'à l'étape 5) ;
       `fortify.home` = `/eleve` ; pages `welcome`, `dashboard` et
       `DashboardTest` du kit retirés, ses autres écrans pointent sur
       l'accueil élève ;
     - tests visuels : projet `connexion` (session gardée dans
       `tests/visuel/.auth/`, ignoré par git) dont dépendent les écrans.
   - **Vu avec Playwright** et corrigé : à 360 px, « Examens blancs » tient
     sur deux lignes centrées dans son onglet ; une entrée « bientôt » ne
     réagissait pas au toucher (clic mort) → notification. Vitrine sans
     chiffre ni témoignage ; le nom de l'espace s'affiche dans la barre du
     haut à partir de 400 px.
   - **Incident évité** : `Set-Content -Encoding utf8` (PowerShell 5.1) a
     posé un BOM devant `<?php` dans `config/fortify.php` ; retiré aussitôt.
     Ne modifier un fichier PHP qu'avec les outils d'édition ou `sed`.
   - **Preuve** : Pest `HabillagesTest` (8 : vitrine ouverte, espaces fermés
     aux visiteurs, ouverts au compte connecté, retour après connexion) ;
     Vitest `lien-navigation` (2) ; Playwright : vitrine et les trois
     espaces en 4 gabarits × 2 thèmes, axe propre, aucun débordement.
     Totaux : 75 Pest, 114 Vitest, 49 Playwright.

7. [x] **Lot 0, étape 4 — connexion par téléphone et « Mon compte »**
   (2026-10-30)
   - **Constat** : Fortify du kit par e-mail (réinitialisation par lien,
     vérification d'e-mail, passkeys), écrans et messages en anglais ;
     `Password::defaults()` du kit contraire à D3 (12 caractères, symboles,
     vérification de fuite en production).
   - **Décision** :
     - base : migration `users` réécrite sur place (téléphone unique au
       format `+224…`, prénom, pseudo unique, nom et e-mail facultatifs,
       `telephone_verifie_le`, `desactive_le`) ; tables `codes_sms` et
       `journal_acces_plateforme` ; migration passkeys retirée ;
     - `App\Support\Telephone` (jumeau de `lib/telephone.ts`, mêmes
       exemples), règle `TelephoneGuineen`, `App\Support\ReglesCompte`
       (règles uniques pour l'inscription et « Mon compte ») ;
     - SMS : interface `EnvoiSms`, pilote `JournalSms` (rien ne part) ;
       `CodeSmsService` : 6 chiffres, 10 min, 5 essais, haché, un nouveau code
       annule le précédent, 3 envois par numéro et par 15 min, 10 par IP et
       par heure ; même message pour un code inconnu ou expiré ;
     - Fortify : identifiant `telephone` normalisé avant recherche et pour la
       limitation (5 essais par minute par numéro, quelle que soit sa
       graphie) ; compte désactivé refusé ; après inscription →
       vérification du numéro, contournable (« Plus tard ») ; fonctions
       gardées : inscription et 2FA ;
     - `Password::defaults()` = 8 caractères, sans complexité (D3) ;
       session de 30 jours glissants (`SESSION_LIFETIME=43200`, HL-D10) ;
     - contrôleurs `Compte\RecuperationController` (numéro en session, jamais
       dans l'adresse ; code seulement aux numéros vérifiés),
       `VerificationNumeroController`, `MonCompteController` (profil, mot de
       passe, numéro en deux temps — code sur le nouveau numéro —,
       suppression avec mot de passe) ; `routes/compte.php` ;
     - `App\Support\JournalAcces::consigner()` : `compte.cree`,
       `mot_de_passe.change`, `mot_de_passe.recupere`, `numero.verifie`,
       `numero.change` (numéros masqués), `compte.supprime` (la trace reste,
       auteur à `null`) ;
     - pages partagées : `auth.user` réduit à identifiant, prénom, pseudo et
       état du numéro — jamais le numéro ;
     - écrans en français : `auth/connexion`, `inscription`,
       `mot-de-passe-oublie`, `code-recuperation`, `verifier-numero`,
       `two-factor-challenge`, `confirm-password` (habillage
       `connexion-layout`) ; `compte/profil`, `mot-de-passe`, `numero`,
       `affichage` (thème, taille du texte 15/17/19 px, économie de données,
       locaux au téléphone) ; rappel « Vérifie ton numéro » sur l'accueil
       élève ;
     - retirés : écrans, habillages, composants et tests du kit liés à
       l'e-mail, aux réglages et aux passkeys ; primitives inutilisées
       (avatar, menu déroulant, sélecteur, barre latérale…) et leurs paquets ;
     - compte de démonstration : `DatabaseSeeder` (`firstOrCreate`, mot de
       passe `DEMO_MOT_DE_PASSE` de `.env` via `config/demonstration.php`,
       refus en production).
   - **Vu avec Playwright** : connexion, inscription, mot de passe oublié,
     « Mon compte » (profil, numéro, affichage) en 4 gabarits × 2 thèmes ;
     corrigé : montant écrit à la main (« 12 500 GNF » coupé en fin de
     ligne) → `formaterGnf()`. Parcours de bout en bout par les vrais
     écrans : inscription → vérification proposée → « Plus tard » → rappel
     sur l'accueil → suppression du compte → connexion refusée.
   - **Preuve** : Pest `Compte\InscriptionTest`, `ConnexionTest`,
     `RecuperationTest`, `VerificationNumeroTest`, `MonCompteTest`,
     `Unit\TelephoneTest`, `SeederDemonstrationTest` — valeurs relues en
     base ; Vitest `reglages-affichage` ; Playwright `parcours.spec.ts`.
     Totaux : 103 Pest, 117 Vitest, 98 Playwright.

8. [x] **Refonte du design « Ardoise » v2** (2026-10-30, avant l'étape 5)
   - **Constat** (Maurice) : le bleu faisait « ancien site », rien de vivant ;
     caractères grands et gras partout ; pages plates et peu modernes ;
     champs et composants lourds. Exigence : un travail au sommet, élégant,
     professionnel, facile — et le hors ligne n'est pas une excuse pour une
     interface pauvre. Mesuré sur les captures v1 : Lexend 15-16 px en
     500-600, Sora 700 jusque sur les titres de carte, contrôles de 48 px,
     neutres gris-bleu, vitrine à moitié vide, accueil élève réduit à un
     rectangle pointillé.
   - **Décision** :
     - marque violette `nimba-600` `#702AED` (OKLCH 290, blanc 6,5:1) ;
       bleu, orange (Orange Guinée) et jaune en aplat (MTN) exclus comme
       couleur de marque ; monogramme et `public/favicon.svg` redessinés
       (le favicon était encore le logo Laravel) ;
     - neutres neutres, nouveaux jetons `ink-500`, `contour`, `relief` ;
     - Geist variable + Instrument Serif italique (51,5 Ko en français
       contre 72,5) ; interface 14 px, titres 600, jamais 700 ;
     - échelle de hauteurs 48 / 44→40 / 36 / 32, icônes 16 px, badges en
       pilule, onglets segmentés, ombres en couches ; classes de champ
       partagées (`CHAMP_BASE`, `CHAMP_CONTENEUR`) ; variante de bouton
       `doux`, taille `grande` ;
     - surfaces d'expression CSS (`surface-marque`, `halo-marque`,
       `trame-points`) et aperçu dessiné de l'application
       (`components/apercu-application.tsx`) ;
     - écrans refaits : vitrine, connexion en écran partagé, accueil élève,
       navigations élève et personnel, « Mon compte », erreur, catalogue ;
     - règles inscrites : `DESIGN.md` § 0 (niveau d'exigence) et § 13,
       `CLAUDE.md` § 3 bis et § 6, compétence `.claude/skills/design-ardoise`.
   - **Écart au plan** : cibles tactiles de 44 px (au lieu de 48) côté élève,
     40 px à la souris ; options de QCM toujours à 56 px. Raison : 48 px
     partout donnait l'aspect lourd reproché ; 44 px reste la recommandation
     WCAG 2.5.5.
   - **Vu avec Playwright** : 12 écrans × 4 gabarits × 2 thèmes ; corrigé :
     carte blanche du panneau de connexion illisible en sombre (axe,
     `color-contrast`) → classe `clair` ; colonne « Examens blancs » décalée
     → `content-start` ; cartes d'examens trop hautes sur mobile → format
     horizontal. Horloge figée dans `ecrans.spec.ts` (date et salutation de
     l'accueil).
   - **Preuve** : `contrastes.test.ts` aux nouvelles valeurs et aux nouveaux
     jetons ; captures de référence régénérées ; `tsc`, `vp check`, build
     verts. Totaux : 103 Pest, 122 Vitest, 98 Playwright.
   - **À l'occasion** : MySQL de Laragon était arrêté (chaque requête
     attendait la base) ; démarré pour la vérification.

9. [x] **Design « Ardoise » v3 — adaptation aux références** (2026-10-30)
   - **Constat** : la v2 (point 8) ne convenait pas à Maurice. Il a fourni
     cinq références (tableaux de bord « Oliver » et « Eduvo », vitrines
     « BrightPath » et « DevSkill ») et demandé une adaptation complète, sans
     dénaturer le projet. Questions posées ensemble, réponses : mandarine
     chaude ; ses propres photos sur la vitrine ; titres en contraste léger /
     gras ; tableau de bord complet en données d'exemple.
   - **Décision** :
     - couleurs : mandarine `nimba` (`#F6641B` vive, `#D04904` boutons,
       `#A63D02` texte), crème et encre chaudes, sombre brun ; rouge « faux »
       en framboise `#C41942` (le rouge orangé se confondait avec la marque) ;
       monogramme et favicon en mandarine ;
     - police : Plus Jakarta Sans variable (27,3 Ko) ; `titre-contraste` ;
     - formes : boutons en pilule, variante `encre`, champs 12 px, cartes
       20 px, panneaux 28 px, ombres chaudes, `surface-encre`, `fond-ambiance` ;
     - **tableau de bord élève** : `Eleve\AccueilController` →
       `App\Support\Demonstration\TableauDeBordExemple` (`est_exemple`) :
       séance du jour, jauge par matière, cartes de matière en tirets,
       leçons à reprendre, série Lu → Di avec jour de grâce, points d'effort,
       défi, réussites, tuteur (bientôt). Composants `JaugePreparation`,
       `ProgressionSegments`, `ProgressionBarre`, `lib/bientot.ts` ;
       `lib/matieres.ts` gagne `trait` et `plein` ;
     - **vitrine** : héros à trois colonnes, bandeau de preuves, examens et
       matières, « Comment ça marche », FAQ (réponses tirées du PLAN : D4,
       M16), double appel final, pied en colonnes ; `VitrineController` +
       `App\Support\PhotoVitrine` + `config/vitrine.php` pour la photo ;
     - règles : `DESIGN.md` § 0.1 (références, ce qu'on reprend et ce qu'on
       ne reprend pas), § 6.0, § 13 ; `CLAUDE.md` § 3 bis ; compétence
       `design-ardoise` réécrite.
   - **Écart au plan** : l'accueil élève montre dès le lot 0 la forme
     complète du tableau de bord en données d'exemple (le plan la prévoyait
     aux lots 2 et 6). Raison : décision de Maurice ; les données viennent du
     serveur (`est_exemple`, bandeau), et les services métier les
     remplaceront sans changer la page. Aucun rang entre élèves (classements
     opt-in, M9), aucun chiffre de vitrine non sourcé.
   - **Vu avec Playwright** : 12 écrans × 4 gabarits × 2 thèmes ; corrigé :
     mots collés dans les titres (Plus Jakarta est étroite → approche
     `-0.01em`, pas de `tracking-tight` sous 20 px) ; rangée de matières
     défilante non atteignable au clavier (axe) → `tabIndex` + nom ;
     `ink-500` sur `craie-100` à 4,4:1 (axe) → `ink-600` ; en-tête de
     vitrine débordant d'un pixel à 768 px → navigation centrale à partir de
     1024 px ; cartes de matières empilées trop longues sur mobile → rangée
     qui défile.
   - **Preuve** : Pest `TableauDeBordEleveTest` (props, semaine selon le jour,
     clés de matières connues de l'interface), `VitrineTest` (photo absente,
     présente, chemin vide ou dossier) ; `contrastes.test.ts` aux valeurs v3 ;
     captures de référence régénérées. Totaux : 112 Pest, 125 Vitest,
     98 Playwright ; `tsc`, `vp check`, Pint, build verts.

10. [x] **Design « Ardoise » v4 — plus original, plus professionnel** (2026-10-30)
   - **Constat** : Maurice valide la direction v3 mais veut « beaucoup
     mieux » : plus original, plus professionnel ; des **images par défaut**
     (remplaçables ensuite) ; une police qui fasse « site à 10 000 $ » ; des
     boutons de vitrine moins gros et moins arrondis (« ça fait IA »). Analyse :
     la v3 cumulait les tics d'une page générée (pilule partout, pastille de
     flèche, halo orange sous les boutons, sur-titres en capitales espacées,
     libellés à points médians, mot du titre en couleur, cartes identiques,
     trois surfaces fortes).
   - **Décision** :
     - police : **Bricolage Grotesque** variable, fichier `opsz` (76,9 Ko en
       latin, budget 120 Ko), choisie sur spécimen parmi six familles ;
       Plus Jakarta Sans retirée ; grand titre en 350 / 600, vitrine à 72 px ;
     - formes : boutons à **10 px**, graisse 500, 44 px au plus, ombre courte
       sans halo, sans flèche ; cartes 16 px, panneaux 24 px ; onglets,
       choix, toasts sur `rounded-controle` ;
     - **illustrations par défaut** : cinq SVG originaux en papier découpé
       (`public/images/vitrine/defaut/` : héros — le Nimba et le Fouta au
       crépuscule, un chemin à trois jalons —, CEE, BEPC, Bac, soir ; 17 Ko
       en tout), servies par `App\Support\ImagesVitrine` (remplace
       `PhotoVitrine`) et remplaçables dans `config('vitrine.illustrations')` ;
       un chemin sans fichier retombe sur le dessin par défaut ; la photo de
       Maurice, si elle vient, se pose devant l'illustration du héros ;
     - **vitrine recomposée** autour d'un seul moment fort (héros illustré
       + deux fiches flottantes), preuves et atouts en filets, examens
       illustrés, « Trois gestes, chaque soir » illustré, section
       « Tout tient dans le téléphone » avec l'aperçu, FAQ en filets, un seul
       appel final ; plus de sur-titres en capitales (pied de page compris) ;
     - règles mises à jour : `DESIGN.md` (§ 0.1, 3, 4, 7, 8, 11, 13),
       compétence `design-ardoise`, `CLAUDE.md` (polices).
   - **Vu avec Playwright** : spécimen des polices ; vitrine en 360 / 768 /
     1366, clair et sombre ; connexion ; tableau de bord élève. Corrigé :
     héros trop haut à 1366 × 768 (fiche sous la ligne de flottaison → cadre
     carré dès 1024 px, 5:4 sur mobile) ; halo devenu voile olive en sombre
     (`dark:opacity-40`) ; illustration du soir écrasante à 768 px
     (`max-w-xl`) ; étiquette « TA SÉANCE DU JOUR » en capitales sur
     l'accueil élève → casse normale.
   - **Incident** : une conversion de fins de ligne lancée trop largement a
     abîmé les captures PNG de référence ; supprimées puis régénérées
     (96 PNG relus, tous lisibles).
   - **Preuve** : `VitrineTest` passe à 7 tests (dessins par défaut,
     remplacement, repli sur chemin absent, vide, dossier ou nul) ; captures
     de référence régénérées après relecture. Totaux : 118 Pest, 125 Vitest,
     98 Playwright (axe sans violation sérieuse) ; `tsc`, `vp check`, Pint,
     Larastan, build verts.

11. [x] **Vitrine : un titre qui a du sens, et les incohérences corrigées** (2026-10-30)
   - **Constat** : Maurice trouve le titre « Un soir, quinze minutes, et je
     sais où j'en suis » vide de sens, sans rapport avec son projet. Relecture
     de la page contre le PLAN : « Tout tient dans le téléphone » (la
     plaquette veut téléphones, tablettes et ordinateurs) ; « Trois gestes,
     chaque soir » dont le premier est l'inscription ; « l'élève » à la
     troisième personne dans une page qui vouvoie ; séance « Maths et
     physique » au BEPC ; ni le sens du nom, ni l'égalité des chances, ni ce
     qui arrive ensuite.
   - **Décision** : titre « Préparez le CEE, le BEPC et le Bac avec les
     annales corrigées. » (aussi dans le panneau de connexion) ; section sur
     le nom (« mon maître », G-Étudie, égalité des chances, trois
     engagements : programme national, corrigés relus par des enseignants,
     socle gratuit) ; étapes « De l'inscription au jour de l'examen » ;
     « Dans la poche, et partout ailleurs » ; liste « Et bientôt » (tuteur,
     culture générale, parents et enseignants) ; pied de page qui explique le
     nom. Le slogan reste la thèse interne du tableau de bord (PLAN § 3, note).
   - **Puis** : premier titre retenu (« Préparez le CEE, le BEPC et le Bac
     avec les annales corrigées. ») jugé trop verbeux et trop étroit par
     Maurice. Titre final, bref et qui couvre tout : « Tout pour réussir le
     CEE, le BEPC et le Bac. » ; chapeau : « Cours, annales corrigées,
     exercices, examens blancs et suivi de vos progrès, même hors
     connexion. » Même titre sur le panneau de connexion.
   - **À confirmer par Maurice** : la traduction « mon maître » (reprise du
     PLAN § 2.8) et la liste des villes citées.
   - **Preuve** : captures 360 et 1366 relues ; 98 Playwright, 118 Pest ;
     `tsc`, `vp check`, build verts.

12. [x] **Lot 0, étape 5 — rôles et permissions** (2026-10-30)
   - **Constat** : les trois espaces n'étaient gardés que par `auth` (un élève
     ouvrait `/console`) ; aucun rôle ; « Mon compte » toujours dans
     l'habillage élève ; la 2FA de Fortify active sans écran ; aucune limite
     de session pour le personnel.
   - **Décision** :
     - `spatie/laravel-permission` **8.3.2** (compatible Laravel 13 ; tables
       du paquet gardées en anglais, `roles`, `permissions`… : imposé par le
       paquet) ;
     - **une autorité par question** : `App\Enums\Permission` (ce qu'un
       compte peut faire : `espace.eleve`, `espace.contenu`,
       `espace.console`, `compte.double_authentification`),
       `App\Enums\Role` (les 8 rôles du PLAN § 4, leurs permissions,
       `estPersonnel()` = rédacteur, relecteur, responsable pédagogique,
       superadmin), `App\Enums\Espace` (où arrive un compte : console >
       contenu > élève > « Mon compte »), `App\Support\Perimetre` (sur
       quels élèves : consultation / rattachement ; lot 0 = soi-même pour
       l'élève, consultation de tous pour le superadmin ; parent, groupe,
       établissement au lot 11) ;
     - routes `/eleve`, `/contenu`, `/console` avec `->can(Permission::…)` ;
       nouvelle route `/accueil` (`AiguillageController`, `fortify.home`,
       `redirectUsersTo`) qui envoie chaque compte dans son espace après
       connexion, double authentification ou page d'invité ;
     - **`AccesParRoleTest`** (classe PHPUnit) : énumère le routeur, échoue
       sur toute route authentifiée sans `can:` ni dérogation ; second test
       sur les dérogations disparues ou devenues inutiles ; matrice 8 rôles ×
       3 espaces. `OUVERTES_A_TOUS` : aiguillage, déconnexion, « Mon
       compte », vérification du numéro, confirmation du mot de passe et
       routes 2FA de Fortify (chacune avec sa raison) ;
     - **403, pas 404**, pour un espace interdit : c'est une permission, pas
       une ressource hors périmètre ; la page « Accès réservé » renvoie vers
       `/accueil` (son espace) au lieu de la vitrine ;
     - l'inscription donne le rôle `eleve`, et seulement lui ; la fabrique
       `UserFactory` aussi (état `avecRole()` pour les autres) ; `TestCase`
       sème les rôles une fois (`$seed`, `$seeder`), comme un déploiement ;
     - `DatabaseSeeder` = `RolesEtPermissionsSeeder` partout + `DemoSeeder`
       hors production (il refusait tout en production, ce qui aurait cassé
       le `db:seed` de déploiement) ;
     - **double authentification** proposée au personnel (DA4) : onglet
       « Mon compte › Sécurité » (`SecuriteController`, derrière `can:` et
       `password.confirm`) ; activation gardée **au geste** par
       `ActiverDoubleAuthentification` (les routes de Fortify n'ont pas de
       `can:` : un élève qui les appelle reçoit 403) ; QR code à l'encre sur
       blanc, **libellé = pseudo, jamais le numéro** (Fortify y mettait
       l'identifiant de connexion) ; activation, désactivation et nouveaux
       codes de secours journalisés ;
     - **session de 12 h du personnel** (HL-D10) : `SessionCourtePersonnel`,
       12 h après la connexion même en activité, reconnexion par cookie
       « se souvenir de moi » refusée ; élèves et parents gardent 30 jours ;
     - « Mon compte » prend l'habillage de l'espace du compte
       (`CompteLayout`) ; coque réduite pour un compte sans espace ; pied de
       la coque du personnel : « Mon compte » et raccourci vers l'autre
       espace (superadmin → back-office) ; textes au vouvoiement hors élève
       (`useFormule()`), confirmation du mot de passe au vouvoiement ;
     - données partagées : `auth.user.espace`, `espaces`,
       `double_authentification` (toujours sans numéro) ;
     - `JournalAcces::LIBELLES` : libellés des actions, pour « Activité du
       compte » (et la console plus tard).
   - **Écart** : parent, enseignant et gestionnaire d'établissement n'ont pas
     encore d'espace (lot 11) : ils arrivent sur « Mon compte », et gardent la
     session de 30 jours (HL-D10 ne les nomme pas) — à trancher au lot 11
     (points ouverts).
   - **Outillage** : `composer require` relance `boost:update`, qui ajoute
     ses consignes anglaises à la fin de `CLAUDE.md` ; ajout retiré (elles
     sont déjà dans `AGENTS.md`). À refaire après chaque `composer require`.
   - **Vu avec Playwright** : `compte-securite`, `compte-profil-contenu`,
     `erreur-403` en 4 gabarits × 2 thèmes. Corrigé après relecture : page
     « Sécurité » à moitié vide à 1366 → sections « Session de travail »
     (barre, heures d'ouverture et de reconnexion) et « Activité du compte »
     (5 derniers gestes sensibles faits par le compte ou sur lui) ; cinq
     onglets en 3 + 2 à 360 px (une case vide sinon) ; badge d'état passé
     sous le titre (il écrasait « Mot de passe seul ») ; profil du personnel
     qui parlait d'« élèves » et de « progression ». Parcours d'activation
     (QR, clé, mauvais code) vu par script en 360 clair et 1366 sombre, hors
     références (la clé change à chaque fois). Zones horaires masquées dans
     les captures (`data-capture="variable"`). Préparation Playwright : un
     compte par espace (`SESSIONS`), délai de 30 s pour l'aiguillage
     (`php artisan serve` traite une requête à la fois).
   - **Preuve** : Pest `AccesParRoleTest`, `RolesEtPermissionsTest`,
     `SessionCourtePersonnelTest` (avec un témoin : le même cookie reconnecte
     un élève), `Compte\SecuriteTest` (parcours complet avec un vrai code
     TOTP, mauvais code, élève refusé, activité), `PerimetreTest`,
     `SeederDemonstrationTest` réécrit ; Vitest `entete-compte`. Totaux :
     **167 Pest, 127 Vitest, 124 Playwright** — verts ; `tsc`, `vp check`,
     Pint, Larastan (niveau 7), `npm run build` passent.

13. [x] **Lot 0, étape 6 — socle hors ligne HL0** (2026-10-30)
   - **Constat** : aucun service worker, aucune file d'opérations ; hors
     ligne, un clic restait sans effet et un rechargement donnait la page
     d'erreur du navigateur.
   - **Décision** (détail et écarts n° 7 à 14 : `HORS_LIGNE.md` B.2, B.5) :
     - serveur : tables `appareils`, `appareil_profils`,
       `operations_synchronisees` ; `SynchroService` (cinq verdicts, ligne
       insérée en premier dans la transaction, lecture verrouillante après
       un conflit d'index, `enTantQue`, horloge suspecte, refus des UUID non
       v7), `RegistreOperations` (vide au lot 0), `AppareilService`
       (enregistrement au premier `GET /sync/etat`, jeton haché) ;
       `POST /sync/operations` et `GET /sync/etat` (≤ 1 Ko) en dérogation
       dans `AccesParRoleTest` (autorisation par opération) ;
     - service worker maison (`resources/service-worker/sw.js`, servi par
       `ServiceWorkerController`) : précache du manifeste Vite sans les
       pages en ligne, trois versions gardées, fichiers identiques recopiés
       d'une version à l'autre, copies par compte réseau d'abord (6 s),
       fusion des rechargements partiels, page de repli autonome ; activation
       d'une nouvelle version seulement file vide et sans examen en cours ;
     - `config/hors_ligne.php` : liste blanche (`/eleve`,
       `/compte/affichage` au lot 0), partagée aux pages
       (`hors_ligne_pages`) ; même règle dans `sw.js` et `ecrans.ts` ;
     - appareil : `uuid7.ts`, base Dexie `nkaramogo` (onze tables),
       `MoteurHorsLigne` (un envoi à la fois, lots de 50 ordonnés, délais
       croissants, 401 pause / 419 jeton neuf / 409 nouvel appareil,
       anomalies après 8 échecs, horloge mesurée) ; `enregistrer()` est le
       seul point d'entrée des gestes élève ;
     - interface : garde de navigation inscrite avant la barre,
       `EcranIndisponible` monté à la racine, pastille et feuille « Tes
       réponses », bandeaux, navigation estompée, déconnexion prévenue
       (`useDeconnexion`), section « Installer l'application », manifeste et
       icônes (monogramme provisoire, DA8), filet de démarrage dans
       `app.blade.php`.
   - **Dépendances** : `dexie` 4.4.7, `fake-indexeddb` 6.2.7 (tests).
   - **Vu** : essai réel dans Chromium sur le build (service worker,
     appareil enregistré, dialogue, rechargement hors ligne, page de repli,
     retour du réseau), captures relues en 360 clair et 1366 sombre (dialogue,
     feuille, pastille, bandeaux). Corrigé en chemin : `usePage` dans un
     composant monté hors des pages (erreur), course sur
     `registration.waiting`, copies document et Inertia confondues par l'API
     Cache (JSON brut affiché hors ligne), premier contact retardé de 20 s,
     actualisation au retour du réseau qui manquait sur un document servi
     d'après sa copie, page de repli qui restait bloquée, textes
     d'installation au vouvoiement pour un élève. Références Playwright des
     écrans élève régénérées (`--update-snapshots=all` : la pastille restait
     sous le seuil de 1 % et les anciennes références auraient vieilli sans
     alerte).
   - **Preuve** : Pest `HorsLigne\SynchroEtatTest`,
     `SynchroIdempotenteTest`, `SynchroVerdictsTest`,
     `SynchroEnTantQueLAuteurTest`, `HorlogeTest`, `ServiceWorkerTest`,
     `DemarrageInterrompuTest` ; Vitest `hors-ligne/moteur`, `ecrans`,
     `garde-navigation` ; Playwright `hors-ligne.spec.ts` (10 passages
     stables). Totaux : **202 Pest, 165 Vitest, 125 Playwright** — verts ;
     `tsc`, `vp check`, Pint, Larastan (niveau 7), `npm run build` passent.
   - **Pas fait** : HTTPS (D11) ; installation et mode avion sur vrai
     téléphone (`A_TESTER.md`) ; séance complète hors ligne (A.14 n° 24,
     lot 3) ; budgets mesurés (n° 25, lot 7).

14. [~] **Lot 0, étape 7 — clôture** (2026-10-30)
   - **Le lot face au plan** (`PLAN_NKARAMOGO.md` § 12) :

     | Élément du lot 0 | État | Preuve |
     |---|---|---|
     | Audit du projet existant, conventions | ✅ | points 2 et 3 |
     | Design system « Ardoise » (jetons, polices locales, primitives) | ✅ v4 | points 4, 8 à 11 ; `DESIGN.md` § 13 |
     | Habillages vitrine, élève, back-office, console | ✅ | point 6 ; captures |
     | Authentification par téléphone, « Mon compte » | ✅ | point 7 |
     | Rôles et permissions, garde-fou « toute route a une permission » | ✅ | point 12 ; `AccesParRoleTest` |
     | Socle hors ligne HL0 | 🟡 sauf HTTPS | point 13 ; `HORS_LIGNE.md` B.2 (10 / 12) |
     | Playwright et captures de référence | ✅ | 125 tests, 15 écrans × 4 gabarits × 2 thèmes |
     | Catalogue de composants `/dev/composants` | ✅ | point 4 |
     | **Critère d'acceptation** : page de démonstration de tous les composants, 4 tailles × 2 thèmes, contrastes vérifiés | ✅ | `composants-*.png`, axe sans violation sérieuse, Vitest `contrastes` |

   - **Audit de clôture** :
     - CI rejouée en local à l'identique (`composer ci:check` : `vp check`,
       `tsc`, Pint, Larastan, Pest ; puis Vitest) : verte. ⚠ Elle n'a jamais
       tourné sur GitHub : pas de dépôt distant (DA6).
     - Production : `php artisan optimize` construit les caches de
       configuration, routes (51) et vues ; `composer audit` et `npm audit` :
       aucune vulnérabilité connue.
     - Corrigé : quatre commentaires restés au futur (« étape 4 », « étape 5 »)
       dans `telephone.ts`, `telephone.test.ts`, `config/fortify.php`,
       `libelles.ts` ; `A_TESTER.md` renvoyait encore au compte du
       `DatabaseSeeder` ; ancienne session Playwright `compte.json` supprimée ;
       `SESSION_SECURE_COOKIE` ajouté à `.env.example`.
     - Ajouté : section 9 « Modèles Eloquent » (vide depuis le début du lot) et
       section 12 « Mise en production » (liste à suivre dès que D11 est
       fixé).
   - **Ce qui empêche de cocher la clôture** :
     - **D11, domaine et hébergement** (Maurice) : sans eux, pas de HTTPS,
       donc pas de hors ligne ailleurs que sur `localhost`, pas d'installation,
       et les contrôles de `A_TESTER.md` sur vrai téléphone restent bloqués ;
     - ~~fusion de `lot-0` dans `main`~~ : faite le 2026-10-30, en avance
       rapide (12 commits), sur décision de Maurice.
   - **Attendus pour le lot 1** : D1 (liste des matières phares).
   - **Preuve** : 202 Pest, 165 Vitest, 125 Playwright — verts.

15. [x] **Lot 1 — référentiel pédagogique et back-office contenu**
   (2026-10-31, branche `lot-1`, commits par étape, fusionnée dans `main`
   le 2026-10-31 sur décision de Maurice)
   - **Constat** : back-office vide (état « bientôt ») ; aucune table de
     référentiel ; liste des matières phares (D1) non fournie — Maurice a
     demandé à Claude Code de la choisir ; question de savoir si
     l'administrateur ajoute lui-même les matières.
   - **Décisions** (plan validé par Maurice le 2026-10-31) :
     - **Matières phares** (`ReferentielSeeder::PHARES`) : BEPC — Maths,
       Français, Physique, Biologie-Géologie ; Bac SM — Maths, Physique,
       Chimie ; Bac SE — Biologie-Géologie, Chimie, Physique, Maths ; Bac SS
       — Philosophie, Histoire-Géographie, Français, Économie ; CEE aucune
       (trimestre suivant, D1). Priorité de rédaction, pas une donnée
       officielle ; case « phare » modifiable.
     - **Le responsable pédagogique gère le référentiel** (permission
       `referentiel.gerer`, aussi l'administrateur plateforme) : matières
       (nom, teinte parmi les dix du design — une nouvelle teinte est une
       modification du code, sinon Tailwind purge ses classes), épreuves par
       examen et série, programme, années. Coefficients et durées **vides**
       (« À saisir ») ; programme jamais semé.
     - Permissions `contenu.rediger` (rédacteur), `contenu.relire`
       (relecteur), `contenu.administrer` (responsable pédagogique et
       administrateur plateforme, qui ont aussi les deux premières).
     - Tout le back-office consulte tout le catalogue ; on agit sur ce à
       quoi on est rattaché (`Perimetre::peutRedigerLecon`,
       `peutRelireLecon`) ; **l'auteur de la leçon ou de la version
       envoyée ne relit jamais**, même responsable pédagogique.
     - Une version est figée à chaque envoi en relecture ; une leçon publiée
       qu'on modifie reste en ligne jusqu'à la publication suivante ;
       verrou optimiste (`revision`) contre deux onglets ; toute transition
       passe par `ContenuService`, sous verrou.
     - Format des blocs avancé du lot 2 (`HORS_LIGNE.md` écart n° 15) ;
       **TipTap 3.31.4** (la 3.32.2 sortait le jour même) **sans
       l'extension mathématique officielle** (elle exige KaTeX ≤ 0.18, le
       projet a la 0.19) : nos nœuds `formule`, `formuleBloc`, `encadre`,
       rendus par le composant `Formule` existant. L'éditeur (139 Ko
       compressés) ne vit que dans le fragment de la page d'édition.
     - Images, tableaux, mini-questions : reportés (points ouverts).
     - **Suppression de son compte** (point ouvert du lot 0) : refusée à un
       compte qui a signé du contenu (`User::aSigneDuContenu`) — sans cela,
       la clé étrangère faisait échouer la suppression en 500 ; « Mon compte »
       explique pourquoi.
   - **Écarts au plan** : pas de table `filieres` (énumération `Filiere`) ;
     chapitres non versionnés par année scolaire (seules les épreuves le
     sont) ; une leçon se rattache à une **notion** (PLAN M17), pas à un
     chapitre seul ; `TableauDeBordController` remplace la route
     `Route::inertia('contenu')`.
   - **Vu avec Playwright** (12 écrans × 4 gabarits × 2 thèmes, axe sans
     violation sérieuse) et corrigé : textes illisibles en sombre sur les
     panneaux `surface-encre` (`craie-50` s'inverse) ; en-têtes de section
     et lignes tronqués à 360 px ; pastilles « Exemple » trop fortes ;
     corbeilles rouges partout. Détail : `DESIGN.md` § 13, « Lot 1 ».
     Éditeur essayé à la main dans le navigateur : saisie, formule par le
     dialogue, aperçu, enregistrement automatique.
   - **Corrigé en chemin** : la rangée défilante des examens (Épreuves)
     élargissait toute la page à 360 px (élément de grille sans `min-w-0`) ;
     bouton de formule de l'éditeur au nom accessible sans son texte visible
     (axe, sévère) ; une mise à jour de l'éditeur sans changement
     déclenchait un enregistrement (révision avancée, leçon remontée dans
     les listes) — elle est maintenant ignorée ; barre d'outils de
     l'éditeur sur deux lignes à 1366 px ; dates relatives qui changeaient
     la mise en page des captures (texte figé avant comparaison).
   - **Preuve** : **284 Pest** (dont `ReferentielSeederTest` 5,
     `GestionReferentielTest` 16, `CircuitRelectureTest` 14,
     `EcransLeconsTest` 10, `BlocsContenuTest` 32, contenu de démonstration,
     suppression de compte refusée), **204 Vitest** (format des blocs 32,
     `ContenuBlocs` 3, éditeur 4), **215 Playwright** (96 captures du lot 1,
     le parcours du critère d'acceptation, le lot 0 inchangé hors
     `compte-profil-contenu` régénérée volontairement et `contenu-accueil`
     déplacée au lot 1) — verts ; captures stables sur deux semis
     différents. `tsc`, `vp check` (sans avertissement), Pint, Larastan
     niveau 7 et `npm run build` passent.
   - **Reste** : essai de l'éditeur sur les postes des rédacteurs
     (`A_TESTER.md`) ; saisie du programme et des coefficients par l'équipe ;
     un chapitre « TGFYHJ » vide, créé dans la base de développement
     pendant un essai à la main, est laissé en place (donnée de Maurice) —
     les captures du programme sont prises sur Physique · Terminale.

16. [x] **Bandeau d'exemple redessiné** (2026-10-31)
   - **Constat** (Maurice : « ce bandeau est moche ») : hachures jaunes sur
     toute la largeur, filet soleil, capitales espacées en gras — il criait
     plus fort que le titre de l'écran et ne ressemblait à aucun autre
     bandeau de l'application.
   - **Décision** : `BandeauExemple` rejoint la famille des bandeaux
     (`rounded-controle`, teinte `soleil-400` en opacité, sans filet) ; le
     signal tient dans un cachet `Badge` soleil plein « Exemple » avec une
     fiole, suivi de « Contenu fictif, créé pour la démonstration. » en
     casse normale (« Contenu fictif. » sous 640 px, pour tenir sur une
     ligne à 360 px). Utilitaire `hachures-exemple` retiré d'`app.css` ;
     `DESIGN.md` § 3, § 6.7, § 11 et § 13 mis à jour.
   - **Preuve** : captures relues à 360, 768 et 1366 px en clair et en
     sombre (accueil élève, tableaux de bord contenu, édition, fiche et
     relecture d'une leçon, catalogue) ; 56 références régénérées
     (`lot0/eleve-accueil`, `lot0/composants`, `lot1/contenu-accueil-*`,
     `lot1/lecon-*`) — chacune ne diffère de l'ancienne que par le bandeau
     (hauteur + 6 px, contenu identique décalé) ; axe sans violation
     sérieuse, aucun débordement. 284 Pest, 204 Vitest, `npm run build` :
     verts.
   - **Vu en chemin** : la série Lu → Di de l'accueil élève d'exemple suit
     la date **du serveur** (`TableauDeBordExemple`), que
     `page.clock.setFixedTime` ne fige pas : la capture de référence change
     de jour en jour (vendredi marqué le 30, samedi le 31). À régler quand
     le lot 2 remplace ces données d'exemple.

16. [x] **Lot 2 — cours côté élève, accueil élève, parcours d'accueil ;
   HL1** (2026-10-31, branche `lot-2`, un commit)
   - **Constat** : l'accueil élève montrait un tableau de bord d'exemple
     (`TableauDeBordExemple`) ; aucun profil d'examen, aucun écran de
     cours, aucun geste élève ; le critère du lot (« premier exercice en
     moins de 60 s après l'inscription ») demandait un exercice, alors que
     le moteur de questions est au lot 3.
   - **Décisions** (plan validé par Maurice le 2026-10-31, choix
     recommandés) :
     - **QCM minimal avancé du lot 3** : table `questions` conçue pour tous
       les types, QCM à une réponse seulement ; lecteur « ardoise » ;
       réponse par la file (`tentative.enregistrer`) **recorrigée par le
       serveur** (`HORS_LIGNE.md` écart n° 16). Pas encore d'écran de
       saisie des questions : 18 QCM de démonstration (`est_exemple`).
     - **Établissement** : table créée vide ; l'étape du parcours est
       sautée tant que la liste n'existe pas (3 écrans au lieu de 4).
     - **Filière** : « générale » enregistrée, pas demandée (contenu
       franco-arabe en V2, D2) ; une filière déjà posée est gardée.
     - **Défi et réussites** (lot 6) remplacés par « Mes premiers pas »
       (profil, premier exercice, première leçon, première séance) et
       « Mon examen ».
     - **Date d'examen** : `examens.date_prochaine_session`, saisie par le
       responsable pédagogique (Référentiel › Épreuves), jamais semée ;
       sans elle, « Date du BEPC pas encore annoncée ».
     - **Une autorité** : `App\Support\CatalogueEleve` répond à « quels
       contenus cet élève voit-il ? » (épreuves de l'année courante pour
       son examen, sa série et sa filière ; chapitres de sa classe ;
       leçons à version publiée non archivées ; questions publiées).
       Écrans, policy (`LeconPolicy::lire`, 404), séance, synchronisation
       passent tous par elle.
     - **Jauge** (`MaitriseService`, version du lot 2) : part des questions
       réussies au moins une fois, par matière ; pondérée seulement si
       **tous** les coefficients sont saisis. Écart au plan, qui disait
       « jauge vide » : une jauge qui reste à 0 % après un exercice réussi
       mentirait à l'élève (« elle se remplit à chaque exercice réussi »).
     - **Séance du jour** : 5, 8 ou 15 questions selon l'objectif ; jamais
       vues, puis ratées, puis réussies, matières alternées, **ordre
       stable** (sans hasard). Révision espacée au lot 6.
     - **Série** : un jour compte dès une réponse ou une leçon ouverte (au
       jour du geste) ; points et jour de grâce au lot 6.
     - **Fabrique** : un élève a un profil (CLAUDE.md § 4, décor réaliste) ;
       `sansProfil()` pour un élève juste inscrit.
   - **Écarts au plan** : jauge non vide (ci-dessus) ; QCM avancé du
     lot 3 ; `TableauDeBordExemple` supprimé (l'accueil est réel).
   - **Corrigé en chemin** : la synchronisation et « Mon compte »
     partageaient le même compteur de limite de débit (`throttle:120,1`
     sans nom) : après une séance, supprimer son compte répondait 429.
     Limiteur `synchro` propre (`HORS_LIGNE.md` écart n° 17,
     `LimiteSynchroTest`).
   - **Vu avec Playwright** : 7 écrans × 4 gabarits × 2 thèmes
     (`ecrans-lot2.spec.ts`) et 5 écrans du parcours × 3 tailles × 2 thèmes
     (`parcours-lot2.spec.ts`), axe sans violation sérieuse ; accueil
     d'Aïssatou (lot 0), épreuves, tableau de bord et liste des leçons du
     lot 1 régénérés volontairement. Corrigé : page élargie à 398 px sur
     une matière (`grid-cols-1`, `min-w-0`), contraste « / 3 » sur craie,
     matières à 4 colonnes trop étroites, carte seule sur une ligne.
     Détail : `DESIGN.md` § 13, « Lot 2 ».
   - **Preuve** : **326 Pest** (dont `ParcoursAccueilTest` 7,
     `CatalogueEleveTest` 6, `EcransCoursTest` 6, `GestesEleveTest` 11,
     `TableauDeBordEleveTest` 7, `SessionExamenTest` 4, `FormatQuestionTest`
     3, `LimiteSynchroTest` 2), **216 Vitest** (`questions.test.ts`,
     `source.test.ts`), **273 Playwright** dont le parcours du critère
     (premier exercice 4 à 7 s après « Créer mon compte ») — verts. `tsc`,
     `vp check`, Pint, Larastan niveau 7 et `npm run build` passent.
   - **Reste** : premier exercice et séance en mode avion sur vrai
     téléphone (`A_TESTER.md`) ; dates des sessions à saisir par l'équipe ;
     liste des établissements ; packs (lot 7) pour remplir la table
     `contenus`.

17. [x] **Lot 3 — moteur de questions (neuf types), indices, corrigés pas
   à pas, versions de questions, écran de saisie ; HL2** (2026-10-31,
   sur `main`, un commit)
   - **Constat** : au lot 2, un seul type (QCM à une réponse), une seule
     version par question (`questions.version` = 1), une `explication`
     d'un bloc, aucun écran de saisie, le circuit de relecture propre aux
     leçons.
   - **Décisions** (plan validé par Maurice le 2026-10-31, choix
     recommandés ; travail sur `main` à sa demande) :
     - **Score partiel** : 0 à 100, juste seulement à 100 ; les types à
       plusieurs parties (QCM à plusieurs réponses : bonnes cochées moins
       fausses cochées ; trous ; appariement ; ordre : rang par rang)
       donnent « **En partie juste** » (icône demi-cercle, couleur
       indice) ; « Pas encore », jamais « Faux ».
     - **Indices** : un à un, trois au plus ; ils ne retirent rien au
       verdict, leur nombre est gardé (`indices_utilises`, borné) pour la
       maîtrise du lot 6.
     - **Mini-question** dans une leçon : bloc `question` (uuid) dans le
       format des blocs, PHP et TS, avec le jeu d'exemples ; l'objet de
       contenu de la leçon embarque la question publiée (pack compris) ;
       une question non publiée n'est pas livrée.
     - **Signaler une erreur** : reporté au lot 4 (file des signalements).
     - **Versions** : la question suit le circuit des leçons. Un contrat
       `ContenuRelisable` (+ trait `EstRelisable`) ; `ContenuService` et
       `Perimetre::peutRediger/peutRelire/estAuteurDe` sont communs ;
       `PolicyContenuRelisable` porte les gestes, `LeconPolicy` y ajoute
       la lecture élève. Une version fige énoncé, données, réponse,
       indices et corrigé **ensemble** (`versions_contenu.blocs`).
       `TentativeService` corrige contre **la version vue** (une version
       renvoyée ou inventée est refusée) ; une question archivée n'est
       plus proposée, ses tentatives restent.
     - **Type fixé à la création** : une tentative est toujours corrigée
       selon le type de la version qu'elle a vue.
     - **Normalisation des réponses écrites** (courte, trous) : sans
       accents, sans casse, sans ponctuation, espaces réduits, œ/æ
       dépliés ; pas d'approximation (une faute de frappe reste fausse).
       **Nombres** : virgule ou point, espaces de milliers ; l'élève ne
       tape pas l'unité (affichée) ; tolérance en valeur ou en %.
     - **Mélange** des éléments (appariement à droite, remise en ordre) :
       fait par le serveur (`PresentationQuestion`), stable par question,
       jamais l'ordre de la réponse — identique en ligne et dans un pack.
     - **Question ouverte** : `tentative.enregistrer` sans score, puis
       `tentative.auto_evaluer` (`depend_de`), une seule fois.
     - **Texte à trous au back-office** : saisi en une ligne, crochets
       pour les trous, `/` entre formes justes, `*` pour une liste de
       choix (`lib/contenu/trous.ts`, testé).
     - **Relecture des questions** : sous `/contenu/relecture/questions`,
       onglets « Leçons · Questions » sur la file de relecture.
   - **Écarts au plan** : `indices` et `corrige` sont des colonnes de la
     question (versionnées avec elle), pas des tables `indices` /
     `corriges` (PLAN § 6) — sinon une correction d'indice modifierait une
     version déjà vue (`HORS_LIGNE.md` écart n° 18). `questions.version`
     et `explication` disparaissent (numéro de la version publiée ;
     l'explication devient la première étape du corrigé).
   - **Corrigé en chemin** : `TrimStrings` et `ConvertEmptyStringsToNull`
     s'appliquaient aux documents de blocs envoyés par l'éditeur de leçon :
     « Dans un triangle » suivi de « rectangle » en gras perdait son
     espace à l'enregistrement (bug du lot 1, jamais vu car les leçons de
     démonstration sont semées sans passer par la requête). Désactivés
     pour `PUT /contenu/lecons/*` et `/contenu/questions/*`
     (`bootstrap/app.php`, test dans `EcransQuestionsTest`).
     « Continuer » s'affichait un instant avant « Voir mon bilan » sur la
     dernière question (le parcours du lot 2 cliquait dedans).
     Les parcours Playwright tournaient à trois en même temps sur
     `php artisan serve` (une requête à la fois) : celui du lot 1 manquait
     ses délais ; le parcours hors ligne passe désormais après les deux
     autres (`playwright.config.ts`).
   - **Vu avec Playwright** : 7 écrans × 3 tailles × 2 thèmes
     (`ecrans-lot3.spec.ts` : banque de questions, création, saisie,
     fiche, file et fiche de relecture, leçon avec mini-question) et
     l'ardoise des types nouveaux en mode avion (`parcours-lot3.spec.ts` :
     texte à trous, question ouverte avant et après l'auto-évaluation),
     axe sans violation sérieuse, aucun débordement. Corrigé : LaTeX brut
     dans les listes (formules omises de l'extrait), double « Vérifie que
     tu as compris », surface blanche dans l'aperçu, difficulté sur deux
     lignes (cinq cases égales), « Ta réponse » à la relecture (« Réponse
     attendue »), feuille du verdict restée défilée après
     l'auto-évaluation. Régénérés volontairement : édition de leçon (outil
     « Mini-question »), matière et accueil des élèves de démonstration
     (nouvelles questions), « Sécurité » de la console (journal d'une
     base resemée). Détail : `DESIGN.md` § 13, « Lot 3 ».
   - **Preuve** : **391 Pest** (dont `CircuitQuestionsTest` 7,
     `CorrectionServeurTest` 13 — A.14 n° 6 —, `AutoEvaluationTest` 3,
     `EcransQuestionsTest` 6, `FormatQuestionTest` 5,
     `FormatQuestionValidationTest` 29), **291 Vitest** (jeu commun de
     57 corrections, auto-évaluations, normalisations et nombres ;
     `exercice-question.test.tsx` 8 ; `trous.test.ts` 3 ; blocs : 5
     exemples de mini-question), **316 Playwright** dont **A.14 n° 24** :
     élève neuf, séance de 15 questions en mode avion, rechargement
     (reprise à la 4ᵉ question), retour du réseau → chaque réponse reçue
     **une seule fois**, aucune refusée. `tsc`, `vp check`, Pint,
     Larastan niveau 7 et `npm run build` passent.
   - **Reste** : séance en mode avion sur vrai téléphone (`A_TESTER.md`) ;
     « Signaler une erreur » (lot 4) ; un hook d'enregistrement commun
     aux deux éditeurs (points ouverts).

18. [x] **Lot 4 — annales, import assisté par IA, « Signaler une erreur »
   et file des signalements** (2026-10-31, sur `main`, un commit)
   - **Constat** : aucune annale ; `questions.source` n'avait que
     `maison` ; « Signaler une erreur » reporté du lot 3 ; les entrées
     « Annales » (élève, back-office) et « Signalements » de la navigation
     étaient désactivées.
   - **Décisions** (plan validé par Maurice le 2026-10-31) :
     - **Énoncé + brouillon de réponse** : l'IA **transcrit** l'énoncé
       (jamais inventé, « [illisible] » signalé) et **propose** la réponse
       attendue et un corrigé pas à pas ; chaque question arrive
       `reponse_a_verifier` et l'annale ne part pas en relecture tant qu'il
       en reste (« J'ai vérifié », sur l'annale ou l'écran de saisie).
     - **Modèle** : Claude Opus 5.5 (`config('annales.modele')`, effort
       `high`), par le SDK officiel PHP `anthropic-ai/sdk` ^1.3
       (**dépendance ajoutée**, la seule du lot) : PDF ou image en base64,
       sortie structurée (`ExtracteurClaude::schema()`, stricte), réponse
       en flux, repli serveur `fallbacks: default` si le modèle décline.
       Sans clé, `ExtracteurSimule` (jamais en production : là, l'import
       échoue avec sa raison). Une tentative par import (`tries = 1`) :
       chaque lecture coûte ; « Relancer » sur un import en échec.
     - **Trois modes** : Lecture et Entraînement ; « Conditions réelles »
       **absent jusqu'au lot 5** (pas de bouton « bientôt »).
     - **Réponse aux signalements** : visible par l'élève (« Mes
       signalements », pastille sur l'accueil), une seule fois, pas de
       fil de discussion ; figée dès que l'élève l'a lue. Dix signalements
       par jour au plus (jour de la saisie). Traités par le relecteur et
       le responsable pédagogique (`signalements.traiter`) ; l'import, par
       le rédacteur et le responsable (`annales.importer`).
     - **Une annale se relit avec ses questions** (`SujetService`) :
       envoi, reprise, publication et renvoi s'appliquent au sujet et à
       ses questions, dans une transaction ; une question d'annale n'a pas
       de relecture à part (`QuestionPolicy::relire`, `soumettre`). La
       version du sujet fige la **structure** (parties, barèmes,
       consignes, ordre des questions) ; chaque question garde la sienne.
     - **Rattachement** : un sujet porte examen, série, filière, matière
       et **session** (année), pas une ligne `epreuves` (propre à une année
       scolaire). Durée et coefficient : **ceux imprimés sur le document**,
       vides sinon (CLAUDE.md § 5) ; une durée absurde proposée n'est pas
       reprise.
     - **Droits (D5)** : champ « Droits de publication » sur chaque
       annale, non bloquant pendant le test fermé ; signalé « Droits à
       renseigner » au back-office. Le lot 8 (référencement public) devra
       l'exiger.
     - **Catalogue** : une question d'annale n'est proposée que si son
       annale est en ligne (`CatalogueEleve::questions`, condition groupée) ;
       elle alimente aussi les séances et dit d'où elle vient (« BEPC
       2024 », `PresentationQuestion`).
     - **Hors ligne** : `signalement.creer` (priorité 3) ; la fiche
       d'annale reçoit un objet de contenu `SujetEleve`
       (`PresentationSujet`) que le pack du lot 7 rangera tel quel ;
       `/eleve/annales` et `/eleve/signalements` entrent dans la liste
       blanche ; le document original (`/eleve/documents/annales/…`) reste
       **en ligne seulement** (le service worker ne copie pas un PDF).
   - **Écarts au plan** : `corriges` et `indices` restent des colonnes de
     la question (écart n° 18 du lot 3) : une annale n'a pas de « corrigé
     de sujet » à part, ses questions portent le leur. Une question déjà
     publiée ne se retire pas d'une annale : on l'archive.
     Le PLAN § 8 parle d'« API Claude derrière un service et une file » :
     c'est fait, avec le SDK officiel plutôt que le client HTTP de
     Laravel (recommandation de la documentation de l'API).
   - **Corrigé en chemin** : `composer require` a fait réécrire
     `CLAUDE.md` par `boost:update` (197 lignes de consignes en anglais
     ajoutées) : retiré, `CLAUDE.md` reste celui du projet. À surveiller à
     chaque `composer update` (point ouvert). Le parcours d'inscription
     (`parcours.spec.ts`) attendait ses redirections 5 s seulement, quand
     les autres parcours attendent 20 à 30 s : sur ce poste, chaque requête
     de `php artisan serve` prend ~1,2 s, et l'inscription en enchaîne
     plusieurs → délai porté à 20 s (le compte était bien créé). La feuille
     « Signaler une erreur » se capturait défilée de quelques pixels selon
     le passage → remise en haut, sans focus, avant la capture.
   - **Vu avec Playwright** (`ecrans-lot4.spec.ts`, 13 écrans × 3 tailles
     × 2 thèmes) et corrigé : texte `ink-500` sur la teinte muette des
     onglets « Lecture / Entraînement » et des types d'import (contraste,
     axe) → `ink-600` ; énoncés des questions de l'annale réduits à leur
     extrait (« Calcule … ») → énoncé rendu, formules comprises ; grand
     cadre vide quand le navigateur n'a pas de lecteur PDF intégré (Android,
     navigateur sans greffon) → aperçu seulement si
     `navigator.pdfViewerEnabled`, sinon « Ouvrir » ; quatre boutons pleins
     « Vérifier l'annale » dans la liste des imports → seuls les imports
     à suivre (en lecture, en échec, annale en brouillon) ; deux « Signaler
     une erreur » en entraînement → celui de l'annale en lecture
     seulement ; titre de la question répété sur la fiche d'un
     signalement ; listes « Toutes les années » et « Tous les examens »
     tronquées. Captures des autres lots régénérées volontairement : la
     navigation (« Annales » et « Signalements » actifs), les onglets de
     relecture à trois entrées, la section « Annales et signalements » du
     tableau de bord, « Signaler une erreur » sous les questions et les
     leçons. Détail : `DESIGN.md` § 13, « Lot 4 ».
   - **Preuve** : **436 Pest** (dont `ImportAssisteTest` 7 — le critère par
     les routes réelles —, `CircuitAnnalesTest` 8, `AnnalesEleveTest` 8,
     `SignalementsTest` 8, `TexteEnBlocsTest` 14 : conversion du texte,
     chaque type proposé, propositions incohérentes), **296 Vitest** (dont
     `signaler-erreur.test.tsx` 5), Playwright : **parcours du critère**
     (`parcours-lot4.spec.ts` : téléversement d'un PDF, lecture en file,
     vérification, envoi, publication par le responsable pédagogique,
     l'élève de BEPC l'ouvre et s'y entraîne) et les écrans. `tsc`,
     `vp check`, Pint, Larastan niveau 7 et `npm run build` passent.
   - **Reste** : un vrai sujet lu par l'API Claude (clé à créer,
     `A_TESTER.md`) ; un signalement fait en mode avion sur un vrai
     téléphone ; la convention D5 ; le mode « Conditions réelles » (lot 5) ;
     les annales dans les packs (lot 7).

19. [x] **Lot 5 — examen blanc chronométré, sauvegarde continue sur
   l'appareil ; HL3** (2026-11-05, sur `main`, un commit)
   - **Constat** : la table Dexie `examens_blancs` existait depuis le lot 0
     (vide) ; `tentatives.mode` n'avait que `seance` et `entrainement` ;
     « Examens blancs » était désactivé dans la navigation ; ni coefficients
     ni moyenne d'admission saisis.
   - **Décisions** (Maurice, 2026-11-01 et 2026-11-05) :
     - l'examen blanc se passe sur **une annale publiée** (3ᵉ mode
       « Conditions réelles ») ; la session complète (toutes les épreuves,
       moyenne pondérée) viendra plus tard ;
     - **durée** : imprimée sur l'annale, sinon celle de l'épreuve
       (Référentiel), sinon **choisie par l'élève** (1 h, 2 h, 3 h, 4 h) ;
       l'origine est gardée sur le résultat ;
     - **fin du temps** : l'examen se termine seul, même application
       fermée (heure de fin = fin du temps) ; les rédactions s'auto-évaluent
       ensuite au barème ;
     - **note sur 20 seule** ; **verdict** « au-dessus / en dessous de la
       moyenne d'admission », seulement si l'équipe l'a saisie
       (`examens.moyenne_admission`, Référentiel › Épreuves) ; pas
       « admis » sur une seule épreuve ;
     - **carte de partage** dans ce lot : image dessinée sur l'appareil,
       prénom seul, partagée par le menu du téléphone.
     - **Règle de note** (une seule autorité, deux jumelles :
       `App\Support\NoteExamen`, `lib/examen-blanc/note.ts`, jeu commun
       `tests/fixtures/notes-examen.json`) : une partie vaut son barème
       imprimé (parts égales si un barème manque) ; dans une partie, les
       questions pèsent autant ; sans réponse = 0 ; arrondi au centième.
     - L'examen **vit sur l'appareil** pendant le passage ; il n'arrive au
       serveur qu'à la fin, par `examen_blanc.terminer` (priorité 0), dont
       l'`uuid` est celui de l'examen (ajout de `uuid` facultatif à
       `NouveauGeste` : enregistré deux fois, une seule opération). Le
       serveur recorrige chaque réponse contre la version vue
       (`TentativeService`, tentatives `examen_blanc`, qui compteront pour
       la maîtrise du lot 6). Horloge douteuse : signalée, jamais
       sanctionnée.
   - **Écarts au plan** : PLAN M7 prévoit coefficients réels, ordre des
     épreuves et moyenne pondérée : ils attendent la session complète
     (décision de Maurice) et les coefficients officiels. Le passage se
     fait sur la fiche de l'annale (`?mode=examen`), pas sur une page à
     part : elle est déjà gardée hors ligne.
   - **Corrigé en chemin** : deux critères du barème d'une annale de
     démonstration (lot 4) contenaient des `$…$` affichés tels quels (un
     critère est du texte simple) → seeder corrigé, et
     `PropositionEnQuestion` retire les `$` d'un critère proposé par l'IA.
     MySQL (Laragon) était arrêté après un redémarrage du poste : relancé.
   - **Vu avec Playwright** (`ecrans-lot5.spec.ts`, 6 écrans × 3 tailles ×
     2 thèmes) : lancement, passage, auto-évaluation, résultat sur
     l'appareil (« en attente d'envoi »), « Mes examens blancs », résultat
     détaillé ; axe sans violation sérieuse, aucun débordement. Captures des
     autres lots régénérées volontairement : la navigation (« Examens
     blancs » actif), l'accueil d'Aïssatou (ses réponses d'examen comptent),
     Référentiel › Épreuves (moyenne d'admission).
   - **Preuve** : Pest (dont `ExamenBlancHorsLigneTest` 10 — A.14 n° 7 —,
     `NoteExamenTest` 10), Vitest (dont `examen-blanc.test.ts` 16 — A.14
     n° 20 et 21 —, `moteur.test.ts` +1), Playwright : **parcours du
     critère** `parcours-lot5.spec.ts` et les écrans. Totaux : **456 Pest,
     313 Vitest, 426 Playwright** (captures régénérées sur le build, sans
     `public/hot`). `tsc`, `vp check`, Pint, Larastan niveau 7 et
     `npm run build` passent. En chemin : `hors-ligne.spec.ts` coupait le
     réseau pendant que le premier `/sync/etat` était en route ; sa réponse
     arrivait après et remettait, à raison, « en ligne » : le test attend
     désormais ce premier contact (course du test, pas du produit) ;
     `SeederDemonstrationTest` compte à part les sept réponses des deux
     examens blancs semés.
   - **Reste** : extinction forcée du téléphone en plein examen
     (`A_TESTER.md`, A.15 n° 2) ; session complète et moyenne pondérée ;
     la moyenne d'admission à saisir par l'équipe ; lancement hors ligne
     depuis un pack (lot 7).

*(Claude Code ajoute ici un point numéroté par lot ou par décision : le constat,
la décision, la preuve — tests ajoutés et nombre total de tests passants.)*

### Points ouverts

- **Matières phares** (D1) : choisies au lot 1 par Claude Code à la demande
  de Maurice (`ReferentielSeeder::PHARES`, point 15) ; à faire confirmer par
  l'équipe pédagogique, modifiables dans Référentiel › Épreuves.
- **Coefficients et durées officiels** et **programme** (chapitres, notions)
  de chaque matière phare : à saisir par l'équipe pédagogique dans le
  référentiel. Tant qu'ils manquent, jauge et examen blanc ne peuvent pas les
  utiliser.
- **Rattachement rédacteur ↔ matière** (PLAN § 7 : « par matière phare, un
  rédacteur et un relecteur ») : pas au lot 1 ; tout le personnel du
  back-office voit tout le catalogue, un rédacteur ne modifie que ses
  leçons. À décider quand l'équipe sera constituée.
- **Mise à jour de Composer** : `boost:update` (lancé après `composer
  require`) réécrit `CLAUDE.md` en y ajoutant ses consignes en anglais.
  Vérifier `git diff CLAUDE.md` après chaque `composer require/update`
  (lot 4).
- **Annales** (lot 4) : la convention D5 (champ « Droits de publication »)
  ; un vrai sujet lu par l'API Claude ; un import par fichier (un sujet
  très long peut dépasser une lecture : le découper) ; les annales dans
  les packs (lot 7).
- **Images, tableaux et mini-questions dans les leçons** : hors du format
  des blocs au lot 1 (stockage et conversion WebP à décider avec les packs,
  mini-questions au lot 3).
- **Dates des sessions d'examen** (lot 2) : à saisir par l'équipe
  pédagogique dans Référentiel › Épreuves ; sans elles, pas de compte à
  rebours.
- **Questions** : écran de saisie et versions faits (lot 3) ; les 30
  questions de démonstration sont des exemples (`est_exemple`), à
  remplacer par celles de l'équipe pédagogique. « Signaler une erreur »
  au lot 4.
- **Enregistrement automatique** : l'écran de saisie des questions reprend
  la mécanique de l'éditeur de leçon (délai, verrou, Ctrl+S, départ
  retenu) ; un hook commun aux deux éditeurs serait plus sûr — à faire à
  la prochaine retouche de l'un des deux.
- **Images et tableaux dans les leçons et les questions** : toujours hors
  du format des blocs (stockage et WebP à décider avec les packs).
- **Désactiver un compte du personnel** : un compte qui a signé du contenu
  ne se supprime plus lui-même (point 15) ; l'écran administrateur qui le
  désactive reste à faire (console, lot 13).- **Domaine et hébergement** (D11) : à fixer avant la clôture du lot 0 (HTTPS).
- **Logo vectoriel** : remplacera le monogramme provisoire des icônes (DA8).
- **Fournisseur SMS** (D3) : à choisir avant le lot 8 ; d'ici là, aucun SMS
  ne part (codes dans le journal Laravel en développement).
- **Recours d'un élève au numéro jamais vérifié qui a oublié son mot de
  passe** : l'écran dit « demande de l'aide à ton enseignant ou à
  N'karamögö » ; le canal d'assistance (et l'écran administrateur qui
  réinitialise un mot de passe) reste à définir.
- **Espaces parent, enseignant, gestionnaire** (lot 11) : d'ici là, ces
  comptes n'ouvrent que « Mon compte ». Décider alors si enseignants et
  gestionnaires (qui verront des données d'élèves) prennent la session de
  12 h et la double authentification du personnel.
- **Changement de mot de passe** : les autres sessions ouvertes ne sont pas
  fermées (pas de `AuthenticateSession`) ; à décider avec l'étape 6 (appareils
  enregistrés, révocation).
- Liste des établissements (nom, type, préfecture, commune, région) à constituer.
- Coefficients et durées officiels de chaque épreuve, par série et par filière,
  à obtenir et faire valider.
- Nom de domaine `nkaramogo.*` à vérifier et réserver (D11).

## 9. Modèles Eloquent

| Modèle | Table | Rattachement | Remarque |
|---|---|---|---|
| `User` | `users` | rôles (`HasRoles`), appareils (`appareil_profils`) | téléphone `+224…` unique, prénom, pseudo unique ; `estPersonnel()`, `adresseDoubleAuthentification()` (pseudo, jamais le numéro) |
| `CodeSms` | `codes_sms` | numéro | code haché, motif `MotifCode`, 10 min, 5 essais |
| `EntreeJournalAcces` | `journal_acces_plateforme` | auteur, cible | écrit par `JournalAcces::consigner()` seulement ; jamais modifié |
| `Appareil` | `appareils` | profils (`appareil_profils`) | jeton haché (SHA-256), révocable (`revoque_le`) |
| `OperationSynchronisee` | `operations_synchronisees` | auteur, appareil | `uuid` unique global (idempotence) ; `acceptee` ou `rejetee` seulement |
| `Role`, `Permission` (spatie) | `roles`, `permissions`, `model_has_roles`… | — | recopiés de `App\Enums\Role` et `Permission` par `RolesEtPermissionsSeeder` |
| `AnneeScolaire` | `annees_scolaires` | épreuves | une seule `courante` (`ReferentielService::rendreCourante`) |
| `Examen`, `Serie`, `Classe` | `examens`, `series`, `classes` | classe d'examen → examen | semés par `ReferentielSeeder`, pas d'écran de saisie |
| `Matiere` | `matieres` | épreuves, chapitres | `teinte` (`TeinteMatiere`) = couleur et icône du design ; ne se supprime pas si utilisée |
| `Epreuve` | `epreuves` | année, examen, série nulle, matière | **porte coefficient et durée** (vides tant que non saisis), `phare` (D1) ; unicité par `cle_unicite` (série nulle comprise) |
| `Chapitre`, `Notion` | `chapitres`, `notions` | matière + classe ; chapitre | `ordre`, `est_exemple` |
| `Lecon` | `lecons` | notion, auteur | `uuid` v7 (clé de route), `brouillon` (blocs), `revision` (verrou), `version_publiee_id` ; statut changé par `ContenuService` seulement |
| `VersionContenu` | `versions_contenu` (polymorphe : leçon, question) | auteur, décideur | figée à l'envoi en relecture ; `decision` (`DecisionRelecture`), `commentaire` ; pour une question, `blocs` = énoncé, données, réponse, indices et corrigé ensemble |
| `ProfilEleve` | `profils_eleves` | élève (unique), examen, série nulle, classe, établissement nul | écrit par `ProfilEleveService` seulement ; `objectif_minutes` (10, 15, 30) ; `libelleExamen()` |
| `Etablissement` | `etablissements` | — | liste à constituer (vide) |
| `ProgressionLecon` | `progressions_lecons` | élève, leçon | `etat` + `etat_saisi_le`, `position` + `position_saisie_le` : la plus récente gagne |
| `Question` | `questions` | notion, auteur | `uuid` v7, `type` (`TypeQuestion`, fixé à la création), brouillon dans les colonnes (`enonce`, `donnees`, `reponse_attendue`, `indices`, `corrige`, `difficulte`), `extrait` (listes, recherche), `revision`, `version_publiee_id` ; circuit par `ContenuService` ; format : `FormatQuestion` ; vue élève : `PresentationQuestion` |
| `Seance` | `seances` | élève | `uuid`, `jour`, `questions` (ids ordonnés), `termine_le` |
| `Sujet` | `sujets` | examen, série nulle, matière, auteur | `uuid` v7, `session`, `type` (`TypeSujet`), durée et coefficient **imprimés** (vides sinon), `droits` (D5), document original (disque privé) ; circuit par `SujetService` ; vue élève : `PresentationSujet` |
| `SujetPartie` | `sujet_parties` | sujet | `uuid`, `ordre`, `titre`, `bareme`, `consigne` (blocs) |
| `ImportSujet` | `imports_sujets` | auteur, examen, série, matière, sujet créé | `statut` (`StatutImport`), `extracteur`, `modele`, jetons, `avertissements`, `erreur` |
| `Signalement` | `signalements` | élève, cible (question, leçon, sujet) | `uuid` = celui de l'opération ; `motif`, `message` (500), `statut`, `reponse` (figée une fois lue), `saisi_le` |
| `ExamenBlanc` | `examens_blancs` | élève, annale (version vue) | `uuid` = celui de l'examen (appareil) ; durée et origine, début, fin, `temps_ecoule`, `note_sur_20` (serveur), `note_appareil`, `details` par partie, `horloge_suspecte` ; écrit par `ExamenBlancService` seulement |
| `Tentative` | `tentatives` | élève, question, séance nulle | ajout seulement (sauf l'auto-évaluation, une fois) ; `uuid` = celui de l'opération ; `version` = numéro vu ; `score` 0–100 et `correcte` = correction du serveur ; `criteres`, `auto_evaluee_le` |

## 10. Enums

| Enum | Valeurs | Rôle |
|---|---|---|
| `Role` | `eleve`, `parent`, `enseignant`, `redacteur`, `relecteur`, `admin_contenu`, `gestionnaire_etablissement`, `superadmin` | permissions de chaque rôle, `estPersonnel()` |
| `Permission` | `espace.eleve`, `espace.contenu`, `espace.console`, `referentiel.gerer`, `contenu.rediger`, `contenu.relire`, `contenu.administrer`, `compte.double_authentification`, `annales.importer`, `signalements.traiter` (lot 4) | seule liste des permissions |
| `Espace` | `console`, `contenu`, `eleve` (ordre de priorité) | où arrive un compte (`accueilDe()`) |
| `MotifCode` | `verification`, `recuperation`, `changement_numero` | motif d'un code SMS |
| `CodeExamen` | `CEE`, `BEPC`, `BAC` | `nom()`, `aDesSeries()` |
| `CodeSerie` | `SM`, `SE`, `SS` | séries du Baccalauréat unique |
| `Filiere` | `generale`, `franco_arabe` | filière d'une épreuve (D2) |
| `TeinteMatiere` | les dix clés de `lib/matieres.ts` | même liste en TS, vérifiée par un test |
| `StatutContenu` | `brouillon`, `en_relecture`, `publie`, `archive` | statut d'une leçon ou d'une question |
| `DecisionRelecture` | `publiee`, `renvoyee`, `retiree` | issue d'une version envoyée en relecture |
| `TypeQuestion` | `qcm_une`, `qcm_plusieurs`, `vrai_faux`, `numerique`, `courte`, `trous`, `appariement`, `ordre`, `ouverte` | type d'une question, `libelle()`, `estAutoEvaluee()` |
| `ModeTentative` | `seance`, `entrainement`, `examen_blanc` (lot 5) | où la réponse a été donnée |
| `EtatLecon` | `comprise`, `a_revoir` | ce que l'élève dit d'une leçon |
| `TypeEtablissement` | `public`, `prive`, `franco_arabe` | type d'un établissement |
| `TypeSujet` | `officiel`, `blanc_maison` | annale ou sujet maison |
| `StatutImport` | `en_attente`, `en_cours`, `pret`, `echec` | un import assisté |
| `CibleSignalement` | `question`, `lecon`, `sujet` | ce qu'on signale |
| `MotifSignalement` | `enonce`, `corrige`, `reponse_refusee`, `incomprehensible`, `autre` | même liste dans `signaler-erreur.tsx` (testé) |
| `StatutSignalement` | `ouvert`, `traite`, `rejete` | issue d'un signalement |

## 11. Routes

| Groupe | Garde | Fichier |
|---|---|---|
| `/` vitrine, `/dev/composants` (hors production) | publiques | `routes/web.php` |
| `/accueil` (aiguillage) | `auth`, dérogation | `routes/web.php` |
| `/eleve` · `/contenu` · `/console` | `auth` + `can:espace.eleve` · `can:espace.contenu` · `can:espace.console` | `routes/eleve.php`, `routes/web.php` |
| `/eleve/bienvenue` (parcours d'accueil, « Mon examen ») ; `/eleve/cours`, `/eleve/cours/{slug}`, `/eleve/lecons/{uuid}`, `/eleve/chapitres/{id}/fiche`, `POST /eleve/seance`, `/eleve/seances/{uuid}` | `auth` + `can:espace.eleve` ; profil exigé (`ProfilEleveRequis`) ; leçon gardée par `LeconPolicy::lire`, le reste par `CatalogueEleve` (404) | `routes/eleve.php` |
| `PUT /contenu/referentiel/examens/{examen}/session` | `can:referentiel.gerer` | `routes/contenu.php` |
| `/contenu` (tableau de bord) | `auth` + `can:espace.contenu` | `routes/web.php` |
| `/contenu/referentiel/*` (matières, épreuves, programme, années) | `auth` + `can:referentiel.gerer` | `routes/contenu.php` |
| `/contenu/lecons`, `/contenu/lecons/{uuid}` | `auth` + `can:espace.contenu` ; fiche gardée par `LeconPolicy` | `routes/contenu.php` |
| `/contenu/lecons/creer`, édition, enregistrement, envoi, reprise, modification | `can:contenu.rediger` + `LeconPolicy::rediger` (auteur ou responsable pédagogique) | `routes/contenu.php` |
| `/contenu/relecture`, publier, renvoyer | `can:contenu.relire` + `LeconPolicy::relire` (jamais l'auteur) | `routes/contenu.php` |
| archiver, restaurer | `can:contenu.administrer` | `routes/contenu.php` |
| `/contenu/questions` (liste, fiche), `creer`, édition, envoi, reprise, modification ; `/contenu/relecture/questions`, publier, renvoyer ; archiver, restaurer | mêmes gardes que les leçons ; `QuestionPolicy` (circuit commun `PolicyContenuRelisable`) | `routes/contenu.php` |
| `/eleve/examens-blancs`, `/eleve/examens-blancs/{uuid}` (le passage : `/eleve/annales/{uuid}?mode=examen`) | `auth` + `can:espace.eleve` ; résultat gardé par `ExamenBlancPolicy::voir` (404) | `routes/eleve.php` |
| `/eleve/annales`, `/eleve/annales/{uuid}`, `/eleve/documents/annales/{uuid}`, `/eleve/signalements` | `auth` + `can:espace.eleve` ; annale gardée par `SujetPolicy::lire` (404) | `routes/eleve.php` |
| `/contenu/annales` (liste, fiche, document), `/contenu/relecture/annales` ; importer (`annales/importer`, `annales/imports`, relancer) ; parties, questions d'annale, circuit | `can:espace.contenu` · `can:annales.importer` (+ `throttle:20,60`) · `can:contenu.rediger` / `relire` / `administrer` ; `SujetPolicy` | `routes/contenu.php` |
| `/contenu/signalements`, fiche, répondre | `can:signalements.traiter` ; `SignalementPolicy` (404) | `routes/contenu.php` |
| `/compte/*` (profil, mot de passe, numéro, affichage, vérification, suppression) | `auth`, dérogations « Mon compte » | `routes/compte.php` |
| `/compte/securite` | `auth` + `can:compte.double_authentification` + `password.confirm` | `routes/compte.php` |
| `/mot-de-passe-oublie*` | `guest` | `routes/compte.php` |
| Fortify : connexion, inscription, 2FA, confirmation du mot de passe | Fortify ; routes authentifiées en dérogation, activation 2FA gardée au geste | paquet |

Toute exception est justifiée dans `AccesParRoleTest::OUVERTES_A_TOUS`.

## 12. Mise en production — liste à suivre

> Préparée à la clôture du lot 0 ; attend le domaine et l'hébergement (D11).
> Chaque point se vérifie sur la préproduction avant la production.

1. **HTTPS** sur tout le domaine (certificat valide, redirection du HTTP) :
   sans lui, pas de service worker, donc ni hors ligne ni installation.
2. `.env` : `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://…`,
   `SESSION_SECURE_COOKIE=true`, `APP_KEY` généré une fois et gardé ;
   **pas** de `DEMO_MOT_DE_PASSE`. Base MySQL dédiée.
3. Déploiement, dans l'ordre : `composer install --no-dev --optimize-autoloader`,
   `npm ci && npm run build` (vérifier l'absence de `public/hot`),
   `php artisan migrate --force`, **puis** `php artisan db:seed --force`
   (rôles et permissions seulement : `DemoSeeder` refuse la production),
   `php artisan optimize`. Vérifié en local : les caches de configuration,
   de routes et de vues se construisent (51 routes).
4. Serveur web : `/sw.js` passe par PHP (pas de fichier statique de ce nom),
   avec ses en-têtes (`Service-Worker-Allowed: /`, `Cache-Control:
   no-cache`) ; `/build/*` servi avec un cache long (`immutable`), les noms
   étant hachés ; `/manifest.webmanifest` en `application/manifest+json`.
5. File d'attente et tâches planifiées : `QUEUE_CONNECTION=database` → un
   `php artisan queue:work --timeout=900 --tries=1` surveillé (lot 4 :
   l'import assisté en dépend) et `DB_QUEUE_RETRY_AFTER=960` (au-delà de
   la durée d'une lecture, sinon un second travailleur reprend le job).
   `ANTHROPIC_API_KEY` dans `.env` (jamais dans le dépôt) ; sans elle,
   l'import échoue avec sa raison (pas de lecture simulée en production).
   Documents originaux sur le disque privé (`storage/app/private/annales`,
   à sauvegarder avec la base).
6. SMS : aucun fournisseur (D3) ; en production, `JournalSms` signale
   seulement l'absence d'envoi — la vérification du numéro et la
   récupération du mot de passe ne fonctionnent donc pas encore.
7. Après le premier déploiement : créer le premier administrateur
   plateforme à la main (`php artisan tinker`, rôle `superadmin`), activer sa
   double authentification, puis dérouler les contrôles « bloqués tant que
   le domaine HTTPS n'existe pas » de `A_TESTER.md`.
