# DEVBOOK : N'karamögö · G-Étudie

## 0. Reprise — où en est le projet (mis à jour le 2026-10-30)

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

### État au 2026-10-30 (lot 0, étapes 0 à 3 faites)

- **Dépôt git** : `main` porte l'état de départ (kit + documents + audit) ; le
  lot 0 avance sur la branche **`lot-0`**, un commit par étape. Pas de dépôt
  distant (DA6).
- **Décisions** : D1–D12, HL-D1–HL-D12 et DA1–DA9 **tranchées** (point 2).
  Attendus de Maurice : liste des matières phares (D1, avant le lot 1),
  domaine et hébergement (D11, avant la clôture du lot 0), logo vectoriel.
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
- **Tests** : 75 Pest (252 assertions, MySQL `g_etudie_test`), 114 Vitest,
  49 Playwright (connexion + 6 écrans × 4 gabarits × 2 thèmes) — verts.
  `tsc`, `vp check`, Pint, Larastan (niveau 7) et `npm run build` passent.
- **⚠ Les trois espaces connectés ne sont gardés que par `auth`** : n'importe
  quel compte connecté ouvre `/contenu` et `/console`. Les permissions
  (`can:`) arrivent à l'étape 5, et `AccesParRoleTest` les exigera.
- **Pas encore fait dans le lot 0** : connexion par téléphone et « Mon
  compte », rôles et permissions, socle hors ligne. Les écrans de connexion
  et de réglages du kit (en anglais, par e-mail) sont encore en place ;
  « Moi » mène à ses réglages.
- **Lancer l'application** : `.claude/launch.json` déclare `laravel`
  (`php artisan serve`, port 8000) et `vite` (`npm run dev`, port 5173).
  Les captures de référence se prennent sur le build : arrêter `npm run dev`
  et vérifier l'absence de `public/hot` avant `npm run test:visuel`. Les
  écrans connectés demandent le compte du `DatabaseSeeder` en base de
  développement (`php artisan db:seed`).

### Prochaines étapes, par ordre de priorité

1. **Lot 0, étape 4 — connexion par téléphone et « Mon compte »** (dont
   `Password::defaults()` à aligner sur D3 : 8 caractères, sans règle de
   complexité — le kit impose 12 caractères, casse mixte, symboles et une
   vérification de fuite par appel réseau en production). La connexion des
   tests visuels (`tests/visuel/connexion.setup.ts`) passe alors au téléphone.
2. **Étapes 5 et 6** : rôles, permissions, `AccesParRoleTest` (les routes
   `/eleve`, `/contenu`, `/console` prennent leur `can:` ; redirection après
   connexion selon le rôle) → socle hors ligne HL0. Puis clôture (étape 7).
3. **Hors code, à lancer en parallèle** (sinon l'application sera vide) :
   recrutement des rédacteurs et relecteurs des matières phares, convention avec
   le ministère / la DGECS sur les annales (D5), correction de la plaquette (CEE,
   BEPC, chiffres sourcés), logo vectoriel pour les icônes de l'application.

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
| Authentification | téléphone + mot de passe (D3) | **laravel/fortify 1.41.0** : connexion par **e-mail**, inscription, réinitialisation par lien e-mail, vérification d'e-mail, 2FA TOTP, **passkeys** (laravel/passkeys 0.2.1) | à transformer : identifiant `telephone`, récupération par code SMS (hors Fortify), vérification d'e-mail retirée ; 2FA et passkeys : DA4 |
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
| Polices | Sora, Lexend, KaTeX auto-hébergées | Instrument Sans via l'option `fonts` de laravel-vite-plugin : **téléchargée au build et servie depuis `public/build/assets`** (auto-hébergée) | ✅ Sora et Lexend par `@fontsource/sora` et `@fontsource/lexend` 5.3.0 importés dans `app.css` ; option `fonts` du plugin retirée (elle faisait télécharger le WOFF) — `DESIGN.md` § 13 |
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
| Référentiel | `annees_scolaires`, `examens`, `filieres`, `series`, `classes`, `matieres`, `epreuves`, `chapitres`, `notions` | ⬜ prévu (lot 1) |
| Contenu | `lecons`, `versions_contenu`, `questions`, `indices`, `corriges`, `sujets`, `sujet_parties`, `ressources_externes`, `signalements`, `packs_hors_ligne` | ⬜ prévu (lots 1, 3, 4, 7) |
| Élève | `users`, `profils_eleves`, `liens_parents`, `tentatives`, `maitrises`, `seances`, `examens_blancs`, `series_jours`, badges, défis | ⬜ prévu (lots 0, 2, 3, 5, 6) |
| Organisation | `etablissements`, `groupes`, `devoirs`, `abonnements`, `paiements`, `codes_acces`, `conversations_tuteur` | ⬜ prévu (lots 9 à 11) |
| Hors ligne & audit | `appareils`, `appareil_profils`, `operations_synchronisees`, `journal_acces_plateforme` | ⬜ prévu (lot 0) |

**Une seule plateforme, pas de multi-entreprise.** Les établissements, groupes
et liens parent-enfant sont des **rattachements**, qui disent sur quoi une
permission s'exerce (section 7).

## 4. État d'avancement — backend

| Service | Rôle | État |
|---|---|---|
| `ReferentielService` | examens, séries, épreuves (coefficients, durées) | ⬜ |
| `ContenuService` + workflow de relecture | brouillon → relecture → publication, versions | ⬜ |
| `ImportAnnaleService` | PDF/scan → sujet structuré (IA) → relecture | ⬜ |
| `TentativeService` | enregistrement, **correction serveur**, maîtrise | ⬜ |
| `SeanceService` | séance du jour, séances pré-calculées | ⬜ |
| `ExamenBlancService` | passage, note, moyenne pondérée | ⬜ |
| `MaitriseService` | maîtrise par notion, jauge, révision espacée | ⬜ |
| `PackService` | génération, empreintes, différentiel, droits | ⬜ |
| `SynchroService` | file d'opérations (`HORS_LIGNE.md` A.3.6) | ⬜ |
| `TuteurService` | API Claude, quotas, journal, coûts | ⬜ |
| `PaiementService` | Orange Money, MTN MoMo, codes prépayés | ⬜ |
| `PlateformeService` | console : activité, contenu, revenus, impact | ⬜ |

## 5. État d'avancement — frontend

| Habillage / écran | État |
|---|---|
| Page `/dev/composants` (catalogue Ardoise) | ✅ lot 0, étape 1 (point 4) |
| Habillages vitrine, élève, back-office, console (coquilles et pages d'entrée) | ✅ lot 0, étape 3 (point 6) |
| Vitrine finale (démo jouable, compte à rebours, tarifs) | ⬜ lot 8 |
| Connexion / inscription par téléphone, parcours d'accueil, « Mon compte » | ⬜ |
| Accueil élève (jauge, séance du jour, trace) | ⬜ |
| Leçon, fiche de révision | ⬜ |
| Lecteur d'exercice (« l'ardoise ») | ⬜ |
| Annales (liste, fiche, trois modes) | ⬜ |
| Examen blanc (lancement, passage, résultat, carte de partage) | ⬜ |
| Progression, profil, téléchargements | ⬜ |
| Back-office contenu | ⬜ |
| Console plateforme | ⬜ |

Infrastructure d'interface à construire au lot 0 : primitives de `DESIGN.md`
§ 11, barre de progression de navigation et garde-fous Inertia (`CLAUDE.md` § 4),
composants hors ligne (`HORS_LIGNE.md` A.3.7 à A.3.9), formatage GNF dans
`lib/utils.js`.

## 6. Données de démonstration (seeders)

| Seeder | Rôle | État |
|---|---|---|
| `RolesEtPermissionsSeeder` | **source unique** des rôles et permissions (`syncPermissions`) | ⬜ |
| `ReferentielSeeder` | structure des examens, séries, classes, matières — **coefficients et durées laissés vides**, à saisir et valider par l'équipe pédagogique | ⬜ |
| `DemoSeeder` | comptes de démo par rôle, leçons et questions **`est_exemple = true`** | ⬜ |

⚠ Les permissions ne viennent que des seeders : un déploiement lance `migrate`
**puis** `db:seed`. Comptes créés en `firstOrCreate` (un re-seed ne réinitialise
jamais un mot de passe).

Comptes de démo prévus (mots de passe dans le `.env` de développement, jamais en
production) : un élève BEPC, un élève Bac SE, un parent, un enseignant, un
rédacteur, un relecteur, un admin contenu, un superadmin.

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

*(Claude Code ajoute ici un point numéroté par lot ou par décision : le constat,
la décision, la preuve — tests ajoutés et nombre total de tests passants.)*

### Points ouverts

- **Liste des matières phares** (D1) : attendue de Maurice avant le lot 1.
- **Domaine et hébergement** (D11) : à fixer avant la clôture du lot 0 (HTTPS).
- **Logo vectoriel** : remplacera le monogramme provisoire des icônes (DA8).
- Liste des établissements (nom, type, préfecture, commune, région) à constituer.
- Coefficients et durées officiels de chaque épreuve, par série et par filière,
  à obtenir et faire valider.
- Nom de domaine `nkaramogo.*` à vérifier et réserver (D11).

## 9. Modèles Eloquent

*(à remplir au fil des lots : modèle, table, rattachement, remarque)*

## 10. Enums

*(à remplir — prévus : `CodeExamen` (`CEE`, `BEPC`, `BAC`), `CodeSerie`
(`SM`, `SE`, `SS`), `Filiere` (`general`, `franco_arabe`), `TypeQuestion`,
`StatutContenu` (`brouillon`, `en_relecture`, `publie`, `archive`),
`ModeTentative` (`seance`, `entrainement`, `examen_blanc`), `Role`.)*

## 11. Routes

*(à remplir — chaque groupe avec son middleware `can:` ; toute exception
justifiée dans `AccesParRoleTest::OUVERTES_A_TOUS`.)*
