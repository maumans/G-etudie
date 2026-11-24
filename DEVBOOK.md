# DEVBOOK : N'karamögö · G-Étudie

## 0. Reprise — où en est le projet (mis à jour le 2026-11-21, lot 14)

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
| `MISE_EN_PRODUCTION.md` | Mettre en ligne et y rester : serveur, `.env`, commandes de chaque déploiement, file d'attente, planificateur, journaux, sauvegardes, et ce que chaque lot demande au déploiement. Complété à chaque lot. |
| `TERRAIN.md` | Lot 14 : organiser un essai avec de vrais élèves — autorisations, matériel, déroulé, fiche de passation, après l'essai, modèle d'autorisation parentale. |
| `A_TESTER.md` | Tous les contrôles manuels en attente (vrais téléphones, coupures réelles, paiements réels). Créé à l'audit (2026-10-30), vide. |
| `DEMARRAGE.md` | Installation de Playwright et premiers messages pour Claude Code. |
| `AGENTS.md` | Consignes Laravel Boost générées par le kit (en anglais). En cas de conflit, `CLAUDE.md` prévaut. |

### État au 2026-11-21 (lot 14 : outils de l'essai faits, critère en attente des essais ; lot 10 : vraie API en attente du crédit)

- **Dépôt git** : `main` porte les lots 0 à 14. Les lots 3 à 14 ont été
  faits **directement sur `main`**, à la demande de Maurice. Dépôt distant
  **privé** `github.com/maumans/G-etudie` (`origin`, branché par Maurice
  après DA6). **Ni les captures de référence ni le dossier ministère ne
  sont dans le dépôt** (point 32 : `.gitignore` complété, historique
  purgé le 2026-11-24 ; sauvegarde de l'ancien historique dans
  `.sauvegardes/`, ignoré).
- **On dit « sujet », plus « annale »** (point 31, décision de Maurice) :
  menus « Sujets », titres « Sujets d'examen », vitrine « Sujets
  corrigés » ; adresses `/eleve/sujets…` et `/contenu/sujets…` (les
  anciennes redirigent). *Annale* ne reste qu'un nom interne du code.
- **Lot 14 : outils faits, critère pas encore tenu** (point 30). Le
  critère — `A_TESTER.md` exécutée sur de vrais téléphones avec de vrais
  élèves — attend **D11** (HTTPS) et les **autorisations écrites** des
  parents et de l'établissement : c'est `TERRAIN.md` qui dit comment
  mener l'essai. Livré pour le rendre mesurable, tout par la file :
  **« Ton avis »** (bilan de séance une fois par semaine, et « Mon
  compte › Appareils »), **« Cet appareil »** (diagnostic lu sur le
  téléphone, hors ligne aussi, envoyé avec un code de six caractères),
  **erreurs captées** sur les appareils (sans rien de personnel), et
  **Console › Terrain** (avis à traiter avec la décision prise, erreurs,
  diagnostics par code, campagnes d'essai). ⚠ **Au déploiement** :
  `migrate`, `db:seed`, et la tâche `terrain:purger` au planificateur
  (`MISE_EN_PRODUCTION.md` § 8, lot 14).
- **Lot 13 fait** (point 29) : **console plateforme** — vue d'ensemble,
  Activité (actifs, rétention à 7 et 30 jours, séances, examens blancs),
  Contenu (couverture, relecture, signalements et leur délai), Revenus
  (paiements, moyens, formules, codes, abonnés), **Impact** (assidus et
  autres : jauge et examens blancs) et son **rapport PDF** (critère :
  `dompdf`, une page A4, journalisé), Journal des accès, Personnel
  (désactiver / réactiver un compte, sessions fermées). Un groupe de
  moins de 10 élèves n'est jamais chiffré. La jauge est désormais
  **relevée chaque dimanche** (`jauges:relever`). ⚠ **Au déploiement** :
  `composer install` (dompdf), `migrate`, `db:seed`, et le planificateur
  porte la nouvelle tâche (`MISE_EN_PRODUCTION.md` § 8, lot 13).
- **Lot 12 fait** (point 28) : **culture générale** (matière
  transversale : tout élève, hors jauge ; question du jour la même pour
  tous, quiz de cinq, carte de partage « Défier mes amis » ; chaque
  question cite sa source), **ressources externes** (liens par notion,
  liste fermée de sites dont YouTube, vérifiés par un autre relecteur,
  dialogue « Tu quittes N'karamögö » avec le poids, dans les packs,
  contrôle hebdomadaire des liens), **communauté encadrée** (fil « Questions
  du groupe » signé du pseudo, filtré à l'envoi, signalement, **masquage en
  un geste** par l'enseignant, masquage provisoire à 3 signalements,
  parole retirée, fil fermé ; **défi du groupe** avec classement opt-in).
  ⚠ **Au déploiement** : `migrate`, `db:seed`, **`packs:generer`**, la
  tâche `ressources:verifier` (lundi), et saisir les **mots interdits** au
  back-office avant d'ouvrir les fils (`MISE_EN_PRODUCTION.md` § 8, lot 12).
- **Lot 11 fait** (point 27) : **trois espaces de plus**. **Parent** : il
  suit ses enfants en lecture seule (temps de révision de la semaine,
  jauge, matières, examens blancs) et **paie leur abonnement** ; le lien
  naît d'un **code de six chiffres que l'élève donne** (« Mon compte ›
  Parents », 24 h, une fois). **Enseignant** : ses groupes (code de
  groupe à annoncer en classe), **les notions faibles de sa classe**
  (critère), qui travaille, les **devoirs** (questions publiées, échéance)
  et qui a rendu. **Établissement** : rapport de préparation par groupe,
  enseignants rattachés, **licences** (places attribuées aux élèves).
  **Console › Établissements** : créer, nommer le gestionnaire (mot de
  passe provisoire montré une fois), accorder une licence. Un devoir **est
  une séance** (réponses par la file). Enseignant et gestionnaire passent
  en **session de 12 h** (personnel). ⚠ **Au déploiement** : `migrate`,
  `db:seed` (`MISE_EN_PRODUCTION.md` § 8, lot 11).
- **Lot 10 fait** (point 26) : **tuteur N'karamögö** — « Explique-moi »
  sous une question ratée, « Je ne comprends pas cette étape » sur chaque
  étape d'un corrigé, « Mon tuteur » (question libre dans une de ses
  matières, conversations, relances). Sonnet 5.5, réponse **en flux** (SSE,
  sans file : écart au PLAN M11), **ancrée** sur la question, la réponse de
  l'élève et le corrigé validé ; quota **3 par jour sans abonnement, 30
  avec** ; cache des premières explications ; refus propres (hors sujet,
  inadapté) écrits par l'équipe ; rien de personnel envoyé. Back-office ›
  Tuteur (journal anonyme, questions les plus expliquées, signalements) et
  Console › Tuteur (coûts). **Sans `ANTHROPIC_API_KEY`, le tuteur est
  simulé** (« EXEMPLE ») : la vraie API est à essayer (`A_TESTER.md`
  § 7 bis). ⚠ **Au déploiement** : `migrate`, `db:seed`,
  `fastcgi_read_timeout 120s` et pas de `text/event-stream` dans
  `gzip_types` (`MISE_EN_PRODUCTION.md` § 8, lot 10) ; fixer une limite de
  dépense sur console.anthropic.com.
- **Lot 9 fait** (point 25) : **abonnements** (Mensuel 15 000 GNF / 1 mois,
  Année scolaire 100 000 GNF / **10 mois**, prix de `config/vitrine.php`),
  **paiement mobile** Orange Money / MTN MoMo derrière une interface
  (`PasserellePaiement`) avec une **passerelle simulée** (faux écran
  d'opérateur, webhook signé envoyé à la vraie route ; refusée en
  production), **codes prépayés** (console : fabriquer, imprimer, remettre,
  désactiver ; élève : « J'ai un code » ; seule l'empreinte est gardée).
  **Ce que l'abonnement ouvre** (`DroitsAbonne`) : corrigés détaillés de
  toutes les annales (la session la plus récente de chaque épreuve reste
  offerte, l'équipe peut en offrir d'autres), examens blancs sans limite
  (deux par mois sinon, décomptés aussi hors ligne), tous les packs ; le
  pack d'un élève gratuit est une **variante « libre »** sans les corrigés
  réservés. Deux appareils par abonnement (HL-D8). **Critère tenu** :
  `PaiementTest` (« webhook rejoué deux fois → un seul abonnement ») et
  `parcours-lot9.spec.ts` (paiement de bout en bout dans le navigateur,
  webhook rejoué deux fois). ⚠ **Au déploiement** : `migrate`, `db:seed`,
  **`php artisan packs:generer`** (variantes), `CODES_ACCES_CLE` dans `.env`
  (à ne **jamais** changer), planificateur (`paiements:verifier`). En
  production, le paiement mobile reste **fermé** tant qu'un vrai
  fournisseur n'est pas branché : seuls les codes ouvrent un abonnement
  (`MISE_EN_PRODUCTION.md` § 8, lot 9).
- **Lot 8 fait** (point 22) : **vitrine finale** — question jouable sans
  compte (indices, verdict, corrigé pas à pas, rien d'envoyé), compte à
  rebours sur les dates **saisies** par l'équipe, « annales en accès
  libre », **tarifs en GNF** (Gratuit ; Mensuel 15 000 GNF ; Année
  scolaire 100 000 GNF, prix proposés par Claude à la demande de Maurice,
  modifiables dans `config/vitrine.php` / `.env`), partenaires réels
  seulement, bouton « Installer » ; **annales publiques** `/sujets` et
  `/sujets/{slug}` (énoncé visible, corrigé réservé aux inscrits ; public
  **seulement si les droits de publication sont saisis**, D5) ;
  **référencement** dans le HTML du serveur (titre, description,
  canonique, Open Graph, JSON-LD), `sitemap.xml`, `robots.txt` ; **cartes
  de partage WhatsApp** dessinées par GD. **Rendu serveur (SSR) de la
  vitrine** (point 23, accord de Maurice le 2026-11-07) : **Lighthouse
  mobile sur l'accueil : performance 92 (91, 93, 92), accessibilité 100,
  SEO 100 — critère ≥ 90 tenu** (mesure locale dans les conditions de
  production ; PageSpeed sur le vrai domaine après D11). En production :
  un programme Supervisor de plus (`nkaramogo-ssr`) et `npm run build:ssr`
  (`MISE_EN_PRODUCTION.md` § 4.3 et § 5).
- **Lot 7 fait** (point 21) : **packs** (HL5) — une matière se télécharge
  (« Téléchargements », poids affiché avant), par morceaux, reprise après
  coupure, mise à jour **différentielle** ; hors ligne, sa page, ses
  leçons, ses fiches et ses annales s'ouvrent **depuis le pack**, même
  jamais ouvertes en ligne, et « M'entraîner » ouvre l'une de ses **trois
  séances préparées** ; droits HL-D3 (un pack gratuit ; abonnés au lot 9).
  **Profils multiples** (HL6) — « Qui révise ? », code local à 4 chiffres,
  jeton de profil (changer de profil sans mot de passe, réponses de chaque
  profil au bon nom), « Ordinateur partagé », « Mon compte › Appareils ».
  **Budgets** (HL7) mesurés par `budgets.spec.ts` (coquille 272 Ko). **Critère
  tenu** : `parcours-lot7.spec.ts` (mode avion, séance complète,
  rechargement, retour du réseau → un seul envoi). ⚠ **Au déploiement :
  `php artisan packs:generer`** après `migrate` et `db:seed`, et le
  planificateur (`schedule:run`) pour la regénération de nuit ; un
  `queue:work` pour les regénérations à la publication. Tout est dans
  **`MISE_EN_PRODUCTION.md`** (§ 8, lot 7).
- **Lot 6 fait** (point 20) : **maîtrise par notion** (scores récents
  pondérés, confiance à 3 réponses), **révision espacée** (1, 3, 7, 14,
  30 jours), **jauge** par matière pondérée par les coefficients saisis,
  **séance du jour** choisie par la maîtrise (révisions dues d'abord),
  **motivation** : série au jour du geste avec un jour de grâce par
  semaine, points d'effort et niveaux, 12 badges, défi de la semaine ;
  écran **« Ma progression »** et matière filtrée « À travailler ».
  Autorités : `MaitriseService`, `MotivationService`, `SeanceService`.
  **HL4 fait** : dernière jauge du serveur + « N réponses pas encore
  comptées », trois séances préparées faites hors ligne
  (`GET /eleve/instantane`), trace complétée sur l'appareil. **Critère
  tenu** : `JaugeScenarioTest` rejoue `tests/fixtures/scenario-jauge.json`
  (valeurs calculées à la main) par la file, et dans le désordre.
  ⚠ **Au déploiement : `php artisan progression:recalculer`** une fois,
  après `migrate` et `db:seed`.
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
- **Tests (lot 14)** : **734 Pest, 428 Vitest**, verts (point 30) ;
  Playwright : `ecrans-lot14.spec.ts` (32 captures) et la passe complète
  sur le build (point 30). Captures sur ce poste : `PLAYWRIGHT_PORT=8010`,
  `--workers=1`, sans `npm run dev`. Pour regarder un écran **sans les
  masques** des valeurs variables : `REVUE=<dossier>` avec
  `ecrans-lot14.spec.ts`.
- **Tests (lot 12)** : **695 Pest, 414 Vitest, 709 Playwright**, verts
  (point 28). MySQL de Laragon à relancer après un redémarrage du poste
  (`D:\Applications\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqld.exe
  --defaults-file=…\my.ini`) : sans lui, file et captures échouent.
- **Tests (lot 10)** : **620 Pest, 399 Vitest** ; Playwright : 30 écrans
  et 2 parcours de plus (572 en tout), verts sur les lots relancés (point
  26). MySQL de Laragon à redémarrer s'il s'est arrêté (`mysqld.exe
  --defaults-file=…/my.ini`). ⚠ **Une clé de l'API est dans `.env`**
  (2026-11-13) : en développement, le tuteur et l'import des annales
  appellent la vraie API (facturée). Les tests PHP et le serveur que lance
  Playwright restent simulés ; pour les parcours, arrêter tout `php artisan
  serve` déjà ouvert sur le port (il garderait le mode réel) et lancer la
  file avec `ANNALES_EXTRACTEUR=simule php artisan queue:work` (parcours du
  lot 4).
- **Tests (lot 9)** : **587 Pest, 399 Vitest, 540 Playwright**, verts (point 25). Playwright sur ce poste : `PLAYWRIGHT_PORT=8010` (le 8000 est pris par un autre projet), `--workers=1`, sans `npm run dev`, **avec `php artisan queue:work`** (parcours du lot 4). Les tests ne touchent plus au disque `local` de développement (horloge des captures).
- **Tests (lot 7)** : **511 Pest, 341 Vitest, 479 Playwright** (écrans des lots 0 à 7, 5 connexions, 7 parcours, socle hors ligne, 3 budgets ; captures sur le build). Dernier passage complet : 478 / 479 — le parcours « deux profils » a échoué une fois (course de session, voir « Pièges ») ; corrigé, puis 8 passages verts de suite. `tsc`, `vp check`, Pint, Larastan niveau 7 et `npm run build` passent. Sur ce poste, lancer
  Playwright en série (`--workers=1`) et sans `npm run dev`.
- **Tests (lot 6)** : 482 Pest (MySQL `g_etudie_test`, rôles et badges semés une
  fois par `TestCase`, `SocleSeeder`), 322 Vitest, Playwright (sessions par
  compte, écrans des lots 0 à 6, parcours d'inscription, parcours des
  critères des lots 1, 2, 4 et 5, séance en mode avion du lot 3, socle hors
  ligne ; 444 tests) — verts. Sur ce poste, lancer les captures en série
  (`--workers=1`) et sans `npm run dev`. `tsc`,
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
- **Espaces** (lot 11) : élève, parent (02 Mamadou, suit Aïssatou),
  enseignante (03 Fatoumata, groupe 10e A, code `KAFE47`), gestionnaire
  (07 Mariama, Collège exemple de Ratoma), back-office, console. Cinq
  élèves d'exemple (`DemoOrganisationSeeder::ELEVES_EXEMPLE`, +224 600 00
  01 01 à 05, **sans mot de passe utilisable**) peuplent la 10e A.
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
   « Sujets », le sujet BEPC 2022 en brouillon : comparer au document,
   « J'ai vérifié », envoyer ; « Importer un sujet » ; 05 relectrice ou
   06 responsable pédagogique : « Relecture › Sujets », « Signalements »),
   puis côté élève (01 Aïssatou : « Sujets », BEPC 2024 en lecture et en
   entraînement, « Exercices par chapitre », « Signaler une erreur »).
4. **Équipe pédagogique** : saisir la **date de la prochaine session** de
   chaque examen (Référentiel › Épreuves) pour le compte à rebours ; **la
   convention D5** avant toute publication publique des annales (le champ
   « Droits de publication » de chaque annale l'attend).
5. **Maurice : essayer le lot 6** — 01 Aïssatou : l'accueil (jauge,
   série sur deux semaines, défi, réussites), « Ma progression », toucher
   un segment de la jauge (matière « À travailler »), « Commencer » ;
   relire les badges et leurs points dans `database/seeders/BadgeSeeder.php`
   (à changer librement). 09 Ousmane : « Ma progression » avant tout
   exercice.
6. **Maurice : essayer le lot 5** — 01 Aïssatou : une annale, « Conditions
   réelles », commencer, répondre, fermer l'onglet, rouvrir (l'accueil
   annonce l'examen), terminer ; « Examens blancs ». Équipe : saisir la
   **moyenne d'admission** de chaque examen (Référentiel › Épreuves) pour
   le verdict.
7. **Maurice : essayer le lot 7** — 01 Aïssatou : « Téléchargements »,
   télécharger les Mathématiques (les autres matières disent « Avec
   l'abonnement ») ; couper le réseau (mode avion du navigateur) : ouvrir
   la matière, une leçon, une annale, « M'entraîner » ; revenir en ligne.
   Puis la pastille du profil → « Qui révise ? » → choisir un code ;
   « Ajouter un profil » → se connecter avec 09 Ousmane ; repasser à
   Aïssatou par son code. Sur un vrai téléphone : `A_TESTER.md` (lot 7),
   après D11.
8. **Maurice : fournisseur de paiement** — choisir Orange Money et MTN
   MoMo en direct, ou un agrégateur qui couvre les deux ; ouvrir le compte
   marchand, obtenir la documentation et des **clés de test** : Claude Code
   écrit alors le pilote (`PasserellePaiement`) en une séance. Puis
   `A_TESTER.md` § 7 (après D11).
9. **Maurice : essayer le lot 9** — 01 Aïssatou (gratuite) : « Abonnement »
   (barre latérale, ou « Qui révise ? » sur mobile), « Payer par mobile
   money » › Orange Money › un numéro › « Payer » › « Ouvrir l'écran de
   l'opérateur » › « Valider » (**simulation**) ; avant cela, l'annale BEPC
   2023 (corrigé réservé) et « Conditions réelles » (il lui reste un examen
   blanc gratuit ce mois). 09 Ousmane : abonné. 08 Sékou : Console › Codes
   prépayés (lot d'exemple, imprimer, « Codes remis ») et Paiements.
   ⚠ Après l'essai, Aïssatou est abonnée : `php artisan migrate:fresh
   --seed` remet la démonstration à zéro.
10. **Maurice : essayer le lot 10** — 01 Aïssatou : une séance, répondre
   faux, « Explique-moi », puis « Encore plus simple » ; sur l'annale BEPC
   2024 (lecture, « Voir le corrigé »), « Je ne comprends pas cette
   étape » ; « Mon tuteur » (barre latérale, ou la carte de l'accueil) : une
   question libre, puis une question sur le football (recentrage). 06 :
   Back-office › Tuteur. 08 : Console › Tuteur. Avec une clé de l'API :
   `A_TESTER.md` § 7 bis.
10 bis. **Maurice : essayer le lot 11** — 03 Fatoumata : « Mes groupes »
   › 10e A (notions à retravailler, élèves, code), « Donner un devoir »
   (choisir 3 questions, échéance), puis le devoir « Le théorème de
   Pythagore » (3 rendus sur 6). 01 Aïssatou : accueil › « Mes devoirs »
   › « Commencer », répondre, « Devoir rendu » ; « Moi › Parents » ›
   « Créer un code ». 02 Mamadou : la fiche d'Aïssatou, « Payer son
   abonnement » (simulation) ; « Suivre un autre enfant » avec le code.
   07 Mariama : le rapport, « Licences » › « Attribuer ». 08 Sékou :
   Console › Établissements.
10 ter. **Maurice : essayer le lot 12** — 01 Aïssatou : accueil › « La
   question du jour » ; « Culture générale » (barre latérale) › « Lancer un
   quiz », puis « Défier mes amis » ; la leçon « Le théorème de Pythagore »
   › « Pour aller plus loin » (dialogue de sortie) ; « Mes groupes » ›
   « Questions du groupe 10e A » : poser une question, en signaler une ;
   cocher « Paraître au classement ». 03 Fatoumata : 10e A › « Questions de
   la classe » (le message signalé, « Masquer ») ; « Donner un devoir » ›
   « C'est un défi du groupe » ; le « Défi du vendredi ». 04 rédacteur :
   Back-office › Ressources › « Proposer une ressource » ; 05 relectrice :
   « Vérifiée ». 06 : Back-office › Modération (mots refusés).
10 quater. **Maurice : essayer le lot 13** — 08 Sékou : Console › Vue
   d'ensemble, puis Activité, Contenu, Revenus ; Impact : changer la
   période, choisir « BEPC » puis le « Collège exemple de Ratoma »
   (sous 10 élèves, les chiffres disparaissent : c'est voulu) ;
   « Télécharger le rapport (PDF) » et l'ouvrir ; Journal des accès
   (l'export y figure) ; Personnel : désactiver 04 Ibrahima, essayer de
   se connecter avec lui (refusé), le réactiver. Relire la **définition de
   l'assidu** et le **seuil de 10** (point 29) ; dire si un partenaire
   (école, ONG) doit avoir son propre accès à l'impact.
10 quinquies. **Maurice : essayer le lot 14** — 01 Aïssatou : « Moi ›
   Appareils » : « Cet appareil », « Envoyer ce diagnostic » (noter le
   code), « Donner mon avis » ; finir une séance du jour : la carte « Cette
   séance t'a aidé ? » (une fois par semaine). 08 Sékou : Console ›
   Terrain, la campagne « Essai d'exemple — Ratoma », « Traiter » un avis
   avec une décision ; onglet « Diagnostics », chercher le code noté.
   Puis **préparer le premier essai** avec `TERRAIN.md` : établissement,
   lettre aux parents (à faire relire par un juriste, D9), téléphones —
   **après D11**. Les résultats des fiches reviennent à Claude Code
   (`A_TESTER.md` § 9, puis les corrections du lot 14 bis).
11. **Équipe pédagogique** : saisir dans le référentiel le programme
   (chapitres, notions), les coefficients et les durées des matières
   phares ; confirmer la liste des phares.
12. **Hors code, à lancer en parallèle** (sinon l'application sera vide) :
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
| Inertia (client) | Inertia | **@inertiajs/react 3.9.1**, @inertiajs/vite 3.9.1 | le plugin Vite résout les pages lui-même : un `resolve` maison sera nécessaire pour rattraper l'échec d'import (`HORS_LIGNE.md` A.3.3) ; **rendu serveur de la vitrine seulement** (`resources/js/ssr.tsx`, point 23) |
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
| Organisation | `abonnements`, `paiements`, `codes_acces` ✅ lot 9 ; `conversations_tuteur` ✅ lot 10 ; `etablissements`, `liens_parents`, `codes_liaison`, `rattachements_etablissement`, `groupes`, `membres_groupes`, `devoirs`, `devoirs_questions`, `licences_etablissement` ✅ lot 11 | ✅ lots 9 à 11 |
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
| `PlateformeService` | console : activité, contenu, revenus, impact (lot 13, point 29) ; avec `ReleveJaugeService` (relevé du dimanche), `ComptesService` (désactiver un compte du personnel), `RapportImpact` (PDF) | ✅ |

## 5. État d'avancement — frontend

| Habillage / écran | État |
|---|---|
| Page `/dev/composants` (catalogue Ardoise) | ✅ lot 0, étape 1 (point 4) |
| Habillages vitrine, élève, back-office, console (coquilles et pages d'entrée) | ✅ lot 0, étape 3 (point 6) |
| Vitrine finale (question jouable, compte à rebours, annales en accès libre, tarifs, partenaires, installation) ; annales publiques `/sujets` et `/sujets/{slug}` ; partage WhatsApp | ✅ lot 8 (point 22) ; rendu serveur et critère Lighthouse ✅ (point 23) |
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

20. [x] **Lot 6 — progression, maîtrise par notion, révision espacée,
   jauge, motivation ; HL4** (2026-11-05, sur `main`, un commit)
   - **Constat** : la jauge du lot 2 comptait la part des questions
     réussies au moins une fois ; la série était recalculée à chaque
     affichage, sans grâce ; ni maîtrise, ni points, ni badges, ni défis ;
     la séance du jour se choisissait à « Commencer », en ligne seulement.
   - **Décisions** (proposées, acceptées par Maurice le 2026-11-05) :
     - **maîtrise d'une notion** : moyenne des scores des 20 dernières
       réponses, une réponse pesant deux fois moins tous les 14 jours
       (comptés depuis la plus récente), × min(1, réponses / 3) ;
       « maîtrisée » à 80, « fragile » sous 50 ; les indices ne retirent
       rien. Recalculée **depuis toutes les réponses triées par
       `saisi_le`** : l'ordre d'arrivée (hors ligne) ne change rien ;
     - **révision espacée** : 1, 3, 7, 14, 30 jours ; réussir une notion
       due la fait monter d'un palier ; en partie juste → demain ; faux →
       palier 0, demain ; réussir avant la date ne fait pas monter ;
     - **matière** = moyenne de ses notions **évaluables** (au moins une
       question pour l'élève), une notion jamais travaillée compte 0 ;
       **jauge** = matières pondérées par les coefficients s'ils sont tous
       saisis, sinon moyenne simple (règle du lot 2 inchangée) ;
     - **séance du jour** : révisions dues, puis notions commencées pas
       maîtrisées, puis nouvelles, puis le reste ; la matière qui rapporte
       le plus d'abord (coefficient × ce qui manque) ; deux questions par
       notion au plus ; **trois séances préparées d'avance** (HL4) ;
     - **points d'effort** à la réception : 1 par réponse (juste ou non),
       20 par séance, 50 par examen blanc, 30 par défi, + les points des
       badges ; source unique, donc idempotents ; **niveaux** à paliers
       fixes (0, 50, 150, 300, 500…) ;
     - **série** au jour du geste, **un jour de grâce par semaine** (le
       plus récent manqué, s'il est précédé d'un jour fait ; il ne compte
       pas comme un jour fait) ; objectif du soir atteint par une séance
       terminée ou le temps passé ≥ l'objectif ; trace sur deux semaines ;
     - **12 badges** (catalogue `BadgeSeeder`, semé partout — c'est un
       référentiel, modifiable par Maurice) ; règles dans
       `MotivationService::regles()` ;
     - **défi de la semaine** automatique : 2 × les questions d'une séance
       en bonnes réponses, dans la matière qui rapporte le plus ;
     - **« Ma progression »** dans la barre latérale ; sur téléphone, par
       la jauge et ses liens (les cinq onglets du bas ne bougent pas) ;
       toucher un segment ouvre la matière filtrée « À travailler »
       (`?faibles=1`, filtrée par le serveur).
   - **Une autorité par règle** : `MaitriseService` (maîtrise, révision,
     jauge, poids des matières), `MotivationService` (série, points,
     niveaux, badges, défi), `SeanceService` (choix des questions) ;
     `TableauDeBordEleveService` met en forme. `TentativeService`,
     `SeanceService::terminer`, `ProgressionService` et
     `ExamenBlancService` les appellent dans la même transaction que le
     geste — en ligne comme par la file.
   - **Écarts au plan** : séances préparées toutes matières confondues, pas
     « par matière téléchargée » (packs au lot 7, `HORS_LIGNE.md` écart
     n° 23) ; défis seulement automatiques (saisie au back-office plus
     tard) ; pas de classements (V1.1, opt-in).
   - **Ajouts** : migration `2026_11_05_090000_create_progression_tables`
     (`maitrises`, `series_jours`, `points_effort`, `badges`,
     `badges_obtenus`, `defis`, `participations_defis` ; `seances.jour`
     facultatif, `rang`, `remplacee_le`) ; `SocleSeeder` (rôles + badges,
     semé aussi par `Tests\TestCase`) ; commande **`progression:recalculer`**
     (à lancer une fois au déploiement du lot 6 : les réponses des lots 2 à
     5 n'avaient ni maîtrise ni série ; idempotente) ; routes
     `eleve.progression` et `eleve.instantane` (`can:espace.eleve`).
   - **Corrigé en chemin** : quand une séance préparée manquait de
     questions, une question déjà prise par une autre séance passait avant
     une question libre (trouvé par `SeancesPrepareesTest`) ; le résumé
     « maîtrisées » de « Ma progression » comptait une notion due à 82 %
     comme « à revoir » et contredisait la matière (1/6) : compté par score,
     les révisions dues à part ; mes scripts d'édition avaient passé 17
     fichiers en fins de ligne CRLF : remis en LF.
   - **Vu avec Playwright** (`ecrans-lot6.spec.ts`, 3 écrans × 3 tailles ×
     2 thèmes : « Ma progression » d'Aïssatou, celle d'Ousmane qui n'a rien
     fait, la matière « À travailler ») : axe sans violation sérieuse, aucun
     débordement. Captures régénérées volontairement : l'accueil (lots 0 et
     2, série, défi, réussites, notions maîtrisées), la page matière (lot 2,
     maîtrise par notion), l'accueil du premier soir (parcours du lot 2) et
     la séance ouverte du parcours du lot 3 (même question, autre rang : le
     nouvel ordre). Corrigé à la relecture : voir `DESIGN.md` § 13, « Lot
     6 » (contraste du bloc des points, carte qui débordait, titres
     tronqués, page élargie à 1 027 px par un `sr-only`, nom accessible du
     lien « Détail »).
   - **Preuve** : **critère** `JaugeScenarioTest` (scénario écrit, par la
     file, puis dans le désordre) ; `MaitriseCalculTest` 4,
     `SeancesPrepareesTest` 8, `MotivationTest` 6, `EcransProgressionTest` 4,
     `RecalculerProgressionTest` 2 ; Vitest `progression.test.ts` 9 (HL4).
     Totaux : **482 Pest, 322 Vitest, 444 Playwright** (434 écrans,
     5 connexions, 5 parcours ; captures sur le build). `tsc`, `vp check`,
     Pint, Larastan niveau 7 et `npm run build` passent.
   - **Pièges rencontrés** : le parcours du lot 5 passe un examen sur le
     compte d'Aïssatou puis l'efface ; depuis le lot 6, il laissait ses
     points, sa maîtrise et sa série → les captures d'Aïssatou dérivaient
     après chaque passage. Le nettoyage retire désormais ces points et
     relance `progression:recalculer --eleve`, qui recalcule aussi les
     notions dont toutes les réponses ont disparu. Sur ce poste, le serveur
     `php artisan serve` tombe sous la charge de connexions parallèles
     (connexions de démo au-delà de 30 s) : les captures passent en série
     (`--workers=1`). `hors-ligne.spec.ts` échoue tant que `npm run dev`
     tourne (`public/hot` : le service worker se retire, voulu) ; il passe
     sur le build.
   - **Reste** : séance préparée faite en mode avion sur un vrai téléphone
     et série sur une vraie semaine (`A_TESTER.md`, lot 6) ; trois séances
     par matière téléchargée (lot 7) ; défis saisis par l'équipe et
     classements opt-in (V1.1).

21. [x] **Lot 7 — hors ligne complet : packs (HL5), profils multiples
   (HL6), budgets (HL7)** (2026-11-06, sur `main`, un commit)
   - **Constat** : le hors ligne gardait les écrans déjà ouverts et trois
     séances préparées ; rien ne se téléchargeait (la table `contenus`
     n'était remplie que par les séances), un seul profil par téléphone
     (les gestes d'un autre profil restaient `reporte`, écart HL n° 9), pas
     de connexion « ordinateur partagé », budgets jamais mesurés par un test.
   - **Décisions** (proposées, acceptées par Maurice le 2026-11-06) :
     - **droits aux packs avant le lot 9** : HL-D3 tel quel — un pack
       gratuit au choix, qu'on échange en supprimant le sien ; la règle
       « abonné = tous les packs de son examen, expiration fin + 7 jours »
       est écrite et testée, active au lot 9 (`SourceAbonnements`) ;
     - **réponses des profils non actifs** : elles partent au retour du
       réseau avec le **jeton de profil** de leur auteur (vérifié par le
       serveur, `enTantQue`) — lève l'écart HL n° 9 ;
     - **ordinateur partagé** : case à la connexion, rien n'est gardé
       (session jusqu'à la fermeture du navigateur, ni profil, ni pack, ni
       copie).
   - **Une autorité par règle** : `PackService` (ce que contient un pack,
     composé pour un profil fictif : aucune donnée personnelle) ;
     `DroitsPacks` (qui prend, qui met à jour, expiration) ;
     `AppareilService` (jetons de profil) ; `PresentationCours` (props des
     écrans de cours, pour la route **et** le pack — extrait de
     `CoursController` et `LeconController`). Côté appareil :
     `lib/hors-ligne/packs.ts`, `lib/hors-ligne/profils.ts`,
     `lib/contenu/source.ts` (lecture depuis le pack). Détail : `HORS_LIGNE.md`
     B.3 « HL5 », « HL6 », « HL7 ».
   - **Écrans** : « Téléchargements » (`/eleve/telechargements`, barre
     latérale et « Qui révise ? ») ; « Qui révise ? » (pastille du profil) ;
     connexion « Déjà sur ce téléphone » et « Ordinateur partagé » ; « Mon
     compte › Appareils » ; page d'une matière : invitation au pack et
     annales. `DESIGN.md` § 13, « Lot 7 ».
   - **Écarts** : `HORS_LIGNE.md` n° 24 à 29 — pas encore de médias (aucun
     bloc image) ; la fiche cite ses leçons ; packs en base (JSON brut) et
     poids compressé ; jeton de profil ; coquille servie pour un écran
     jamais copié ; événement `offline` du navigateur.
   - **Ajouts** : migration `2026_11_06_090000_create_packs_tables`
     (`packs`, `pack_elements`, `packs_eleves`, `seances.matiere_id`,
     `appareil_profils.jeton_profil_hache` / `jeton_utilise_le` /
     `retire_le`) ; commande **`packs:generer`** (à lancer au déploiement
     après `migrate` et `db:seed`, puis chaque nuit à 3 h par le
     planificateur ; `DemoSeeder` la lance aussi) ; file `GenererPack`
     (regénère les packs d'une matière à chaque publication, retrait ou
     correction) ; routes `eleve.telechargements`, `eleve.packs.*`
     (`can:espace.eleve`), `compte.appareils.*` et
     `appareil.profils.retirer` (dérogations motivées dans
     `AccesParRoleTest`), `appareil.profils.basculer` (sans session,
     `throttle:basculer-profil`) ; middleware `OrdinateurPartage` ; journal
     `profil.bascule`, `appareil.retire`.
   - **Corrigé en chemin** : `PackService` laissait passer un champ de
     travail (`est_exemple`) dans l'INSERT des éléments — invisible en
     test, cassé sous `db:seed` (un seeder lève la protection `$fillable`,
     trouvé par `SeederDemonstrationTest`) ; une page lue dans la base
     locale, ou un retour arrière vers une page servie d'après sa copie,
     faisait croire l'application en ligne ; juste après une coupure,
     « Commencer » partait vers le serveur au lieu d'ouvrir la séance
     gardée ; le battement présentait le jeton du profil actif au lieu de
     celui de la session (le serveur en remettait un neuf, rangé sous le
     mauvais profil) ; une visite Inertia ne trouvait pas la copie d'un
     écran ouvert comme document ; le bandeau de copie datée ne s'affichait
     plus après un rechargement hors ligne (trouvé par `hors-ligne.spec.ts`,
     effet de bord de la détection `offline`) ; les scripts d'édition avaient remis des
     fins de ligne CRLF dans 40 fichiers : remis en LF ; un fichier
     (`pages/eleve/cours.tsx`) n'était pas au format du projet depuis le
     dossier ministère : reformaté.
   - **Vu avec Playwright** : `ecrans-lot7.spec.ts` (Téléchargements,
     matière avec son pack, « Qui révise ? », Appareils, connexion avec deux
     profils ; 3 tailles × 2 thèmes) — axe sans violation sérieuse, aucun
     débordement ; corrections : `DESIGN.md` § 13, « Lot 7 ». Captures
     régénérées volontairement, après relecture des écarts : la
     connexion (lot 0, case « Ordinateur partagé ») ; l'accueil élève et
     « Mon compte » (lot 0 : entrée « Téléchargements » de la barre latérale,
     pastille du profil devenue bouton avec chevron, onglet « Appareils ») ;
     la page d'une matière (lots 2 et 6 : invitation au pack, annales) ;
     « Ma progression » (lot 6 : barre latérale, et la série, le défi et
     les dates relatives que le serveur calcule à sa vraie date — ces
     références dérivent d'un jour à l'autre, déjà au lot 6).
   - **Preuve** : **critère** `parcours-lot7.spec.ts` — un élève neuf
     télécharge les Mathématiques ; **en mode avion**, la matière, une
     leçon, une fiche et une annale **jamais ouvertes en ligne** s'ouvrent
     depuis le pack, la leçon **rechargée** hors ligne se rouvre, une séance
     de la matière se fait jusqu'au bilan, rechargement ; **retour du
     réseau → chaque geste reçu une fois, tous acceptés**. Second parcours :
     deux profils sur un téléphone, chacun répond hors ligne, changement de
     profil par le code sans réseau ; au retour, chaque réponse au nom de
     son auteur, la session suit le profil choisi. Pest `PacksTest` (16 :
     A.14 n° 8 et 9), `ProfilsAppareilTest` (15) ; Vitest `packs.test.ts`
     (12 : n° 22 et 23), `profils.test.ts` (5), `moteur.test.ts` (+1),
     `gnf.test.ts` (+1) ; budgets `budgets.spec.ts` (A.14 n° 25, chiffres
     dans `HORS_LIGNE.md` B.4). Totaux : **511 Pest, 341 Vitest, 479 Playwright** (écrans des lots 0 à 7, 5 connexions, 7 parcours, socle hors ligne, 3 budgets ; captures sur le build). Dernier passage complet : 478 / 479 — le parcours « deux profils » a échoué une fois (course de session, voir « Pièges ») ; corrigé, puis 8 passages verts de suite. `tsc`, `vp check`, Pint, Larastan niveau 7 et `npm run build` passent.
   - **Pièges rencontrés** : `page.waitForFunction` avec une fonction
     asynchrone n'attend pas (la promesse est « vraie ») : `expect.poll`. Un
     parcours lancé par son nom de fichier relance d'abord toutes les
     captures (projets Playwright dépendants) : `--no-deps` pour le rejouer
     seul. Chaque contexte Playwright enregistre un appareil pour Aïssatou
     (des milliers) : « Appareils » n'en montre que dix. Le parcours du
     lot 4 demande un `php artisan queue:work` (import assisté), et les
     regénérations de packs aussi. **Course de session** : changer de
     profil régénère la session ; une requête partie avant, avec l'ancien
     cookie, pouvait revenir avec un cookie vide et déconnecter le
     téléphone. Les requêtes de l'application attendent désormais la fin
     d'un changement de profil (et lui, que celles en vol reviennent), et
     un écran de lecture n'est rechargé qu'après ; reste le cas d'un clic
     de l'élève exactement pendant ce changement (il arrive alors sur la
     connexion, où son profil se rouvre par son code) — `HORS_LIGNE.md`
     B.6, à observer sur vrai téléphone.
   - **Reste** : vrais téléphones (`A_TESTER.md` : pack interrompu sur
     réseau faible, deux profils en mode avion, code et ordinateur partagé,
     iPhone sept jours) — bloqués par D11 ; médias des packs avec le premier
     bloc image ; limite de deux appareils d'un compte payant (lot 9).

22. [x] **Lot 8 — vitrine finale, annales publiques (SEO), cartes de
   partage WhatsApp, installation** (2026-11-07, sur `main`, un commit) —
   **critère Lighthouse « performance ≥ 90 » non atteint** (voir « Reste »)
   - **Constat** : la vitrine du lot 0 n'avait ni démonstration jouable, ni
     compte à rebours, ni tarifs, ni annales publiques ; aucune balise de
     référencement ni de partage (WhatsApp ne lit pas le JavaScript : une
     carte de lien doit être dans le HTML du serveur) ; Lighthouse mobile
     sur l'accueil, dans les conditions de production (gzip, cache, OPcache),
     donnait **performance 78, accessibilité 100, SEO 92**.
   - **Décisions** (Maurice, 2026-11-06) : **D5 tenu** — une annale
     officielle n'est publique que si son champ « Droits de publication »
     est rempli ; un sujet maison l'est ; un sujet d'exemple est visible
     mais jamais indexé. **Tarifs** : fixés par Claude, modifiables à tout
     moment (`config/vitrine.php`, `TARIF_MENSUEL_GNF`, `TARIF_ANNEE_GNF`) —
     Gratuit ; Mensuel 15 000 GNF (le prix d'environ 1,5 Go de données) ;
     Année scolaire 100 000 GNF (10 mois, soit 10 000 GNF par mois, 33 %
     d'économie). **Dépendance `lighthouse` (dev) ajoutée**. **SSR : me
     demander d'abord** (demande faite à la fin du lot).
   - **Une autorité par règle** : `AnnalesPubliques` (qui est public, ce
     qui sort : l'énoncé sans `attendue`, indices, corrigé ni barème) ;
     `CatalogueEleve::sujetEnLigne` (devenue publique, partagée) ; `Seo`
     (balises, `indexationPermise` lue par la balise robots **et**
     `robots.txt`) ; `QuestionDemonstration` (question choisie
     `VITRINE_QUESTION_DEMO`, sinon l'exemple marqué) ;
     `ImagesVitrine::partenaires` ; `ImagePartageService` ; côté appareil
     `lib/vitrine.ts`, `lib/habillages.ts` (miroir PHP
     `App\Support\Habillages`, jeu d'exemples `tests/fixtures/habillages.json`).
   - **Écrans** : vitrine (question jouable et compte à rebours, annales en
     accès libre, tarifs, partenaires, installation, navigation « Annales »
     et « Tarifs ») ; `/sujets` (filtres par examen et matière, côté
     serveur) ; `/sujets/{slug}` (énoncé par partie, corrigé réservé,
     colonne « Le corrigé, étape par étape », partage WhatsApp, autres
     sessions). `DESIGN.md` § 13, « Lot 8 ». Composant
     `components/installation.tsx` extrait de « Mon compte › Affichage ».
   - **Performance** (mesures : `tests/lighthouse/mesurer.mjs`, relais
     `relais-production.mjs` qui imite Nginx) : habillages chargés **avec
     leur page** au lieu du paquet de démarrage (écart HL n° 31 : 91 + 116 Ko
     → 63 Ko compressés + React) ; illustration du héros **préchargée** par
     le document ; sections sous la ligne de flottaison en
     `content-visibility: auto` (calcul des styles et mise en page ÷ 2) et
     rendues par React juste après le héros ; question jouable (moteur et
     KaTeX) chargée à l'approche. Résultat : **performance ~81** (73 à 83),
     **accessibilité 100**, **SEO 100**. Essais écartés, mesurés : WebP du
     héros au lieu du SVG (aucun gain), SVG sans grain (aucun gain),
     préchargement de la police (pire). Ce qui reste : sans rendu serveur,
     l'illustration du héros — l'élément le plus grand — attend que React
     construise la page (bloquer l'illustration donne 90 : c'est le seul
     obstacle) ; et le décodage de la police variable (~0,5 s de fil
     principal à ×4).
   - **Écarts** : `HORS_LIGNE.md` n° 30 (question de la vitrine hors de
     la file : un visiteur n'est pas un élève) et n° 31 (habillages chargés
     à la demande, même rattrapage d'échec d'import). Placement : la
     question jouable est **sous** le héros, pas dedans (PLAN M1 dit
     « héros ») — le héros garde son seul moment fort (`DESIGN.md` § 4),
     et la question n'est chargée qu'à l'approche.
   - **Ajouts** : migration `2026_11_07_090000_add_slug_to_sujets_table`
     (adresse publique stable, `-2` si prise ; les sujets présents reçoivent
     la leur) ; routes publiques `vitrine.sujets.index`,
     `vitrine.sujets.show`, `plan-site`, `robots`, `partage.image.*` ;
     `public/robots.txt` supprimé (servi par Laravel) ; polices TTF
     statiques `resources/fonts/` (instances 400 et 700 tirées de la
     police variable, licence OFL jointe) pour GD ; `config/vitrine.php` :
     `tarifs`, `partenaires`, `question_demo`, `indexer`
     (`VITRINE_INDEXER=false` en préproduction) ; script
     `npm run test:lighthouse`. `MISE_EN_PRODUCTION.md` § 2, § 8 « Lot 8 »,
     § 9.
   - **Corrigé en chemin** : FreeType (Windows) n'ouvre pas un chemin non
     ASCII — le dossier du projet (« N’KARAMÖGÖ ») : la police est copiée
     dans le dossier temporaire ; la première mesure Lighthouse derrière le
     relais était **fausse** (98 : les fichiers du build, en adresse
     absolue vers l'autre port, ne chargeaient pas — seul le HTML était
     mesuré) : le relais garde l'hôte d'origine.
   - **Vu avec Playwright** : `ecrans-lot8.spec.ts` — accueil complet,
     question jouée (verdict et corrigé), liste des annales, sujet public ;
     360, 768 et 1366 × clair et sombre ; axe sans violation sérieuse,
     aucun débordement. Corrigé : contraste du prix par mois sur la teinte
     mandarine (`ink-500` → `ink-600`) ; capture pleine page qui laissait
     blanches les sections `rendu-differe` (la capture force leur rendu).
     Plus : « Tarifs » depuis `/sujets` mène à la section ; la question
     jouable ne met rien dans la file (`operations` vide). Captures
     `vitrine-accueil` du lot 0 retirées (remplacées par celles du lot 8).
   - **Preuve** : Pest `AnnalesPubliquesTest` (11 : D5 par la vraie porte du
     back-office, aucune fuite du corrigé dans le HTML, exemple jamais
     indexé, maison public, archivé fermé, balises dans le HTML, image
     1200 × 630 non redessinée, filtres serveur, robots et préproduction),
     `VitrineFinaleTest` (10 : compte à rebours sur dates saisies et à
     venir, question choisie ou exemple, tarifs, partenaires, balises,
     habillages) ; Vitest `vitrine.test.tsx` (18 : habillages sur la
     fixture, jours restants, date, prix par mois, économie, lien
     WhatsApp, rendu du compte à rebours), `chargement-page.test.ts`
     adapté. Totaux : **532 Pest, 359 Vitest, 497 Playwright : 476 passés, 16 captures en écart, 5 parcours non lancés (ils dépendent des captures) — détail dans « Reste »**. `tsc`,
     `vp check`, Pint, Larastan niveau 7 et `npm run build` passent.
   - **Reste** : ~~critère Lighthouse performance ≥ 90~~ — tenu par le
     rendu serveur (point 23). Puis : mesure PageSpeed sur le vrai domaine, carte
     WhatsApp et installation sur vrais téléphones (`A_TESTER.md`, lot 8,
     bloqués par D11). **Passage Playwright complet du 2026-11-07** : les
     16 écarts sont (1) la liste des annales du back-office à 360 px
     (2 captures) : la migration des adresses publiques avait d'abord
     rempli `slug` par Eloquent, qui touche `updated_at` — la liste trie par
     là, l'ordre de la base de développement a changé. **Migration corrigée**
     (écriture directe, `updated_at` intact) ; la base de développement,
     déjà migrée, doit être **refaite par Maurice** (`php artisan
     migrate:fresh --seed`, refusé à Claude par la protection automatique) ;
     (2) l'accueil élève (8) et « Ma progression » (6) : la série, le défi et
     « Reprendre » sont calculés à la vraie date — dérive connue depuis le
     lot 6, sans rapport avec le lot 8. Après la base refaite :
     `npx playwright test --workers=1`, relire, puis `--update-snapshots`
     pour ces écrans. Puis : vraie question de BEPC pour la vitrine
     (`VITRINE_QUESTION_DEMO`) ; dates des sessions (compte à rebours) ;
     prix à confirmer avant le lot 9.

23. [x] **Lot 8, suite — rendu serveur (SSR) de la vitrine, critère
   Lighthouse tenu** (2026-11-07, sur `main`, un commit)
   - **Constat** : sans rendu serveur, l'illustration du héros (le plus
     grand élément) attendait que React construise la page : performance
     ~81 (point 22). Rendu serveur seul : 81-83 encore — Lighthouse simule
     un réseau lent, et l'illustration y attendait derrière une quarantaine
     de fichiers JavaScript **préchargés** (balises `modulepreload` et
     en-tête `Link`) ; le lecteur anticipé de Chrome lit même le HTML d'un
     `<template>`.
   - **Décision** (Maurice : « Oui, active le SSR ») : **rendu serveur pour
     la vitrine seulement** — une règle, `Habillages::renduServeur` (pages
     `vitrine/*`), appliquée par `App\Ssr\PasserelleVitrine` (la passerelle
     d'Inertia, liée dans `AppServiceProvider`) : les espaces connectés
     n'appellent jamais le processus Node (ils dépendent de l'appareil et
     sont servis hors ligne par le service worker). Navigateur et serveur
     partagent la résolution des pages et l'enveloppe
     (`resources/js/application.tsx`), pour un arbre identique ; `ssr.tsx`
     ne touche pas `window`.
   - **Ce qui a fait passer la barre** (mesures, médiane de trois après un
     passage de chauffe) : (1) l'illustration préchargée **avant** les
     scripts dans `<head>` ; (2) **scripts lancés après l'affichage** sur
     une page effectivement construite par le serveur
     (`App\Ssr\ScriptsDifferes` : après `load` et une image peinte ;
     balises en chaîne JSON, produites par une **copie** de Vite pour
     qu'elles ne soient ni lues par le lecteur anticipé, ni annoncées dans
     l'en-tête `Link`) — la page se lit et ses liens marchent sans
     JavaScript ; (3) **page entière construite par le serveur** (le
     « héros d'abord, le reste juste après » du point 22, `useRenduComplet`,
     est retiré : héros seul 87, page entière 90-91 — et Google lit la FAQ
     et les tarifs) ; (4) une frontière `<Suspense>` par section sous le
     héros : React hydrate section par section (plus longue tâche 246 →
     186 ms). Résultat : **92 (91, 93, 92)**, LCP 2,0 s, TBT ~330 ms,
     accessibilité 100, SEO 100. `/sujets` : performance 96 (SEO 66 en
     développement : la liste n'a que des sujets d'exemple, donc `noindex`
     — voulu, point 22).
   - **Sans processus Node** (arrêté, en panne, plus d'une seconde) : la
     vitrine part sans rendu serveur, ses scripts **ne sont pas** différés,
     le navigateur la construit comme avant — testé. `phpunit.xml` coupe le
     rendu serveur (`INERTIA_SSR_ENABLED=false`) ; les tests le rallument
     avec un processus simulé.
   - **Hydratation** : aucun écart serveur / téléphone sur `/`,
     `/#titre-tarifs` (l'ancre est trouvée), `/sujets`, `/sujets?examen=…`,
     `/sujets/{slug}`, en clair et en sombre (script Playwright, erreurs de
     console et d'hydratation). Le compte à rebours compte depuis **le jour
     du serveur** (prop `aujourdhui`) : sinon un téléphone dans un autre
     fuseau, ou une visite à minuit, donnait un HTML différent.
   - **Corrigé en chemin** : l'option `ssr` de `laravel-vite-plugin`
     bloquait `npm run dev` (Vite ne démarrait plus) — inutile, le plugin
     Inertia trouve `resources/js/ssr.tsx` seul : retirée ; `export default
     createInertiaApp(…)` n'est pas reconnu par le plugin (pas de serveur
     dans le paquet) : `void createInertiaApp(…)`, comme `app.tsx` ; la
     mesure Lighthouse ajoute un **passage de chauffe** non compté (le
     premier passage d'un Chrome neuf perd 15 à 30 points qu'aucune visite
     réelle ne perd ; chaque passage reste une première visite, cache vidé).
   - **Développement** : `npm run dev` sert aussi le rendu serveur (Vite,
     `/__inertia_ssr`). Sous Windows il prend de 0,2 à 7 s par page : au-delà
     d'une seconde (`INERTIA_SSR_TIMEOUT`), la page part construite par le
     navigateur — normal ; `INERTIA_SSR_TIMEOUT=5` dans `.env` pour le voir
     à l'œuvre. Sans scripts différés en développement.
   - **Vu avec Playwright** : `ecrans-lot8.spec.ts` repassé (31 : 360, 768,
     1366 × clair et sombre, axe, parcours) — captures identiques, sauf
     `vitrine-accueil-360-sombre` dont la **référence était fausse**
     (l'illustration « soir », chargée à la demande, n'y était pas encore) :
     mise à jour. Écrans du lot 0 (connexion, inscription) repassés. Pas de
     passage complet : les 16 écarts connus du point 22 attendent la base
     refaite.
   - **Preuve** : Pest `RenduServeurTest` (4 : vitrine construite par le
     serveur, une seule requête par page ; connexion et espace élève sans
     appel ; processus en échec ou injoignable → page construite par le
     navigateur, scripts non différés ; avec un manifeste Vite d'essai,
     scripts absents du HTML et de l'en-tête `Link` sur la vitrine, présents
     sur la connexion). Totaux : **536 Pest, 359 Vitest**. `tsc`,
     `vp check`, Pint, Larastan niveau 7, `npm run build:ssr` passent ;
     `php artisan inertia:start-ssr` et `inertia:check-ssr` essayés.
     `MISE_EN_PRODUCTION.md` : § 1, § 2 (`INERTIA_SSR_*`), § 3,
     **§ 4.3 (Supervisor `nkaramogo-ssr`)**, § 5 (`npm run build:ssr`,
     `php artisan inertia:stop-ssr`), § 8 « Lot 8 », § 9, § 10.
   - **Reste** : PageSpeed sur le vrai domaine (`A_TESTER.md`, lot 8, D11) ;
     vérifier en production que `curl … | grep -c data-server-rendered`
     donne 1 (§ 9).

24. [x] **Captures stables : horloge du serveur figée, tris départagés**
   (2026-11-08, sur `main`, un commit)
   - **Constat** : après la base refaite par Maurice (`migrate:fresh
     --seed`), passage Playwright complet : 472 réussis, 20 échecs, 5 non
     lancés. (1) **Accueil élève (8) et « Ma progression » (6)** : les
     données de démonstration sont datées par rapport au **moment du
     semis**, le serveur calcule avec la **vraie date** — un jour plus tard,
     série, badges et « À revoir » changent (le navigateur était déjà figé,
     pas le serveur). (2) **Annales du back-office (2)** : deux sujets de la
     même session, semés dans la même seconde, revenaient dans un ordre
     laissé à la base — **bug de tri** (une liste paginée sans ordre total
     peut aussi répéter ou sauter une ligne d'une page à l'autre). (3)
     **Banque de questions (4)** : ordre des dates de modification du
     nouveau semis — écart légitime. (4) Parcours hors ligne et une annale
     (2) : **environnement** — MySQL arrêté dans la nuit, puis le port 8000
     repris par un autre projet de Maurice (« Cargoscope SHILANE ») ; verts
     une fois relancés sur un autre port.
   - **Décisions** : `App\Support\HorlogeDemo` (une autorité) note
     l'instant du semis (`DemoSeeder`, `storage/app/private/demo/horloge.txt` ;
     à défaut, la création du premier compte de démonstration) ;
     `FigerHorlogeDemo` traite à cet instant une requête qui porte le
     cookie `horloge_demo=1` — **en local et en test seulement**, placé
     **après** l'ouverture de la session (sinon la dernière activité
     reculerait et la session expirerait pour les requêtes suivantes),
     horloge rendue après la requête. Côté Playwright, `figerHorloges(page,
     HORLOGE)` (`tests/visuel/gabarits.ts`) fige le navigateur et pose le
     cookie, dans tous les `ecrans*.spec.ts`. Tris : départage par `id`
     dans les annales (back-office, élève, cours, vitrine, liste publique) et
     le tableau de bord du back-office. Port de Playwright réglable
     (`PLAYWRIGHT_PORT`, 8000 par défaut) : `reuseExistingServer`
     reprenait sans rien dire l'application d'un autre projet.
   - **Limite** : les captures dépendent des données du semis — après un
     **nouveau** `migrate:fresh --seed` un autre jour de la semaine, la
     série de l'accueil et de « Ma progression » peut changer une fois :
     relire puis `--update-snapshots` pour ces écrans. Entre deux semis,
     elles ne bougent plus.
   - **Vu avec Playwright** : 18 références remplacées après relecture
     (accueil élève × 8, progression × 6, banque de questions × 4 :
     série « Trois soirs », 5 notions à revoir, aucun débordement, sombre
     lisible) ; repassage sans mise à jour : **97 / 97** sur ces écrans et
     les annales du back-office ; parcours hors ligne et annale élève verts.
   - **Preuve** : Pest `HorlogeDemoTest` (5 : instant du semis avec le
     cookie, vraie heure sans, horloge d'un test respectée, sans effet en
     production, session enregistrée à la vraie heure en base). Totaux :
     **541 Pest, 359 Vitest**. `tsc`, `vp check`, Pint, Larastan niveau 7
     passent. `MISE_EN_PRODUCTION.md` : rien de plus (sans effet en
     production).

25. [x] **Lot 9 — abonnements, Orange Money / MTN MoMo, codes prépayés**
   (2026-11-08, sur `main`, un commit)
   - **Constat** : la vitrine affichait les tarifs (lot 8) mais « Choisir »
     n'ouvrait rien ; `SourceAbonnements` répondait « personne n'est
     abonné » (`AucunAbonnement`) ; corrigés, examens blancs et packs
     étaient ouverts à tous sans distinction ; HL-D8 (deux appareils) en
     attente.
   - **Décisions** (proposées, acceptées par Maurice le 2026-11-08,
     « Oui, lance-le ») :
     - **fournisseur** : interface `PasserellePaiement` et passerelle
       **simulée** maintenant (critère tenu en simulation) ; le pilote réel
       quand Maurice aura le compte marchand et les clés de test ;
     - **gratuit** : le corrigé détaillé de la session la plus récente de
       chaque épreuve, et ceux que l'équipe coche (« Offrir le corrigé à
       tous », back-office, responsable pédagogique) ; **deux examens
       blancs par mois** ; cours, exercices et séances gratuits ;
     - **pack gratuit** : variante « libre » sans les corrigés réservés
       (`HORS_LIGNE.md` écart n° 33) ;
     - **Année scolaire = 10 mois** à partir de l'achat, avec la date de
       fin affichée (la vitrine dit « pour 10 mois ») ;
     - numéro **vérifié** exigé pour payer (D3), **pas** pour un code.
   - **Une autorité par règle** : `AbonnementService` (ouvrir, prolonger
     à la suite, fin d'abonnement) ; `PaiementService` (lancer, webhook,
     rattrapage) ; `CodeAccesService` (lots, remise, désactivation,
     utilisation) ; `App\Support\DroitsAbonne` (corrigé ouvert, examens du
     mois, appareils) ; `App\Support\CodeAcces` et `lib/code-acces.ts`
     (format, clé de contrôle, même jeu d'exemples) ; `DroitsPacks`
     (variante du pack, appareils).
   - **Sécurité** (CLAUDE.md § 9) : montant lu dans la configuration,
     jamais du téléphone ; numéro du payeur **chiffré** (deux derniers
     chiffres à l'écran) ; webhook sans CSRF mais **signé** (HMAC, 401
     sinon, rien d'enregistré), **idempotent** (unicité de l'événement,
     verrou sur le paiement, `abonnements.paiement_id` unique), montant
     différent refusé ; codes : empreinte HMAC seulement, clair chiffré
     jusqu'à la remise puis effacé (14 jours au plus), 8 essais par 15 min
     et 30 par heure et par adresse ; journal des accès
     (`abonnement.active`, `code.utilise`, `lot_codes.*`) sans code
     complet ; passerelle simulée et faux opérateur refusés en production.
   - **Écrans** : « Mon abonnement », « Payer », suivi du paiement (relu
     toutes les 3 s, `usePoll`), faux opérateur (`dev/passerelle`) ;
     console « Codes prépayés » (liste, fiche, planche d'impression) et
     « Paiements » ; carte « Corrigé détaillé avec l'abonnement » sur
     l'annale, badges dans la liste ; quota au lancement de l'examen blanc ;
     liens « Avec l'abonnement » de « Téléchargements » ; avis HL-D8
     (Téléchargements, Abonnement, Appareils) ; case « Offrir le corrigé à
     tous » au back-office ; « Choisir » de la vitrine mène à l'inscription.
   - **Vu avec Playwright** (`ecrans-lot9.spec.ts`, 7 écrans × 3 gabarits ×
     2 thèmes, axe, débordement ; `parcours-lot9.spec.ts`) : corrigés à la
     relecture — « GNF » en double sur les prix, débordement de la console
     à 360 px (grille sans `grid-cols-1`), sigle « MoMo » trop large pour
     sa pastille, nombre d'appareils et référence d'opérateur masqués
     (variables d'un passage à l'autre). Détail : `DESIGN.md` § 13.
   - **Données de démonstration** (`DemoAbonnementsSeeder`) : lot de 24
     codes d'exemple (Sékou), Ousmane abonné (un mois payé + une année par
     code), un essai MoMo refusé pour Aïssatou, qui reste gratuite.
   - **Passage Playwright complet** (2026-11-08, sur le build, port 8010 —
     le 8000 est pris par un autre projet) : **539 / 540**, puis les deux
     parcours restants verts une fois `queue:work` lancé (l'import du lot 4
     attend un travailleur de file : environnement, pas le lot 9). Captures
     changées, **toutes relues** et attendues : sécurité du compte en
     console (deux entrées de menu) ; lot 4 — annales du back-office
     (« Accès au corrigé »), annale élève en entraînement et signalement
     (carte « Corrigé réservé », BEPC 2023), liste des annales à 360 px
     (badges) ; lot 5 — lancement de l'examen blanc à 360 px (« Ton dernier
     examen blanc gratuit du mois ») ; lot 7 — « Téléchargements » (bouton
     vers l'abonnement) et « Qui révise ? » (« Mon abonnement ») ; lot 8 —
     accueil de la vitrine à 360 px (« pour 10 mois » ; l'ancienne référence
     n'avait pas rendu une illustration différée). Les autres écrans élève
     (nouvelle entrée de la barre latérale) restent sous le seuil de 1 %.
   - **Bug préexistant corrigé** (CLAUDE.md § 8) : `SeederDemonstrationTest`
     sème la démonstration et **récrivait l'instant du semis de la base de
     développement** (`storage/app/private/demo/horloge.txt`, disque
     `local` partagé) : après chaque `php artisan test`, les captures
     lisaient une autre date et « Ma progression » dérivait (une révision
     devenait due). Décision : `Tests\TestCase` fausse le disque `local`
     pour tous les tests ; instant du semis rétabli (2026-11-07 06:22,
     création du premier compte de démonstration) ; le nettoyage du parcours
     du lot 5 recalcule la progression à cet instant (`HorlogeDemo`), plus à
     la vraie date. Preuve : Pest complet, fichier inchangé après ; « Ma
     progression » identique à sa référence après le parcours du lot 5
     (18 / 18).
   - **Totaux** : **587 Pest** (vert), **399 Vitest** (381 + 18), **540
     Playwright** (vert, avec `queue:work`). `tsc`, `vp check`, Pint,
     Larastan niveau 7 et `npm run build` passent.
   - **Preuve** : Pest `Abonnements/PaiementTest` (14, dont le critère),
     `CodesAccesTest` (8), `DroitsAbonneTest` (8), Unit
     `CodeAccesFormatTest` ; Vitest `code-acces.test.ts`,
     `hors-ligne/abonnement.test.ts` ; Playwright `ecrans-lot9.spec.ts`
     (42), `parcours-lot9.spec.ts`.
   - **Reste** : vrai fournisseur et vrai paiement (`A_TESTER.md` § 7,
     bloqué par le choix du fournisseur et D11) ; parents payeurs (lot 11) ;
     licences d'établissement et comptes parrainés (PLAN M16, plus tard) ;
     revenus détaillés (console, lot 13). Une question d'annale tirée dans
     la **séance du jour** montre encore son corrigé à un élève gratuit
     (la règle ne porte que sur la fiche d'annale et le pack) : à trancher
     avec Maurice si c'est gênant.

26. [x] **Lot 10 — tuteur N'karamögö (IA), quotas, journal, coûts**
   (2026-11-12 / 13, sur `main`, un commit)
   - **Constat** : la carte « Ton tuteur » de l'accueil disait « bientôt » ;
     rien ne permettait d'expliquer un corrigé autrement qu'en le relisant.
   - **Décisions de Maurice** (2026-11-12, plan accepté) : **Sonnet 5.5**
     (`claude-sonnet-5-5`, deux fois moins cher qu'Opus, rapide à démarrer ;
     changeable dans `.env`) ; quota **3 explications par jour sans
     abonnement, 30 avec** ; tuteur **ancré** sur une question ou une étape
     de son corrigé, **et** question libre dans une des matières de
     l'élève ; correction assistée des rédactions de l'examen blanc
     **reportée** à un lot ultérieur.
   - **Écart au PLAN M11** (« service en file d'attente ») : une file ne
     rend pas de premier mot en moins de 3 s ; la réponse est **diffusée
     depuis la requête** (SSE sur un POST, `X-Accel-Buffering: no`), le
     journal et le coût s'écrivent à la fin du flux ; la limitation de
     débit (8 par minute) et un verrou (une explication à la fois par
     élève) protègent les processus PHP. `HORS_LIGNE.md` écart n° 34 : la
     demande ne passe pas par la file d'opérations (niveau C).
   - **Une autorité** : `App\Services\Tuteur\TuteurService` (qui peut
     demander quoi, contexte, quota, cache, marqueurs, journal, coût) ;
     moteurs derrière `MoteurTuteur` : `TuteurClaude` (API en flux, effort
     `low`, cache des consignes et du contexte, repli serveur
     `fallbacks: default`, `metadata.userID` opaque) et `TuteurSimule`
     (sans réseau, « EXEMPLE — explication fictive », imite les marqueurs ;
     jamais en production).
   - **Ancré sur notre contenu** : le tuteur lit l'énoncé, les choix, la
     réponse attendue, **la réponse de l'élève**, le **corrigé validé** et
     la notion (`ContexteTuteur`, `App\Support\BlocsEnTexte`, formules en
     LaTeX) ; il ne corrige pas autrement (consigne). Une annale au corrigé
     réservé (`DroitsAbonne`) n'ouvre pas le tuteur (403 « réservé aux
     abonnés ») : il le dévoilerait. Question libre : la matière et le
     programme étudié seulement.
   - **Mineurs** (CLAUDE.md § 9) : rien de personnel envoyé (ni prénom, ni
     pseudo, ni numéro ; examen seulement) ; ce que tape l'élève est
     nettoyé (numéros et adresses → « [retiré] », `Confidentialite`) avant
     d'être envoyé **et** gardé ; consignes : ne rien demander de
     personnel, renvoyer vers un adulte de confiance en cas de détresse ;
     **refus propre** : les marqueurs `[HORS_SUJET]` / `[INADAPTE]` sont
     retenus avant d'être vus et remplacés par une phrase écrite par
     l'équipe ; un refus du modèle aussi ; rien n'est décompté.
   - **Cache** : la première explication d'une question (ou d'une étape),
     à une version et pour une même réponse de l'élève, est servie de
     nouveau sans appel (`explications_tuteur`) ; jamais une réponse à une
     phrase tapée.
   - **Écrans** : « Explique-moi » (séance, leçon, annale) et « Je ne
     comprends pas cette étape » (chaque étape du corrigé), feuille chargée
     au premier appui (`React.lazy`) ; « Mon tuteur » (question libre, quota,
     conversations, relances) ; carte de l'accueil réelle ; Back-office ›
     Tuteur (journal **anonyme**, les plus expliquées, signalements à
     classer) ; Console › Tuteur (coût en dollars et en GNF, cache, premier
     mot médian et 9 sur 10, par jour, par modèle). Entrées de navigation
     gardées par `tuteur.utiliser`, `tuteur.journal`, `tuteur.couts`.
   - **Données de démonstration** (`DemoTuteurSeeder`) : 14 conversations
     d'Aïssatou et d'Ousmane sur deux semaines, par le vrai chemin (tuteur
     simulé), habillées comme des réponses de l'API, `est_exemple`.
   - **Bug préexistant corrigé** (CLAUDE.md § 8) :
     `DemoExamensBlancsSeeder` datait ses deux examens 9 et 2 jours avant le
     semis : semée après le 9 du mois, la démonstration les mettait dans le
     même mois et Aïssatou n'avait plus d'examen blanc gratuit (les écrans
     du lot 5 et « Mon abonnement » échouaient selon le jour du semis). Le
     premier tombe maintenant toujours le mois précédent.
   - **Critère tenu** (`parcours-lot10.spec.ts`, build, `php artisan serve`
     port 8010, tuteur simulé) : « Explique-moi » → **premier mot à 838,
     887 et 967 ms** sur trois passages (requête partie vers 390 ms :
     chargement du panneau à la demande ; en-têtes vers 850 ms) ; le
     texte grandit en plusieurs fois avant la fin ; formules rendues.
     Un tout premier passage, serveur et cache froids, a donné 2 918 ms :
     sous le seuil, mais de peu — la mesure avec la vraie API et un vrai
     réseau reste à faire (`A_TESTER.md` § 7 bis). **Hors sujet** : le
     recentrage de l'équipe, jamais `[HORS_SUJET]`, le compteur ne bouge
     pas, pas de relance. Pest : « hors sujet », « contenu inadapté, ou
     refus du modèle ».
   - **Vu avec Playwright** (`ecrans-lot10.spec.ts`, 5 écrans × 3
     gabarits × 2 thèmes, axe et débordement ; la feuille et le
     recentrage dans le parcours, 3 × 2). Corrigé à la relecture (détail
     `DESIGN.md` § 13, lot 10) : puce de matière blanche sur blanc en
     sombre, date trop pâle sur la conversation active, tableau de la
     console inatteignable au clavier, « Je ne comprends pas cette
     étape » qui débordait à 360 px (annale du lot 4), tuiles de matière
     illisibles sur l'encre, « 5 relances » annoncées après un recentrage,
     quota masqué à tort dans les captures. Le nettoyage du parcours
     effaçait mal (une conversation sur une question d'exemple est
     elle-même `est_exemple`) : il efface maintenant par identifiant.
   - **Passage Playwright** (2026-11-12 / 13, build, port 8010, en série) :
     un premier passage complet (538 verts) a montré les échecs ci-dessus
     et ceux des lots 5 et 9 (bug du semis, plus haut) ; après
     corrections, **verts** : lots 4, 5, 9 et 10 (175), parcours du lot 10,
     `ecrans.spec.ts`, lot 2, `budgets.spec.ts` et `hors-ligne.spec.ts`
     (164). Références changées, **toutes relues** et attendues : accueil
     élève (lots 0 et 2 : carte du tuteur), sécurité du compte en console
     (entrée « Tuteur »), annale en lecture (lot 4 : boutons du tuteur) ;
     « Mon abonnement » (lot 9 : dates du nouveau semis, et l'avis HL-D8
     disparu — l'ancienne référence comptait les appareils accumulés par
     les passages Playwright). ⚠ Le passage avait été lancé avec
     `--update-snapshots` sur un filtre de fichiers qui entraînait tous les
     lots (dépendance `ecrans`) : seules ces références ont bougé, et
     celles des lots 5 et 9 réécrites à tort ont été remises du dépôt puis
     recomparées.
   - **Totaux** : **620 Pest** (vert), **399 Vitest** (vert : 381 + 18 dans
     `tests/js/tuteur/` ; recompté le 2026-11-13, le total « 399 » du lot 9
     comptait 18 tests deux fois), Playwright vert sur tout ce qui a été
     relancé (ci-dessus). `tsc`, `vp check`, Pint, Larastan niveau 7,
     `npm run build:ssr` passent.
   - **Preuve** : Pest `Tuteur/TuteurTest` (19), `Tuteur/JournalEtCoutsTuteurTest`
     (4), Unit `TuteurOutilsTest` (10) ; Vitest `tuteur/texte.test.ts`,
     `tuteur/flux.test.ts` ; Playwright `ecrans-lot10.spec.ts` (30),
     `parcours-lot10.spec.ts` (2).
   - **Première clé branchée** (2026-11-13) : l'API accepte la clé de
     Maurice mais le compte n'a **pas de crédit** (« credit balance is too
     low »). Corrigé en chemin : ce refus (400, comme une demande mal
     formée) faisait lire à l'élève « Reformule-la plus court » et au
     rédacteur « format ou taille refusés » ; `App\Support\ErreursApiClaude`
     le reconnaît : « Le tuteur est momentanément fermé » pour l'élève,
     « Le crédit de l'API Claude est épuisé : rechargez-le… » pour l'import,
     une ligne d'erreur dans le journal. Et, la clé présente faisant passer
     tuteur et import en mode réel, `phpunit.xml` (clé vide, moteurs
     simulés, `force`) et le serveur lancé par Playwright (`webServer.env`)
     imposent le mode simulé : aucun test ne paie un appel.
   - **Reste** : la vraie API (critère des 3 s, refus propres, `A_TESTER.md`
     § 7 bis, **bloqué par le crédit**) ; correction assistée des rédactions de
     l'examen blanc (reportée par Maurice) ; « Explique-moi » sur le
     résultat d'un examen blanc (les questions n'y portent pas encore leur
     identifiant).

27. [x] **Lot 11 — parents, enseignants, établissements, devoirs**
   (2026-11-13 / 14, sur `main`, un commit)
   - **Constat** : parent, enseignant et gestionnaire n'ouvraient que
     « Mon compte » ; `Perimetre` ne connaissait que l'élève et
     l'administrateur ; « parents payeurs » et licences étaient reportés
     (lot 9, point 25).
   - **Décisions de Maurice** (2026-11-13, plan accepté tel quel) :
     1. liaison parent par un **code que l'élève génère** (6 chiffres,
        24 h, une fois, empreinte HMAC seulement ; deux parents au plus) ;
     2. **le parent paie** l'abonnement de son enfant (même
        `PaiementService`, `paiements.beneficiaire_id`) et peut saisir un
        code prépayé pour lui ;
     3. établissement : **rapport, enseignants, licences accordées par la
        console** ; **pas de comptes élèves créés en lot** (numéros de
        mineurs saisis par l'école, D9) ;
     4. enseignant et gestionnaire = **personnel** (12 h, double
        authentification proposée) ; le parent garde 30 jours ;
     5. l'enseignant voit **prénom et pseudo** ; les élèves d'un groupe ne
        se voient pas entre eux ;
     6. un devoir = des **questions publiées** ; rendu en retard accepté,
        marqué ;
     7. résumé hebdomadaire au parent par SMS/WhatsApp **reporté** (pas de
        fournisseur, D3).
   - **Une autorité** : `App\Support\Perimetre` répond désormais pour
     tous : enfants d'un parent (`enfants`, `estParentDe`), groupes
     consultables (enseignant : les siens ; gestionnaire : ceux de son
     établissement ; élève : ceux où il est ; administrateur : tous),
     `peutGererGroupe` (l'enseignant du groupe seulement),
     `etablissementsGeres`, `elevesConsultables` (élèves présents dans les
     groupes ouverts). La maîtrise d'une classe vient de `MaitriseService`
     (`jaugesDuGroupe`, `notionsFaibles`, même pondération que `jauge()`,
     factorisée dans `ponderer()`) ; les abonnements de licence de
     `AbonnementService` (`activerLicence`, `arreterLicence`).
   - **Services** (`app/Services/Organisation`) : `LiaisonParentService`,
     `GroupeService` (code de 6 caractères sans signes ambigus, examen,
     série et filière de l'élève exigés, 5 groupes par élève, un élève
     retiré ne revient pas seul), `DevoirService` (création, « Commencer »
     → séance unique, état de chaque élève), `EtablissementService`
     (établissement, rattachement — ouvre le compte du personnel avec un
     mot de passe provisoire montré une fois, refuse un numéro d'élève ou
     de parent —, licences, places sous verrou), `SuiviService` (ce que
     lisent les trois espaces). Refus métier : `GesteRefuse` → erreur de
     formulaire. Policies `GroupePolicy`, `DevoirPolicy` (**404**) ; fiche
     d'un enfant : `Perimetre::estParentDe` (404).
   - **Écart au PLAN § 6** (`HORS_LIGNE.md` écart n° 35) : pas de table
     `rendus_devoirs` ; **le rendu est la séance du devoir**
     (`seances.devoir_id`, unique par élève) — réponses par
     `tentative.enregistrer`, fin par `seance.terminer`. La séance d'un
     devoir n'est jamais la séance du jour (`enCours`, séances préparées,
     « faite aujourd'hui » l'excluent).
   - **Permissions** (`App\Enums\Permission`) : `espace.parent`,
     `espace.enseignant`, `espace.etablissement`, `groupes.gerer`,
     `groupes.rejoindre`, `parents.inviter`, `etablissement.gerer`,
     `etablissements.administrer` ; le parent reçoit aussi
     `abonnement.souscrire`. `Espace` : établissement, enseignant, parent
     (aiguillage après connexion). Toutes les routes nouvelles portent
     leur `can:` (`routes/organisation.php`, `AccesParRoleTest` vert sans
     dérogation nouvelle). Limites de débit : `code-liaison`,
     `code-groupe`. Journal des accès : liens parent, rattachements,
     comptes ouverts, licences, élève retiré d'un groupe.
   - **Écrans** (DESIGN.md § 13, lot 11) : parent (accueil, enfant,
     abonnement, paiement), enseignant (accueil, groupe, nouveau devoir,
     devoir), établissement (rapport, groupe, licences), élève (« Mes
     groupes », carte « Mes devoirs » de l'accueil, titre et bilan de la
     séance d'un devoir, « Mon compte › Parents »), console
     (établissements, fiche). Tous en ligne seulement (niveau C).
   - **Démonstration** (`DemoOrganisationSeeder`) : Collège exemple de
     Ratoma, licence de 40 places, la 10e A (Aïssatou + cinq élèves
     d'exemple qui ont répondu par `TentativeService`), deux devoirs (un
     échu rendu par trois élèves, un à rendre), Mamadou lié à Aïssatou ;
     tout `est_exemple`.
   - **Critère tenu** : Pest `Organisation/GroupesEtDevoirsTest`
     (« critère du lot 11 ») — la 10e A ne montre que la notion travaillée
     par **ses** élèves (moyenne 30 %, 2 fragiles), jamais celle d'un élève
     de la 10e B (5 %) ; le groupe d'un collègue répond **404** (fiche et
     retrait d'un élève) ; capture `enseignant-groupe` (six notions de la
     démonstration, la plus faible d'abord).
   - **Tests ajoutés** : Pest `Organisation/GroupesEtDevoirsTest` (8),
     `Organisation/ParentsTest` (7), `Organisation/EtablissementsTest` (6),
     `PerimetreTest` (+2) ; Vitest `suivi.test.tsx` (6) et la table des
     habillages (+3) ; Playwright `ecrans-lot11.spec.ts` (14 écrans × 3
     gabarits × 2 thèmes, axe et débordement). Tests du lot 10 et
     d'avant mis à jour : espaces des rôles (`AccesParRoleTest`,
     `RolesEtPermissionsTest`, `HabillagesTest`), permissions de l'élève
     (`ConnexionTest`), comptes semés (`SeederDemonstrationTest`).
   - **Vu avec Playwright** (`ecrans-lot11.spec.ts`, 14 écrans × 3 gabarits
     × 2 thèmes, axe et débordement, 84 captures) : corrigé à la relecture
     (détail DESIGN.md § 13, lot 11) — tuiles de chiffres trop hautes,
     accord « sur 1 qui l'a travaillée », sous-titres de devoirs tronqués,
     semaine de révision illisible à petites minutes, débordement à 360 px
     (licences), dates de licence serrées (console), « À rendre il y a
     2 jours » (→ « Échu il y a 2 jours »).
   - **Passage Playwright complet** (2026-11-14, build, port 8010, en
     série) : lancé plusieurs fois à cause de deux coupures de MySQL sans
     rapport avec le lot (le poste a tourné plus de six heures d'affilée).
     Un vrai écart trouvé au passage : un **nouvel élève inscrit tombe
     maintenant sur l'étape « Ton établissement »** du parcours d'accueil,
     puisque `DemoOrganisationSeeder` crée le premier établissement de la
     base (`eleve/bienvenue.tsx` : cette étape n'existait pas tant que la
     liste était vide, PLAN § 6). Corrigé dans les quatre parcours qui
     inscrivent un élève neuf (`budgets.spec.ts`,
     `parcours-lot2/lot3/lot7.spec.ts`) par une étape commune,
     `passerEtapeEtablissement()` (`gabarits.ts`) : elle franchit l'étape
     sans rien choisir si elle apparaît, ne fait rien sinon — le même
     comportement attendra les écoles réelles après D11.
   - **Bug préexistant trouvé et corrigé en chemin** (CLAUDE.md § 8) :
     deux captures de `parcours-lot2.spec.ts` et `parcours-lot3.spec.ts`
     (`seance-verdict`, `seance-ouverte-evaluee`) n'avaient jamais été
     rafraîchies depuis que le lot 10 a ajouté « Explique-moi » et « Je ne
     comprends pas cette étape » sous un corrigé : les références
     montraient encore l'écran d'avant le lot 10. Sans rapport avec le
     lot 11 ; mises à jour avec les autres.
   - **Totaux** : **649 Pest** (vert), **408 Vitest** (vert), **667
     Playwright** (vert : connexion 8, écrans 651, les sept parcours de
     bout en bout 8 — `parcours-lot4.spec.ts` exige la file
     (`ANNALES_EXTRACTEUR=simule php artisan queue:work`), sans quoi
     l'import tente la vraie API et échoue faute de crédit (point 26)).
     `tsc`, `vp check`, Pint, Larastan niveau 7 et `npm run build`
     passent.
   - **Reste** : résumé hebdomadaire au parent (SMS/WhatsApp, D3) ;
     création de comptes élèves en lot (refusée pour l'instant, D9) ;
     communauté du groupe (lot 12) ; vrai paiement par un parent et devoir
     en mode avion sur vrai téléphone (`A_TESTER.md`, lot 11).

28. [x] **Lot 12 — culture générale, ressources externes, communauté encadrée**
   (2026-11-18, sur `main`, un commit)
   - **Constat** : la matière « Culture générale » existait sans épreuve,
     donc invisible ; aucun lien sortant ; les groupes du lot 11 n'avaient
     pas de fil (décision 5 du lot 11 : les élèves ne se voient pas).
   - **Décisions de Maurice** (2026-11-18, plan accepté) :
     1. dans le fil, les élèves voient le **pseudo** des auteurs (jamais
        prénom ni numéro) ; l'enseignant voit prénom et pseudo ; la liste
        des membres reste cachée (assouplit la décision 5 du lot 11) ;
     2. une publication paraît **tout de suite, filtrée** (mots interdits,
        numéros, liens, e-mails) ; signalement ; masquage en un geste par
        l'enseignant ; masquage provisoire à **trois** signalements
        d'élèves différents ;
     3. « défis entre amis » = **carte de partage** du quiz (prénom seul,
        dessinée sur l'appareil) **et défi du groupe** lancé par
        l'enseignant, classement par pseudo **opt-in** ;
     4. **YouTube accepté**, chaque vidéo vérifiée par un relecteur ;
        l'élève est prévenu des suggestions et publicités du site.
   - **Culture générale** (PLAN M10) : `matieres.transversale` — tout
     élève la voit, hors jauge, hors coefficients, hors séance du jour et
     hors devoirs ; ses chapitres (des thèmes) n'ont pas de classe
     (`chapitres.classe_id` vide, Référentiel › Programme le dit). Une
     autorité : `CatalogueEleve::questionsCulture()`, et `CultureService`
     (question du jour **la même pour tous**, ordre stable qui passe par
     toutes avant d'en répéter une ; quiz de cinq, jamais vues d'abord ;
     historique). Une question de culture **cite sa source**
     (`questions.sources`, figée dans la version, affichée sous le
     corrigé ; sans elle, pas de relecture). Réponses par la file ; la
     culture n'entre pas dans la maîtrise (`MaitriseService`). Un quiz est
     une séance `culture`, exclue de la séance du jour par
     `Seance::duJour()` (qui remplace les trois `whereNull('devoir_id')`).
   - **Ressources externes** (PLAN M19) : `RessourceService` (seule
     autorité) — liste fermée de sites (`config/ressources.php`, HTTPS,
     sous-domaines admis, raccourcis et domaines déguisés refusés), un
     rédacteur propose, un **autre** relecteur vérifie (jamais le sien,
     même responsable pédagogique), une ressource modifiée repasse « à
     vérifier », retrait motivé ; `ressources:verifier` chaque lundi (un
     lien muet sort de la vue élève, « Lien cassé » au back-office).
     Elles voyagent dans l'objet de la leçon, donc dans le pack ; chaque
     changement visible regénère le pack de la matière. Poids annoncé
     (saisi, sinon estimé par type et durée) ; dialogue « Tu quittes
     N'karamögö » avant tout départ.
   - **Communauté encadrée** (PLAN M13, critère) : `FilGroupeService`
     (seule autorité : publier, signaler, masquer, garder, retirer la
     parole 1 à 30 jours, fermer le fil ; 500 caractères, 10 messages par
     jour et par groupe, 30 s entre deux, un envoi idempotent par UUID) et
     `FiltreFil` (numéro guinéen de 9 chiffres ou plus, lien, e-mail, mots
     comparés sans casse ni accents, en mot entier, même déguisés par des
     lettres répétées ou des points). Qui lit et qui modère :
     `Perimetre::peutParticiperAuFil` / `peutModererFil` ; policies
     `participer` / `moderer` (**404**). Mots interdits tenus au
     back-office › Modération (responsable pédagogique). Chaque geste de
     modération est au journal des accès. **Défi du groupe** = un devoir
     `defi` (écart n° 35 inchangé : un rendu est une séance) ;
     `DevoirService::classement` ne nomme que les élèves qui l'acceptent
     (`membres_groupes.classement_accepte`).
   - **Écart** (`HORS_LIGNE.md` n° 36) : publier, signaler et modérer
     partent en direct, pas par la file ; le brouillon est gardé sur
     l'appareil à chaque frappe.
   - **Permissions** : `communaute.participer` (élève),
     `communaute.moderer` (enseignant) ; ressources : `contenu.rediger` /
     `contenu.relire` ; modération : `contenu.administrer`. Toutes les
     routes nouvelles portent leur `can:` (`AccesParRoleTest` vert sans
     dérogation nouvelle).
   - **Démonstration** (`DemoCommunauteSeeder`, tout `est_exemple`) : trois
     thèmes (Guinée, Afrique, Monde), onze questions de faits connus avec
     leur source (Wikipédia), un quiz déjà fait par Aïssatou ; cinq liens
     Wikipédia et Vikidia (quatre vérifiés) ; le fil de la 10e A (trois
     questions, deux réponses de Fatoumata, un message signalé deux fois) ;
     le « Défi du vendredi » rendu par trois élèves dont deux classés ;
     neuf mots interdits (développement seulement).
   - **Critère tenu** : Pest `Communaute/FilGroupeTest` (« un élève
     signale, l'enseignant masque en un geste, les élèves ne le voient
     plus ») et Playwright `parcours-lot12.spec.ts` (Aïssatou signale,
     Fatoumata touche « Masquer » une fois, la question disparaît du fil
     d'Aïssatou).
   - **Bugs trouvés en chemin et corrigés** : les props de séance de
     l'instantané et de l'écran différaient pour une séance tout juste
     créée (`culture` absent → `null`) ; `config('ressources.domaines.' .
     $domaine)` ne lisait rien (les points du domaine passaient pour de la
     notation pointée) ; **chaque `db:seed` déplaçait l'horloge des
     captures** (`DemoSeeder` notait l'instant à chaque passage, même sur une
     démonstration déjà semée) : relancé au début du lot pour semer le
     lot 12, il a fait lire les données des lots précédents quatre jours
     plus tard (séries, quota du tuteur, « il y a N jours »). Corrigé :
     l'instant n'est noté qu'au premier semis (Pest `HorlogeDemoTest`) et
     `DemoCommunauteSeeder` se date sur cette horloge ; la démonstration de
     développement a été refaite (`migrate:fresh --seed`, accord de Maurice
     le 2026-11-18, puis de nouveau le 2026-11-19 après une session
     interrompue en plein parcours et la règle du quiz ci-dessous). Une leçon « Parcours 1794635505538 » laissée le
     2026-11-14 par un parcours du lot 1 interrompu (coupure MySQL) a
     disparu avec.
   - **Un quiz n'est pas une séance du jour** (trouvé à la relecture de
     « Ma progression ») : sa fin passait par `MotivationService::apresSeance`
     — objectif du soir atteint, 20 points de séance, badge « Première
     séance », case « Terminer une séance du jour » cochée. Désormais
     `apresQuizCulture` : le jour compte pour la série, rien d'autre (chaque
     réponse a ses points). Pest `Culture/CultureTest`.
   - **Poids** (`HORS_LIGNE.md` A.11) : la question du jour tirait l'ardoise
     de saisie et le lecteur de formules (KaTeX) dans l'accueil — coquille
     mesurée à **410 Ko** compressés (272 Ko au lot 7, budget 500 Ko). Sur
     l'accueil, la carte montre l'énoncé en texte et « Répondre » ;
     l'ardoise est chargée au premier appui (`React.lazy`, gardée par le
     service worker). Mesure après correction : **309 Ko** (`budgets.spec.ts`).
   - **Tests ajoutés** : Pest `Communaute/FilGroupeTest` (9),
     `Culture/CultureTest` (8), `HorlogeDemoTest` (+1), `Ressources/RessourcesTest` (10), Unit
     `FiltreFilTest` (18) ; Vitest `communaute/lot12.test.ts` (6) ;
     Playwright `ecrans-lot12.spec.ts` (8 écrans × 3 gabarits × 2 thèmes)
     et `parcours-lot12.spec.ts` (2). Mis à jour : `ConnexionTest`
     (permission de l'élève), `SeederDemonstrationTest` (+ cinq réponses
     de quiz).
   - **Totaux** : **695 Pest** (vert), **414 Vitest** (vert) ; `tsc`,
     `vp check` (un avertissement antérieur au lot), Pint, Larastan niveau 7
     et `npm run build` passent ; **709 Playwright** (vert : 699 écrans,
     dont budgets et hors ligne, et les 10 parcours de bout en bout).
   - **Vu avec Playwright** (`ecrans-lot12.spec.ts`, 8 écrans × 3 gabarits
     × 2 thèmes, axe et débordement ; `parcours-lot12.spec.ts`, 3 étapes × 3
     × 2) : corrigé à la relecture (détail `DESIGN.md` § 13, lot 12) —
     contraste des messages signalés, bouton blanc illisible en sombre,
     débordement à 360 px (Ressources), « Signaler » sur sa propre ligne,
     carte des rendus étirée, « Revoir le cours » après un quiz, et le poids
     de l'accueil (point « Poids »). Références changées, **toutes relues**
     et attendues : accueil élève (lots 0 et 2 : la question du jour), leçon
     (lots 2 et 3 : ressources sous « Pour aller plus loin »), saisie d'une
     question (lot 3 : « La source »), « Mes groupes », accueil et groupe de
     l'enseignant, nouveau devoir, groupe vu par l'établissement (lot 11 :
     fil, défi, classement). Passage complet le 2026-11-19 sur le build,
     port 8010, en série, file `ANNALES_EXTRACTEUR=simule` ; deux échecs
     isolés d'écriture de capture (verrou de fichier Windows) rejoués verts.
   - **Reste** : les vrais téléphones (`A_TESTER.md`, lot 12) ; la liste
     de production des mots interdits (à saisir avant d'ouvrir les fils) ;
     « Ça m'aide » sur une réponse et les classements opt-in hors groupe
     (PLAN M9) ne sont pas faits ; du vrai contenu de culture générale,
     sourcé, par l'équipe.

29. [x] **Lot 13 — console plateforme : activité, contenu, revenus, impact**
   (2026-11-20, sur `main`, un commit)
   - **Constat** : la console n'avait qu'un état vide (lot 0) et des
     entrées de navigation sans écran ; la jauge est recalculée à chaque
     fois depuis les maîtrises, **sans historique** : son évolution ne se
     lisait nulle part ; un compte du personnel ne pouvait pas être
     désactivé (point ouvert du point 15) ; une session ouverte survivait à
     `desactive_le` (seule la connexion le refusait).
   - **Décisions de Maurice** (2026-11-20, plan accepté tel quel) :
     1. le rapport est un **vrai PDF** fait par `dompdf/dompdf` (PHP pur,
        rien à installer sur le serveur ; **dépendance ajoutée**, 3.1.6) ;
     2. **élève assidu** = au moins 3 séances terminées par semaine pendant
        au moins la moitié des semaines de la période (PLAN § 15) ; les
        quiz de culture ne comptent pas ;
     3. **seuil d'anonymat** : un groupe de moins de 10 élèves mesurés
        n'est pas chiffré ; aucun nom, pseudo ni numéro dans la console
        ni dans le rapport ;
     4. l'impact est réservé à l'**administrateur plateforme** (un rôle
        « partenaire » plus tard s'il le faut) ;
     5. **Console › Personnel** : désactiver / réactiver un compte du
        personnel, sessions fermées, journalisé.
   - **Une autorité** : `App\Services\Plateforme\PlateformeService`
     (activité, contenu, revenus, impact) — l'accueil de la console,
     chaque écran et le PDF y lisent leurs chiffres. Actif un jour = a
     répondu ce jour-là (`series_jours`) ; rétention à N jours = part des
     inscrits depuis plus de N jours qui ont répondu N jours ou plus après
     leur inscription (non chiffrée sous 10). La couverture du programme
     sort du contrôleur du back-office dans `App\Support\CouvertureProgramme`
     (lue par le back-office **et** la console).
   - **Relevé de la jauge** : table `releves_jauge` (élève, lundi de la
     semaine, valeur ; examen, série et établissement recopiés au jour du
     relevé), commande `jauges:relever` **le dimanche à 22 h**, par la
     même règle que l'accueil élève (`MaitriseService::jaugesDuGroupe`) ;
     relancer la même semaine remplace la valeur ; un compte désactivé
     n'est plus relevé. **L'historique commence au premier passage en
     production** : le passé ne se reconstitue pas.
   - **Écrans** (console, `routes/plateforme.php`) : Vue d'ensemble
     (actifs, rétention, revenus, signalements ; courbe des actifs et des
     assidus, paiements par semaine ; carte d'impact en `surface-encre` ;
     « Rapport d'impact (PDF) » en action dominante), Activité, Contenu,
     Revenus (`paiements.voir`), Impact (filtres période 8/12/26 semaines,
     examen et série, établissement ; assidus et autres côte à côte, jauge
     et examens blancs ; méthode), Journal des accès (filtre par action,
     auteur ou IP, dates ; appareil lu dans l'agent), Personnel. Graphiques
     dessinés à la main (`components/console/graphiques.tsx`, pas de
     bibliothèque) : un axe, série de comparaison en pointillés, survol
     avec réglette et bulle, tableau équivalent pour les lecteurs d'écran.
   - **Rapport PDF** (`RapportImpact`, vue `rapports.impact`) : une page
     A4, Bricolage Grotesque en trois instances TTF statiques tirées de la
     police variable (`resources/fonts/pdf`, OFL : dompdf ne lit ni woff2
     ni polices variables), courbe en SVG, phrase-clé, deux groupes,
     méthode et « une association, pas une cause » ; bandeau EXEMPLE si
     des élèves fictifs y entrent ; chaque export au journal
     (`rapport_impact.exporte`, avec les filtres).
   - **Désactiver un compte** : `ComptesService` (seule porte) — jamais
     son propre compte, jamais le dernier administrateur actif ; sessions
     en base supprimées, jeton « se souvenir de moi » changé ; nouveau
     middleware `CompteDesactive` (déconnecte une session encore ouverte,
     **bug préexistant corrigé**) ; il laisse passer `sync/*` : la
     synchronisation décide geste par geste (un geste fait hors ligne avant
     la désactivation reste accepté, `SynchroService`, HORS_LIGNE.md A.6 —
     c'est la suite complète qui l'a rappelé,
     `SynchroEnTantQueLAuteurTest`) ; un compte qui n'est pas du personnel
     répond 404.
   - **Permissions** : `console.impact`, `console.journal`,
     `comptes.administrer` (administrateur plateforme). Les routes
     Activité et Contenu sont sous `espace.console`.
   - **Démonstration** : `DemoPlateformeSeeder` — 60 élèves fictifs
     (40 BEPC dont la moitié au collège de démonstration, 20 Bac SE), douze
     semaines de séances, de jours actifs, de relevés, d'examens blancs, de
     paiements simulés et de codes prépayés (par le vrai service), graine
     fixe ; `profils_eleves.est_exemple` (nouvelle colonne) marque tous les
     élèves de la démonstration et déclenche le bandeau. Le scénario fait
     progresser les assidus (+18,5 points de jauge contre +3,5) : ce n'est
     **pas une mesure**.
   - **Écart** : aucun au PLAN ; la console reste en ligne seulement
     (`HORS_LIGNE.md` B.3 « Lot 13 »).
   - **Preuve** : Pest `Console/PlateformeTest` (11, dont le critère :
     PDF téléchargé, `%PDF-`, chiffres de l'écran, journal) et
     `Console/PersonnelEtJournalTest` (7) ; `SeederDemonstrationTest`
     complété ; `AccesParRoleTest` (toutes les nouvelles routes gardées) ;
     Larastan niveau 7 à 0 ; Playwright `ecrans-lot13.spec.ts` (42
     captures : 7 écrans × 360 / 768 / 1366 × clair / sombre, axe sans
     violation sérieuse, aucun débordement) et `parcours-lot13.spec.ts`
     (le critère : filtre BEPC, « Télécharger le rapport (PDF) », fichier
     `%PDF-` nommé, export au journal ; projet `parcours-impact`, après les
     captures, l'entrée du journal effacée à la fin).
     **Totaux** : `php artisan test` **717 passants** (6 277 assertions),
     `npm run test:js` **414**, `tsc`, `vp check`, Pint, Larastan et
     `npm run build` verts. Passe visuelle complète sur le build (projet
     `ecrans`, en série) : 730 captures sur 733 identiques du premier
     coup ; les trois autres (groupe vu par l'établissement à 360 px,
     culture générale à 360 px) repassent vertes seules — instables
     préexistantes (ordre d'élèves à égalité d'activité, ardoise chargée
     à la demande), écrans que ce lot ne touche pas.
   - **Vu et corrigé** (Playwright) : « % » renvoyé seul à la ligne dans
     la carte d'impact ; étiquette « 100 % » coupée sur l'axe (colonne à la
     largeur de la plus longue étiquette) ; « 41 h » coupé ; accords
     « 1 notions » ; paliers à 0,5 pour des comptes ; colonnes déséquilibrées
     de la vue d'ensemble (actifs par examen en lignes compactes) ;
     rétention de démonstration trop belle (94 %) ; flèche absente de la
     police du PDF ; rapport ramené à une page. Références des écrans de
     la console des lots précédents régénérées (la navigation de la
     console a ses vrais liens) : vue d'ensemble du lot 0 (8, refaite),
     lot de codes et paiements du lot 9 (12 : la cohorte y ajoute ses
     paiements et ses codes) — **toutes relues**, aucune autre ne bouge.
   - **Reste** : le premier relevé de production (dimanche suivant la mise
     en ligne) ; le rapport ouvert chez un partenaire (`A_TESTER.md`,
     lot 13) ; un rôle « partenaire » qui lirait l'impact de son seul
     établissement, si Maurice le veut ; `composer audit` signale 11 avis
     de sécurité **préexistants** (Laravel, Symfony) — mise à jour à
     décider à part, pas faite dans ce lot.

30. [~] **Lot 14 — terrain : outils de l'essai (critère pas encore tenu)**
   (2026-11-21, sur `main`, un commit)
   - **Constat** : le critère du lot (« liste `A_TESTER.md` exécutée sur
     vrais téléphones », avec de vrais élèves à Conakry et dans une
     préfecture) **ne peut pas être tenu par Claude Code**, et il est
     bloqué par **D11** (sans HTTPS, pas de service worker sur un
     téléphone, donc pas de hors ligne à essayer) et par les autorisations
     écrites (des mineurs, D9). Rien dans l'application ne disait ce qui
     casse sur un téléphone d'élève, ni ce que l'élève en pense ; la
     plaquette demande « test d'essai, critiques, prise en compte ».
   - **Décisions de Maurice** (2026-11-21, plan accepté tel quel) :
     1. `A_TESTER.md` **reste la seule liste** des contrôles (pas de copie
        dans la console) ; les résultats remontés passent en « Contrôles
        faits » ;
     2. « Ton avis » **rattaché au compte** (pseudo, examen, établissement
        lus par la plateforme seulement, jamais par un établissement) ;
     3. les erreurs rattachées **à l'appareil seulement** ;
     4. aucun essai sans l'accord écrit des parents et de l'établissement,
        et seulement après D11.
   - **Ce qui est fait** — une autorité, `App\Services\TerrainService` ;
     tout arrive par la file d'opérations (`HORS_LIGNE.md` B.3 « HL8 ») :
     - **« Ton avis »** (`avis.donner`) : Oui / Un peu / Non, six
       étiquettes (`EtiquetteAvis`, mêmes clés et libellés côté appareil,
       vérifié par un test), un mot de 300 caractères passé au filtre du
       fil (`FiltreFil` : numéro, lien, adresse, mot interdit) ; 5 par
       jour ; proposé dans le bilan d'une séance, d'un quiz ou d'un devoir
       **une fois par semaine au plus** et par profil, et depuis « Mon
       compte › Appareils » ;
     - **diagnostic de l'appareil** (`diagnostic.envoyer`) : « Mon compte ›
       Appareils › Cet appareil », lu sur l'appareil (hors ligne aussi),
       alertes en clair (heure fausse, stockage non protégé, place, gestes
       à corriger, version en attente), « Envoyer ce diagnostic » avec un
       **code de six caractères** (alphabet de Crockford) choisi par
       l'appareil ; le serveur ne garde que 23 clés typées, rien de
       personnel ;
     - **erreurs captées** (`erreurs.signaler`) : script, promesse rejetée,
       page qui ne se charge pas (A.3.3), geste « À corriger » sur échec
       répété ; regroupées par empreinte (nombres neutralisés), chemin sans
       domaine ni paramètres, numéros / adresses / jetons masqués ; jamais
       refusées (un refus s'afficherait à l'élève), plafonnées ;
     - **Console › Terrain** (`console.terrain`, administrateur
       plateforme) : chiffres clés, avis (réponse, écran, étiquettes,
       commentaire, « Traiter » avec la décision — la trace de la prise en
       compte), « Ce qui gêne », erreurs (combien de fois, navigateur,
       version, pile), diagnostics (recherche par code sur toute la
       garde) ; **campagnes d'essai** (nom, lieu, établissement, dates) qui
       filtrent le tout ;
     - **purge** : `terrain:purger` chaque nuit (diagnostics et erreurs
       90 jours, avis un an) ;
     - **`TERRAIN.md`** : préalables bloquants, interdits (aucune photo ni
       vidéo de visage), matériel, la veille, déroulé d'une demi-journée
       relié aux entrées de `A_TESTER.md`, fiche de passation, après
       l'essai, modèle d'autorisation parentale (à faire relire, D9).
   - **Démonstration** : `DemoTerrainSeeder` — une campagne d'exemple au
     collège de démonstration, 12 avis d'élèves de la cohorte fictive (3
     traités), 4 erreurs, 2 diagnostics, 3 appareils ; tout `est_exemple`
     (bandeau).
   - **Écarts** (`HORS_LIGNE.md` B.5, n° 37 et 38) : diagnostic et erreurs
     **réservés à l'élève** (la file ne tourne que pour lui ; le plan les
     prévoyait pour tout compte) ; `/compte/appareils` **entre dans la
     liste blanche** (c'est sans réseau qu'on a besoin du diagnostic).
   - **Bugs trouvés en chemin, corrigés** : (1) la vérification horaire du
     service worker (`inscription.update()`) rejetait sans traitement
     quand le réseau manquait — **trouvée par la capture d'erreurs
     elle-même**, pendant les captures (préexistant, lot 0) ; (2) deux
     erreurs captées dans le même instant s'écrasaient dans le stockage
     (lire puis réécrire) : écritures l'une après l'autre (trouvé par
     `terrain.test.ts`).
   - **Preuve** : Pest `Terrain/TerrainTest` (17 : file une seule fois,
     heure du geste, filtre, quota, validation, élève seul, clés du
     diagnostic, plafonds sans refus, regroupement et anonymisation,
     purge, accès à la console, campagne par dates et établissement,
     validation de la campagne, traitement d'un avis et 404, libellés
     identiques) ; `ConnexionTest` et `GestesEleveTest` mis à jour
     (permission et registre) ; Vitest `terrain/terrain.test.ts` (14).
     **Totaux** : `php artisan test` **734 passants**, `npm run test:js`
     **428**, `tsc`, `vp check`, Pint, Larastan niveau 7 et
     `npm run build` verts. Playwright `ecrans-lot14.spec.ts` (32
     captures : 4 écrans × 360 / 768 / 1366 × clair / sombre, axe sans
     violation sérieuse, aucun débordement). **Passe complète sur le
     build** (776 tests, en série) : 758 verts du premier coup ; références
     **régénérées et relues**, parce que l'écran a changé à dessein :
     `lot7/appareils` (6, la section « Cet appareil »), `lot2/seance-bilan`
     et `lot12/parcours-quiz-bilan` (la carte « Ton avis » sous les
     actions ; l'action dominante reste visible à 360 × 740) ; deux
     instabilités préexistantes repassent vertes seules
     (`lot12/eleve-sortie` à 360 px, axe pendant une transition dans le
     critère du lot 12) ; les parcours qui dépendent des captures ont été
     relancés (`--no-deps`), verts. ⚠ Le parcours du lot 4 lance lui-même
     `queue:work --once` : la commande Playwright doit porter
     `ANNALES_EXTRACTEUR=simule` (sinon l'import tente la vraie API).
     `parcours-lot13.spec.ts`, mal formaté depuis le lot 13, est reformaté
     (`vp check` vert).
   - **Vu et corrigé** (Playwright) : « 9 aviss » et « 25 foiss » (pluriel
     invariable) ; « Une nouvelle version attend » affiché à tort pendant
     la **première** installation du service worker (nouvel état « En
     cours d'installation ») ; version « inconnue » au premier rendu (lue
     sur la page Inertia) et hachage entier trop long (8 caractères) ;
     dix lignes empilées à 360 px (grille sur deux colonnes partout) ;
     sélecteur de campagne tout en bas à 360 px, sous la liste (remonté
     avant la liste sur mobile, en tête de colonne sur ordinateur). Les
     captures de référence masquent les valeurs lues sur l'appareil ; une
     relecture sans masque (`REVUE=<dossier>`) a servi à les regarder.
   - **Reste — le critère** : les essais eux-mêmes, après D11 et les
     autorisations (`TERRAIN.md`) ; les 7 contrôles HL8 et toute la liste
     `A_TESTER.md` sur vrais téléphones ; puis les corrections qui en
     sortent (lot 14 bis). Le modèle d'autorisation parentale est à faire
     relire par un juriste.

31. [x] **On dit « sujet », plus « annale »** (2026-11-21, sur `main`, un
   commit)
   - **Constat** : « annales » est le mot de France ; en Guinée, élèves et
     enseignants disent « les sujets », « les anciens sujets », « les
     sujets corrigés ». Le code disait déjà `Sujet` (modèle) et `/sujets`
     (pages publiques) : seul le vocabulaire affiché ne suivait pas.
   - **Décisions de Maurice** (2026-11-21, les quatre points acceptés) :
     1. tout ce que voient élèves, parents et enseignants : **« Sujets »**
        dans un menu ou un onglet, **« Sujets d'examen »** en titre
        d'écran, **« Sujets corrigés »** sur la vitrine (ce que les élèves
        cherchent ; titre, description et carte de partage aussi) ;
     2. le back-office aussi (« Sujets », « Relecture › Sujets »,
        « Vérifier le sujet », messages et confirmations) ;
     3. les adresses : `/eleve/annales…` → `/eleve/sujets…`,
        `/eleve/documents/annales/…` → `/eleve/documents/sujets/…`,
        `/contenu/annales…` → `/contenu/sujets…`, `/contenu/relecture/annales`
        → `/contenu/relecture/sujets` ; noms de route `eleve.sujets.*`,
        `contenu.sujets.*` ; pages `eleve/sujets`, `eleve/sujet`,
        `contenu/sujets/*`. Fait **maintenant**, tant qu'aucun élève n'a
        l'application installée (pas de copie hors ligne à l'ancienne
        adresse) ;
     4. les documents : une règle de vocabulaire dans `CLAUDE.md` § 5,
        `DESIGN.md` § 9 et `PLAN_NKARAMOGO.md` M6, sans réécrire
        l'historique.
   - **Anciennes adresses** : `AnciennesAdressesController` redirige
     (301) vers la nouvelle, **paramètres compris** (`?mode=examen`) —
     la redirection native de Laravel les perdait. Sans compte : la page
     d'arrivée garde ses contrôles.
   - **Accords** : le mot change de genre. Remplacement par règles,
     phrase par phrase (cas particuliers d'abord : « un sujet publié »,
     « tous les sujets », « Ce sujet n'est plus proposé »), puis
     **relecture de chaque phrase visible modifiée** : elle a trouvé et
     corrigé « une sujet officiel », « Du scan à l'sujet publié »,
     « d'sujet », « sujets publiques », « proposée », « semées » (deux
     règles enchaînées, ou une apostrophe échappée en PHP). La suite PHP
     a trouvé « Ce sujet n'est plus proposée ».
   - **Gardé tel quel (noms internes, invisibles)** : classes
     (`AnnaleController`, `ImportAnnaleController`, `Services\Annales`),
     table et config `annales`, permission `annales.importer`, valeur
     `source = annale`, type d'élément de pack `annale` (un pack déjà
     téléchargé reste lisible), clés de props (`annales`,
     `annales_disponibles`), noms des captures de référence.
   - **Hors ligne** : la liste blanche suit (`/eleve/sujets`),
     `HORS_LIGNE.md` B.5 n° 39.
   - **Preuve** : Pest `AnciennesAdressesTest` (9 : sept anciennes
     adresses, paramètres compris ; la redirection ne donne aucun accès ;
     les nouvelles s'ouvrent) ; tests existants mis à jour (noms de route,
     adresses, messages). **Totaux** : `php artisan test` **743 passants**,
     `npm run test:js` **428**, `tsc`, `vp check`, Pint, Larastan niveau 7
     et `npm run build` verts. Vitrine en rendu serveur vérifiée
     (`build:ssr`, processus relancé, `data-server-rendered`, aucune
     erreur d'hydratation, « Sujets corrigés » dans le HTML).
     **Playwright** : toutes les références **régénérées**
     (`--update-snapshots=all`) — avec la tolérance de 1 %, le seul
     libellé du menu passait sous le seuil et les références auraient
     gardé « Annales » ; 776 tests verts (les écrans `eleve-sortie` et
     `eleve-tuteur-conversation`, en échec pendant une passe de 4 h 4 sur
     un poste chargé, repassent verts seuls).
   - **Vu et corrigé** (Playwright) : filtres et pastilles du back-office
     restés au féminin (« Toutes », « Les miennes », « Publiée »,
     « Archivée ») → `statutDe(statut, 'masculin')` et `BadgeStatut
     genre="masculin"` pour un sujet (leçons et questions restent au
     féminin) ; confirmations « Les élèves ne **la** verront plus »,
     « **Elle** et toutes ses questions » → au masculin. Deux imports en
     échec et trois travaux en souffrance, laissés dans la base de
     démonstration par un parcours du lot 4 lancé sans
     `ANNALES_EXTRACTEUR=simule`, retirés (`queue:work --once` du parcours
     traitait sinon un ancien travail).
   - **Reste** : rien.

32. [x] **Dépôt propre avant GitHub : `.gitignore` et historique purgé**
   (2026-11-24, sur `main`)
   - **Constat** (audit en lecture seule) : **aucun secret réel** dans Git,
     ni dans les fichiers suivis ni dans l'historique (`APP_KEY` et
     `ANTHROPIC_API_KEY` du `.env` n'apparaissent nulle part ; les
     mentions des documents sont des exemples, `sk-ant-…`). Mais :
     - `tests/visuel/captures/` : 828 PNG, 135 Mo par version, **403 Mo
       dans l'historique** (2 333 versions : chaque régénération en
       ajoute une copie) ; la CI ne lance pas Playwright ;
     - `docs/presentation-ministere/` (PDF, PowerPoint, captures) :
       **suivi alors que `/docs` était dans le `.gitignore`** (ajouté
       après coup : ignorer ne retire pas du suivi) ; 60 Mo d'historique ;
     - trous du `.gitignore` : `.env.local`, `.env.testing`… non ignorés ;
       rien pour les clés et certificats (la clé de signature du Play
       Store viendra, D12), ni pour les fichiers Windows ;
     - le mot de passe de démonstration est `password` (pas une fuite :
       il n'existe que hors production ; trop faible pour une préproduction
       en ligne).
   - **Décisions de Maurice** (2026-11-24) : purger l'historique et
     remplacer `main` sur GitHub ; retirer le dossier ministère du dépôt ;
     le dépôt GitHub est **privé**.
   - **Fait** : `.gitignore` réorganisé par blocs commentés (secrets et
     environnements `.env.*` sauf `.env.example`, clés `*.pem` `*.key`
     `*.p12` `*.pfx` `*.keystore` `*.jks`, `google-services.json` ;
     captures de référence ; relectures `REVUE` et rapports Lighthouse ;
     `/docs` ; `/.sauvegardes` ; couverture ; `Thumbs.db`, `desktop.ini`) ;
     captures et dossier ministère retirés du suivi (**ils restent sur le
     poste**) ; historique réécrit sans eux (`git filter-repo`) puis
     `main` poussée en remplacement sur GitHub. Sauvegarde complète de
     l'ancien historique : `.sauvegardes/g-etudie-avant-purge-2026-11-24.bundle`
     (ignoré ; `git clone` de ce fichier rend l'ancien dépôt).
   - **Conséquences** : les identifiants de commit cités plus haut dans ce
     DEVBOOK sont ceux d'avant la purge (le message de commit, lui, est
     inchangé) ; une autre copie du dépôt doit être **re-clonée** ; sur un
     poste neuf, les captures de référence se créent au premier passage
     (`DEMARRAGE.md` § 2).
   - **À faire par Maurice** : changer `DEMO_MOT_DE_PASSE` dans `.env`
     avant toute préproduction accessible en ligne.

*(Claude Code ajoute ici un point numéroté par lot ou par décision : le constat,
la décision, la preuve — tests ajoutés et nombre total de tests passants.)*

### Points ouverts

- [x] **`CodesAccesTest` fragile — corrigé** (2026-11-13) : un échec à la
  ligne 105 dans un passage complet. Cause : le code « mal tapé » était le
  vrai code dont le dernier caractère devenait « Z » ; un code qui finissait
  déjà par « Z » restait juste (une fois sur trente). Le caractère change
  maintenant toujours.

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
- [x] **Désactiver un compte du personnel** : fait au lot 13 (point 29,
  Console › Personnel) ; un compte qui a signé du contenu ne se supprime
  toujours pas (point 15).- **Domaine et hébergement** (D11) : à fixer avant la clôture du lot 0 (HTTPS).
- **Logo vectoriel** : remplacera le monogramme provisoire des icônes (DA8).
- **Fournisseur SMS** (D3) : à choisir avant le lot 8 ; d'ici là, aucun SMS
  ne part (codes dans le journal Laravel en développement).
- **Recours d'un élève au numéro jamais vérifié qui a oublié son mot de
  passe** : l'écran dit « demande de l'aide à ton enseignant ou à
  N'karamögö » ; le canal d'assistance (et l'écran administrateur qui
  réinitialise un mot de passe) reste à définir.
- **Lot 12** : « Ça m'aide » sur une réponse du fil et les classements
  opt-in hors groupe (PLAN M9 : classe, établissement, région) ne sont pas
  faits ; la liste des mots interdits de production est à saisir par le
  responsable pédagogique ; le contenu de culture générale (sourcé) est à
  rédiger par l'équipe.
- [x] **Espaces parent, enseignant, gestionnaire** : faits au lot 11
  (point 27) ; enseignants et gestionnaires prennent la session de 12 h et
  la double authentification du personnel.
- **Résumé hebdomadaire au parent** (PLAN M15) : par SMS ou WhatsApp,
  quand un fournisseur sera choisi (D3).
- **Comptes élèves créés par l'école** : refusés au lot 11 (numéros de
  mineurs saisis par un tiers) ; à revoir avec D9.
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
| `Seance` | `seances` | élève | `uuid`, `jour` (vide tant qu'une séance préparée n'est pas commencée), `rang` (1 à 3), `questions` (ids ordonnés), `termine_le`, `remplacee_le` ; choisie par `SeanceService` seulement |
| `Maitrise` | `maitrises` | élève, notion | `score` 0–100, `reponses`, `palier` 0–5, `prochaine_revision_le`, `derniere_reponse_le`, `maj_le` ; écrite par `MaitriseService` seulement, recalculée depuis toutes les réponses |
| `SerieJour` | `series_jours` | élève | `jour` (du geste), `reponses`, `secondes`, `objectif_atteint` ; `MotivationService` |
| `PointEffort` | `points_effort` | élève | ajout seulement ; `source` + `source_cle` uniques (idempotent), `points`, `recu_le` |
| `Badge`, `BadgeObtenu` | `badges`, `badges_obtenus` | — ; élève, badge | catalogue semé (`BadgeSeeder`, clé, nom, description, icône, points, ordre) ; règle par clé dans `MotivationService::regles()` |
| `Defi`, `ParticipationDefi` | `defis`, `participations_defis` | matière ; défi, élève | `semaine` (lundi), `type` `bonnes_reponses`, `objectif` ; `reussi_le` |
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
| `/sujets`, `/sujets/{slug}`, `/sitemap.xml`, `/robots.txt`, `/partage/n-karamogo.png`, `/partage/sujets/{slug}.png` (lot 8) | publiques ; un sujet n'existe que si `AnnalesPubliques` le dit public (404 sinon) | `routes/web.php` |
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
| `/eleve/examens-blancs`, `/eleve/examens-blancs/{uuid}` (le passage : `/eleve/sujets/{uuid}?mode=examen`) | `auth` + `can:espace.eleve` ; résultat gardé par `ExamenBlancPolicy::voir` (404) | `routes/eleve.php` |
| `/eleve/sujets`, `/eleve/sujets/{uuid}`, `/eleve/documents/sujets/{uuid}`, `/eleve/signalements` | `auth` + `can:espace.eleve` ; sujet gardé par `SujetPolicy::lire` (404) | `routes/eleve.php` |
| `/contenu/sujets` (liste, fiche, document), `/contenu/relecture/sujets` ; importer (`sujets/importer`, `sujets/imports`, relancer) ; parties, questions d'un sujet, circuit | `can:espace.contenu` · `can:annales.importer` (+ `throttle:20,60`) · `can:contenu.rediger` / `relire` / `administrer` ; `SujetPolicy` | `routes/contenu.php` |
| `/eleve/progression` (« Ma progression »), `/eleve/instantane` (JSON de l'appareil, HL4) | `can:espace.eleve` + profil requis | `routes/eleve.php` |
| `/contenu/signalements`, fiche, répondre | `can:signalements.traiter` ; `SignalementPolicy` (404) | `routes/contenu.php` |
| `/compte/*` (profil, mot de passe, numéro, affichage, vérification, suppression) | `auth`, dérogations « Mon compte » | `routes/compte.php` |
| `/compte/securite` | `auth` + `can:compte.double_authentification` + `password.confirm` | `routes/compte.php` |
| `/mot-de-passe-oublie*` | `guest` | `routes/compte.php` |
| Fortify : connexion, inscription, 2FA, confirmation du mot de passe | Fortify ; routes authentifiées en dérogation, activation 2FA gardée au geste | paquet |

Toute exception est justifiée dans `AccesParRoleTest::OUVERTES_A_TOUS`.

## 12. Mise en production — liste à suivre

> **Déplacée dans `MISE_EN_PRODUCTION.md`** (2026-11-06, à la demande de
> Maurice) : prérequis du serveur, `.env` de production, premier
> déploiement pas à pas, file d'attente (Supervisor) et planificateur
> (cron), déploiements suivants, journaux, sauvegardes, et **ce que chaque
> lot demande au déploiement** (commandes « une seule fois » comprises :
> `progression:recalculer` au lot 6, `packs:generer` au lot 7). C'est la
> seule liste à suivre ; chaque lot la complète (`CLAUDE.md` § 7).
