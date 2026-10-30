---
name: design-ardoise
description: "Design system « Ardoise » v4 de N'karamögö · G-Étudie (mandarine chaude, Bricolage Grotesque, boutons sobres à 10 px, tableaux de bord pleins, vitrine illustrée). À invoquer AVANT de créer ou modifier tout écran, layout, composant d'interface, page Inertia/React (.tsx), classe Tailwind, couleur, police, icône ou capture Playwright ; et pour relire une capture d'écran. Donne les références à suivre, les jetons, l'échelle, les recettes d'écran et la grille de relecture."
metadata:
  author: n-karamogo
---

# Design « Ardoise » v4 — mode d'emploi

Référence complète : `DESIGN.md` (§ 0 et § 0.1 d'abord). Ce fichier est la
version de travail.

## 1. La cible

Les cinq références de Maurice (`DESIGN.md` § 0.1) : tableaux de bord
« Oliver » et « Eduvo », vitrines « BrightPath » et « DevSkill ». Leur langage :
**ambiance chaude** (crème, halos pêche), **une couleur vive (mandarine)
épaulée par le noir**, **chaque matière à sa couleur**, **écrans pleins
d'informations utiles**, **grands titres en contraste léger / gras**, rayons
généreux, cartes blanches sur fond teinté. **v4** : la même direction en plus
original et plus professionnel — pas de pilule partout, pas de tics de page
générée (voir § 4 bis). Le hors ligne
n'excuse jamais un écran pauvre. Si un écran paraît plus vide, plus froid ou
plus pauvre que les références, il n'est pas fini.

## 2. Les jetons (`resources/css/app.css`, jamais de valeur inventée)

| Besoin | Classe |
|---|---|
| Fond de page | `bg-background` (crème `craie-50`) ; espaces connectés : `fond-ambiance` |
| Carte | `rounded-carte border bg-card p-5 shadow-carte` (16 px) |
| Grand panneau | `rounded-panneau` (24 px) |
| Surface active / qui flotte | `bg-relief` (+ `ring-1 ring-black/5 shadow-xs`) |
| Remplissage muet | `bg-craie-100` (texte dessus : `ink-600`, pas `ink-500`) |
| Texte : principal / secondaire / tertiaire | `text-ink-900` / `text-ink-600` / `text-ink-500` |
| Bordure de champ, case | `ink-400` (via `border-input`) |
| Filet de bouton outline | `border-contour` |
| Mandarine vive (surfaces, icônes, segments, pastilles) | `nimba-500` — **jamais en texte courant** |
| Bouton plein, mot coloré d'un grand titre | `nimba-600` |
| Lien, libellé sur teinte | `nimba-700` (sombre : `nimba-300` / `nimba-400`) |
| Teinte mandarine | `bg-nimba-500/[0.12] dark:bg-nimba-400/15` |
| Encre (bouton `encre`, étapes numérotées) | `bg-ink-900 text-craie-50` |
| Matière | `MATIERES[cle].tuile` / `.plein` / `.trait` / `.texte` (`lib/matieres.ts`) |
| Verdicts | `juste` / `faux` (framboise) / `indice` — icône + mot + couleur |
| Surfaces fortes | `surface-marque` (mandarine), `surface-encre` (noir) — une par écran |
| Héros | `halo-marque` ; `trame-points` en décor |
| Chiffres | `font-data` |

## 3. Typographie et échelle

- Police unique : **Bricolage Grotesque** (taille optique : vive en grand,
  calme en petit). Interface 14 px (`text-interface`), aide 13, méta 12,
  titre de carte 15-16 en 600, lecture 17.
- **Grand titre** (écran, héros, section ≥ 24 px) : `titre-contraste` — la
  phrase en 350, les mots clés en `<strong>` 600. Pas de mot en couleur.
- Chiffres clés : 600, `font-data`, `tracking-tight`, unité en 500 `ink-500`.
- **Pas de `tracking-tight` sous 20 px** : les mots se collent.
- Hauteurs : `grande` 44 · `normale` 44 → 40 · `compacte` 36 · `petite` 32.
  Boutons et champs à **10 px** (`rounded-controle`), graisse 500 ; ronds
  seulement pour badges, pastilles et boutons-icônes.
- Icônes Lucide 16 (boutons) · 18 (lignes, navigation) · 20 (onglets, atouts).

## 4. Règles de composition

1. **Composants du kit d'abord** : `Button` (`default`, `encre`, `doux`,
   `outline`, `ghost`), `Champ` + `Input`, `Badge`, `ProgressionSegments`,
   `ProgressionBarre`, `JaugePreparation`, `BandeauExemple`, `EtatVide`.
   Un nouveau champ réutilise `CHAMP_BASE` / `CHAMP_CONTENEUR`.
2. **Une action dominante** par écran (bouton plein mandarine).
3. **Un moment fort** : une `surface-marque` ou une `surface-encre` (deux au
   plus sur la vitrine).
4. **Écran plein** : l'état de l'élève d'abord (jauge, série, matières, à
   reprendre). Pas de données ? La forme avec des données d'exemple servies
   par le serveur et marquées `est_exemple` (bandeau), sinon `EtatVide` avec
   une action.
5. **Jamais de clic mort** : une action pas encore construite appelle
   `annoncerBientot('…')` (`lib/bientot.ts`).
6. **Matière = couleur + nom + icône**, jamais la couleur seule.
7. **Surface blanche fixe** dans un écran qui peut passer en sombre : classe
   `clair`.
8. **Mobile d'abord** (360 px) : séance / action dominante visible sans
   défiler ; une rangée de cartes peut défiler horizontalement
   (`snap-x overflow-x-auto`, avec `tabIndex={0}` et un nom accessible).
   Desktop : colonne principale + colonne latérale de 320 px.
9. **Données honnêtes** : aucun chiffre de vitrine non sourcé (« 50K+ »,
   « 4,9 ★ »), aucun sujet, coefficient, durée ou date d'examen inventés,
   aucun classement nominatif (opt-in, PLAN M9).
10. **Images** : la vitrine a toujours ses illustrations (dessins par défaut
    SVG en papier découpé, `public/images/vitrine/defaut/`, remplaçables dans
    `config('vitrine.illustrations')`, servis par `ImagesVitrine`). Photo :
    seulement celle de Maurice (`config('vitrine.photo_heros')`), posée devant
    l'illustration du héros.
11. Classes Tailwind écrites en entier dans des `.ts` / `.tsx`.

## 4 bis. Ce qui fait « page générée » — à ne pas faire

- la pilule sur chaque bouton, la flèche dans une pastille, le halo coloré
  sous un bouton plein, un bouton de 48 px ;
- un sur-titre en capitales espacées au-dessus de chaque titre, un libellé
  « Mot · Mot · Mot », un mot du titre isolé en couleur ;
- tout découper en cartes identiques (préférer des filets quand le contenu
  est une liste) ; trois surfaces fortes qui se disputent l'œil ;
- une entrée animée sur chaque section. Un seul mouvement orchestré (les
  fiches du héros), le reste immobile.

## 5. Recettes

- **Tableau de bord** : `pages/eleve/accueil.tsx` (DESIGN.md § 6.0) — en-tête
  méta + `titre-contraste` ; grille `lg:grid-cols-[minmax(0,1fr)_20rem]` ;
  cartes de matière (tuile, %, notions, tirets) ; liste « Reprendre » (tuile,
  titre, sous-titre, barre fine, minutes, bouton rond) ; série Lu → Di.
- **Vitrine** : `pages/vitrine/accueil.tsx` — héros à deux colonnes (titre,
  chapeau, deux boutons de 44 px ; illustration + deux fiches flottantes),
  preuves en filets, examens illustrés, « Trois gestes » illustré, « Tout
  tient dans le téléphone » avec l'aperçu, FAQ en filets, un appel final
  `surface-encre`. Titres de section sans sur-titre.
- **Écran d'accès** : `ConnexionLayout` — formulaire ≤ 384 px, panneau
  `surface-marque` à partir de 1024 px.
- **Ligne de liste** : tuile 40 px `rounded-[12px]` + titre 600 + sous-titre
  13 px `ink-500` + action ronde de 40 px à droite.
- **Précision sous un titre** : une phrase en 13 px `text-ink-500`, casse
  normale — jamais de sur-titre en capitales.

## 6. Relecture d'une capture (360 / 768 / 1366, clair et sombre)

- [ ] À côté des références, l'écran tient la comparaison (chaleur, richesse,
      finition).
- [ ] Rien de trop gros ni trop petit ; mots bien espacés ; chiffres clés lisibles.
- [ ] Une action dominante, visible sans défiler à 360 × 740.
- [ ] Pas de vide : ni moitié d'écran blanche, ni carte creuse.
- [ ] Un moment fort, pas plus.
- [ ] Sombre : chaud, aucun blanc sur blanc, aucun texte clair sur surface claire.
- [ ] Rien ne déborde (360 et 768 px compris) ; cartes d'une rangée alignées.
- [ ] axe : 0 violation sérieuse.

Consigner ce qui a été vu et corrigé dans `DESIGN.md` § 13 et le DEVBOOK.
