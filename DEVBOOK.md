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

### État au 2026-10-30 (après l'audit)

- **Rien n'est codé pour N'karamögö.** Le projet est le **kit de démarrage
  officiel Laravel + React** (`laravel/react-starter-kit`) tel que généré :
  Laravel 13, Inertia 3, React 19 en **TypeScript**, Tailwind 4, **Vite+**,
  Fortify (connexion par e-mail, 2FA, passkeys), **Pest**. Versions exactes en
  section 2.
- **Audit fait** : écarts avec `PLAN_NKARAMOGO.md` § 8 et `CLAUDE.md` relevés,
  propositions faites, décisions d'audit DA1–DA9 ouvertes (en attente de Maurice).
- **⚠ La base de développement n'existe pas** : `.env` pointe sur MySQL
  `g_etudie`, inconnue du serveur MySQL local. Comme les sessions sont en base,
  **toute page répond 500** (`SQLSTATE[HY000] [1049] Unknown database 'g_etudie'`).
  Correction : créer la base (`utf8mb4_unicode_ci`) puis `php artisan migrate`.
- **Playwright MCP opérationnel** (vérifié le 2026-10-30) : page d'accueil
  ouverte et capturée en 360 × 740 — d'abord l'erreur 500 ci-dessus, puis la
  page d'accueil du kit (serveur lancé avec `SESSION_DRIVER=file` et
  `CACHE_STORE=file` en variables d'environnement, sans toucher à `.env`) : pas
  de débordement horizontal, aucune erreur console. Le serveur MCP n'écrit ses
  captures que dans le projet (`.playwright-mcp/`, à ignorer dans git).
  Navigateurs `@playwright/test` installés (chromium-1248).
- **Pas de dépôt git.** Et le `.gitignore` du kit **exclut `CLAUDE.md`,
  `AGENTS.md`, `.mcp.json`, `.claude/` et `boost.json`** : à corriger avant le
  premier commit (DA6).
- **Tests** : les 40 tests Pest du kit passent (138 assertions), sur SQLite en
  mémoire (base dédiée, jamais celle de développement). Aucun test N'karamögö.
  Pas encore de script `test:js` (Vitest 5.0.5 est fourni par Vite+).
- **Décisions** : D1–D12 et HL-D1–HL-D12 **proposées, non tranchées** ; plan
  détaillé du lot 0 proposé à Maurice, en attente de son accord.

### Prochaines étapes, par ordre de priorité

0. **Trancher les décisions** qui bloquent les lots 0 et 1 : D2, D3 (et ses
   sous-questions), D8, HL-D1, HL-D8, HL-D9, HL-D10, HL-D12, DA1–DA9 ; pour le
   lot 1 : D1 (liste des matières phares). D11 avant de clore le lot 0 (HTTPS).
1. **Prérequis du lot 0** : `git init` + `.gitignore` corrigé + commit de l'état
   du kit ; création de la base `g_etudie` (et `g_etudie_test` si DA3) ;
   `APP_LOCALE=fr`.
2. **Lot 0 — Socle**, dans cet ordre, un commit et un point de contrôle par
   étape : design system Ardoise et page `/dev/composants` (4 gabarits × 2
   thèmes) → garde-fous Inertia → quatre habillages → authentification par
   téléphone et « Mon compte » → rôles, permissions, `AccesParRoleTest` → socle
   hors ligne HL0.
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
| Base de données | MySQL | MySQL `g_etudie` (`.env`) | base à créer |
| Langue / fuseau | français | `APP_LOCALE=en`, `faker en_US`, fuseau `UTC` | passer en `fr` / `fr_FR` ; UTC conservé en base (Conakry = UTC+0, sans heure d'été) |
| Outillage dev | — | laravel/boost 2.10.4 (MCP + skills), laravel/mcp 1.1.2, laravel/pail 1.2.7, laravel/pao 1.1.5, laravel/chisel 0.1.1, laravel/sail 1.69.0, laravel/tinker 3.0.2, laravel/pint, larastan/larastan 3.13.2 (niveau 7) | — |

### Interface

| Couche | Prévu | Installé | Écart / décision |
|---|---|---|---|
| React | React | **react / react-dom 19.3.1**, React Compiler (`babel-plugin-react-compiler` 1.0.0) | — |
| Inertia (client) | Inertia | **@inertiajs/react 3.9.1**, @inertiajs/vite 3.9.1 | le plugin Vite résout les pages lui-même : un `resolve` maison sera nécessaire pour rattraper l'échec d'import (`HORS_LIGNE.md` A.3.3) |
| Langage | `.js` / `.jsx` (textes de `CLAUDE.md`, `HORS_LIGNE.md`) | **TypeScript 5.9.3** (`.ts` / `.tsx`, `tsc --noEmit` en CI) | DA1 : conserver TypeScript |
| CSS | Tailwind (+ `tailwind.config`) | **tailwindcss 4.3.3** (`@tailwindcss/vite`), configuration **dans `app.css`** (`@theme`, `@source`), **sans `tailwind.config`** | règle « classes seulement dans le JS/TS » maintenue ; sombre par `@custom-variant dark (&:is(.dark *))` |
| Bundler | Vite | **Vite+ 1.4.0** (`vite` remplacé par `@voidzero-dev/vite-plus-core` 1.4.0, Rolldown 1.2.16), commandes `vp dev / build / check / test`, `vite.config.ts` | `optimizeDeps.include` à vérifier sous Vite+ ; laravel-vite-plugin 3.2.0 |
| Primitives UI | shadcn/Radix + CVA + tailwind-merge | shadcn « new-york » (`components.json`), 13 paquets `@radix-ui/react-*`, class-variance-authority 0.7.1, tailwind-merge 3.7.0, clsx, lucide-react 0.475.0, sonner 2.0.8, input-otp 1.4.2 | dossier `resources/js/components/ui/` en **minuscules et kebab-case** (DESIGN.md dit `Components/ui/`) ; `@radix-ui/react-tabs` absent |
| Polices | Sora, Lexend, KaTeX auto-hébergées | Instrument Sans via l'option `fonts` de laravel-vite-plugin : **téléchargée au build et servie depuis `public/build/assets`** (auto-hébergée) | remplacer par Sora + Lexend (fournisseur `fontsource`, sous-ensembles latin + latin-ext, WOFF2) |
| Formules | KaTeX | absent | `katex` 0.19.1 (types inclus) au lot 0 pour le composant `Formule` |
| Hors ligne | SW maison, Dexie, UUID v7 | absent | `dexie` 4.4.7 au lot 0 ; UUID v7 écrit à la main (`lib/hors-ligne/uuid7.ts`) |
| Graphiques / éditeur | Recharts / TipTap | absents | lots 1 (TipTap) et 6 (Recharts) |

### Tests

| Outil | Prévu | Installé | Remarque |
|---|---|---|---|
| Tests PHP | PHPUnit | **Pest 5.3.4** sur **PHPUnit 13.4.5**, pest-plugin-laravel 5.0.1 | DA2 ; 40 tests du kit, verts |
| Base de test | dédiée | **SQLite en mémoire** (`phpunit.xml`) | dédiée, mais ≠ MySQL de production → DA3 |
| Tests JS | Vitest + fake-indexeddb | **Vitest 5.0.5** (fourni par Vite+), aucun test, pas de script `test:js` | à ajouter : `fake-indexeddb` 6.2.6, `happy-dom`, `@testing-library/react` |
| Bout en bout / visuel | Playwright + axe | **@playwright/test 1.64.1**, **@axe-core/playwright 4.14.0**, navigateurs installés | `playwright.config.ts` et `tests/visuel/` à créer |
| MCP Playwright | `@playwright/mcp` | déclaré dans `.mcp.json` en `@latest` (0.0.83 au 2026-10-30), **opérationnel** | figer la version |
| CI | — | `.github/workflows/tests.yml` : `composer setup` puis `composer ci:check` (oxlint/oxfmt via `vp check`, `tsc`, Pint, Larastan, Pest) | ajouter `test:js` et les tests visuels |

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
| Page `/dev/composants` (catalogue Ardoise) | ⬜ |
| Vitrine | ⬜ |
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
