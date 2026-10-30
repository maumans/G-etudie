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

### État au 2026-10-30 (lot 0, étapes 0 à 4 faites, puis refonte du design v2)

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
- **Images de la vitrine** : dessins par défaut en place ; Maurice peut les
  remplacer (`config('vitrine.illustrations')`, mêmes proportions) et, s'il le
  souhaite, ajouter la photo détourée d'une personne majeure avec
  autorisation écrite (`public/images/vitrine/heros.webp`), posée devant
  l'illustration du héros.
- **Tests** : 118 Pest (MySQL `g_etudie_test`), 125 Vitest, 98 Playwright
  (connexion + 12 écrans × 4 gabarits × 2 thèmes + un parcours complet
  inscription → suppression) — verts. `tsc`, `vp check`, Pint, Larastan
  (niveau 7) et `npm run build` passent.
- **⚠ Les trois espaces connectés ne sont gardés que par `auth`** : n'importe
  quel compte connecté ouvre `/contenu` et `/console`. Les permissions
  (`can:`) arrivent à l'étape 5, et `AccesParRoleTest` les exigera.
- **⚠ Aucun SMS ne part** : le pilote `JournalSms` écrit le code dans
  `storage/logs/laravel.log` (en production, il signale seulement l'absence
  de fournisseur). Fournisseur SMS à choisir avant le lot 8 (D3).
- **Pas encore fait dans le lot 0** : rôles et permissions (avec la 2FA
  proposée au personnel et la session de 12 h des rôles back-office et
  console), socle hors ligne.
- **Lancer l'application** : `.claude/launch.json` déclare `laravel`
  (`php artisan serve`, port 8000) et `vite` (`npm run dev`, port 5173).
  Base : `php artisan migrate:fresh` puis `php artisan db:seed` — le seeder
  crée l'élève de démonstration (+224 600 00 00 01) avec le mot de passe
  `DEMO_MOT_DE_PASSE` de `.env`. **MySQL** : celui de Laragon
  (`D:\Applications\laragon`), à démarrer s'il ne tourne pas — sans lui,
  chaque requête attend la base puis échoue. Les captures de référence se prennent sur le
  build : arrêter `npm run dev` et vérifier l'absence de `public/hot` avant
  `npm run test:visuel`.

### Prochaines étapes, par ordre de priorité

1. **Lot 0, étape 5 — rôles et permissions** : `spatie/laravel-permission`,
   `RolesEtPermissionsSeeder`, `DemoSeeder` (un compte par rôle, connexion par
   téléphone), `App\Support\Perimetre`, `AccesParRoleTest` (les routes
   `/eleve`, `/contenu`, `/console` prennent leur `can:` ; « Mon compte » et
   la vérification du numéro entrent dans `OUVERTES_A_TOUS` avec leur
   raison) ; redirection après connexion selon le rôle ; 2FA proposée aux
   rôles back-office et console ; session de 12 h pour ces rôles (HL-D10).
2. **Étape 6 — socle hors ligne HL0**, puis clôture (étape 7).
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
| Référentiel | `annees_scolaires`, `examens`, `filieres`, `series`, `classes`, `matieres`, `epreuves`, `chapitres`, `notions` | ⬜ prévu (lot 1) |
| Contenu | `lecons`, `versions_contenu`, `questions`, `indices`, `corriges`, `sujets`, `sujet_parties`, `ressources_externes`, `signalements`, `packs_hors_ligne` | ⬜ prévu (lots 1, 3, 4, 7) |
| Comptes | `users` (téléphone, prénom, pseudo, nom et e-mail facultatifs, `telephone_verifie_le`, `desactive_le`), `codes_sms` | ✅ lot 0, étape 4 |
| Élève | `profils_eleves`, `liens_parents`, `tentatives`, `maitrises`, `seances`, `examens_blancs`, `series_jours`, badges, défis | ⬜ prévu (lots 2, 3, 5, 6) |
| Organisation | `etablissements`, `groupes`, `devoirs`, `abonnements`, `paiements`, `codes_acces`, `conversations_tuteur` | ⬜ prévu (lots 9 à 11) |
| Audit | `journal_acces_plateforme` (écrit par `App\Support\JournalAcces`) | ✅ lot 0, étape 4 |
| Hors ligne | `appareils`, `appareil_profils`, `operations_synchronisees` | ⬜ prévu (lot 0, étape 6) |

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
| Connexion / inscription par téléphone, vérification du numéro, mot de passe oublié, « Mon compte » | ✅ lot 0, étape 4 (point 7) |
| Parcours d'accueil (examen, série, établissement, objectif) | ⬜ lot 2 |
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

*(Claude Code ajoute ici un point numéroté par lot ou par décision : le constat,
la décision, la preuve — tests ajoutés et nombre total de tests passants.)*

### Points ouverts

- **Liste des matières phares** (D1) : attendue de Maurice avant le lot 1.
- **Domaine et hébergement** (D11) : à fixer avant la clôture du lot 0 (HTTPS).
- **Logo vectoriel** : remplacera le monogramme provisoire des icônes (DA8).
- **Fournisseur SMS** (D3) : à choisir avant le lot 8 ; d'ici là, aucun SMS
  ne part (codes dans le journal Laravel en développement).
- **Recours d'un élève au numéro jamais vérifié qui a oublié son mot de
  passe** : l'écran dit « demande de l'aide à ton enseignant ou à
  N'karamögö » ; le canal d'assistance (et l'écran administrateur qui
  réinitialise un mot de passe) reste à définir.
- **Changement de mot de passe** : les autres sessions ouvertes ne sont pas
  fermées (pas de `AuthenticateSession`) ; à décider avec l'étape 6 (appareils
  enregistrés, révocation).
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
