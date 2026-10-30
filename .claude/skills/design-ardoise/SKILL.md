---
name: design-ardoise
description: "Design system « Ardoise » v2 de N'karamögö · G-Étudie. À invoquer AVANT de créer ou modifier tout écran, layout, composant d'interface, page Inertia/React (.tsx), classe Tailwind, couleur, police, icône ou capture Playwright ; et pour relire une capture d'écran. Donne le niveau d'exigence, les jetons, l'échelle de tailles, les recettes d'écran et la grille de relecture."
metadata:
  author: n-karamogo
---

# Design « Ardoise » v2 — mode d'emploi

Référence complète : `DESIGN.md` (§ 0 à lire en premier). Ce fichier est la
version de travail : ce qu'il faut avoir en tête en écrivant une interface.

## 1. L'exigence

Un produit **au sommet** : attirant par son élégance et son professionnalisme,
retenant par sa facilité. Référence : Linear, Vercel, Stripe, Brilliant.
**Le hors ligne n'excuse jamais une interface pauvre** : on économise les
images et les bibliothèques, pas le soin. Si une capture fait « ancien site »,
l'écran n'est pas fini.

## 2. Les jetons (dans `resources/css/app.css`, jamais de valeur inventée)

| Besoin | Classe |
|---|---|
| Fond de page | `bg-background` (`craie-50`) |
| Carte | `rounded-carte border bg-card shadow-carte` |
| Surface active / qui flotte | `bg-relief` (+ `ring-1 ring-black/5 shadow-xs`, `dark:ring-white/5`) |
| Remplissage muet, piste d'onglets | `bg-craie-100` |
| Texte : principal / secondaire / tertiaire | `text-ink-900` / `text-ink-600` / `text-ink-500` |
| Non-texte (bordure de champ, icône décorative) | `ink-400` |
| Filet de bouton outline, option au repos | `border-contour` |
| Accent | `nimba-600` (texte sur teinte `nimba-700`, sombre `nimba-300`) |
| Teinte de l'accent | `bg-nimba-600/[0.10] dark:bg-nimba-300/15` (jamais `bg-nimba-50`) |
| Énergie (série, points) | `soleil-400`, texte dessus `soleil-900` |
| Verdicts | `juste` / `faux` / `indice` — toujours icône + mot + couleur |
| Surface d'expression | `surface-marque` (texte blanc, `text-white/75`, mot en `text-soleil-300`) |
| Fond de héros | `halo-marque`, `trame-points` |
| Mot mis en valeur | `font-accent italic font-normal tracking-normal` (Instrument Serif) |
| Chiffres | `font-data` |

Ombres : `shadow-xs` (contrôles) → `shadow-carte` → `shadow-releve` →
`shadow-flottant` ; `shadow-bouton` pour un bouton plein.

## 3. L'échelle

- Texte : `text-meta` 12 · `text-aide` 13 · `text-interface` 14 (défaut du
  `body`) · `text-titre-carte` 16 · `text-lecture` 17 · `text-titre-ecran` 22 ·
  `text-titre-ecran-large` 28 · `text-heros` 40 · `text-vitrine` 60.
- Graisses : 400 texte · 500 libellés, boutons, navigation · 600 titres.
  **Jamais `font-bold`.** Les `h1`–`h4` sont déjà en 600, resserrés, équilibrés :
  ne pas leur rajouter de graisse.
- Hauteurs (`Button` / `Input` `taille`) : `grande` 48 · `normale` 44 → 40 px
  (≥ 640 px) · `compacte` 36 · `petite` 32. Options de QCM ≥ 56 px.
- Icônes Lucide : 16 px (boutons, champs), 18 px (navigation latérale), 20 px
  (barre d'onglets), 24 px max en décor.
- Rayons : contrôles `rounded-controle` 10 · cartes `rounded-carte` 16 ·
  dialogues et surfaces d'expression 20 · panneaux de marque 28 · pilules.

## 4. Les règles de composition

1. **Composants du kit d'abord** (`components/ui/`). Un nouveau champ réutilise
   `CHAMP_BASE` / `CHAMP_CONTENEUR` de `input.tsx`. Un motif écrit deux fois
   devient un composant.
2. **Une action dominante** par écran (bouton plein). Les autres : `outline`,
   `ghost`, `doux`.
3. **Un moment d'expression** par écran, pas plus : `surface-marque`, ou un
   mot en serif italique, ou un aperçu dessiné, ou un halo.
4. **Jamais de page plate** : un écran s'ouvre sur une ligne méta (13 px
   `ink-500` : date, matière, provenance) puis un titre de 22/28 px ; un écran
   vide montre ce qui arrive et propose **une action**.
5. **Actif = relief**, pas aplat de couleur : fond `relief` + anneau + ombre,
   icône à l'accent.
6. **Surface blanche fixe** (carte blanche dans un panneau violet, aperçu de
   téléphone) : classe `clair`, sinon elle devient illisible en sombre.
7. **Sombre** : chaque teinte en opacité ; vérifier qu'aucun texte clair ne
   tombe sur un fond resté clair.
8. **Mobile d'abord** (360 px) : pleine largeur pour l'action dominante,
   marges de 16-20 px, rien qui déborde ; desktop : utiliser la largeur
   (deux colonnes, aperçu), jamais une colonne étroite perdue au milieu.
9. **Données honnêtes** : aucun chiffre, date d'examen, coefficient ou
   témoignage inventé dans une interface réelle ; un aperçu décoratif est
   `aria-hidden` avec une phrase qui le décrit (`ApercuApplication`).
10. **Classes Tailwind écrites en entier** dans des `.ts` / `.tsx`
    (jamais `bg-${couleur}-600`).

## 5. Recettes

- **Écran d'accès** (connexion…) : `ConnexionLayout` — formulaire ≤ 384 px,
  `EnTeteConnexion`, champs en `gap-4`, bouton plein pleine largeur, liens en
  `text-lien` 500.
- **Section de réglages** : `SectionCompte` — carte, titre 16 px, description
  `ink-600`, formulaire, bouton `sm:w-fit`.
- **Carte de fonction / tuile** : tuile d'icône 36-40 px `rounded-[10px]`
  (teinte ou `bg-craie-100`), titre 14-16 px en 600, texte 13-14 px `ink-600`,
  `grid content-start`.
- **Bandeau d'alerte** : `rounded-carte border border-<statut>/45
  bg-<statut>/[0.08]`, icône 20 px du statut, texte `ink-600` avec le début en
  500 `ink-900`, bouton `outline` `compacte`.
- **Héros** : `relative isolate overflow-hidden`, calques `halo-marque` et
  `trame-points` en `-z-10`, titre 40/52/60 px `tracking-[-0.035em]` avec une
  fin en serif italique `text-nimba-600`, sous-titre 16-17 px `ink-600`,
  boutons `grande`, promesses en 13 px avec coches de l'accent.

## 6. Relecture d'une capture (Playwright, 360 / 768 / 1366, clair et sombre)

Pour chaque capture, répondre honnêtement :
- [ ] Ça a l'air **d'aujourd'hui** ? (comparé à Linear / Stripe / Brilliant)
- [ ] Rien de **trop gros ni trop gras** ; pas de bouton ou champ épais.
- [ ] Une hiérarchie lisible d'un coup d'œil ; une seule action dominante,
      visible sans défiler à 360 × 740.
- [ ] Pas de page plate, pas de moitié d'écran vide sur desktop.
- [ ] Un moment d'expression, un seul.
- [ ] Sombre : aucun blanc sur blanc, aucune surface blanche avec du texte
      clair, accent en `nimba-300`.
- [ ] Rien ne déborde à 360 px ; titres équilibrés, pas de mot orphelin
      disgracieux ; cartes d'une même rangée alignées.
- [ ] axe : 0 violation sérieuse.

Puis consigner ce qui a été vu et corrigé dans `DESIGN.md` § 13 et le DEVBOOK.
