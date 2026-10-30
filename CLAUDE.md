# CLAUDE.md — Règles de travail sur N'karamögö · G-Étudie

Ce fichier est lu par Claude Code à chaque session. Il dit **comment** on
travaille ici. Le **quoi** est dans `PLAN_NKARAMOGO.md` et `HORS_LIGNE.md`, le
**à quoi ça ressemble** dans `DESIGN.md`, et **où on en est** dans `DEVBOOK.md`.
Ces fichiers sont la seule référence du projet.

---

## 1. Le projet en trois lignes

Plateforme d'apprentissage pour les élèves guinéens en classe d'examen (CEE,
BEPC, Baccalauréat unique SM/SE/SS) : cours, annales corrigées depuis 2010,
exercices, examens blancs, jauge de préparation. Web installable (PWA),
utilisable hors ligne, économe en données. Utilisateurs principaux : **des
mineurs**, sur des Android d'entrée de gamme, avec peu de données.

## 2. Ordre de lecture en début de session

1. `DEVBOOK.md` § 0 « Reprise » — ce qui est fait, ce qui reste, par quoi reprendre.
2. Le lot en cours dans `PLAN_NKARAMOGO.md` § 12, et ses décisions (§ 13).
3. `DESIGN.md` avant de toucher à une interface — **§ 0 « Le niveau d'exigence » d'abord** —
   et la compétence `design-ardoise` (`.claude/skills/design-ardoise/SKILL.md`).
4. `HORS_LIGNE.md` (partie A, et le lot HL lié au lot en cours) avant de toucher
   à un geste élève, au service worker ou au stockage local ; mettre à jour sa
   partie B à la fin du lot.
5. `A_TESTER.md` si le lot ajoute des contrôles manuels.

## 3. Conventions

- **Tout le code en français** : migrations, modèles, contrôleurs, services,
  variables, composants, routes. Exception : `users` / `User` et ce que
  Laravel impose.
- Devise **GNF**, format `100 000 GNF` (espace insécable pour les milliers,
  virgule pour les décimales), produit par **une seule** fonction,
  `formaterGnf()` de `resources/js/lib/utils.ts`, et son équivalent PHP
  `App\Support\Gnf::formater()` — un même jeu d'exemples
  (`tests/fixtures/gnf.json`) les teste tous les deux.
- Stack (versions dans `DEVBOOK.md` § 2) : Laravel 13 + Inertia 3 + React 19 en
  **TypeScript** (`.ts` / `.tsx`) + Tailwind 4 + Vite+ (`vp`) + primitives
  shadcn/Radix + CVA + tailwind-merge ; tests PHP en **Pest**. Quand un document
  du projet cite un fichier `.js` / `.jsx` de `resources/js`, lire `.ts` / `.tsx`
  (seul `resources/service-worker/sw.js` reste en JavaScript). **Avant d'ajouter
  une dépendance, lire `composer.json` et `package.json`** et s'aligner sur les
  versions présentes. Ne jamais monter une version majeure sans le dire et sans
  raison.
- Fichiers d'interface en **minuscules et kebab-case**, comme le kit :
  `resources/js/components/ui/zone-donnee.tsx` exporte `ZoneDonnee`,
  `resources/js/pages/dev/composants.tsx`. Ne jamais mélanger les casses d'un
  dossier (Windows ne voit pas la différence, le serveur Linux si).
- Services métier dans `app/Services`, règles partagées dans `app/Support`.
  **Une règle = une autorité** : si deux endroits répondent à la même question
  (« cet élève peut-il voir ce groupe ? », « quelle est la jauge ? »), c'est un
  bug en devenir. Une route en ligne et une opération hors ligne qui font le même
  geste appellent **la même méthode du même service**.
- Permissions avec `spatie/laravel-permission`. « Une permission dit ce que le
  compte peut faire ; le rattachement (classe, établissement, enfant) dit sur
  quoi. » Les rattachements sont résolus par **une seule** classe,
  `App\Support\Perimetre`.
- **Toute route authentifiée porte un `can:`**, ou figure, avec sa raison, dans
  la constante `OUVERTES_A_TOUS` de `AccesParRoleTest`. Ce test énumère le
  routeur et échoue sur toute route qui n'est ni gardée ni déclarée ; un second
  test échoue sur toute dérogation dont la route n'existe plus. Ajouter une route
  oblige ainsi à décider qui y a droit.
- Policies : **404, pas 403**, sur une ressource hors périmètre (qu'une ressource
  existe n'est pas une information à donner).
- Une fiche de détail est gardée par sa **policy**, pas seulement la liste :
  cacher un lien ne ferme pas une porte.
- Identifiants créés sur l'appareil : **UUID v7** (jamais v4).

## 3 bis. Exigence visuelle — non négociable

Maurice veut un produit **au sommet** : élégant, professionnel, vivant, et
facile. La cible, ce sont **les cinq références qu'il a fournies** (tableaux de
bord « Oliver » et « Eduvo », vitrines « BrightPath » et « DevSkill »),
analysées dans `DESIGN.md` § 0.1 ; la compétence `design-ardoise` en donne la
recette. L'essentiel ne se rediscute pas :

- **Le hors ligne et la faible connexion ne sont jamais une excuse** pour une
  interface pauvre : on économise les images et les bibliothèques, pas le soin.
- **Chaud** : crème, pêche, mandarine `nimba`, encre. Jamais de bleu roi, de
  violet froid, de gris bleuté, ni l'orange pur d'Orange (`#FF7900`).
- **Plein et utile** : un écran montre l'état de l'élève (jauge, série,
  matières, à reprendre). Sans données, il garde sa forme avec des données
  d'exemple marquées `est_exemple` (bandeau), ou un état vide avec une action —
  jamais un rectangle « bientôt » seul.
- **Dosé** : interface 14 px ; titres de carte 15-16 px en 600 ; grands titres
  en contraste 400 / `<strong>` 700 (`titre-contraste`) ; chiffres clés en 700.
- **Coloré par la matière** (`MATIERES[cle]` : tuile, barre, trait), toujours
  avec le nom et l'icône.
- **Jetons seulement** (`app.css`) ; un motif répété devient un composant.
- **Images** : la vitrine a toujours ses illustrations (dessins par défaut
  remplaçables, `config('vitrine.illustrations')`, `DESIGN.md` § 8) ; comme
  photo, uniquement celle que Maurice fournit (personne majeure, autorisation
  écrite), à l'emplacement `config('vitrine.photo_heros')`.
- **Sobre, pas générique** : boutons à 10 px sans halo ni flèche, pas de
  sur-titre en capitales espacées, pas de libellé « A · B · C », un seul
  moment fort par écran.
- Avant de déclarer un écran fini, le poser à côté des références : s'il paraît
  plus pauvre, plus froid ou plus vide, il n'est pas fini.

## 4. Règles techniques — pièges connus

Chacun de ces pièges a déjà coûté des heures sur un projet de même stack. Les
règles ne se rediscutent pas.

### Interface et Inertia

- **Ordre du spread des filtres.** `router.get(url, { recherche, ...filtres })`
  envoie l'ancien terme : `filtres` vient du serveur et contient la valeur
  précédente, qui écrase la saisie. **Toujours `{ ...filtres, recherche }`** :
  `filtres` fournit ce qu'on ne touche pas (tri, page), la page met après ce
  qu'elle contrôle.
- **Props optionnelles (`Inertia::optional()`) : états explicites.** `undefined`
  signifierait à la fois « pas demandé », « en cours » et « échec » ; une requête
  qui échoue laisse alors la prop `undefined`, l'effet ne se redéclenche jamais et
  l'écran tourne sans fin. Chaque prop a un état `chargement` / `echec` / `pret`,
  `onFinish` conclut **toujours**, une réponse 200 sans la prop demandée est un
  échec, et le composant `ZoneDonnee` affiche l'échec avec « Réessayer ». Un test
  vérifie, en en-têtes Inertia réels, que chaque prop optionnelle est livrée sur
  rechargement partiel **et** n'est pas évaluée au chargement complet.
- **Barre de progression maison** (`resources/js/lib/barre-navigation.js`,
  `progress: false` dans `createInertiaApp`). Celle d'Inertia s'arrête à la
  réponse réseau, pas à l'affichage, attend 250 ms avant de paraître, et ne voit
  pas les visites servies par le préchargement. La nôtre : démarre sur
  `inertia:before` (toute visite, cache compris) ; se termine après le signal de
  fin **et** un double `requestAnimationFrame` (le second ne tire qu'une fois la
  page peinte) ; progresse par une animation CSS sur `transform` (jouée par le
  compositeur, elle avance même pendant un gros rendu React) ; n'affiche rien sous
  80 ms ; sur annulation ou erreur, s'efface sans aller à 100 % ; prend la couleur
  de l'accent (`var(--nimba-600)`, `--nimba-300` en sombre), visible en clair comme en sombre.
- **Préchargement au survol** (`prefetch` Inertia) sur les liens de navigation :
  le clic devient immédiat.
- **Échec d'import d'une page après un déploiement** : voir `HORS_LIGNE.md`
  A.3.3 — sans ce traitement, un clic reste sans effet et sans message.
- **`HandleInertiaRequests::version()` renvoie `null` quand `public/hot` existe** :
  en développement, le manifeste Vite n'a rien à voir avec ce que charge le
  navigateur, et un `npm run build` lancé en parallèle ferait repartir chaque
  navigation en 409. En production, la vérification de version reste active.
- **`optimizeDeps.include` dans `vite.config.ts`** pour les dépendances importées
  seulement par des pages chargées à la demande (Recharts, KaTeX, TipTap…) : sinon
  Vite les découvre à la première visite et **recharge l'onglet en pleine
  navigation**.
- **Classes Tailwind uniquement dans des `.ts` / `.tsx`**, écrites en entier
  (jamais `bg-${couleur}-600`), jamais construites dans un enum ou une chaîne
  PHP : le balayage de Tailwind ne les voit pas et elles sont purgées du CSS de
  production (ça marche en développement, pas chez l'élève). Tailwind 4 n'a pas
  de `tailwind.config` : les couleurs vivent dans `@theme` de
  `resources/css/app.css`, les sources balayées s'y déclarent avec `@source`.
- **Mode sombre** : toute teinte de fond de l'accent ou d'un statut s'exprime en
  **opacité** (`bg-nimba-600/[0.12] dark:bg-nimba-500/25`), jamais en nuance
  claire fixe (`bg-nimba-50`), qui reste blanche en sombre sous un texte devenu
  clair — blanc sur blanc.
- **Polices auto-hébergées** : une police distante échoue hors ligne.
  Bricolage Grotesque variable (fichier `opsz`), par Fontsource, importée dans
  `app.css`.
- **Écran qui affiche la date ou l'heure** : figer l'horloge dans sa capture
  (`page.clock.setFixedTime`), sinon la référence change chaque jour.
- **`public/hot` oublié** après un `npm run dev` arrêté : le build semble cassé
  et le service worker se désinstalle. Le vérifier avant toute vérification de
  build.

### Base de données et Eloquent

- **`$fillable` incomplet = valeur perdue en silence.** Un attribut calculé passé
  à `create()` et absent de `$fillable` disparaît sans erreur. Les tests relisent
  **la valeur en base**, pas seulement l'absence d'exception.
- **`whereHas` + `orWhere…` à plat** : le OU s'unit à la condition de jointure et
  le `EXISTS` devient vrai pour toute ligne ayant la relation. Toujours grouper
  les conditions dans une closure.
- **Enum casté passé là où une chaîne est attendue** : utiliser `->value`. Une
  comparaison ou une clé de tableau avec l'objet enum échoue, parfois en 500.
- **Recherche texte** (`App\Support\RechercheTexte`) : chaque mot du terme doit
  apparaître dans au moins une des colonnes ciblées (qui peuvent traverser une
  relation) ; jokers `%` et `_` échappés ; recherche **côté serveur** quand la
  liste est paginée (filtrer la seule page courante affiche « aucun résultat »
  alors qu'il y en a ailleurs).
- **Les permissions et les référentiels ne viennent que des seeders** : un
  déploiement lance `migrate` **puis** `db:seed`. Les seeders sont idempotents
  (`updateOrCreate`) ; les **comptes** sont créés en `firstOrCreate`, pour qu'un
  `db:seed` de déploiement ne réinitialise jamais un mot de passe.
- Les migrations ne sèment rien.

### Tests

- Base de test **dédiée**, jamais la base de développement (`RefreshDatabase` la
  vide) : MySQL `g_etudie_test`, fixée dans `phpunit.xml`. `Tests\TestCase`
  refuse de vider une base dont le nom ne finit pas par `_test`.
- Tests PHP en **Pest** (`php artisan make:test --pest`). Un test qui a besoin
  d'une constante publique (`AccesParRoleTest::OUVERTES_A_TOUS`) s'écrit en
  classe PHPUnit : Pest l'exécute aussi.
- **Un test peut couvrir tout un module et rater sa porte d'entrée** : au moins un
  test passe par l'écran ou la route de configuration réelle, pas seulement par
  des données posées en base.
- **Un décor de test qui ne ressemble pas à la réalité ne protège de rien** : les
  fabriques et le décor commun reproduisent les rattachements réels (un élève a un
  profil, un enseignant a un groupe…).
- Un test qui pose l'en-tête `X-Inertia-Version` doit lui donner une chaîne
  (`?? ''`), jamais `null` : sinon il échoue en 409 seulement sur les machines où
  `npm run dev` tourne.

### Fonction souvent oubliée

- L'utilisateur peut **changer lui-même** son mot de passe et son numéro
  (onglet « Mon compte ») — dès le lot 0. Sinon seul un administrateur peut le
  faire, et un mot de passe communiqué à l'ouverture du compte ne change jamais.

## 5. Le contenu pédagogique — règle stricte

- **Ne jamais inventer** un sujet d'examen, un corrigé « officiel », un
  coefficient, une durée d'épreuve ou un programme. Ces données viennent de
  l'équipe pédagogique et sont saisies dans le back-office.
- Contenu de démonstration : autorisé pour développer, mais marqué
  `est_exemple = true` en base et affiché avec le bandeau « EXEMPLE — contenu
  fictif ». Les seeders de démo le posent systématiquement.
- Noms exacts : **CEE** (pas CEPE), **BEPC**, **Baccalauréat unique**, séries
  **SM, SE, SS**, filière **franco-arabe**.
- Aucun texte copié de manuels ou de sites tiers.

## 6. Vérification visuelle (Playwright) — définition de « vu »

Le serveur MCP Playwright est installé pour ce projet (voir `DEMARRAGE.md`).

Pour **chaque** écran créé ou modifié :
1. Lancer l'application (`php artisan serve` + `npm run dev`, ou le build).
2. Ouvrir l'écran avec Playwright, se connecter avec le compte de démo du rôle
   concerné.
3. Capturer en **360 × 740**, **768 × 1024** et **1366 × 768**, en **clair et
   sombre** (thème forcé par la classe `dark` sur `<html>` ou
   `prefers-color-scheme`).
4. **Regarder** les captures et corriger ce qui ne va pas (débordement, contraste,
   action dominante hors écran, formule non rendue, état vide manquant) **et ce
   qui est lourd ou daté** : texte trop gros ou trop gras, contrôles épais,
   page plate, moitié d'écran vide, surface blanche fixe devenue illisible en
   sombre (lui donner la classe `clair`). Liste complète : compétence
   `design-ardoise`, « Relecture d'une capture ».
5. Lancer l'audit axe (`@axe-core/playwright`) sur l'écran.
6. Enregistrer les captures validées dans `tests/visuel/captures/` et mettre à
   jour `tests/visuel/ecrans.spec.ts` si l'écran est un écran clé.
7. Écrire dans le DEVBOOK ce qui a été vu et corrigé.

Si Playwright n'est pas disponible dans la session : **le dire**, ne pas cocher
la case, et inscrire la vérification dans `A_TESTER.md`.

## 7. Définition de « terminé » pour un point

- Code écrit, **tests** Pest et/ou Vitest qui couvrent le comportement **et**
  le cas d'erreur.
- `php artisan test`, `npm run test:js`, `npm run build` : verts.
- Écrans vus avec Playwright (§ 6).
- `DEVBOOK.md` mis à jour : un point numéroté avec **le constat, la décision,
  la preuve**, et la section 0 « Reprise » rafraîchie.
- `HORS_LIGNE.md` partie B mise à jour si le lot touche au hors ligne.
- Contrôles impossibles ici (vrai téléphone, vraie coupure, vrai paiement)
  inscrits dans `A_TESTER.md`, pas à pas : comment le provoquer, quoi observer,
  quoi relever en cas d'échec.
- Commit avec un message clair en français.

Une case n'est cochée que si c'est **vrai**. Cocher par optimisme rend le
DEVBOOK inutile.

## 8. Manière de travailler avec Maurice

- Répondre et documenter **en français**.
- Avant un lot : un plan court (fichiers touchés, migrations, risques) et les
  questions qui bloquent. Les décisions du plan (§ 13) et de `HORS_LIGNE.md`
  (A.12) qui concernent le lot sont tranchées avant d'écrire du code.
- Signaler un **écart au plan** au moment où il est fait, avec sa raison
  (« Journal des écarts » du DEVBOOK ou de `HORS_LIGNE.md`).
- Quand une demande contredit une règle de sécurité (mineurs, données,
  permissions), le dire et proposer une alternative — ne pas l'appliquer en
  silence, ne pas refuser sans solution.
- Un bug préexistant trouvé en chemin : le corriger si c'est sûr, et le consigner.

## 9. Sécurité et mineurs

- Données minimales (téléphone, prénom, pseudo, classe). Pas de photo de
  profil, pas de date de naissance exacte, pas de géolocalisation.
- Aucune messagerie privée libre entre élèves.
- Rien de personnel envoyé au tuteur IA ; consignes système adaptées aux mineurs.
- Limitation de débit sur connexion, codes SMS, codes d'accès, code local de
  profil, tuteur.
- Paiements : webhooks signés et **idempotents** ; aucun secret dans le dépôt
  (`.env` uniquement).
- Journal des accès sensibles (`journal_acces_plateforme`) : action, auteur,
  cible, IP, agent, horodatage — sans portée par établissement (on trace
  justement ce qui traverse les périmètres).

## 10. Commandes utiles

```bash
php artisan test                 # suite PHP (base de test dédiée)
npm run test:js                  # Vitest
npm run build                    # build de production
npx playwright test              # captures et parcours de bout en bout
npx playwright test --update-snapshots   # après validation visuelle volontaire
```
