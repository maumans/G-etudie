# PLAN_NKARAMOGO.md — N'karamögö · G-Étudie

> **Source de vérité fonctionnelle** du projet. À lire avec `CLAUDE.md` (règles
> de travail), `DESIGN.md` (direction visuelle) et `HORS_LIGNE.md` (mode hors
> ligne). L'état réel du code vit dans `DEVBOOK.md`, tenu à jour point par point.
>
> Porteur : VISION FUTURE – ENTREPRISES Sarlu (Kountya, Coyah).
> Rédigé le 2026-10-29 à partir de la plaquette du projet.
> Démarrage avec Claude Code : `DEMARRAGE.md`.

---

## 0. En une phrase

Une plateforme web installable (téléphone, tablette, ordinateur) où un élève
guinéen en classe d'examen **révise ses cours, s'entraîne sur les vraies annales
corrigées depuis 2010, passe des examens blancs chronométrés, et sait chaque
jour à quel point il est prêt** — même avec un forfait internet minuscule et une
connexion qui coupe.

---

## 1. Ce que demande la plaquette — et où chaque demande atterrit

Chaque phrase de la plaquette est une exigence. Elle est tracée vers un module
(section 5). Rien n'est oublié, rien n'est inventé sans être signalé.

| Demande de la plaquette | Module | Priorité |
|---|---|---|
| Application **multiplateforme** (téléphones, tablettes, ordinateurs) | Socle PWA installable (+ Play Store via TWA plus tard) | MVP |
| Cours selon le **programme national** guinéen, primaire → lycée, « surtout les classes d'examens pour un départ » | M3 Référentiel, M4 Cours | MVP (classes d'examens) |
| **Sujets et corrigés types** des examens nationaux **depuis 2010** | M6 Annales | MVP |
| **Exercices de simulation** liés aux classes d'examens | M5 Exercices, M7 Examen blanc | MVP |
| Apprendre **à son rythme, où que l'on soit** | M8 Progression, M12 Hors ligne | MVP |
| Cours **interactifs et personnalisés** | M4 (blocs interactifs), M8 (révision ciblée), M11 Tuteur | MVP / V1.1 |
| **Culture générale** : Guinée, Afrique, monde | M10 Culture générale | V1.1 |
| **Liens** vers d'autres connaissances universelles | M19 Ressources externes | V1.1 |
| **Égalité des chances** pour tous | Gratuité d'un socle, hors ligne, faible consommation de données, accessibilité | MVP |
| Créer un **réseau entre élèves** de même promotion | M13 Communauté (encadrée — voir § 2.6) | V2 |
| **Motivation** des élèves, centre d'intérêt | M9 Motivation (séries, défis, classements) | MVP |
| Élèves **en confiance pendant les examens réels** | M7 Examen blanc aux conditions réelles | MVP |
| **Améliorer le taux de réussite** | M18 Console : mesure de l'effet (§ 15) | MVP (mesure) |
| **Partenariats** ministères, donateurs, institutions | M14 Établissements, M18 Console, rapports d'impact | V2 |
| **Employabilité des jeunes / activités génératrices de revenus** | Hors produit : rédacteurs, relecteurs, ambassadeurs rémunérés (§ 7) | Organisation |
| Méthodologie : test d'essai, critiques, prise en compte | Lot 14 Terrain + M17 Signalement d'erreurs | MVP |
| Maintenance, suivi-évaluation, capitalisation | M18 Console, journal, sauvegardes | MVP |

---

## 2. Ce que la plaquette ne dit pas, ou dit de façon à corriger

À régler avant de montrer le produit (ou la plaquette) à un ministère ou un
bailleur. Une erreur de nom d'examen dans une application d'examens se remarque
tout de suite.

### 2.1 Le nom de l'examen de fin de primaire
La plaquette parle du **CEPE**. L'examen guinéen de fin d'études élémentaires est
le **CEE** (Certificat d'Études Élémentaires), qui ouvre l'accès à la 7e année ;
c'est l'appellation employée par la DGECS pour la session 2026. → L'application
dit **CEE** partout. La plaquette est à corriger. Une coquille « BEPE » s'y trouve
aussi (pour **BEPC**).

### 2.2 La structure réelle du système
- Primaire : 1re à 6e année → **CEE**.
- Collège : 7e à 10e année → **BEPC**.
- Lycée : 11e, 12e, Terminale → **Baccalauréat unique**, en trois séries :
  **Sciences Mathématiques (SM)**, **Sciences Expérimentales (SE)**, **Sciences
  Sociales (SS)**.
- Une **filière franco-arabe** existe au CEE et au Bac (SE et SS). La plaquette
  n'en parle pas : décision D2.
- Chaque série a ses matières et **ses coefficients** : l'examen blanc doit les
  reproduire (calcul de moyenne pondérée). Les coefficients et durées officiels
  sont des **données à saisir et à faire valider**, jamais à deviner.

### 2.3 Les statistiques citées
« Les trois dernières années de 2022 à 2019 » couvre quatre années, et les taux
cités (14 %, 40 %, 39 %) ne sont pas sourcés. Pour un dossier de financement :
citer les chiffres officiels publiés par la DGECS, avec année et examen. Le
tableau de bord d'impact de la console (§ 15) servira ensuite de preuve.

### 2.4 Les droits sur le contenu — le vrai risque du projet
- Les **sujets d'examens** appartiennent à l'État. Les publier à grande échelle
  sans accord expose le projet. → Convention avec le ministère de tutelle / la
  DGECS (décision D5). C'est aussi le meilleur argument commercial.
- Les **corrigés** et les **cours** rédigés par nos propres enseignants sont
  notre propriété — à condition de les payer et de faire signer une cession de
  droits. **Aucun copier-coller de manuels ou de sites tiers.**
- L'IA peut aider à **mettre en forme** un sujet scanné ; elle ne doit **jamais
  inventer** un sujet présenté comme officiel, ni publier un corrigé non relu
  par un enseignant.

### 2.5 Le contenu est le chantier principal, pas le code
Ordre de grandeur des annales depuis 2010 : environ 3 examens × 16 sessions ×
(≈5 épreuves au CEE + ≈7 au BEPC + 3 séries × 7 au Bac) ≈ **500 sujets**, chacun
avec un corrigé détaillé. Plus les cours de chaque chapitre des classes
d'examens. Sans équipe de rédaction organisée, la plus belle application est
vide. → Section 7, et lancement **par matières phares** (D1).

### 2.6 « Un réseau entre élèves » — les utilisateurs sont des mineurs
Une messagerie libre entre adolescents inconnus est un risque réel
(harcèlement, contacts d'adultes malveillants) et une charge de modération.
→ La communauté se fait **par groupes encadrés** (classe créée par un
enseignant, questions-réponses modérées, défis entre camarades), **sans
messagerie privée libre**, **sans photo de profil**, avec pseudonyme. Décision D7.

### 2.7 Les contraintes de terrain absentes de la plaquette
Forfaits chers et petits, Android d'entrée de gamme, téléphone **partagé** par
la famille, coupures de courant et de réseau, révisions **le soir**. Ce ne sont
pas des détails : ce sont des exigences (§ 9). Le mode hors ligne est
spécifié en entier dans `HORS_LIGNE.md`.

### 2.8 Le nom de marque
« N'KARAMÖGÖ – G - ETUDIE » s'écrit de trois façons dans la plaquette. Proposition :
- marque : **N'karamögö** (« Mon maître ») ;
- signature : **G-Étudie** (« la Guinée étudie ») ;
- domaine et recherche : **nkaramogo** (le « ö » ne se tape pas sur un clavier
  de téléphone ; la recherche interne et le SEO acceptent les deux graphies).

---

## 3. Vision produit — la thèse

> **Un soir, quinze minutes, et je sais où j'en suis.**

L'élève ouvre l'application le soir, souvent sur un téléphone partagé, avec peu
de données. L'écran d'accueil répond immédiatement à trois questions :

1. **Combien de temps avant mon examen ?** — compte à rebours (J-214 avant le BEPC).
2. **Suis-je prêt ?** — la **jauge de préparation** : un pourcentage par matière,
   pondéré par les coefficients, calculé sur ce qu'il a réellement réussi.
3. **Que faire ce soir ?** — **la séance du jour** : 15 minutes proposées, choisies
   là où il est le plus faible et là où ça rapporte le plus de points.

Tout le reste (cours, annales, examens blancs, culture générale) se traverse
depuis là. C'est le dispositif qui porte la thèse du produit.

**Ce qui doit donner l'impression de sérieux et de modernité** : la qualité des
corrigés (pas à pas, formules propres), la fluidité sur un petit Android,
l'examen blanc qui ressemble à un vrai, et le tuteur qui explique.

---

## 4. Publics et rôles

| Rôle | Qui | Ce qu'il fait |
|---|---|---|
| `eleve` | 11–20 ans, classe d'examen | révise, s'entraîne, passe des examens blancs |
| `parent` | parent / tuteur | suit la progression de ses enfants (lecture seule), paie l'abonnement |
| `enseignant` | professeur partenaire | crée des classes, donne des devoirs, suit ses élèves, répond aux questions |
| `redacteur` | enseignant recruté | rédige cours, exercices, corrigés |
| `relecteur` | enseignant expérimenté | valide ou renvoie un contenu ; **un contenu n'est publié qu'après relecture** |
| `admin_contenu` | responsable pédagogique | référentiel, planning éditorial, signalements |
| `gestionnaire_etablissement` | école partenaire | licences, comptes de ses élèves, rapports |
| `superadmin` | plateforme | console, paiements, partenaires, statistiques d'impact |

Permissions par `spatie/laravel-permission`, **une permission dit ce que le
compte peut faire, le rattachement (classe, établissement, enfant) dit sur quoi**.
Les policies répondent **404, pas 403**.

---

## 5. Périmètre fonctionnel

Légende : **MVP** = lancement · **V1.1** = dans les trois mois qui suivent ·
**V2** = ensuite.

### M1 — Site public (vitrine) · MVP
Le premier contact, qui doit donner envie et inspirer confiance.
- Héro : promesse + **aperçu réel** d'un exercice jouable sans compte (une
  question de maths de BEPC, corrigé animé). Montrer plutôt que dire.
- Les trois examens (CEE, BEPC, Bac SM/SE/SS) et ce qu'on trouve pour chacun.
- Compte à rebours national jusqu'aux prochains examens.
- « Comment ça marche » en 3 temps · hors ligne · faible consommation de données.
- Partenaires et établissements (vrais logos, quand ils existent — **aucun faux
  témoignage, aucun faux logo**).
- Installation de l'application (bouton « Installer » PWA ; Play Store plus tard).
- Tarifs clairs en GNF.
- SEO : une page publique par sujet d'annale (énoncé visible, corrigé réservé aux
  inscrits) — c'est ce que les élèves tapent dans Google (« sujet bac SM 2019 maths »).
- Cartes de partage soignées (Open Graph) : **WhatsApp est le canal de diffusion
  principal**. Chaque résultat d'examen blanc est partageable en image.

### M2 — Comptes et premier lancement · MVP
- Inscription par **numéro de téléphone guinéen** (+224) + mot de passe. Pas
  d'email obligatoire : beaucoup d'élèves n'en ont pas.
- SMS de code **uniquement** pour la récupération du mot de passe et la
  vérification initiale (coût SMS maîtrisé — D3).
- Parcours d'accueil en 4 écrans maximum : examen visé → série (si Bac) →
  établissement (facultatif) → objectif du soir (10, 15 ou 30 min). Puis
  **un premier exercice immédiatement**, pas un tableau vide.
- **Profils sur un téléphone partagé** : plusieurs élèves d'une même famille sur
  un appareil, chacun protégé par un code à 4 chiffres (D8).
- Lien parent ↔ enfant par un code généré dans le compte de l'élève.
- Changement de mot de passe et de numéro par l'utilisateur lui-même, dès le
  lot 0 (sinon un mot de passe communiqué à l'ouverture du compte ne change jamais).

### M3 — Référentiel pédagogique · MVP
Examens → séries → classes → matières (avec coefficient et durée par série) →
chapitres → notions. Saisi par l'admin contenu, versionné par année scolaire
(les programmes et coefficients changent). Source unique pour les cours, les
exercices, les annales, la jauge et l'examen blanc.

### M4 — Cours · MVP
- Une leçon = une suite de **blocs** : texte, formule (LaTeX), image/schéma,
  encadré « À retenir », méthode, exemple résolu, piège fréquent, mini-question
  de vérification, audio court (V1.1).
- Lecture confortable sur 360 px de large, mode sombre, taille de texte réglable.
- « À retenir » rassemblé en **fiche de révision** par chapitre (consultable hors
  ligne, imprimable).
- Marquer « compris / à revoir ». Reprendre là où on s'est arrêté.

### M5 — Exercices et moteur de questions · MVP
- Types : QCM (une ou plusieurs réponses), vrai/faux, réponse numérique (avec
  tolérance et unité), réponse courte (normalisation accents/casse), texte à
  trous, appariement, remise en ordre, **question ouverte autocorrigée** (l'élève
  compare sa rédaction au corrigé et s'évalue selon un barème — indispensable
  pour le français, la philosophie, l'histoire).
- Pour chaque question : indice(s) progressifs, corrigé détaillé **pas à pas**,
  notion liée (lien vers le cours), difficulté, source (annale X ou exercice maison).
- Retour immédiat : **icône + mot + couleur** (jamais la couleur seule).
- Mode **séance** : file de questions adaptée (faiblesses + révision espacée).
- « Signaler une erreur » sur chaque question (M17).

### M6 — Annales et corrigés · MVP
- Classement : examen → session (année) → série → matière.
- Trois modes pour chaque sujet :
  1. **Lecture** : énoncé + corrigé détaillé.
  2. **Entraînement** : question par question, avec indices (le sujet est
     découpé en questions structurées, qui alimentent aussi M5).
  3. **Conditions réelles** : chronomètre de la vraie durée, pas d'indice,
     corrigé et note à la fin → c'est M7.
- Le **document original** (scan ou PDF) reste consultable à côté de la version
  structurée : c'est la preuve de l'authenticité.
- Filtres : par chapitre (« tous les exercices de probabilités tombés au Bac SE
  depuis 2010 ») — c'est une fonctionnalité que les élèves n'ont nulle part ailleurs.

### M7 — Examen blanc · MVP
- Reproduit une épreuve (ou une session complète) : durée réelle, coefficients
  réels, ordre des épreuves.
- Plein écran, chronomètre discret, sauvegarde continue (une coupure ne fait
  rien perdre — `HORS_LIGNE.md` A.8).
- Note sur 20 par épreuve, **moyenne pondérée** de la série, verdict
  « admis / ajourné » simulé, comparaison avec ses examens blancs précédents.
- Correction : automatique pour les questions fermées, **auto-évaluation guidée
  au barème** pour les questions ouvertes (ou tuteur IA en V1.1).
- Résultat partageable en image (sans données personnelles au-delà du prénom).

### M8 — Progression et jauge de préparation · MVP
- Maîtrise par **notion** (0–100), calculée sur les réponses récentes (les
  anciennes pèsent moins), consolidée par chapitre, matière et examen.
- **Jauge de préparation** = maîtrise des matières pondérée par leurs
  coefficients dans la série de l'élève. Elle dit la vérité, elle ne flatte pas.
- **Révision espacée** : une notion réussie revient quelques jours plus tard
  pour vérifier qu'elle tient.
- « Séance du jour » générée chaque soir à partir de ces deux sources.

### M9 — Motivation · MVP (base) / V1.1 (classements)
- Série de jours (avec un « jour de grâce » par semaine — les coupures de courant
  ne doivent pas punir l'élève).
- Points d'effort, niveaux, badges **mérités** (premier examen blanc, 7 jours de
  suite, 100 % en probabilités…).
- Défis hebdomadaires par matière.
- Classements **opt-in**, par classe / établissement / région, avec pseudonyme.
  Jamais de classement national nominatif par défaut.
- Aucune mécanique qui pousse à rester inutilement (pas de défilement infini,
  pas de notifications culpabilisantes).

### M10 — Culture générale · V1.1
Quiz Guinée / Afrique / Monde (histoire, géographie, institutions, sciences,
personnalités), « question du jour », défis entre amis. Contenu rédigé et
**sourcé** par l'équipe ; vérification par un relecteur comme le reste.

### M11 — Le tuteur « N'karamögö » (IA) · V1.1
L'idée qui donne son sens au nom : *« Mon maître, j'étudie »*.
- Bouton « Explique-moi » sur une question ratée ou un passage de corrigé :
  l'élève reçoit une explication reformulée, plus simple, avec un exemple.
- « Je ne comprends pas cette étape » sur un corrigé pas à pas.
- **Ancré sur notre contenu** : le tuteur reçoit la question, le corrigé validé
  et la notion du cours, et explique à partir de là. Il ne corrige pas
  différemment de nos enseignants.
- Correction assistée des questions ouvertes de l'examen blanc (avec barème),
  présentée comme indicative.
- Garde-fous : hors sujet scolaire → recentre ; contenus inadaptés aux mineurs →
  refus ; quota par jour selon l'abonnement ; journal des échanges consultable par
  l'admin contenu pour améliorer les corrigés ; coût suivi dans la console.
- Techniquement : API Claude via un service Laravel en file d'attente, réponses
  diffusées en flux, mise en cache des explications identiques. Modèle et prix à
  vérifier sur docs.claude.com au moment du lot.

### M12 — Hors ligne et économie de données · MVP (socle) / lot dédié
Spécification complète et suivi : **`HORS_LIGNE.md`**.
- Application installable, coquille et écrans en cache (service worker maison,
  `HORS_LIGNE.md` A.3).
- **Packs téléchargeables** : « Télécharger Maths BEPC (4,2 Mo) » — cours,
  exercices, annales et corrigés d'une matière, pour réviser sans réseau.
- Réponses, séances et examens blancs **enregistrés sur l'appareil puis
  synchronisés** (file d'opérations Dexie, UUID v7, idempotence serveur —
  `HORS_LIGNE.md` A.3.5 et A.3.6).
- **Mode économie de données** : pas d'image lourde, pas d'audio automatique,
  poids affiché avant tout téléchargement.

### M13 — Communauté encadrée · V2
- Groupes de classe créés par un enseignant (code d'accès).
- Fil de questions-réponses par groupe, modéré (signalement, masquage, mots
  interdits), visible par l'enseignant.
- Défis entre membres d'un groupe.
- **Pas** de messagerie privée libre entre élèves, **pas** de photo de profil.

### M14 — Enseignants et établissements · V2
- Enseignant : classes, devoirs (série d'exercices avec échéance), tableau de
  suivi (qui a fait quoi, notions faibles de la classe).
- Établissement : licences groupées, création de comptes en lot, rapport de
  préparation par classe — le produit qu'on vend aux écoles privées.

### M15 — Parents · V1.1
Lecture seule : temps de révision, jauge, derniers examens blancs. Résumé
hebdomadaire par SMS ou WhatsApp (canal à valider — coût).

### M16 — Abonnements et paiements · V1.1
- **Freemium** (D4) : cours + une partie des annales gratuits ; corrigés
  détaillés complets, examens blancs illimités, packs hors ligne et tuteur en
  abonnement.
- Paiement **Orange Money** et **MTN MoMo** (via API opérateur ou agrégateur
  local — à choisir et vérifier).
- **Cartes d'accès / codes prépayés** vendus en librairie, en école ou par des
  revendeurs : beaucoup d'élèves n'ont pas de mobile money à eux.
- Licences établissement et comptes parrainés (bailleur, ONG, ministère).
- Tous les montants en **GNF**, format `100 000 GNF`, produit par une seule fonction partagée.

### M17 — Back-office contenu · MVP
Le poste de travail des rédacteurs. Il conditionne la vitesse de tout le projet.
- Éditeur de blocs (TipTap) avec formules LaTeX, images, tableaux, schémas.
- Workflow : `brouillon` → `en_relecture` → `publie` (→ `archive`) ; renvoi avec
  commentaire ; **historique des versions** ; rien n'est publié sans relecteur
  différent de l'auteur.
- Rattachement obligatoire à une notion du référentiel.
- **Import d'annale assisté** : téléversement du PDF/scan → extraction proposée
  (énoncé découpé en questions, formules en LaTeX) par IA vision → **relecture
  humaine obligatoire** → publication. Le document original reste attaché.
- File des **signalements d'erreurs** des élèves, avec réponse.
- Planning éditorial : couverture du programme par matière (chapitres sans
  cours, annales sans corrigé) — on voit ce qui manque.
- Paiement des rédacteurs : suivi des contenus livrés et validés par personne.

### M18 — Console plateforme · MVP (base)
- Activité : élèves actifs (jour/semaine), rétention, séances, examens blancs.
- Contenu : couverture, signalements ouverts, contenus en attente de relecture.
- Revenus : abonnements, paiements, codes vendus.
- **Impact** : évolution de la jauge et des notes d'examens blancs des élèves
  assidus — la preuve à montrer aux partenaires.
- Journal des accès sensibles (reprendre `journal_acces_plateforme`).

### M19 — Ressources externes · V1.1
Liens vers des ressources libres et sûres par notion (vidéos éducatives,
encyclopédies), vérifiés par un relecteur. Signalés comme sortants et
consommateurs de données.

### M20 — Notifications · MVP (push) / V1.1 (SMS/WhatsApp)
Rappel de séance à l'heure choisie par l'élève, compte à rebours avant
l'examen, réponse à un signalement. Peu nombreuses, désactivables.

---

## 6. Modèle de données (première version)

Nommage **en français** (sauf `users`). Tout identifiant exposé à l'appareil est
un **UUID v7** (hors ligne).

### Référentiel
- `annees_scolaires` (libelle, debut, fin, courante)
- `examens` (code `CEE`|`BEPC`|`BAC`, nom, classe_terminale, date_prochaine_session)
- `filieres` (`general`, `franco_arabe`)
- `series` (examen_id, code `SM`|`SE`|`SS`, nom) — vide pour CEE et BEPC
- `classes` (nom « 10e année », ordre, examen_id nullable)
- `matieres` (nom, slug, icone, couleur)
- `epreuves` (examen_id, serie_id nullable, matiere_id, filiere, coefficient,
  duree_minutes, annee_scolaire_id) — **la table qui porte les coefficients**
- `chapitres` (matiere_id, classe_id, titre, ordre)
- `notions` (chapitre_id, titre, ordre)

### Contenu
- `lecons` (notion_id ou chapitre_id, titre, statut, auteur_id, relecteur_id,
  publie_le, version_courante_id)
- `versions_contenu` (polymorphe : contenu JSON des blocs, auteur, créée le,
  commentaire) — historique complet
- `questions` (type, enonce JSON, donnees JSON selon le type, reponse_attendue
  JSON, tolerance, bareme, difficulte 1–5, notion_id, statut, source_type,
  source_id, sujet_partie_id nullable)
- `indices` (question_id, ordre, contenu JSON)
- `corriges` (question_id ou sujet_id, contenu JSON pas à pas, statut)
- `sujets` (epreuve_id, session (année), type `officiel`|`blanc_maison`,
  document_original (fichier), statut, droits (référence de l'autorisation))
- `sujet_parties` (sujet_id, ordre, titre, bareme, consigne JSON)
- `ressources_externes` (notion_id, url, titre, type, verifiee_par, verifiee_le)
- `signalements` (question/leçon/corrigé, user_id, motif, message, statut, reponse)
- `packs_hors_ligne` (matiere, examen, serie, version, taille_octets, genere_le, fichier)

### Élève et apprentissage
- `users` (telephone unique, nom, prenom, pseudo, mot_de_passe, role…,
  desactive_le) — **pas d'email obligatoire**
- `profils_eleves` (user_id, examen_id, serie_id, filiere, classe_id,
  etablissement_id nullable, objectif_minutes, date_examen_visee)
- `liens_parents` (parent_id, eleve_id, code, confirme_le)
- `tentatives` (uuid, user_id, question_id, reponse JSON, correcte, score,
  duree_secondes, indices_utilises, mode `seance`|`entrainement`|`examen_blanc`,
  saisi_le, recu_le) — append-only
- `maitrises` (user_id, notion_id, score 0–100, prochaine_revision_le, maj_le)
- `seances` (uuid, user_id, genere_le, termine_le, questions JSON)
- `examens_blancs` (uuid, user_id, sujet_id ou composition, debut, fin,
  note_sur_20, statut, details JSON)
- `series_jours` (user_id, jour, minutes, objectif_atteint)
- `badges`, `badges_obtenus`, `defis`, `participations_defis`

### Organisation
- `etablissements` (nom, type `public`|`prive`|`franco_arabe`, prefecture,
  commune, region) — liste de base à constituer
- `groupes` (enseignant_id, etablissement_id, nom, code_acces)
- `membres_groupes`, `devoirs`, `devoirs_questions`, `rendus_devoirs`
- `abonnements` (user_id ou etablissement_id, formule, debut, fin, statut)
- `paiements` (uuid, montant_gnf, moyen `orange_money`|`mtn_momo`|`code`|…,
  reference_operateur, statut, payload JSON)
- `codes_acces` (code haché, formule, duree_jours, lot, vendu_par, utilise_par, utilise_le)
- `conversations_tuteur`, `messages_tuteur` (avec jetons consommés et coût)
- `appareils`, `appareil_profils`, `operations_synchronisees` (`HORS_LIGNE.md` A.3.6, A.7)
- `journal_acces_plateforme` (accès sensibles : action, auteur, cible, IP, agent, horodatage)

---

## 7. Le contenu — organisation, pas seulement code

C'est ici que se joue la réussite. Ce n'est pas le travail de Claude Code, mais
le code doit le servir.

- **Équipe** : par matière phare, un rédacteur et un relecteur différents. Ce
  sont précisément les « activités génératrices de revenus » de la plaquette :
  enseignants payés au contenu validé, étudiants pour la saisie et le découpage.
- **Format** : tout contenu est **structuré** (blocs JSON + LaTeX), jamais un PDF
  collé. C'est ce qui permet l'interactivité, le hors ligne léger, la recherche
  et le tuteur.
- **Charte de rédaction** (à écrire avec l'équipe pédagogique) : vocabulaire du
  programme guinéen, exemples locaux (marché de Madina, prix en GNF, villes de
  Guinée), phrases courtes, un corrigé = étapes numérotées + « pourquoi ».
- **Ordre de production** : la matière la plus coefficientée de chaque série
  d'abord, et pour chaque sujet d'annale, le corrigé avant le cours.
- **Contenu de démonstration** pendant le développement : clairement marqué
  « EXEMPLE — contenu fictif » en base et à l'écran, jamais présenté comme un
  sujet officiel.

---

## 8. Architecture technique

**Claude Code vérifie les
versions réellement installées (`composer.json`, `package.json`) avant
d'ajouter quoi que ce soit** et n'impose pas une montée de version non demandée.

| Couche | Choix |
|---|---|
| Serveur | Laravel (version du projet créé), Eloquent, files d'attente **réelles** (Redis ou base) — le tuteur, les imports et les packs ne peuvent pas tourner en `sync` |
| Interface | React + Inertia.js, Tailwind, primitives shadcn/Radix + CVA |
| Formules | KaTeX (rendu rapide, fonctionne hors ligne, polices locales) |
| Éditeur back-office | TipTap + extension mathématique |
| Graphiques | Recharts (console, progression) |
| Hors ligne | service worker maison servi à `/sw.js`, Dexie (IndexedDB), UUID v7 — spécifiés dans `HORS_LIGNE.md` A.3 |
| Recherche | d'abord SQL avec la règle « chaque mot doit apparaître » (`App\Support\RechercheTexte`, `CLAUDE.md` § 4) ; Meilisearch + Scout si le volume l'exige |
| Fichiers | stockage compatible S3 + CDN ; images converties en WebP/AVIF à plusieurs tailles |
| IA | API Claude (tuteur, import assisté), derrière un service et une file |
| Temps réel | non nécessaire au MVP (pas de Pusher par défaut) |
| Paiements | API opérateurs / agrégateur, webhooks idempotents |
| Notifications | Web Push (VAPID) ; SMS/WhatsApp via fournisseur local (V1.1) |
| Mesure d'audience | outil respectueux de la vie privée, auto-hébergé |
| Tests | PHPUnit, Vitest + fake-indexeddb, **Playwright** (bout en bout + captures visuelles) |
| Hébergement | VPS (Nginx, PHP-FPM, MySQL, Redis) en **HTTPS obligatoire** (sans HTTPS, pas de service worker), sauvegardes quotidiennes hors serveur |

---

## 9. Exigences de terrain (Guinée)

Traitées comme des exigences testables, pas comme des souhaits.

| Contrainte | Exigence |
|---|---|
| Données chères | Premier chargement de l'espace élève **< 500 Ko** transférés (hors polices mises en cache) ; une leçon texte **< 50 Ko** ; poids affiché avant tout téléchargement ; mode économie de données |
| Android d'entrée de gamme | Utilisable sur un appareil 2 Go de RAM, écran 360 × 740 ; pas d'animation lourde ; bundle par page découpé |
| Réseau instable | Toute saisie survit à une coupure ; jamais de « réessayez plus tard » qui perd une réponse |
| Coupures de courant | Sauvegarde continue des examens blancs et des séances |
| Téléphone partagé | Profils protégés par code ; déconnexion facile ; aucune donnée d'un profil visible par un autre |
| Révisions le soir | Mode sombre soigné, luminosité confortable |
| Lecture | Français clair, niveau adapté à la classe ; audio en langues nationales (pular, malinké, soussou) envisagé en V2 pour le CEE |
| Polices | **Auto-hébergées** (les polices distantes échouent hors ligne) |

---

## 10. Sécurité, mineurs et données personnelles

- **Minimisation** : téléphone, prénom, pseudo, classe. Pas de date de naissance
  exacte (tranche d'âge suffit), pas de photo, pas de géolocalisation.
- Consentement parental selon l'âge (seuil à fixer — D9) ; vérifier la loi
  guinéenne applicable aux données personnelles avant le lancement.
- Pseudonyme partout où un autre élève peut voir quelque chose.
- Tuteur IA : pas de données personnelles envoyées, consignes de sécurité
  adaptées aux mineurs, journal.
- Mots de passe hachés, limitation des tentatives (connexion, code SMS, codes
  d'accès), sessions révocables, journal des accès sensibles.
- Multi-établissements : un enseignant ne voit que ses groupes ; un parent que
  ses enfants (policies 404).
- Paiements : aucun numéro de compte stocké en clair ; webhooks signés et
  idempotents.

---

## 11. Qualité — définition de « terminé »

Un point du DEVBOOK n'est coché que si :
1. le code existe, **testé** (PHPUnit / Vitest) ;
2. l'écran a été **vu** par Claude Code avec Playwright (captures 360 px,
   tablette, ordinateur, clair et sombre — voir `DESIGN.md` § 12) ;
3. aucune régression (`php artisan test`, `npm run test:js`, `npm run build`) ;
4. les contrôles qui demandent un vrai téléphone sont inscrits dans `A_TESTER.md`.

---

## 12. Découpage en lots

Chaque lot se termine par : tests verts, captures relues, DEVBOOK mis à jour,
commit. **Ne pas commencer un lot avant que les décisions qui le concernent
(§ 13) soient tranchées.**

| Lot | Contenu | Critère d'acceptation principal |
|---|---|---|
| **0** | Socle : audit du projet existant, conventions, design system « Ardoise » (tokens, polices locales, primitives), layouts (vitrine, élève, back-office, console), authentification par téléphone, rôles et permissions, garde-fou « toute route a une permission », socle hors ligne (`HORS_LIGNE.md` HL0), Playwright + captures, page « catalogue de composants » | Une page de démonstration de tous les composants, capturée en 4 tailles × 2 thèmes, contrastes vérifiés |
| **1** | Référentiel pédagogique + back-office contenu (éditeur, workflow de relecture, versions) | Un rédacteur crée une leçon avec formules ; un autre la relit et la publie ; l'auteur ne peut pas se relire |
| **2** | Cours côté élève + accueil élève (compte à rebours, jauge vide, séance du jour minimale) + parcours d'accueil ; rendu des contenus indépendant de leur source (HL1) | Un nouvel élève fait son premier exercice en moins de 60 s après inscription |
| **3** | Moteur de questions (tous les types), indices, corrigés pas à pas, séances — **chaque réponse passe par la file d'opérations**, correction refaite par le serveur (HL2) | Chaque type de question corrigé juste, testé ; retour icône + mot + couleur |
| **4** | Annales : modèle, import assisté (IA + relecture), trois modes, filtres par chapitre | Un sujet scanné devient un sujet structuré publiable sans saisie manuelle de l'énoncé |
| **5** | Examen blanc chronométré, coefficients, moyenne pondérée, sauvegarde continue sur l'appareil (HL3) | Une coupure (onglet fermé) en plein examen ne fait rien perdre ; la moyenne correspond au calcul officiel |
| **6** | Progression, maîtrise par notion, révision espacée, jauge, motivation (séries, badges, défis) ; jauge et séances pré-calculées hors ligne (HL4) | La jauge d'un élève de test évolue comme attendu sur un scénario écrit |
| **7** | Hors ligne complet : packs téléchargeables, profils multiples, copies datées, budgets mesurés (HL5 à HL7) | Mode avion : séance complète, rechargement, retour réseau → un seul envoi |
| **8** | Vitrine finale, SEO des annales, cartes de partage WhatsApp, installation | Score Lighthouse mobile ≥ 90 (performance, accessibilité, SEO) sur la page d'accueil |
| **9** | Abonnements, Orange Money / MTN MoMo, codes prépayés | Paiement de test de bout en bout ; webhook rejoué deux fois → un seul abonnement |
| **10** | Tuteur N'karamögö (IA), quotas, journal, coûts | Une explication en flux en moins de 3 s pour démarrer ; refus propre hors sujet |
| **11** | Parents, enseignants, établissements, devoirs | Un enseignant voit les notions faibles de sa classe ; rien d'une autre classe |
| **12** | Culture générale, ressources externes, communauté encadrée | Signalement → masquage en un geste par l'enseignant |
| **13** | Console plateforme : activité, contenu, revenus, impact | Rapport d'impact exportable en PDF pour un partenaire |
| **14** | Terrain : essais avec de vrais élèves (Conakry + une préfecture), corrections | Liste `A_TESTER.md` exécutée sur vrais téléphones |

**MVP de lancement** = lots 0 à 8, avec le contenu des matières phares (D1).

---

## 13. Décisions à arbitrer

> **Tranché le 2026-10-30** : Maurice a retenu toutes les propositions
> ci-dessous, avec les précisions de l'audit (D3 : vérification du numéro non
> bloquante, exigée avant paiement, liaison parent et récupération par SMS ;
> D5 : test fermé ; D9 : aucune donnée d'âge avant vérification juridique ;
> D11 : à fixer avant la clôture du lot 0). Détail : `DEVBOOK.md` point 2.
> Encore attendu de Maurice : la **liste des matières phares** (D1, avant le
> lot 1) et la réservation du domaine (D11).

| # | Question | Proposition |
|---|---|---|
| D1 | Quels examens et matières au lancement ? | Bac (SM, SE, SS) et BEPC, matières à plus fort coefficient d'abord ; CEE au trimestre suivant (les élèves de primaire ont rarement un téléphone à eux) |
| D2 | Filière franco-arabe ? | Prévue dans le modèle dès le lot 0, contenu en V2 |
| D3 | Identifiant de connexion | Téléphone + mot de passe ; SMS seulement pour vérification et récupération |
| D4 | Modèle économique | Freemium + abonnements mensuels/annuels + codes prépayés + licences établissements + comptes parrainés |
| D5 | Droits sur les annales | Convention avec le ministère / la DGECS avant publication publique ; en attendant, test fermé |
| D6 | Tuteur IA | V1.1, avec quota ; non bloquant pour le lancement |
| D7 | Communauté | Groupes encadrés par enseignant, pas de messagerie privée libre |
| D8 | Téléphone partagé | Profils multiples protégés par code à 4 chiffres |
| D9 | Âge et consentement | Seuil de consentement parental à fixer après vérification légale |
| D10 | Langues | Français ; audio en langues nationales en V2 (CEE d'abord) |
| D11 | Hébergement et domaine | VPS + CDN, domaine `nkaramogo.*` à vérifier et réserver |
| D12 | Application sur le Play Store | PWA d'abord ; publication Play Store (TWA) après le lot 8 — crédibilité auprès des élèves |

---

## 14. Risques principaux

| Risque | Parade |
|---|---|
| Pas assez de contenu au lancement | Lancement resserré (D1), outil d'import assisté, planning éditorial visible |
| Erreur dans un corrigé | Double relecture, bouton « Signaler », correction tracée et rapide |
| Droits sur les annales contestés | Convention (D5), documents originaux et provenance attachés |
| Coût des données pour l'élève | Budgets de poids testés, packs, mode économie |
| Coût de l'IA | Quotas, cache, modèle adapté, suivi dans la console |
| Faible usage après l'inscription | Séance du jour courte, rappels choisis, valeur dès le premier soir |
| Fraude sur les codes prépayés | Codes hachés, lots traçables, limitation des essais |
| Sécurité des mineurs | § 2.6 et § 10 |

---

## 15. Comment on saura que ça marche

- Élèves actifs par semaine, et part de ceux qui font ≥ 3 séances par semaine.
- Rétention à 7 et 30 jours.
- Évolution de la jauge et des notes d'examens blancs des élèves assidus.
- Après chaque session nationale : déclaratif « admis / ajourné » des élèves
  (facultatif), comparé au taux national publié par la DGECS. C'est la preuve
  de l'objectif général de la plaquette.
- Délai moyen de correction d'un signalement d'erreur.
