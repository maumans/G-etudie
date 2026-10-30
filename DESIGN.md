# DESIGN.md — « Ardoise »

Design system de N'karamögö · G-Étudie. Le nom vient de l'ardoise de l'écolier :
l'endroit où l'on s'essaie, où l'on se trompe, où l'on efface et où l'on recommence.

> Ce fichier fixe la **direction**. Les valeurs ci-dessous sont un point de départ
> vérifié (contrastes calculés le 2026-10-29) ; Claude Code les implémente, les
> **capture avec Playwright**, et consigne chaque ajustement avec sa raison dans
> la section 13.

---

## 1. Le parti pris

Un logiciel de gestion peut se contenter d'une chrome silencieuse et d'une
couleur rare. N'karamögö s'adresse à des **élèves de 11 à 20 ans** :
il doit donner envie d'ouvrir l'application le soir, et donner confiance le jour
de l'examen. Deux exigences qui tirent en sens inverse :

- **Attirant** : chaleureux, vivant, qui célèbre l'effort, qui a l'air *d'aujourd'hui*
  — pas d'un site administratif, pas d'une brochure.
- **Sérieux** : ce sont des examens nationaux. La typographie des formules, la
  propreté des corrigés et la précision des chiffres disent « on peut me croire ».

Résolution : **une chrome calme et lumineuse, et de l'énergie concentrée sur les
moments qui la méritent** — une bonne réponse, une série tenue, un examen blanc
réussi, la jauge qui monte. La couleur porte toujours une information, mais ici l'information inclut *« bravo »*.

Trois choses que l'élève doit ressentir en 5 secondes :
1. **Je sais quoi faire ce soir** (la séance du jour est l'action dominante).
2. **Je vois que je progresse** (la jauge, la série).
3. **C'est fait pour moi, ici** (examens guinéens nommés juste, exemples locaux,
   prix en GNF, mon examen et ma série partout).

### Ce qu'on refuse
- Le look « plateforme e-learning générique » : photos de banque d'images
  d'étudiants souriants devant un ordinateur, dégradés violets, cartes à ombre
  portée en grille. La plaquette en est pleine ; l'application ne doit pas l'être.
- L'infantilisation : pas de mascotte bébé, pas de police « comic ». Un lycéen
  de Terminale SM doit se sentir respecté.
- Les drapeaux et couleurs nationales en aplats décoratifs : le rouge et le vert
  sont réservés au **faux** et au **juste** (§ 2.3).
- Toute animation qui coûte de la batterie ou des données sans rien dire.

---

## 2. Couleurs

### 2.1 Neutres (basculent en mode sombre)

| Token | Clair | Sombre | Rôle |
|---|---|---|---|
| `craie-50` | `#F6F7FB` | `#0E1220` | Canvas de page |
| `craie-100` | `#ECEEF5` | `#1A2034` | Survol, remplissage muet |
| `card` | `#FFFFFF` | `#161B2E` | Cartes, feuilles, dialogues |
| `border` | `#E1E4EE` | `#262D45` | Filets |
| `ink-900` | `#141A2E` | `#EEF1F8` | Texte principal — 16,1:1 sur canvas |
| `ink-600` | `#4F5873` | `#A9B1C7` | Texte secondaire — 7,1:1 (clair), 8,0:1 (sombre) |
| `ink-400` | `#8A92A8` | `#6B7493` | **Non-texte uniquement** (bordures de contrôle, icônes décoratives) — 3,1:1 / 3,7:1 |

Le mode sombre n'est pas une option cosmétique : **les élèves révisent le soir**,
souvent sur des écrans OLED où le noir économise la batterie.

### 2.2 La marque

| Token | Valeur | Rôle |
|---|---|---|
| `nimba-600` | `#2537C9` | **L'accent unique** : action principale, navigation active, focus, liens. Blanc dessus : 8,5:1 |
| `nimba-700` | `#1F2DA6` | Libellé actif sur fond teinté, survol du bouton principal — 10,6:1 |
| `nimba-300` (sombre) | `#8B9AFF` | L'accent en mode sombre — 6,6:1 sur carte sombre |
| `soleil-400` | `#FFC21A` | **L'énergie** : série de jours, points, célébration, mise en avant. **Jamais du texte sur blanc** ; encre `ink-900` dessus : 10,7:1 |

Le bleu « Nimba » (du mont Nimba) prolonge le bleu de la plaquette sans le
recopier ; le jaune « soleil » apporte la chaleur. Ensemble ils sont lisibles,
modernes, et **à plus de 40° de teinte du rouge et du vert** — la règle d'Iles
Mau, qui évite qu'une action se confonde avec un verdict.

### 2.3 Les verdicts — trois couleurs, pas une de plus

| Token | Texte (clair) | Rôle |
|---|---|---|
| `juste-600` | `#15803D` (5,0:1) · sombre `#4ADE80` (9,8:1) | Bonne réponse, notion maîtrisée, admis |
| `faux-600` | `#C42B2B` (5,6:1) · sombre `#F87171` (6,2:1) | Mauvaise réponse, ajourné, erreur de saisie |
| `indice-600` | `#8A5A00` (5,9:1) · remplissage `#F5A524` | Indice, « presque », à revoir, avertissement |

**Règle absolue : un verdict n'est jamais porté par la couleur seule.** Toujours
**icône + mot + couleur** (✓ « Juste », ✗ « Pas encore », 💡 « Indice »). Un élève
daltonien, un écran délavé au soleil ou une impression en noir et blanc doivent
rendre le même sens.

**« Pas encore » plutôt que « Faux »** dans les retours d'exercice : on corrige
une tentative, pas un élève. Le mot « Faux » reste pour les tableaux de
correction d'examen blanc, où il est attendu.

### 2.4 Couleurs de matières

Chaque matière a une teinte (tuile d'icône, arête gauche d'une carte, en-tête
de leçon). Elles **n'apparaissent
jamais dans une zone de verdict** et sont toujours accompagnées du nom et de
l'icône de la matière.

| Matière | Teinte | Icône (Lucide) |
|---|---|---|
| Mathématiques | indigo 245° | `Sigma` |
| Physique | cyan 195° | `Atom` |
| Chimie | violet 275° | `FlaskConical` |
| Biologie-Géologie | sarcelle 175° | `Leaf` |
| Français | magenta 320° | `BookOpen` |
| Anglais | bleu ciel 210° | `Languages` |
| Histoire-Géographie | ocre 35° | `Globe2` |
| Philosophie | prune 295° | `Lightbulb` |
| Économie | ardoise 220°, faible saturation | `TrendingUp` |
| Culture générale | soleil 45° | `Sparkles` |

Claude Code calcule les nuances (50 → 900) et vérifie : nuance 600 ≥ 4,5:1 sur
blanc pour un libellé, ≥ 3:1 pour une icône ; même contrôle sur carte sombre.

### 2.5 Teintes de fond : en opacité, jamais en nuance claire fixe

Un fond « légèrement bleu » ou « légèrement vert » (carte sélectionnée, option
choisie, bandeau d'aide, ligne active) s'écrit en **opacité** de la couleur :
`bg-nimba-600/[0.12] dark:bg-nimba-500/25`, `bg-juste-600/[0.10]`… Jamais
`bg-nimba-50` : une nuance claire fixe reste presque blanche en mode sombre,
pendant que le texte posé dessus s'éclaircit — blanc sur blanc. Une opacité se
compose avec le fond, quel qu'il soit. Le libellé posé sur une teinte de
l'accent est en nuance **700** (clair) / **300** (sombre), pas 600.

---

## 3. Typographie

| Usage | Police | Raison |
|---|---|---|
| Titres, chiffres héros, marque | **Sora** (600/700) | Géométrique, nette, technologique sans froideur — le « à la pointe » demandé |
| Corps, interface, cours | **Lexend** (400/500/600) | Conçue pour la fluidité de lecture ; larges approches, lettres bien distinctes — ce qu'il faut pour lire un cours sur un petit écran le soir |
| Formules | **KaTeX** (polices KaTeX locales) | Rendu typographique de qualité « manuel », hors ligne |

- **Toutes les polices sont auto-hébergées** (`@fontsource` ou fichiers dans
  `public/fonts`), sous-ensemble latin + latin étendu, `font-display: swap`.
  Une police distante échoue hors ligne.
- Budget : **≤ 120 Ko** de polices au total (WOFF2). Vérifier le poids réel.
- `html { font-size: 16px }`. Le corps de lecture d'une leçon est à **17 px**
  (réglable : 15 / 17 / 19), interligne 1,6. L'interface est à 15 px.
- `.font-data` = `tabular-nums` pour notes, chronomètres, points, montants GNF.
- `font-feature-settings` des chiffres : tabulaires dans les tableaux, proportionnels ailleurs.

### Échelle (px)

`12` méta · `13` aide · `15` interface · `17` lecture · `20` titre de carte ·
`24` titre d'écran mobile · `32` titre d'écran desktop · `44` chiffre héros
(jauge, note sur 20) · `56` vitrine (desktop seulement)

---

## 4. Formes, espace, profondeur

- Rayons : contrôles **12 px**, cartes **16 px**, feuilles mobiles **24 px** en
  haut. Doux : c'est un produit pour des jeunes, pas un back-office.
- **Cibles tactiles ≥ 48 px** partout côté élève (options de QCM : 56 px).
- Grille 4 px ; marges latérales mobiles 16 px ; largeur de lecture ≤ 680 px.
- Profondeur : cartes à filet + ombre très légère (`0 1px 2px`), ombre réelle
  réservée à ce qui flotte (feuilles, dialogues, toasts). Pas de glassmorphism.
- **Une seule action dominante par écran** (bouton plein `nimba-600`, pleine
  largeur sur mobile, collé en bas de l'écran dans le lecteur d'exercice).

---

## 5. Mouvement et célébration

Le mouvement est **une récompense, pas une décoration**.

| Moment | Effet | Durée |
|---|---|---|
| Bonne réponse | l'option se remplit en `juste`, coche qui se trace, petit rebond | 300 ms |
| « Pas encore » | léger tremblement horizontal (2 oscillations), puis le corrigé glisse du bas | 250 ms |
| Série tenue | la flamme de série s'allume en `soleil` | 600 ms |
| Fin de séance / examen blanc réussi | confettis légers (CSS, ≤ 40 particules, une fois) | 1,2 s |
| Jauge qui monte | l'arc s'étend de l'ancienne à la nouvelle valeur | 800 ms |

- **CSS d'abord** (transitions, `@keyframes`, `transform`/`opacity` uniquement).
  Une bibliothèque d'animation n'est admise que si son poids est justifié
  (framer-motion pèse une quarantaine de Ko compressés : trop pour animer un tiroir).
- `prefers-reduced-motion` : tout est remplacé par des changements d'état instantanés.
- **Mode économie de données / appareil lent** : pas de confettis.
- Aucune animation en boucle, sauf l'indicateur de chargement (et seulement
  s'il dure plus de 400 ms).
- Sons : facultatifs, **désactivés par défaut**, synthétisés en Web Audio (pas de
  fichier à télécharger — un fichier audio serait justement la requête qui
  échoue hors ligne).

---

## 6. Les dispositifs — ce qui rend N'karamögö reconnaissable

### 6.1 La jauge de préparation — la signature

Un **arc de cercle** (pas un donut plein) en tête de l'accueil élève, qui porte
le `<h1>`. Au centre : le pourcentage en chiffre héros (44 px, Sora), dessous :
« prêt pour le BEPC ». Autour de l'arc, une graduation discrète.

- L'arc est segmenté **par matière**, chaque segment à sa teinte de matière,
  sa longueur proportionnelle à son coefficient, son remplissage à sa maîtrise.
  On lit d'un coup d'œil : « je suis bon en maths, faible en physique, et la
  physique pèse lourd ».
- Toucher un segment ouvre la matière, filtrée sur ses notions faibles.
- `aria-label` complet : « Préparation au BEPC : 47 %. Mathématiques 71 %,
  Physique-Chimie 22 %, … ».
- Au-dessus : eyebrow **« J-214 avant le BEPC »** (compte à rebours).
- La jauge **ne ment pas** : un élève qui n'a rien fait voit 0 %, avec la phrase
  « Ta jauge se remplit à chaque exercice réussi. Commence ce soir. »

### 6.2 La séance du jour

Juste sous la jauge, la **seule carte pleine couleur** de l'écran (fond
`nimba-600`, texte blanc) : « Ta séance du jour · 15 min · 12 questions ·
Physique et Maths ». Un bouton : **« Commencer »**. C'est l'action dominante.

### 6.3 La trace (série de jours)

Quatorze cases sur une ligne, une par jour :
pleine en `soleil` quand l'objectif est atteint, à moitié quand l'élève a
commencé, creuse sinon, avec le **jour de grâce** marqué d'une étoile. Une
flamme et le nombre de jours. Pas de culpabilisation : une série rompue dit
« Nouvelle série — on repart ».

### 6.4 Le lecteur d'exercice (« l'ardoise »)

L'écran le plus utilisé. Plein écran, aucune barre de navigation.

```
┌─────────────────────────────┐
│ ✕   ▓▓▓▓▓▓▓░░░░░  7/12   🔥3│  ← fermer · progression · série
│                             │
│ MATHS · Probabilités        │  ← eyebrow, teinte de matière
│ Bac SE 2019 · Exercice 2    │  ← provenance (si annale)
│                             │
│ Énoncé, formules KaTeX,     │  ← 17 px, largeur de lecture
│ figure…                     │
│                             │
│ ┌─────────────────────────┐ │
│ │ A   P(A∩B) = 0,12       │ │  ← options 56 px, lettre dans une pastille
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ B   …                   │ │
│ └─────────────────────────┘ │
│                             │
│ 💡 Un indice                │  ← discret, coûte des points
├─────────────────────────────┤
│ [       Vérifier         ]  │  ← collé en bas, pleine largeur
└─────────────────────────────┘
```

Après « Vérifier », une **feuille** monte du bas : verdict (icône + mot +
couleur), puis le **corrigé pas à pas**, étapes numérotées, chacune repliable,
avec « Je ne comprends pas cette étape » (tuteur, V1.1) et « Signaler une erreur ».
Bouton du bas : « Continuer ».

### 6.5 L'examen blanc

Registre volontairement **plus sobre** : c'est la répétition du jour J. Fond
`card`, chronomètre `font-data` en haut à droite (passe en `indice` à 10 min de
la fin, sans clignoter), navigation entre questions par une grille de numéros,
sauvegarde silencieuse affichée « Enregistré · 21:42 ». Le résultat, lui,
retrouve la couleur : note sur 20 en chiffre héros, mention, détail par épreuve,
**carte de partage** générée en image (format 1080 × 1350 pour WhatsApp/statut).

### 6.6 La fiche d'annale

En-tête : examen · session · série · matière, et un **cachet** « Sujet officiel »
avec lien vers le document original — ou « Sujet d'entraînement » pour un sujet
maison. La provenance est toujours visible : c'est ce qui fonde la confiance.

### 6.7 Le contenu de démonstration

Tant que le vrai contenu n'est pas là, tout exemple porte un **bandeau hachuré**
« EXEMPLE — contenu fictif ». On ne doit jamais pouvoir prendre une capture
d'écran de démo pour un vrai sujet.

---

## 7. Les quatre habillages

| Habillage | Public | Registre |
|---|---|---|
| **Vitrine** | visiteurs, parents, partenaires | Le plus expressif : grande typographie Sora, sections généreuses, **démo jouable** dans le héro, illustrations vectorielles originales (pas de photos de banque d'images), compte à rebours national |
| **Espace élève** | élèves | Barre d'onglets en bas sur mobile (Accueil · Cours · Annales · Examens blancs · Moi), barre latérale sur desktop. Lumineux, chaleureux |
| **Back-office contenu** | rédacteurs, relecteurs | Dense, calme, efficace : chrome claire et achromatique, couleur réservée aux statuts (brouillon, en relecture, publié). Éditeur pleine largeur, aperçu « comme l'élève le verra » côte à côte |
| **Console plateforme** | superadmin | Barre latérale sombre : on n'est pas « dans » une école, on est au-dessus. Signal permanent, pas un message qu'on ferme |

### Écrans de l'espace élève (MVP)

Accueil (jauge, séance, trace, reprendre) · Choix de matière · Chapitre (notions,
progression) · Leçon · Fiche de révision · Lecteur d'exercice · Liste des
annales (filtres) · Fiche d'annale · Examen blanc (lancement, passage, résultat)
· Progression (par matière, par notion) · Profil (examen, série, objectif,
profils du téléphone, téléchargements hors ligne, mode données, thème, taille
du texte) · Parcours d'accueil (4 écrans) · Connexion / inscription par téléphone.

---

## 8. Illustrations et iconographie

- Icônes : **Lucide**, trait 2 px, 20 px (24 px dans la barre d'onglets).
- Illustrations : **SVG originaux**, style trait + aplats, palette de la marque,
  scènes du quotidien guinéen (révision à la lumière d'une lampe, cour d'école,
  marché) — à commander à un illustrateur ou à produire en SVG simple.
  Interdit : personnages ou logos protégés, photos de mineurs réels, photos de
  banque d'images génériques.
- États vides illustrés et **toujours accompagnés d'une action** (« Aucun examen
  blanc pour l'instant. Passe ton premier : 45 min, Maths BEPC 2022. »).

---

## 9. Écriture

- **Tutoiement** côté élève (c'est le registre d'un maître bienveillant — « Mon
  maître »), vouvoiement côté parents, partenaires et vitrine institutionnelle.
- Phrases courtes, verbes d'action : « Commencer », « Vérifier », « Voir le
  corrigé », « Passer l'examen blanc » — jamais « Soumettre ».
- Noms officiels exacts : **CEE**, **BEPC**, **Baccalauréat unique**, séries
  **SM / SE / SS**, « 10e année », « Terminale ».
- Chiffres : `13,5 / 20`, `100 000 GNF`, `J-214`.
- Un message d'erreur dit quoi faire : « Pas de connexion. Ta réponse est
  gardée sur le téléphone et partira toute seule. »

---

## 10. Accessibilité (non négociable)

- Contraste ≥ 4,5:1 pour tout texte, ≥ 3:1 pour toute limite de contrôle et icône
  porteuse de sens — dans **les deux thèmes**.
- Verdicts : icône + mot + couleur.
- Formules KaTeX avec rendu MathML accessible.
- Taille de texte réglable sans casser la mise en page (tester à 19 px + zoom 200 %).
- Navigation complète au clavier sur desktop ; `:focus-visible` visible partout.
- `aria-live="polite"` sur les verdicts et le chronomètre (annonce à 10 min et 1 min, pas chaque seconde).
- Boutons-icônes avec `aria-label`.

---

## 11. Composants — un seul composant par usage

Primitives dans `resources/js/components/ui/` (fichiers en kebab-case :
`zone-donnee.tsx` exporte `ZoneDonnee`), construites sur Radix + CVA.
Règle : **un motif réécrit à la main dans deux pages devient un composant**, sinon
les comportements divergent et l'application paraît incohérente. Aucun second
jeu de contrôles ne doit survivre au kit de démarrage : ses `PrimaryButton`,
`TextInput`, etc. deviennent de simples alias des primitives ci-dessous.

| Composant | Contrat |
|---|---|
| `Button` | Deux axes. **`variant`** = intensité : `default` (plein `nimba`, l'action dominante), `succes` (plein vert : l'action qui conclut, ex. « Terminer l'examen »), `destructive` (plein rouge, toujours confirmé), `outline`, `ghost`. **`ton`** (sur `outline`/`ghost`) = famille : `neutre`, `nimba`, `danger`. Bordure d'un `outline` en `ink-400` (≥ 3:1 — une bordure plus pâle rend le bouton invisible), survol en teinte d'opacité de l'accent, icône en `currentColor`, 20 px. Hauteurs : 48 px côté élève, 40 px back-office. Un bouton dit ce qu'il fait (« Vérifier », « Passer l'examen blanc »), jamais « Soumettre ». Icône seule ⇒ `aria-label` + `aria-hidden` sur l'icône |
| `Input`, `Textarea`, `Label` | Même hauteur que les boutons du même habillage ; libellé toujours visible (pas de libellé-placeholder) ; message d'erreur sous le champ, lié par `aria-describedby` |
| `SearchInput` | La frappe met à jour le champ tout de suite ; `onRecherche` est appelé **350 ms après la dernière frappe** ; **Entrée** lance tout de suite ; **Échap** et la croix vident le champ **et relancent la recherche à vide** (sinon la liste reste filtrée sur un terme effacé) ; une valeur identique ne relance rien. Sans `onRecherche`, simple champ contrôlé. Les navigations de filtre passent en `preserveScroll` + `replace` (pas une entrée d'historique par caractère) |
| `TelephoneInput` | Indicatif +224 fixe, 9 chiffres groupés à l'affichage (`6xx xx xx xx`), clavier numérique (`inputmode="tel"`), valeur normalisée envoyée au serveur |
| `CodeInput` | Code à 4 ou 6 chiffres en cases ; collage accepté ; avance automatique ; clavier numérique |
| `DateInput` | Le champ date natif n'ouvre son calendrier que sur un minuscule glyphe, invisible sur certains thèmes et absent de Firefox : le composant le masque, affiche sa propre icône à droite, et ouvre le calendrier au clic sur tout le champ (`showPicker()`, repli sur le focus). Gabarit forcé à la hauteur standard |
| `NumberInput` | Clavier numérique ; séparateur de milliers à l'affichage ; tolère la virgule décimale |
| `Choix` (options de QCM) | Cible ≥ 56 px, lettre dans une pastille, état sélectionné par bordure + teinte d'opacité ; après vérification : icône + mot + couleur |
| `Feuille` (bottom sheet) | Monte du bas sur mobile (corrigé, filtres), dialogue centré sur desktop ; poignée, fermeture par glissement et par bouton ; focus piégé |
| `Dialog` + `ConfirmProvider` | Toute confirmation passe par `confirmer({ titre, message, action, ton })` (promesse) : **jamais** `window.confirm()` |
| `Toaster` | Notifications brèves (Sonner) : succès et erreurs des messages flash. Jamais pour une information qu'on doit retrouver |
| `Badge` | Statut : petit rectangle plein à coins de 6 px, sans contour ni icône — forme distincte d'un bouton |
| `Tabs`, `Pagination` | Pagination en français, construite en composant (jamais de libellés traduits par remplacement dans du HTML injecté) |
| `ZoneDonnee` | Enveloppe une donnée chargée à part : squelette pendant le chargement, message + « Réessayer » + « Recharger la page » en cas d'échec ; jamais un indicateur qui tourne sans fin |
| `EtatVide` | Illustration + phrase + **une action** |
| `Formule` | Rendu KaTeX (MathML accessible) ; défilement horizontal propre si la formule dépasse, jamais de débordement de page |
| `BandeauExemple` | Hachures + « EXEMPLE — contenu fictif » sur tout contenu `est_exemple` |

Les composants du mode hors ligne (`EcranIndisponible`, `BandeauCopie`, pastille
réseau) sont spécifiés dans `HORS_LIGNE.md` A.3.7 à A.3.9.

## 12. Vérification visuelle avec Playwright — obligatoire

Un rendu vérifié côté serveur (réponse 200, bonnes props) ne dit rien de ce que
voit l'élève. Ici, **aucun écran n'est déclaré terminé sans avoir été vu**.

### Le protocole

1. **Le serveur MCP Playwright** (`@playwright/mcp`) permet à Claude Code
   d'ouvrir l'application, cliquer, remplir, et **prendre des captures qu'il
   regarde lui-même** pour juger le rendu et corriger. C'est l'outil de travail
   au fil de l'eau.
2. **`@playwright/test`** fige ce qui a été validé : un fichier
   `tests/visuel/ecrans.spec.ts` parcourt les écrans clés et enregistre des
   captures de référence ; toute différence non voulue fait échouer la suite.

### La matrice de captures

| Gabarit | Taille | Pourquoi |
|---|---|---|
| Android entrée de gamme | 360 × 740 | **l'appareil de référence** |
| Grand téléphone | 412 × 915 | |
| Tablette | 768 × 1024 | écoles, CDI |
| Ordinateur | 1366 × 768 | le portable le plus courant |

× thème clair et sombre × taille de texte normale et grande (19 px) pour le
lecteur d'exercice et la leçon.

Dossier : `tests/visuel/captures/<lot>/<ecran>-<gabarit>-<theme>.png`.

### Ce que Claude Code vérifie sur chaque capture

- Rien ne déborde horizontalement à 360 px ; aucun texte tronqué sans raison.
- L'action dominante est visible **sans défiler** sur 360 × 740.
- Les formules sont rendues (pas de LaTeX brut) et ne débordent pas.
- Contraste lisible en sombre (pas de blanc sur blanc : une teinte claire fixe
  sous un texte devenu clair — d'où la règle des teintes en opacité, § 2.5).
- Les états : vide, chargement, erreur, hors ligne, contenu de démonstration.
- Un audit d'accessibilité automatique (`@axe-core/playwright`) sur chaque écran : 0 violation sérieuse.
- **Performance** : une passe avec réseau ralenti (profil « 3G lente ») et CPU
  ralenti ×4 sur l'accueil, la leçon et le lecteur ; noter le poids transféré
  et le temps jusqu'à l'action dominante utilisable.

### Le catalogue de composants

Une page `/dev/composants` (désactivée en production) affiche chaque primitive
dans tous ses états, en clair et en sombre côte à côte. C'est la première chose
construite au lot 0, et la première chose capturée.

---

## 13. Journal des décisions de design

À tenir par Claude Code : chaque ajustement de valeur, chaque piège rencontré,
avec sa mesure (ratio de contraste, poids en Ko, capture avant/après). Format
: le constat, la cause, la correction, la preuve.
