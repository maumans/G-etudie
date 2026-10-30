# A_TESTER.md — Contrôles manuels en attente

> Tout ce que Claude Code ne peut pas vérifier lui-même : vrais téléphones,
> vraies coupures, vrais SMS, vrais paiements, et toute vérification visuelle
> qui n'a pas pu être faite avec Playwright (`CLAUDE.md` § 6 et § 7).
>
> Une entrée est ajoutée par le lot qui crée le besoin. Elle n'est retirée que
> lorsqu'elle a été exécutée : elle passe alors dans « Contrôles faits », avec la
> date, l'appareil et le résultat.

## Format d'une entrée

```
### [Lot N] Titre court du contrôle
- Pourquoi : ce que ce contrôle protège (référence au plan ou à HORS_LIGNE.md).
- Matériel : appareil, système, navigateur, réseau.
- Comment le provoquer : étapes numérotées, reproductibles par quelqu'un d'autre.
- Quoi observer : le résultat attendu, précis.
- En cas d'échec, relever : capture, heure, message affiché, contenu de la
  pastille réseau, nombre de réponses en attente.
- État : à faire
```

## 1. Vrais téléphones — affichage et performance

### [Lot 0] Catalogue Ardoise sur un Android d'entrée de gamme
- Pourquoi : les captures Playwright viennent de Chromium sous Windows ; le
  rendu des polices, la lisibilité en plein soleil et la fluidité sur un
  téléphone de 2 Go de RAM ne se voient pas d'ici (`PLAN_NKARAMOGO.md` § 9).
- Matériel : Android d'entrée de gamme (2 Go de RAM, écran 360 × 740 ou
  proche), Chrome à jour, Wi-Fi du poste de développement.
- Comment le provoquer :
  1. Sur le poste, lancer `php artisan serve --host=0.0.0.0 --port=8000`
     après `npm run build` (sans `npm run dev`).
  2. Sur le téléphone, ouvrir `http://<adresse IP du poste>:8000/dev/composants`.
  3. Parcourir la page en thème clair, puis passer le téléphone en thème
     sombre et la recharger.
  4. Dehors ou près d'une fenêtre, luminosité au maximum puis au minimum.
- Quoi observer : Sora sur les titres, Lexend sur le texte (pas une police
  système) ; rien ne dépasse à droite ; verdicts lisibles (icône + mot) ;
  les formules s'affichent (pas de LaTeX brut) ; le défilement reste fluide.
- En cas d'échec, relever : capture d'écran, modèle du téléphone, version
  d'Android et de Chrome, section concernée du catalogue.
- État : à faire

### [Lot 0] Gestes tactiles des composants
- Pourquoi : Playwright clique à la souris ; le glissement de la feuille, le
  calendrier natif et le zoom d'iPhone ne s'éprouvent qu'au doigt.
- Matériel : le même Android, et un iPhone si disponible (Safari).
- Comment le provoquer, sur `/dev/composants` :
  1. « Voir le corrigé » (bloc Retours) : la feuille monte du bas ; la faire
     redescendre en glissant la poignée vers le bas.
  2. Toucher n'importe où dans le champ « Date de l'examen ».
  3. Toucher les champs « Prénom » puis « Code reçu par SMS ».
  4. Toucher les options A, B, C du QCM.
- Quoi observer : (1) la feuille suit le doigt et se ferme au-delà d'environ
  un centimètre ; (2) le calendrier natif s'ouvre, pas seulement le clavier ;
  (3) sur iPhone, la page ne zoome pas au toucher d'un champ, et le clavier
  numérique s'ouvre pour le code ; (4) une seule option est choisie à la fois.
- En cas d'échec, relever : vidéo ou capture, modèle et version du système,
  geste exact.
- État : à faire

## 2. Installation de l'application (Android, iPhone)

*(aucune entrée)*

### [Lot 0] Barre d'onglets de l'espace élève au doigt
- Pourquoi : la barre d'onglets est collée en bas de l'écran ; sur un vrai
  téléphone, la barre de gestes d'Android ou d'iPhone peut la recouvrir, et
  les cibles de 72 px de large à 360 px doivent rester faciles à toucher.
- Matériel : l'Android d'entrée de gamme, un iPhone récent si disponible.
- Comment le provoquer : se connecter (compte du `DatabaseSeeder`), ouvrir
  `/eleve`, toucher chaque onglet, faire défiler la page.
- Quoi observer : la barre reste visible au-dessus de la barre de gestes ;
  « Accueil » ouvre l'accueil ; « Cours », « Annales », « Examens blancs »
  affichent « … arrive bientôt » ; « Moi » ouvre le compte ; le contenu
  n'est jamais caché sous la barre en bas de page.
- En cas d'échec, relever : capture, modèle, mode de navigation du
  téléphone (gestes ou boutons).
- État : à faire

## 3. Coupures réelles — réseau, courant, batterie

*(aucune entrée)*

## 4. Hors ligne et synchronisation (`HORS_LIGNE.md` A.15)

*(aucune entrée)*

## 5. Téléphone partagé et profils

*(aucune entrée)*

## 6. SMS réels — vérification du numéro, récupération du mot de passe

### [Lot 0] Codes SMS sur de vrais téléphones (quand le fournisseur sera branché)
- Pourquoi : en développement, aucun SMS ne part (le code est écrit dans
  `storage/logs/laravel.log`) ; le délai d'arrivée, le texte reçu et le
  remplissage automatique du code ne se voient que sur un vrai réseau (D3).
- Matériel : un Android sur chaque opérateur disponible (Orange, MTN…), un
  iPhone si possible ; le fournisseur SMS choisi, configuré en préproduction.
- Comment le provoquer :
  1. S'inscrire avec le numéro du téléphone de test, demander le code
     depuis l'écran « Vérifie ton numéro ».
  2. Se déconnecter, « Mot de passe oublié ? », demander un code.
  3. « Mon compte » → « Numéro » : passer à un second numéro de test.
- Quoi observer : le SMS arrive en moins d'une minute ; il dit
  « N'karamögö : ton code est … » ; le clavier propose le code (Android :
  suggestion, iPhone : « Depuis Messages ») ; le code saisi est accepté ;
  après 10 minutes, il est refusé.
- En cas d'échec, relever : opérateur, heure d'envoi et de réception, texte
  reçu, message d'erreur affiché.
- État : à faire (bloqué tant qu'aucun fournisseur n'est branché)

### [Lot 0] Connexion qui dure sur un téléphone partagé
- Pourquoi : « Rester connecté sur ce téléphone » et la session de 30 jours
  glissants (HL-D10) doivent éviter de retaper le mot de passe chaque soir,
  et « Se déconnecter » doit vraiment fermer l'accès.
- Matériel : un Android, l'application ouverte dans Chrome.
- Comment le provoquer : se connecter avec la case cochée, fermer Chrome,
  rouvrir le lendemain ; puis « Moi » → « Se déconnecter », revenir en
  arrière avec le bouton du téléphone.
- Quoi observer : le lendemain, l'espace élève s'ouvre sans mot de passe ;
  après déconnexion, le retour arrière ne montre pas l'espace élève.
- En cas d'échec, relever : capture, heure, ce qui s'est affiché.
- État : à faire

## 7. Paiements réels — Orange Money, MTN MoMo, codes prépayés

*(aucune entrée)*

## 8. Vérifications visuelles reportées (Playwright indisponible)

*(aucune entrée)*

## 9. Contrôles faits

*(aucune entrée — date, appareil, résultat, et lien vers le point du DEVBOOK)*
