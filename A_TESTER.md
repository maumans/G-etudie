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
- Quoi observer : Bricolage Grotesque partout (pas une police système), mots
  bien espacés dans les titres ; rien ne dépasse à droite ; verdicts lisibles (icône + mot) ;
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

### [Lot 0] Photo du héros de la vitrine
- Pourquoi : la vitrine attend la photo fournie par Maurice (DESIGN.md § 8) ;
  d'ici là, l'aperçu de l'application en tient lieu.
- Matériel : la photo d'une personne **majeure**, avec son **autorisation
  écrite signée** de diffusion (à archiver hors du dépôt).
- Comment le provoquer : détourer la personne (fond transparent), exporter en
  WebP ≈ 900 × 1100 px, ≤ 150 Ko, la déposer en
  `public/images/vitrine/heros.webp`, recharger `/`.
- Quoi observer : la photo remplace le téléphone, devant la forme mandarine,
  nette, sans fond blanc autour ; à 360 px, elle reste sous le titre et le
  bouton « Commencer gratuitement » reste visible sans défiler ; le poids
  transféré de la page n'augmente que du poids de la photo.
- En cas d'échec, relever : capture aux trois largeurs, poids du fichier.
- État : en attente de la photo

### [Lot 1] L'éditeur de leçon sur les postes des rédacteurs
- Pourquoi : TipTap, le collage et la saisie LaTeX ne se testent ici que
  dans Chromium ; les rédacteurs travailleront sur leurs propres postes
  (souvent un portable Windows avec Chrome ou Firefox, parfois une tablette).
- Matériel : un portable Windows (Chrome, puis Firefox) et, si possible, une
  tablette Android ; connexion du rédacteur de démonstration (+224 600 00 00 04).
- Comment le provoquer :
  1. Back-office › Leçons › « Les identités remarquables » › « Continuer la
     rédaction ».
  2. Coller un paragraphe copié depuis Word (gras, italique, souligné, une
     image, un tableau).
  3. Insérer une formule dans la ligne et une formule centrée avec les
     raccourcis du dialogue (fraction, racine, vecteur).
  4. Ajouter un encadré « Piège fréquent », en changer le genre.
  5. Attendre « Enregistré à … », fermer l'onglet, rouvrir la leçon.
  6. Ouvrir la même leçon dans deux onglets, écrire dans les deux.
- Quoi observer : le collage garde gras et italique, perd souligné, image et
  tableau sans erreur ; les formules s'affichent pareil à gauche et dans
  « Comme l'élève la verra » ; rien n'est perdu à la réouverture ; le
  second onglet affiche « Cette leçon a été enregistrée ailleurs » et
  propose « Recharger », sans écraser le premier.
- En cas d'échec, relever : navigateur et version, capture, texte collé,
  message de l'indicateur d'enregistrement.
- État : à faire

### [Lot 2] Premier exercice en moins de 60 s, sur un vrai téléphone
- Pourquoi : critère du lot 2. Mesuré à 4-7 s par Playwright sur
  l'ordinateur (réseau local) ; reste à le vérifier sur un Android d'entrée
  de gamme, en 3G/4G réelle, avec un élève qui découvre l'écran.
- Matériel : un Android 2 Go de RAM, données mobiles, chronomètre ; un
  numéro de test (6 00 …).
- Comment le provoquer : ouvrir le site, « Créer un compte », remplir les
  quatre champs, « Plus tard » sur la vérification, choisir l'examen
  (et la série au Bac), garder 15 minutes, « Faire mon premier exercice »,
  répondre, « Vérifier ».
- Quoi observer : moins de 60 s entre « Créer mon compte » et le verdict ;
  aucun écran blanc ; chaque écran lisible sans zoom ; le bouton dominant
  visible sans défiler.
- En cas d'échec, relever : le temps de chaque étape, l'écran le plus
  lent, le réseau (barres, 3G/4G).
- État : à faire

### [Lot 2] Lire une leçon et imprimer une fiche de révision
- Pourquoi : PLAN M4 — lecture confortable à 360 px, taille du texte
  réglable, fiche imprimable.
- Matériel : un Android ; un ordinateur avec imprimante (ou « Enregistrer
  en PDF »).
- Comment le provoquer : « Mon compte › Affichage », texte « grand » ;
  ouvrir une leçon avec formules, la lire jusqu'au bout, toucher
  « Compris » ; revenir à l'accueil. Sur l'ordinateur : une matière ›
  « Fiche de révision » › « Imprimer ».
- Quoi observer : texte agrandi dans la leçon, formules lisibles et
  défilables si longues ; « Ma lecture » à 100 %, la leçon cochée dans la
  matière et sortie de « Reprendre » ; à l'impression, ni barre latérale
  ni onglets, seulement la fiche.
- En cas d'échec, relever : capture de l'écran, modèle du téléphone.
- État : à faire

## 2. Installation de l'application (Android, iPhone)

### [Lot 0] Installer N'karamögö sur Android et sur iPhone
- Pourquoi : `HORS_LIGNE.md` A.3.2 — installée, l'application s'ouvre depuis
  l'écran d'accueil ; sur iPhone, sans installation, Safari efface le
  stockage (réponses gardées, téléchargements) après sept jours sans visite.
- Matériel : l'Android d'entrée de gamme (Chrome), un iPhone (Safari) ; le
  site servi en **HTTPS** (préproduction, D11) — sans HTTPS, pas de service
  worker ni d'installation.
- Comment le provoquer :
  1. Android : se connecter avec l'élève de démonstration, « Mon compte » →
     « Affichage » → « Installer N'karamögö » (ou le menu de Chrome).
  2. Ouvrir l'icône posée sur l'écran d'accueil.
  3. iPhone : ouvrir le site dans Safari ; lire le bandeau « Installe
     N'karamögö… » ; suivre la marche à suivre de « Mon compte » →
     « Affichage » (Partager → Sur l'écran d'accueil).
- Quoi observer : icône mandarine au monogramme « N' », bien découpée
  (Android : forme du lanceur, rien de coupé) ; ouverture en plein écran sur
  l'accueil élève, sans barre d'adresse ; une fois installée, « Affichage »
  dit « Installée sur ce téléphone » et le bandeau iPhone ne revient plus.
- En cas d'échec, relever : modèle, version du système et du navigateur,
  capture de l'icône et de l'écran d'ouverture.
- État : à faire (bloqué tant que le domaine HTTPS n'existe pas)

### [Lot 0] Barre d'onglets de l'espace élève au doigt
- Pourquoi : la barre d'onglets est collée en bas de l'écran ; sur un vrai
  téléphone, la barre de gestes d'Android ou d'iPhone peut la recouvrir, et
  les cibles de 72 px de large à 360 px doivent rester faciles à toucher.
- Matériel : l'Android d'entrée de gamme, un iPhone récent si disponible.
- Comment le provoquer : se connecter (élève de démonstration +224 600 00 00 01, `DemoSeeder`), ouvrir
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

### [Lot 0] Socle hors ligne en mode avion
- Pourquoi : A.3.7 à A.3.9 — jamais d'écran blanc ni de clic mort sans
  réseau. Vérifié dans Chromium par Playwright (`hors-ligne.spec.ts`), mais
  `setOffline` n'est pas un vrai mode avion.
- Matériel : l'Android d'entrée de gamme, application installée (entrée
  précédente), site en HTTPS.
- Comment le provoquer :
  1. Avec réseau : ouvrir l'accueil élève, puis « Moi » → « Affichage »,
     revenir à l'accueil. Attendre 10 s.
  2. Passer en mode avion. Toucher « Moi ».
  3. Fermer l'application (la balayer des applications récentes), la
     rouvrir.
  4. Toucher la pastille de la barre du haut.
  5. Couper le mode avion ; attendre 30 s sans rien toucher.
- Quoi observer : 2. un dialogue « Cet écran demande une connexion », on
  reste sur l'accueil, la pastille dit « Hors ligne » ; 3. l'accueil
  s'ouvre, avec « Pas de connexion… » et « Accueil au HH:MM — dernière
  version gardée sur ce téléphone » ; 4. la feuille « Tes réponses »
  s'ouvre ; 5. les bandeaux disparaissent, la pastille revient à « Tout est
  envoyé », l'accueil se met à jour seul une fois.
- En cas d'échec, relever : capture à chaque étape, texte de la pastille,
  heure.
- État : à faire

### [Lot 2] Séance du jour en mode avion
- Pourquoi : HORS_LIGNE.md A.1 — une réponse donnée sans réseau compte et
  part toute seule, une seule fois.
- Matériel : un Android, l'application installée (HTTPS, D11).
- Comment le provoquer : ouvrir l'accueil en ligne puis « Commencer » ;
  après deux réponses, passer en mode avion ; répondre à trois autres
  questions ; fermer l'application ; la rouvrir en mode avion, revenir à
  la séance ; couper le mode avion.
- Quoi observer : hors ligne, la pastille dit « N réponses à envoyer » et
  la séance reprend à la bonne question ; au retour du réseau, « Tout est
  envoyé » ; sur l'ordinateur (base), cinq réponses, pas dix.
- En cas d'échec, relever : la pastille, la liste « À envoyer / À
  corriger », l'heure de la coupure.
- État : bloqué tant que le domaine HTTPS n'existe pas (D11)

### [Lot 0] Déploiement pendant une coupure
- Pourquoi : A.3.1 et A.3.3, A.15 n° 6 et 7 — une nouvelle version ne
  s'active que file vide ; une coupure juste après un déploiement montre le
  filet de démarrage, puis la page se recharge seule.
- Matériel : l'Android, la préproduction, quelqu'un qui peut déployer.
- Comment le provoquer :
  1. Ouvrir l'accueil élève avec réseau.
  2. Déployer une nouvelle version (un changement visible, même minime).
  3. Recharger la page et, dans la seconde, passer en mode avion.
  4. Couper le mode avion.
- Quoi observer : 3. soit l'ancienne version reste affichée normalement
  (copie, versions gardées), soit le filet « Tes réponses déjà faites sont
  gardées sur ce téléphone » ; jamais un écran blanc ; 4. la page se
  recharge seule et montre la nouvelle version.
- En cas d'échec, relever : capture, heure du déploiement et de la coupure.
- État : à faire (bloqué tant qu'il n'y a pas de préproduction)

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

### [Lot 0] Double authentification du personnel avec une vraie application
- Pourquoi : les tests calculent le code avec la même bibliothèque que le
  serveur ; seul un vrai téléphone prouve que le QR code (encre sur blanc, en
  clair comme en sombre) se scanne et que l'horloge du téléphone s'accorde
  avec celle du serveur (DA4).
- Matériel : un Android avec Google Authenticator ou Aegis, un iPhone si
  possible ; un poste avec l'application (build, sans `npm run dev`).
- Comment le provoquer :
  1. Se connecter avec le compte de démonstration administrateur plateforme
     (+224 600 00 00 08) ; « Mon compte » → « Sécurité » ; retaper le mot de
     passe.
  2. « Activer la double authentification » ; scanner le QR code, en thème
     clair puis en thème sombre (luminosité du poste au minimum).
  3. Saisir le code affiché ; « Afficher les codes » et les noter.
  4. Se déconnecter, se reconnecter : saisir le code de l'application ; puis
     une seconde fois avec un code de secours.
  5. « Désactiver » et vérifier que la connexion ne demande plus de code.
- Quoi observer : le scan réussit du premier coup dans les deux thèmes ;
  l'application affiche « N'karamögö » et le pseudo (`plateforme_demo`),
  **jamais le numéro** ; le code est accepté ; un code de secours sert une
  seule fois ; « Activité du compte » liste activation et désactivation.
- En cas d'échec, relever : application utilisée, écart d'heure entre
  téléphone et poste, message affiché, capture.
- État : à faire

### [Lot 0] Session de 12 h du personnel
- Pourquoi : HL-D10 — un rédacteur ou un administrateur se reconnecte 12 h
  après sa connexion, même s'il travaille, et « Rester connecté » ne le
  prolonge pas (un poste partagé dans un bureau).
- Matériel : un ordinateur, Chrome ; le compte de démonstration rédacteur
  (+224 600 00 00 04).
- Comment le provoquer : se connecter le matin, case « Rester connecté »
  cochée ; travailler par intervalles ; 12 h plus tard, ouvrir une page du
  back-office. Puis fermer Chrome, le rouvrir le lendemain.
- Quoi observer : à la douzième heure, retour à l'écran de connexion avec le
  message « Session terminée… 12 heures » ; le lendemain, Chrome rouvert, la
  connexion est demandée (pas de reconnexion silencieuse). « Mon compte »
  → « Sécurité » affichait la bonne heure de reconnexion.
- En cas d'échec, relever : heures de connexion et de déconnexion, message
  affiché.
- État : à faire

## 7. Paiements réels — Orange Money, MTN MoMo, codes prépayés

*(aucune entrée)*

## 8. Vérifications visuelles reportées (Playwright indisponible)

*(aucune entrée)*

## 9. Contrôles faits

*(aucune entrée — date, appareil, résultat, et lien vers le point du DEVBOOK)*
