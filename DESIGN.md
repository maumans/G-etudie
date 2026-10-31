# DESIGN.md — « Ardoise » v4

Design system de N'karamögö · G-Étudie. Le nom vient de l'ardoise de l'écolier :
l'endroit où l'on s'essaie, où l'on se trompe, où l'on efface et où l'on recommence.

> Ce fichier fixe la **direction**. Les valeurs ci-dessous sont vérifiées
> (contrastes recalculés par `tests/js/contrastes.test.ts`) ; Claude Code les
> implémente, les **capture avec Playwright**, et consigne chaque ajustement
> avec sa raison dans la section 13. **v3 (2026-10-30)** : adaptation complète
> aux références choisies par Maurice (§ 0.1). **v4 (2026-10-30)** : même
> direction, en plus original et plus professionnel — police Bricolage
> Grotesque, boutons sobres à angles de 10 px, illustrations par défaut
> remplaçables, vitrine recomposée autour d'un seul moment fort (§ 13). La v1
> (bleu roi, tout gros, tout gras) puis la v2 (violet, neutre, froide, écrans
> vides) ont été refusées — § 13.

---

## 0. Le niveau d'exigence — à relire avant toute interface

Maurice veut un produit **au sommet** : qu'un élève, un parent ou un partenaire
qui arrive soit attiré d'abord par **l'élégance et le professionnalisme**, puis
retenu par **la facilité d'usage**. **Le hors ligne n'est jamais une excuse** :
il sert aux cours que l'élève veut suivre sans réseau ; il ne justifie ni une
interface pauvre, ni des pages vides. L'élégance ne coûte presque rien en
données (une police variable de 27 Ko, des dégradés CSS, des ombres) ; on
économise sur les images et les bibliothèques, jamais sur le soin.

### 0.1 Les références

Cinq maquettes fournies par Maurice le 2026-10-30 (tableaux de bord
d'apprentissage « Oliver » et « Eduvo », pages d'accueil « BrightPath » et
« DevSkill ») sont **la cible**. On n'en recopie ni les textes, ni les logos,
ni les photos : on en reprend le langage.

| Ce que font les références | Comment on l'applique |
|---|---|
| **Ambiance chaude** : fond crème, grands halos pêche, aurore pastel | Canevas crème `craie-50`, `halo-marque` derrière les héros, `fond-ambiance` en haut des espaces connectés |
| **Une couleur d'action vive**, l'orange, **épaulée par le noir** | Mandarine `nimba` pour l'action et l'énergie ; encre `ink-900` pour les boutons `encre`, le panneau `surface-encre`, les étapes numérotées |
| **Chaque matière a sa couleur partout** : tuile, barre en tirets, bloc d'emploi du temps | `MATIERES[cle]` : `tuile`, `plein`, `trait` ; `ProgressionSegments` en tirets ; légende de la jauge |
| **Des écrans pleins d'informations utiles** | Le tableau de bord élève complet (§ 6.0) dès le lot 0, en données d'exemple marquées |
| **Grands titres en contraste de graisse** : la phrase en léger, les mots clés en gras ou en couleur | Utilitaire `titre-contraste` + `<strong>` (§ 3) |
| **Vitrine incarnée** : une vraie personne détourée devant une forme orange, fiches flottantes, bandeau de preuves, FAQ, appel final | `VisuelHeros` : l'illustration du Nimba au crépuscule (dessin par défaut, remplaçable), la photo fournie par Maurice devant si elle existe, deux fiches de l'application qui débordent du cadre ; § 7 et § 8 |
| **Rayons généreux, cartes blanches sur fond teinté, icônes fines** | Rayons 10 / 16 / 24 px, `shadow-carte` chaude, Lucide 16-20 px. **Pas la pilule partout** : sur nos écrans elle faisait « gabarit généré » (Maurice, v4) ; les boutons ont des angles de 10 px, seuls badges et pastilles restent ronds |

Ce qu'on **ne** reprend **pas**, et pourquoi :
- **les photos d'élèves mineurs et les photos de banque d'images** : seule la
  photo fournie par Maurice (personne majeure, autorisation écrite) entre sur
  la vitrine (§ 8) ;
- **les classements nominatifs** (« 3rd Ranking ») : les classements sont
  *opt-in* et pseudonymes (PLAN M9) ; le tableau de bord montre les points
  d'effort et les réussites, pas un rang ;
- **les chiffres de vitrine** (« 50K+ apprenants », « 4,9 ★ ») tant qu'on ne
  les a pas : on n'affiche que ce qui est vrai (3 examens, la provenance des
  annales, un principe) ;
- **l'orange pur d'Orange** (`#FF7900`) : notre mandarine tire vers le
  corail et se fonce pour le texte (§ 2.2).

### 0.2 Ce qui fait « ancien » et qu'on ne refait plus

- **tout gros, tout gras** partout ; **tout petit, tout gris** partout (la v2) :
  la hiérarchie se dose écran par écran ;
- un **bleu roi** de logiciel de gestion, un canevas gris-bleu, un violet froid ;
- des **pages vides** : un rectangle « bientôt » au lieu d'un tableau de bord,
  un héros sans visuel, une moitié d'écran blanche ;
- des champs à bordure épaisse, des badges criards, des titres de carte en
  20 px gras.

### 0.3 Ce qui fait « aujourd'hui » et qu'on applique partout

- **Chaud et lumineux** : crème, pêche, mandarine, encre ; jamais de gris froid.
- **Dosé** : interface à 14 px, titres de carte 15-16 px en 600, grands titres
  en contraste 400 / 700, chiffres clés en 700 `font-data`.
- **Plein et utile** : chaque écran montre l'état de l'élève (jauge, série,
  progression, à reprendre) ; un écran sans données montre sa forme avec des
  données d'exemple marquées, ou un état vide avec une action.
- **Coloré par la matière** : l'information se lit à la couleur de sa matière,
  toujours accompagnée de son nom et de son icône.
- **Un moment fort par écran** : une surface mandarine (`surface-marque`) ou
  noire (`surface-encre`), pas trois.

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

Résolution : **une chrome chaude et précise, et de l'énergie concentrée sur les
moments qui la méritent** — la séance du jour, une bonne réponse, une série
tenue, un examen blanc réussi, la jauge qui monte. La couleur porte toujours
une information, mais ici l'information inclut *« bravo »*.

Trois choses que l'élève doit ressentir en 5 secondes :
1. **Je sais quoi faire ce soir** (la séance du jour est l'action dominante).
2. **Je vois que je progresse** (la jauge, la série, mes matières).
3. **C'est fait pour moi, ici** (examens guinéens nommés juste, exemples locaux,
   prix en GNF, mon examen et ma série partout).

### Ce qu'on refuse
- Le look « plateforme e-learning générique » : photos de banque d'images,
  cartes en grille sans hiérarchie.
- L'infantilisation : pas de mascotte bébé, pas de police « comic ». Un lycéen
  de Terminale SM doit se sentir respecté.
- Les drapeaux et couleurs nationales en aplats décoratifs : le rouge et le vert
  sont réservés au **faux** et au **juste** (§ 2.3).
- Toute animation qui coûte de la batterie ou des données sans rien dire.

---

## 2. Couleurs

### 2.1 Neutres (basculent en mode sombre)

Crème et encre **chaudes** (OKLCH teinte 60, faible chroma). Valeurs posées sur
`:root` / `.dark` dans `resources/css/app.css`.

| Token | Clair | Sombre | Rôle |
|---|---|---|---|
| `craie-50` | `#FCF7F4` | `#110E0B` | Canevas crème |
| `craie-100` | `#F5EFEA` | `#241F1C` | Remplissage muet, survol, piste d'onglets |
| `card` | `#FFFFFF` | `#1A1613` | Cartes |
| `relief` | `#FFFFFF` | `#2B2521` | Ce qui se détache : onglet ou entrée active, dialogue, feuille |
| `border` | `#ECE5DF` | `#302A26` | Filets de cartes |
| `contour` | `#DDD4CE` | `#3F3934` | Contour de bouton `outline`, d'option de QCM au repos |
| `ink-900` | `#1E1814` | `#F8F4F1` | Texte principal, **encre** des boutons `encre` — 17,6:1 |
| `ink-600` | `#655C55` | `#B3ADA8` | Texte secondaire — 6,5:1 / 8,1:1 |
| `ink-500` | `#766D66` | `#9B948E` | Texte tertiaire : aide, méta — ≥ 4,5:1 sur carte et canevas (pas sur `craie-100` : y utiliser `ink-600`) |
| `ink-400` | `#988F87` | `#7B736C` | **Non-texte** : bordure de champ et de case (≥ 3:1), icônes décoratives |

Le mode sombre n'est pas cosmétique : **les élèves révisent le soir**. Il reste
chaud (bruns très sombres), jamais gris bleuté.

### 2.2 La marque — mandarine « Nimba »

Le jeton s'appelle toujours `nimba` (le mont Nimba) ; sa valeur est désormais
la mandarine, OKLCH teinte 42.

| Token | Valeur | Rôle |
|---|---|---|
| `nimba-500` | `#F6641B` | **La mandarine vive** : surfaces, icônes, segments de progression, pastilles de série, forme du héros. **Jamais du texte de taille courante** (3,1:1 sur blanc) |
| `nimba-600` | `#D04904` | **Remplissage des boutons** (blanc dessus 4,5:1), base de `surface-marque`, mot coloré d'un grand titre (≥ 24 px : 4,3:1 sur crème) |
| `nimba-700` | `#A63D02` | Liens, libellés sur teinte, survol du bouton principal — 6,4:1 |
| `nimba-400` / `nimba-300` | `#FE8959` / `#FEB295` | L'accent en sombre (texte, icônes, focus) — 7,7:1 / 10,3:1 sur carte sombre |
| `soleil-400` | `#FFC21A` | L'énergie secondaire : étoile du jour de grâce, réussites. Texte dessus `soleil-900` |

Pourquoi pas l'orange pur des références : `#F97316` ou `#FF7900` portent du
texte blanc à moins de 3:1 et `#FF7900` est la couleur d'Orange Guinée ; la
mandarine vive garde l'éclat pour tout ce qui n'est pas du texte, et se fonce
(600, 700) dès qu'il faut lire.

**Surfaces d'expression** (utilitaires de `app.css`, zéro octet) — **une par
écran, deux au plus sur la vitrine** :
- `surface-marque` : mandarine profonde éclairée en haut à droite — séance du
  jour, panneau de connexion, appel final. Texte blanc, secondaire
  `text-white/85`, bouton blanc à texte `nimba-700`.
- `surface-encre` : encre chaude avec une lueur mandarine — tuteur, second
  appel final.
- `halo-marque` (héros), `fond-ambiance` (haut des espaces connectés),
  `trame-points` (fonds décoratifs).

### 2.3 Les verdicts — trois couleurs, pas une de plus

| Token | Texte (clair) | Rôle |
|---|---|---|
| `juste-600` | `#15803D` (5,0:1) · sombre `#4ADE80` (9,8:1) | Bonne réponse, notion maîtrisée, admis |
| `faux-600` | `#C41942` framboise (5,9:1) · sombre `#FC7184` (6,7:1) | Mauvaise réponse, ajourné, erreur de saisie. Tiré vers le framboise (OKLCH 16) : un rouge orangé se confondrait avec la mandarine |
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
`bg-nimba-600/[0.10] dark:bg-nimba-300/15`, `bg-juste-600/[0.08]`… Jamais
`bg-nimba-50` : une nuance claire fixe reste presque blanche en mode sombre,
pendant que le texte posé dessus s'éclaircit — blanc sur blanc. Une opacité se
compose avec le fond, quel qu'il soit. Le libellé posé sur une teinte de
l'accent est en nuance **700** (clair) / **300** (sombre), pas 600.

---

## 3. Typographie

| Usage | Police | Raison |
|---|---|---|
| Tout : interface, corps, titres, chiffres | **Bricolage Grotesque** variable (graisse 200 → 800, taille optique 12 → 96) | Une grotesque d'inspiration française et anglaise du XIXᵉ siècle, rare sur les sites d'apprentissage. Sa **taille optique** fait tout le travail : en grand, dessin serré et vif, `j` et `q` caractéristiques — le titre a une voix ; à 14 px, dessin ouvert et calme, pièges à encre qui gardent les lettres nettes sur un écran bas de gamme. Une famille, deux registres, un fichier (76,9 Ko en latin). Comparée en spécimen à Plus Jakarta, Instrument Sans, Schibsted, Familjen et Onest (§ 13) |
| Formules | **KaTeX** (polices KaTeX locales) | Rendu typographique de qualité « manuel », hors ligne |

- **Auto-hébergée** (Fontsource, importée dans `app.css`), découpée par
  `unicode-range`, `font-display: swap`. Une police distante échoue hors ligne.
- Budget : **≤ 120 Ko** de polices. Mesure v4 : français = **76,9 Ko** (fichier
  `opsz` : graisse + taille optique ; le fichier sans taille optique, 41 Ko,
  perd justement le caractère des titres). Téléchargé une fois, gardé en cache.
- `html { font-size: 16px }`. **Interface à 14 px**, corps de lecture d'une
  leçon à **17 px** (15 / 17 / 19), interligne 1,65. Champs à 16 px sous 640 px.
- **Graisses** : 400 texte · 500 libellés **et boutons** · 600 titres de
  carte, navigation active, chiffres clés · grand titre en **350 / 600**
  (`titre-contraste`). Pas de 700-800 : trop lourd, ça « crie ».
- **Approche** : titres `h1`–`h4` à `-0.01em` ; ne jamais ajouter
  `tracking-tight` à un texte de moins de 20 px (les mots se collent :
  « Majaugedepréparation », vu le 2026-10-30) ; `-0.025em` pour un grand titre
  (`titre-contraste`), `tracking-tight` pour un chiffre clé.
- **Pas de sur-titre en capitales espacées** au-dessus des titres, pas de
  libellé « MOT · MOT · MOT » : ce sont les tics les plus reconnaissables d'une
  page générée. Un titre se suffit ; s'il faut une précision, une phrase en
  13 px `ink-500` en casse normale. Le bandeau d'exemple lui-même est en
  casse normale : c'est le cachet soleil qui avertit (§ 6.7).
- `.font-data` = `tabular-nums` pour notes, chronomètres, points, montants GNF.

### Le grand titre en contraste (`titre-contraste`)

La phrase en **350**, les mots qui comptent en **`<strong>` 600**. Plus de mot
isolé en couleur (v4) : le contraste de graisse suffit, la couleur en plus
faisait effet de manche.

```tsx
<h1 className="titre-contraste text-vitrine">
  Tout pour réussir <strong>le CEE, le BEPC et le Bac.</strong>
</h1>
<h1 className="titre-contraste text-titre-ecran-large">Bonjour, <strong>Aïssatou</strong></h1>
```

Réservé aux titres d'écran, de héros et de section (≥ 24 px). Les titres de
carte restent en 600 uniformes.

### Échelle (px)

`12` méta · `13` aide · `14` interface · `15-16` titre de carte · `17` lecture ·
`24` titre d'écran mobile · `28-32` titre d'écran desktop · `28` chiffre de
carte · `36-44` chiffre héros (jauge) · `44 → 72` titre de vitrine
(44 mobile, 60 tablette, 72 desktop) · `32-44` titre de section de vitrine ·
`17` chapeau de vitrine

---

## 4. Formes, espace, profondeur

- **Rayons** : boutons et champs **10 px** (`rounded-controle` ; bouton
  `petite` 8 px, onglet dans une piste 7 px), cartes **16 px**
  (`rounded-carte`), grands panneaux **24 px** (`rounded-panneau`), feuilles
  20 px en haut. **Ronds** : seulement les badges, les pastilles (série,
  étapes) et les boutons-icônes ronds (« reprendre »).
- **Hauteurs** (une seule échelle pour boutons, champs, onglets) :

  | Taille | Mobile | ≥ 640 px | Usage |
  |---|---|---|---|
  | `grande` | 48 | 48 | appel de héros, séance du jour |
  | `normale` | **44** | **40** | défaut : formulaires, actions |
  | `compacte` | 36 | 36 | en-têtes, barres d'outils |
  | `petite` | 32 | 32 | actions dans une ligne |

  **Cible tactile ≥ 44 px** côté élève ; options de QCM ≥ 56 px ; bouton rond
  « reprendre » 40 px.
- Icônes Lucide **16 px** (boutons, champs), **18 px** (navigation, tuiles de
  ligne), **20 px** (barre d'onglets, pastilles d'atout).
- **Tuiles d'icône** : carré arrondi teinté de la matière (`MATIERES[cle].tuile`)
  de 32 à 48 px, ou pastille pleine mandarine (atouts du héros).
- Grille 4 px ; marges mobiles 16 px ; contenu des espaces connectés ≤ 1152 px
  (`max-w-6xl`), réglages ≤ 768 px, formulaires d'accès ≤ 384 px, vitrine
  ≤ 1280 px (`max-w-7xl`).
- **Profondeur** (ombres chaudes, teintées de brun) : `shadow-xs` (contrôles)
  → `shadow-carte` → `shadow-releve` (survol, surface d'expression) →
  `shadow-flottant` (dialogue, feuille, téléphone de l'aperçu). Bouton plein :
  `shadow-bouton`, avec un halo mandarine sous le bouton.
- **Actif = relief** : entrée de navigation active et onglet actif en `relief`
  + anneau + ombre, icône à l'accent.
- **Une seule action dominante par écran** (bouton plein mandarine). Sur le
  tableau de bord, c'est « Commencer » dans la séance du jour.
- **Champs** : fond blanc, filet `ink-400` (≥ 3:1), `shadow-xs`, focus =
  bordure de l'accent + anneau 4 px ; classes partagées `CHAMP_BASE` /
  `CHAMP_CONTENEUR` de `input.tsx`.

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

### 6.0 Le tableau de bord élève (accueil)

La page d'accueil de l'élève, sur le modèle du tableau de bord « Oliver »
(`resources/js/pages/eleve/accueil.tsx`). Desktop : colonne principale +
colonne latérale de 320 px ; mobile : une colonne, la séance du jour en
premier (l'action dominante tient dans 360 × 740).

| Bloc | Contenu | Composant |
|---|---|---|
| En-tête | date (méta), « Bonjour, **Prénom** » en contraste, une phrase | `titre-contraste` |
| Séance du jour | sur `surface-marque` : titre, matières en pastilles, durée, nombre de questions, **« Commencer »** | `SeanceDuJour` |
| Jauge | l'arc par matière, légende colorée | `JaugePreparation` |
| Mes matières | une carte par matière : tuile, %, notions maîtrisées, barre en tirets ; rangée qui défile sur mobile | `ProgressionSegments` |
| Reprendre | leçons en cours : tuile, leçon, matière · chapitre, barre fine, minutes restantes, bouton rond | `ProgressionBarre` |
| Ma série | nombre de jours, la semaine Lu → Di (fait ✓ mandarine, jour de grâce ★ soleil, aujourd'hui en pointillés, à venir vide), points d'effort | `CarteSerie` |
| Défi de la semaine | intitulé, tirets, compte | `ProgressionSegments` |
| Mes réussites | badges mérités avec leurs points | — |
| Tuteur | sur `surface-encre`, champ d'appel (V1.1 : « bientôt ») | — |

Jusqu'aux lots 2 et 6, les données viennent de
`App\Support\Demonstration\TableauDeBordExemple` (`est_exemple`, bandeau
« EXEMPLE — contenu fictif ») ; ensuite les services métier les remplacent sans
changer la forme. Aucun rang entre élèves (classements opt-in, PLAN M9).

### 6.1 La jauge de préparation — la signature

Un **arc de cercle** ouvert vers le bas (`JaugePreparation`). Au centre : le
pourcentage en chiffre héros (36 px, 700, `font-data`), dessous : « prêt pour le
BEPC ». Légende des matières dessous, à leur couleur.

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

À côté de la jauge (dessus sur mobile), la **seule carte mandarine** de
l'écran (`surface-marque`, texte blanc) : « Ta séance du jour · 15 min ·
12 questions », les matières en pastilles. Un bouton blanc : **« Commencer »**.
C'est l'action dominante.

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

Tant que le vrai contenu n'est pas là, tout exemple porte le **bandeau
d'exemple** (`BandeauExemple`) : une ligne de la famille des bandeaux
(`rounded-controle`, teinte soleil en opacité), ouverte par un **cachet**
« Exemple » en soleil plein avec une fiole, puis « Contenu fictif, créé pour
la démonstration. » en 13 px `ink-600`. On ne doit jamais pouvoir prendre une
capture d'écran de démo pour un vrai sujet : le cachet jaune se voit sur
toute capture, sans hachures ni capitales qui crient.

---

## 7. Les quatre habillages

| Habillage | Public | Registre |
|---|---|---|
| **Vitrine** | visiteurs, parents, partenaires | Le plus expressif (BrightPath, DevSkill), mais **un seul moment fort** : l'illustration du héros. En-tête en texte (pas de pilules), filet discret ; **héros à deux colonnes** — grand titre en contraste, chapeau 17 px, deux boutons de 44 px (plein + contour), examens préparés en étiquettes ; à droite l'illustration du Nimba au crépuscule (photo de Maurice devant si fournie) et deux fiches de l'application qui débordent du cadre (séance du jour, jauge) ; **preuves en filets** (trois colonnes séparées par des traits, pas des cartes) ; examens en cartes illustrées + matières ; **le sens du nom** (« N'karamögö veut dire mon maître », G-Étudie, égalité des chances, trois engagements) ; « De l'inscription au jour de l'examen » : illustration du soir + trois étapes reliées par un trait + principe des corrigés ; « Dans la poche, et partout ailleurs » (téléphone, tablette, ordinateur) : atouts en filets, « Et bientôt » (tuteur, culture générale, parents et enseignants) + `ApercuApplication` sur cercles concentriques ; FAQ en filets ; **un** appel final `surface-encre` avec le soleil couchant ; pied en colonnes. Puis démo jouable et compte à rebours au lot 8 |
| **Espace élève** | élèves | Canevas crème avec `fond-ambiance` ; barre d'onglets en bas sur mobile (Accueil · Cours · Annales · Examens blancs · Moi ; icône active dans une pilule teintée), barre latérale sur desktop (entrée active en relief, carte de l'élève en bas : initiale sur pastille soleil, jamais de photo). Accueil = tableau de bord complet (§ 6.0) |
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

- Icônes : **Lucide**, trait 2 px, 16-20 px (§ 4).
- **Illustrations par défaut** (v4) : cinq dessins SVG originaux livrés avec
  l'application dans `public/images/vitrine/defaut/` (17 Ko en tout) — `heros`
  (le Nimba et les plateaux du Fouta au crépuscule, un chemin qui monte et
  trois jalons : CEE, BEPC, Bac), `cee` (l'ardoise et le crayon), `bepc` (la
  pile de manuels aux couleurs des matières, l'équerre), `bac` (la toque et le
  diplôme), `soir` (la fenêtre sur la nuit, la lampe, le cahier, le
  téléphone). **Langage** : papier découpé — aplats chauds en couches, pas de
  contour, cercles concentriques du soleil, grain léger (`feTurbulence`),
  palette de la marque plus la latérite ; pas de personnage, pas de texte dans
  l'image. Un nouveau dessin suit ce langage.
- **Remplacer une illustration** : déposer l'image dans
  `public/images/vitrine/` et changer son chemin dans
  `config('vitrine.illustrations')` — mêmes proportions (héros 6:7, examens
  18:11, soir 28:23), SVG, WebP ou JPEG ≤ 150 Ko. Un chemin qui ne mène à
  aucun fichier retombe sur le dessin par défaut : la vitrine n'a jamais de
  trou (`App\Support\ImagesVitrine`, une seule autorité).
- **Photo de la vitrine** (décision de Maurice, 2026-10-30), facultative : une
  photo **fournie par Maurice**, d'une personne **majeure**, avec son
  **autorisation écrite signée** de diffusion. Déposée en
  `public/images/vitrine/heros.webp` (`config('vitrine.photo_heros')`) : WebP à
  fond transparent (personne détourée), ≈ 900 × 1100 px, ≤ 150 Ko ; elle se
  pose **devant** l'illustration du héros. Aucune autre photo de personne.
- Interdit : personnages ou logos protégés, photos de mineurs réels, photos de
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
| `Button` | **Angles de 10 px, graisse 500**, ombre courte sans halo, enfoncement d'un pixel au clic. Deux axes. **`variant`** = intensité : `default` (plein mandarine `nimba-600` + `shadow-bouton`, l'action dominante), `encre` (plein noir : action forte sans couleur, seconde action d'un héros), `doux` (teinte mandarine), `succes` (plein vert : l'action qui conclut), `destructive` (plein framboise, toujours confirmé), `outline` (blanc, filet `contour`), `ghost`. **`ton`** (sur `outline`/`ghost`) : `neutre`, `nimba`, `danger`. **`taille`** : `grande` 44, `normale` 44 → 40, `compacte` 36, `petite` 32 (§ 4). 14 px (15 en `grande`), icône 16 px. Sur `surface-marque`, bouton blanc à texte `nimba-700`. **Pas de flèche ajoutée au libellé, pas de pastille de flèche** (v4) : une seconde action est un bouton `outline` ou `ghost`, pas un bouton plus gros. Un bouton dit ce qu'il fait, jamais « Soumettre ». Icône seule ⇒ `aria-label` + `aria-hidden` sur l'icône |
| `Input`, `Textarea`, `Label` | Même hauteur que les boutons du même habillage (44 → 40 px ; `compacte` 36) ; classes partagées `CHAMP_BASE` / `CHAMP_CONTENEUR` (§ 4) ; libellé 14 px en 500 toujours visible (pas de libellé-placeholder), 6 px au-dessus du champ ; aide en 13 px `ink-500` ; message d'erreur 13 px rouge avec icône de 14 px, lié par `aria-describedby` |
| `SearchInput` | La frappe met à jour le champ tout de suite ; `onRecherche` est appelé **350 ms après la dernière frappe** ; **Entrée** lance tout de suite ; **Échap** et la croix vident le champ **et relancent la recherche à vide** (sinon la liste reste filtrée sur un terme effacé) ; une valeur identique ne relance rien. Sans `onRecherche`, simple champ contrôlé. Les navigations de filtre passent en `preserveScroll` + `replace` (pas une entrée d'historique par caractère) |
| `TelephoneInput` | Indicatif +224 fixe, 9 chiffres groupés à l'affichage (`6xx xx xx xx`), clavier numérique (`inputmode="tel"`), valeur normalisée envoyée au serveur |
| `CodeInput` | Code à 4 ou 6 chiffres en cases ; collage accepté ; avance automatique ; clavier numérique |
| `DateInput` | Le champ date natif n'ouvre son calendrier que sur un minuscule glyphe, invisible sur certains thèmes et absent de Firefox : le composant le masque, affiche sa propre icône à droite, et ouvre le calendrier au clic sur tout le champ (`showPicker()`, repli sur le focus). Gabarit forcé à la hauteur standard |
| `NumberInput` | Clavier numérique ; séparateur de milliers à l'affichage ; tolère la virgule décimale |
| `Choix` (options de QCM) | Cible ≥ 56 px, rayon 12 px, lettre dans une pastille carrée de 28 px ; au repos filet `contour`, sélectionné = bordure + `ring-1` de l'accent + teinte à 6 % ; après vérification : icône + mot + couleur |
| `Feuille` (bottom sheet) | Monte du bas sur mobile (corrigé, filtres), dialogue centré sur desktop ; poignée, fermeture par glissement et par bouton ; focus piégé |
| `Dialog` + `ConfirmProvider` | Toute confirmation passe par `confirmer({ titre, message, action, ton })` (promesse) : **jamais** `window.confirm()` |
| `Toaster` | Notifications brèves (Sonner) : succès et erreurs des messages flash. Jamais pour une information qu'on doit retrouver |
| `Badge` | Statut : pilule de **20 px**, texte 12 px en 500, fond en teinte d'opacité, sans filet ni ombre — distinct d'un bouton (40 px, ombre, graisse 600) |
| `Tabs`, `Pagination` | Onglets en contrôle segmenté : piste `craie-100` de 12 px de rayon, onglet actif en `relief` + `ring-1` + `shadow-xs`, 36 → 32 px. Pagination en français, construite en composant (jamais de libellés traduits par remplacement dans du HTML injecté) |
| `ZoneDonnee` | Enveloppe une donnée chargée à part : squelette pendant le chargement, message + « Réessayer » + « Recharger la page » en cas d'échec ; jamais un indicateur qui tourne sans fin |
| `EtatVide` | Illustration + phrase + **une action** |
| `ProgressionSegments`, `ProgressionBarre` | Progression en tirets (20 pastilles, une par 5 %, ou une par unité d'un défi) ou en barre fine ; couleur de la matière (`MATIERES[cle].plein`) ou mandarine ; `role="progressbar"` + `aria-label` + `aria-valuenow` |
| `JaugePreparation` | Arc par matière (§ 6.1), nom accessible complet ; partagée par le tableau de bord et l'aperçu de la vitrine |
| `Formule` | Rendu KaTeX (MathML accessible) ; défilement horizontal propre si la formule dépasse, jamais de débordement de page |
| `BandeauExemple` | Cachet soleil « Exemple » + « Contenu fictif, créé pour la démonstration. » sur une teinte soleil, sur tout contenu `est_exemple` (§ 6.7) |

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

### Lot 0, étape 1 — première implémentation (2026-10-30)

1. **Polices.** *Constat* : le kit charge ses polices par l'option `fonts` de
   `laravel-vite-plugin`, qui déclare chaque graisse deux fois (WOFF2, puis
   WOFF) ; la dernière déclaration l'emporte et le navigateur télécharge le
   WOFF, plus lourd (requêtes `.woff` dans le journal du serveur à l'audit).
   *Correction* : Sora et Lexend importées depuis Fontsource dans `app.css`
   (une seule déclaration, WOFF2 en premier, sous-ensembles par
   `unicode-range`). *Preuve* : français courant = sous-ensemble latin seul,
   Sora 600 + 700 = 29,4 Ko, Lexend 400 + 500 + 600 = 43,1 Ko, soit
   **72,5 Ko** (budget 120 Ko). Les polices KaTeX ne sont chargées que par les
   pages qui affichent une formule.
2. **Nuances calculées.** Matières : nuances 50 → 900 calculées en OKLCH à
   partir des teintes du § 2.4 ; nuance 600 sur blanc de 5,0:1 à 5,8:1, nuance
   300 sur carte sombre de 8,3:1 à 9,2:1. Ajoutés au nuancier : nimba 50–900
   (300, 600, 700 imposées), soleil 50–900 (400 imposée), verdicts en 400
   (texte en sombre) et 700 (survol). **Texte « indice » en sombre** :
   `indice-400` `#F5A524`, 8,4:1 sur la carte sombre (le § 2.3 ne le donnait
   pas). *Preuve* : `tests/js/contrastes.test.ts` relit `app.css` et vérifie
   chaque paire, dans les deux thèmes.
3. **Bouton plein à texte sombre (vu par axe).** *Cause* : `tailwind-merge`
   ne connaissait pas nos tailles (`text-interface`…), les prenait pour des
   couleurs et supprimait le `text-white` qui les précède. *Correction* :
   `extendTailwindMerge` déclare tailles, rayons, ombres, police `titre` et
   `font-data` (`resources/js/lib/utils.ts`). *Preuve* : audit axe sans
   violation `color-contrast`.
4. **Thème sombre imbriqué.** Une variable qui en référence une autre
   (`--background: var(--craie-50)`) est calculée là où elle est déclarée :
   posée sur `:root` seul, elle gardait la valeur claire dans un `.dark`
   imbriqué. Les variables dérivées sont redéclarées sur `:root, .dark, .clair`.
   La classe `.clair` force le clair dans un sous-arbre sombre (catalogue côte
   à côte) ; la variante `dark:` l'exclut.
5. **Débordements à 360 px et dans les grilles.** Le code à 6 cases (48 px
   chacune) dépassait la carte à 360 px et la colonne voisine dans une
   grille à deux colonnes : cases fluides plafonnées à 48 px. Une liste
   d'onglets défilante élargissait la page : les grilles prennent des
   colonnes `minmax(0, 1fr)` (`grid-cols-1`). « Mathématiques » était coupé :
   tuiles de matières sur une colonne sous 400 px. Pagination à 360 px :
   flèches seules et « Page 3 sur 12 ». Un `Champ` sans aide s'étirait dans
   sa rangée : `content-start`. *Preuve* : `tests/visuel` vérifie qu'aucun
   champ, zone de donnée ou état vide ne déborde de son cadre (contrôle
   validé en provoquant le défaut).
6. **Formules.** Une option de QCM qui ne contient qu'une formule n'avait pas
   de nom accessible (le MathML n'en donne pas à un bouton) : `Formule` prend
   un `libelle` (« P de A inter B égale 0,12 »), obligatoire dans ce cas.
   Une formule trop large défile dans son cadre, devenu atteignable au
   clavier. Une erreur de syntaxe s'affiche en `--destructive` (le rouge fixe
   de KaTeX était illisible en sombre).
7. **Écarts assumés au texte ci-dessus.**
   - Champs de saisie à **16 px** (l'interface reste à 15 px) : en dessous,
     iPhone zoome sur le champ au toucher.
   - **Badges en teinte d'opacité**, pas en aplat plein : un aplat de statut
     ne tient pas le contraste dans les deux thèmes ; la forme (rectangle à
     coins de 6 px, sans contour ni icône) reste distincte d'un bouton.
   - Voile des dialogues en couleur fixe (`#0E1220` à 60 %) : `ink-900`
     s'éclaircit en sombre.
   - Pulsation des squelettes retardée de 400 ms (§ 5 : pas d'animation en
     boucle pour une attente courte).

### Lot 0, étapes 3 et 4 — habillages, connexion, « Mon compte » (2026-10-30)

1. **Registres.** Connexion, inscription, récupération et « Mon compte » au
   tutoiement (écrans de l'espace élève, § 7) ; double authentification au
   vouvoiement (réservée au personnel) ; vitrine au vouvoiement ; messages de
   validation et pages d'erreur à la forme neutre (ils servent à tous).
2. **Jamais de clic mort.** Une entrée de navigation d'un écran à venir
   reste visible avec « bientôt » et, touchée, le dit par une notification.
3. **Onglets de « Mon compte » en grille 2 × 2 sur mobile** : une liste qui
   défile cachait « Affichage » à 360 px.
4. **Pas de confirmation du mot de passe à l'inscription** : un bouton
   « Afficher le mot de passe » évite les fautes de frappe sans doubler la
   saisie (inscription en moins d'une minute, critère du lot 2).
5. **Numéro masqué** partout où l'élève le revoit (« 6•• •• •4 56 ») : on
   montre à qui part le code sans exposer le numéro entier sur un téléphone
   partagé.

### Refonte v2 — « tout gros, tout gras, bleu » → dosé, neutre, violet (2026-10-30)

*Constat* (Maurice, après l'étape 4) : le bleu `#2537C9` sur canevas gris-bleu
faisait « ancien site », pas vivant ; caractères grands et gras partout ;
pages plates (une carte blanche au milieu, un héros sans visuel) ; champs et
boutons lourds. La consigne : un travail **au sommet**, élégant et
professionnel, des composants petits et bien dosés, sans prendre le hors
ligne comme excuse.

*Cause*, mesurée sur les captures de la v1 :
- Lexend (large par construction) à 15-16 px en 500-600 et Sora 700 sur
  tous les titres, y compris les titres de carte (20 px gras) ;
- contrôles de 48 px partout, rayons de 12 px, bordures `ink-400` bleutées ;
- neutres teintés de bleu (`#F6F7FB`, `#141A2E`) : l'ensemble lisait
  « logiciel d'administration » ;
- aucune surface d'expression ni visuel : la vitrine laissait la moitié
  droite vide, l'accueil élève un rectangle pointillé.

*Correction* :
1. **Marque** : violet `nimba-600` `#702AED` (OKLCH teinte 290, blanc 6,5:1),
   rampe 50 → 950 recalculée ; le soleil reste l'énergie. Le bleu, l'orange
   (Orange Guinée) et le jaune en aplat (MTN) sont exclus comme couleur de
   marque. Monogramme et `favicon.svg` redessinés (le favicon était encore le
   logo Laravel).
2. **Neutres** neutres (§ 2.1), nouveaux jetons `ink-500` (texte tertiaire
   ≥ 4,5:1), `contour` (filet de bouton), `relief` (surface active,
   dialogue).
3. **Typographie** : Geist variable + Instrument Serif italique (§ 3),
   interface à 14 px, titres en 600 resserrés, jamais de 700.
   *Preuve* : 51,5 Ko de polices en français (72,5 Ko en v1).
4. **Dosage** : échelle de hauteurs 48 / 44→40 / 36 / 32 (§ 4), icônes de
   16 px, badges en pilule, onglets segmentés, profondeur en couches
   (`shadow-xs` → `shadow-flottant`, `shadow-bouton`).
5. **Surfaces d'expression** : `surface-marque`, `halo-marque`,
   `trame-points` (CSS pur) ; aperçu de l'application dessiné en HTML/SVG
   (`components/apercu-application.tsx`) dans le héros de la vitrine.
6. **Écrans refaits** : vitrine (héros à deux colonnes, examens, atouts,
   appel final, pied), connexion en écran partagé (formulaire + panneau de
   marque à partir de 1024 px), accueil élève (date, salutation selon
   l'heure, séance du jour sur `surface-marque`, tuiles « bientôt »),
   navigations (entrée active en relief, pilule de la barre d'onglets, carte
   de l'élève), « Mon compte », back-office, console, erreur.

*Pièges rencontrés* :
- **Carte blanche dans un panneau sombre** : en thème sombre, la carte
  « Juste » du panneau de connexion prenait `ink-600` sombre (gris clair) sur
  fond blanc — vu par axe (`color-contrast`). Une surface blanche fixe posée
  dans un écran qui peut passer en sombre porte la classe **`clair`**.
- **Une capture qui change chaque jour** : l'accueil affiche la date et dit
  « Bonjour » ou « Bonsoir ». `ecrans.spec.ts` fige l'horloge
  (`page.clock.setFixedTime`) ; tout écran qui affiche l'heure ou la date fait
  de même.
- **Grille de cartes à hauteurs inégales** : une `li` en `grid` étirée par sa
  rangée répartit l'espace entre ses lignes (titre décalé) : `content-start`.

*Écart assumé* : la v1 imposait des cibles de 48 px côté élève ; la v2 descend
à 44 px (WCAG 2.5.5, recommandation d'Apple), 40 px à partir de 640 px
(souris), et garde 56 px pour les options de QCM.

*Preuve* : 98 tests Playwright verts (12 écrans × 4 gabarits × 2 thèmes +
parcours), axe sans violation sérieuse, aucun débordement à 360 px ;
captures de référence régénérées dans `tests/visuel/captures/lot0/` ;
`contrastes.test.ts` étendu aux nouveaux jetons (122 tests Vitest).

### Refonte v3 — adaptation aux références de Maurice (2026-10-30)

*Constat* : la v2 (violet, neutres froids, tout petit, accueil élève vide)
n'a pas convaincu. Maurice a fourni cinq références (§ 0.1) et tranché :
**mandarine chaude**, **ses propres photos** pour la vitrine, **titres en
contraste léger / gras**, **tableau de bord complet en données d'exemple**.

*Correction* :
1. **Couleurs** : mandarine `nimba` (OKLCH 42 ; vive `500` `#F6641B` pour
   les surfaces, `600` `#D04904` pour les boutons, `700` `#A63D02` pour le
   texte), crème et encre chaudes, sombre brun ; rouge « faux » tiré vers le
   framboise `#C41942` (le rouge orangé se confondait avec la marque) ;
   monogramme et favicon en mandarine.
2. **Police** : Plus Jakarta Sans variable (27,3 Ko, contre 51,5 Ko pour
   Geist + Instrument Serif) ; utilitaire `titre-contraste`.
3. **Formes** : boutons en pilule, variante `encre`, champs 12 px, cartes
   20 px, panneaux 28 px, ombres chaudes.
4. **Tableau de bord élève** (§ 6.0) servi par
   `App\Http\Controllers\Eleve\AccueilController` depuis
   `TableauDeBordExemple` (`est_exemple`) ; composants `JaugePreparation`,
   `ProgressionSegments`, `ProgressionBarre`, helper `annoncerBientot`.
5. **Vitrine** refaite sur BrightPath / DevSkill (§ 7) ; emplacement photo
   `config('vitrine.photo_heros')`, servi par `VitrineController` /
   `PhotoVitrine`.

*Pièges rencontrés* :
- **Mots collés** : Plus Jakarta est étroite ; `-0.02em` sur les `h1`–`h4`
  plus `tracking-tight` sur un titre de carte donnait
  « Majaugedepréparation ». Approche `-0.01em` par défaut, pas de
  `tracking-tight` sous 20 px, `word-spacing` légèrement ouvert dans
  `titre-contraste`.
- **Rangée qui défile** (matières sur mobile) : axe
  `scrollable-region-focusable` → `tabIndex={0}` + nom accessible.
- **`ink-500` sur `craie-100`** : 4,4:1 (axe, légende de la citation) → `ink-600`
  sur ce fond.
- **En-tête de vitrine à 768 px** : navigation centrale + boutons de compte
  débordaient d'un pixel → navigation centrale à partir de 1024 px.
- **Mandarine vive en texte** : 2,9:1 sur crème — refusée même pour un grand
  titre ; le mot coloré prend `nimba-600` (4,3:1, ≥ 3:1 exigé à 24 px et plus).

*Preuve* : 98 tests Playwright verts (12 écrans × 4 gabarits × 2 thèmes +
parcours), axe sans violation sérieuse, aucun débordement ; captures de
référence régénérées ; `contrastes.test.ts` aux valeurs v3 (125 Vitest) ;
Pest `TableauDeBordEleveTest`, `VitrineTest` (112 Pest).

### Refonte v4 — même direction, plus original, plus professionnel (2026-10-30)

*Constat* (Maurice, sur la v3) : « ça ressemble aux références, mais on peut
faire beaucoup mieux » ; il manque des **images par défaut** (même
remplaçables) ; la police doit faire « site à 10 000 $ » ; les **boutons de la
vitrine sont gros et trop arrondis — ça fait IA**. Analyse : la v3 cumulait les
tics d'une page générée — pilule partout, pastille de flèche dans le bouton,
halo orange sous chaque bouton plein, sur-titres en capitales espacées,
« Réviser · S'entraîner · Réussir », un mot du titre en couleur, contenus
découpés en cartes identiques, trois surfaces fortes concurrentes.

*Correction* :
1. **Police** : Bricolage Grotesque (fichier `opsz`, 76,9 Ko) à la place de
   Plus Jakarta Sans, après un spécimen comparatif de six familles
   (Jakarta, Bricolage en taille optique et en chasse étroite, Instrument
   Sans, Schibsted, Familjen, Onest) sur le titre réel, une ligne
   d'interface, un bouton et des chiffres. Retenue pour la taille optique
   (caractère en grand, calme en petit) et le rendu net à 14 px. Grand titre
   en 350 / 600, vitrine à 72 px. Écartées : une serif d'affichage (crème +
   serif + orange = le cliché n° 1 des pages générées), les grotesques trop
   neutres (Schibsted, Onest : pas de voix), la chasse étroite (trop
   « affiche »), Familjen (trop excentrique à 14 px).
2. **Boutons et formes** : angles de 10 px (fini la pilule), graisse 500,
   44 px au plus, ombre courte sans halo coloré, pas de flèche ;
   cartes 16 px, panneaux 24 px. Onglets, choix de QCM, toasts alignés sur
   `rounded-controle`.
3. **Illustrations** : cinq SVG originaux en papier découpé (§ 8), servis
   par `ImagesVitrine` et remplaçables dans `config/vitrine.php`.
4. **Vitrine recomposée** (§ 7) autour d'un seul moment fort : en-tête en
   texte, héros à deux colonnes avec l'illustration et deux fiches flottantes,
   preuves et atouts en filets plutôt qu'en cartes, examens illustrés, étapes
   reliées, un seul appel final. Plus aucun sur-titre en capitales ; le pied
   de page passe aussi en casse normale.
5. **Espace élève** : il hérite de la police et des formes ; l'étiquette « Ta
   séance du jour » passe en casse normale.

*Pièges rencontrés* :
- **Héros à 1366 × 768** : l'illustration en 6:7 poussait la fiche « Séance du
  jour » sous la ligne de flottaison → carré à partir de 1024 px, 5:4 sur
  mobile (recadré sur le chemin, `object-[50%_70%]`).
- **Halo en sombre** : la lueur soleil devenait un voile olive sur le brun →
  `dark:opacity-40` ; l'illustration claire est adoucie (`dark:brightness-90`).
- **Illustration du soir à 768 px** : pleine largeur, elle écrasait la
  section → `max-w-xl` centrée jusqu'au passage en deux colonnes.

*Preuve* : spécimen et captures 360 / 768 / 1366 en clair et sombre relus ;
98 tests Playwright verts (axe sans violation sérieuse, captures de
référence régénérées après relecture) ; 118 Pest (dont 7 dans
`VitrineTest` : dessins par défaut, remplacement, repli), 125 Vitest ; `tsc`,
`vp check`, Pint, Larastan et `npm run build` passent.

### Vitrine — un titre qui dit ce que fait le produit (2026-10-30)

*Constat* (Maurice) : « Un soir, quinze minutes, et je sais où j'en suis » est
vide de sens et ne représente pas le projet. Relue contre le PLAN (§ 0 à 5),
la page avait aussi des incohérences : « Tout tient dans le téléphone » alors
que la plaquette demande téléphones, tablettes **et** ordinateurs ; « Trois
gestes, chaque soir » dont le premier geste est l'inscription ; une étape
écrite à la troisième personne (« là où l'élève ») dans une page qui
vouvoie ; une séance « Maths et physique » au BEPC (matières non
confirmées) ; rien sur le sens du nom ni sur l'égalité des chances, cœur de
la plaquette ; rien sur ce qui arrive ensuite (tuteur, culture générale,
parents, enseignants).

*Correction* : titre « Préparez le CEE, le BEPC et le Bac **avec les annales
corrigées.** » et chapeau concret (sujets depuis 2010 corrigés par des
enseignants, cours du programme guinéen, examens blancs aux conditions
réelles) ; même phrase dans le panneau de connexion ; section « N'karamögö
veut dire « mon maître » » (G-Étudie, égalité des chances, trois
engagements) ; étapes « De l'inscription au jour de l'examen » au
vouvoiement ; « Dans la poche, et partout ailleurs » ; liste « Et bientôt »
marquée d'un badge ; séance de la fiche réduite aux mathématiques ; pied de
page qui explique le nom ; « G‑Étudie » avec un trait d'union insécable.

*Preuve* : captures 360 et 1366 relues ; 98 Playwright verts (captures de la
vitrine, de la connexion, de l'inscription et du mot de passe oublié
régénérées) ; 118 Pest ; `tsc`, `vp check`, build verts.

*Puis, le même jour* : ce titre était encore trop long et ne couvrait que
les annales. Maurice veut **bref, et qui résume tout ce que gère
l'application**. Titre : « Tout pour réussir **le CEE, le BEPC et le
Bac.** » (sept mots) ; chapeau : « Cours, annales corrigées, exercices,
examens blancs et suivi de vos progrès, même hors connexion. » — les six
piliers en une ligne. Le détail (2010, enseignants, programme guinéen) reste
plus bas, dans les preuves et la section sur le nom.

### Lot 0, étape 5 — « Mon compte » du personnel et onglet « Sécurité » (2026-10-30)

*Constat* : « Mon compte » restait dans l'habillage élève pour tout le monde,
tutoyait un rédacteur et lui parlait de « progression » ; la coque du
personnel n'avait aucun lien vers « Mon compte ». La première capture de
l'onglet « Sécurité » était à moitié vide à 1366 px ; à 360 px, cinq onglets
en grille de 3 laissaient une case vide, et le badge d'état écrasait le titre.

*Décision* :
- « Mon compte » prend l'habillage de l'espace du compte (`CompteLayout`) ;
  une coque réduite à « Mon compte » pour un compte sans espace ;
- pied de la coque du personnel : « Mon compte » (actif sous `/compte`) et
  raccourci vers l'autre espace ouvert ;
- tutoiement pour l'élève, vouvoiement pour les autres (`useFormule()`) ;
- onglet « Sécurité » : ligne d'état (tuile 40 px, titre + badge, précision),
  une seule action pleine ; configuration en deux étapes numérotées à
  l'encre ; QR code à l'encre sur blanc fixe (`clair`), lisible en sombre ;
  clé groupée par 4 en `font-data` ; codes de secours masqués par défaut ;
  puis deux cartes utiles côte à côte : « Session de travail » (barre,
  heures d'ouverture et de reconnexion) et « Activité du compte » (cinq
  derniers gestes sensibles, en filets) ;
- cinq onglets à 360 px : 3 + 2 (grille de 6, `col-span-2` / `col-span-3`) ;
- zones qui changent à chaque passage (heures, journal) marquées
  `data-capture="variable"` et masquées dans les captures de référence.

*Preuve* : `compte-securite`, `compte-profil-contenu`, `erreur-403` en
4 gabarits × 2 thèmes, axe sans violation sérieuse ; parcours d'activation vu
en 360 clair et 1366 sombre ; 124 Playwright verts.

### Lot 0, étape 6 — le hors ligne visible (2026-10-30)

*Décision* : le hors ligne se voit sans alarmer.
- **Pastille** dans la barre du haut (mobile) et au pied de la barre
  latérale : « Tout est envoyé » (vert `juste`), « 12 réponses à envoyer »
  (mandarine), « Hors ligne » (neutre), « Session expirée » (`indice`) —
  toujours icône + mot ; un point framboise s'il y a un refus. La toucher
  ouvre la feuille « Tes réponses » (« À envoyer », « À corriger » avec
  « Réessayer » / « Abandonner »).
- **Bandeaux** d'une ligne au-dessus du contenu, coins `rounded-controle`,
  teintes en opacité : hors ligne (encre 6 %), session expirée (`indice`,
  bouton encre « Se reconnecter »), copie datée (`craie-100`, « Actualiser »),
  notice iPhone (mandarine, refermable). Une phrase qui rassure d'abord.
- **Dialogue** « Cet écran demande une connexion » : tuile 40 px au nuage
  barré, une phrase, « Compris » ; l'élève reste sur son écran.
- **Navigation** hors ligne : entrées sans copie estompées (55 %) avec un
  petit nuage barré, toujours cliquables.
- **Page de repli** et **filet de démarrage** : autonomes (styles en
  ligne), crème / encre / mandarine, clair et sombre.
- « Mon compte › Affichage » : section « Installer l'application » (bouton
  quand le navigateur le propose, étapes numérotées à l'encre sur iPhone).

*Preuve* : captures 360 clair et 1366 sombre relues (accueil en ligne,
dialogue, feuille, copie hors ligne) ; références des écrans élève
régénérées ; 125 Playwright verts, axe sans violation sérieuse.

### Lot 1 — référentiel et back-office contenu (2026-10-31)

*Décision* : le back-office reste dense et calme (§ 7), mais jamais vide.
- **Tableau de bord** : salutation en `titre-contraste`, quatre compteurs
  par statut (liens vers la liste filtrée), **un** moment fort
  `surface-marque` « Votre prochaine action » (relire d'abord, sinon
  reprendre une leçon renvoyée, sinon écrire), « À relire », **couverture
  des matières phares** en tirets à la couleur de la matière (part des
  notions qui ont une leçon publiée), « Renvoyées, à reprendre » (teinte
  `indice`), « Mes brouillons », le circuit en trois étapes à l'encre.
- **Statuts** : seule couleur de la chrome — brouillon (neutre, crayon),
  en relecture (mandarine, horloge), publiée (`juste`, coche), archivée
  (neutre) ; toujours icône + mot (`BadgeStatut`).
- **Éditeur** : rédaction à gauche, « Comme l'élève la verra » à droite
  (le même `ContenuBlocs` que l'espace élève, taille de lecture) ; onglets
  Rédiger / Aperçu sous 1024 px. Titre de 24 px sans cadre, barre d'outils
  collante d'icônes 16 px (état actif en encre 7 %), indicateur
  d'enregistrement discret à côté de l'action dominante « Envoyer en
  relecture ». Formule : dialogue LaTeX avec rendu en direct et dix
  raccourcis rendus par KaTeX.
- **Encadrés** : « À retenir » mandarine, « Méthode » encre sur craie,
  « Exemple résolu » carte neutre, « Piège fréquent » soleil (pas
  `faux` : le rouge reste au verdict, § 2.3) ; icône + titre en 13 px 600.
- **Relecture** : panneau `surface-encre` « À vous de relire » (le moment
  fort de la fiche), commentaire dans un îlot `clair`, « Publier » plein et
  « Renvoyer à l'auteur » en filet blanc ; historique en frise numérotée.
- **Référentiel** : onglets segmentés comme « Mon compte » ; matières en
  lignes à filets (tuile 40 px, « Phare » en pastille mandarine) ; teinte
  choisie dans une grille de dix tuiles ; épreuves avec « À saisir »
  (`indice`) au lieu d'un coefficient inventé, et un panneau encre
  « Données officielles » qui dit pourquoi ; programme en cartes de
  chapitres numérotées à l'encre, notions numérotées « 2.1 ».

*Vu et corrigé sur les captures* :
- **Sombre, panneaux encre** : `text-craie-50` s'inverse en sombre (la
  craie devient foncée) — titre « À vous de relire », bouton « Renvoyer »
  et panneau « Données officielles » illisibles. Sur `surface-encre`, le
  texte est en **blanc fixe** (`text-white`, `/75`, `/60`).
- **360 px, tableau de bord** : « Tout voir » renvoyé sous le titre de
  section (`flex-wrap`) → en-tête de `Section` sans retour à la ligne,
  action `shrink-0` ; titre de leçon tronqué par le badge → badge masqué
  sous 640 px dans la file « À relire » (la file ne contient que des
  leçons en relecture) ; nom de matière tronqué par la classe → la classe
  passe sur la seconde ligne, avec les examens.
- **Pastilles « Exemple »** jaunes pleines sur chaque ligne : trop fortes
  pour un écran de travail → neutres ; le bandeau hachuré « EXEMPLE —
  contenu fictif » reste le signal fort.
- Corbeilles rouges sur chaque ligne : neutres, rouges au survol.
- **Éditeur** : barre d'outils sur deux lignes à 1366 px → colonne de
  rédaction un peu plus large que l'aperçu (1,15 / 1) et outils sans
  espacement ; titre 20 px sous 640 px (24 px au-delà) pour ne pas couper
  un titre long.
- **Épreuves, 360 px** : la rangée défilante des examens élargissait la page
  (élément de grille à `min-width: auto`) → `min-w-0` sur son conteneur ;
  la ligne « Coefficient · Durée » passe à la ligne.
- **Accessibilité** : le bouton qui ouvre une formule dans l'éditeur portait
  un `aria-label` sans son texte visible (axe, sévère) → texte masqué
  « Modifier la formule : » suivi du MathML de la formule.

*Preuve* : 12 écrans × 4 gabarits × 2 thèmes dans
`tests/visuel/captures/lot1/`, axe sans violation sérieuse, aucun
débordement ; stables sur deux semis de démonstration différents.

### Bandeau d'exemple redessiné (2026-10-31)

*Constat* (Maurice : « ce bandeau est moche ») : hachures jaunes sur toute la
largeur, filet soleil, capitales espacées en gras — le bandeau criait plus
fort que le titre de l'écran, et ressemblait à un ruban de chantier plutôt
qu'à la famille des bandeaux (hors ligne, copie, iPhone).

*Décision* : une ligne calme de la même famille — `rounded-controle`, teinte
`soleil-400` en opacité (16 % clair, 9 % sombre), sans filet ; le signal
tient dans un **cachet** `Badge` soleil plein « Exemple » avec une fiole,
suivi d'une phrase en casse normale. L'utilitaire `hachures-exemple` est
retiré d'`app.css`.

*Vu et corrigé sur les captures* : à 360 px, la phrase complète passait sur
deux lignes à côté du cachet → « Contenu fictif. » seul sous 640 px.

*Preuve* : 56 captures de référence régénérées (accueil élève, catalogue,
tableaux de bord contenu, leçons), axe sans violation sérieuse, aucun
débordement.
