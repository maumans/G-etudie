# TERRAIN.md — Essais avec de vrais élèves (lot 14)

> Le lot 14 de `PLAN_NKARAMOGO.md` : « essais avec de vrais élèves (Conakry
> + une préfecture), corrections ». Critère : la liste `A_TESTER.md`
> exécutée sur de vrais téléphones. Ce document dit **comment organiser un
> essai** : ce qu'il faut avant, comment il se déroule, ce qu'on relève et
> ce qu'on en fait. Les contrôles eux-mêmes, pas à pas, restent dans
> `A_TESTER.md` : c'est la seule liste.
>
> Les utilisateurs sont des **mineurs**. Rien ici ne se fait sans les
> autorisations du § 2.

## 1. Ce que l'essai doit nous apprendre

1. **L'application tient-elle sur les téléphones des élèves ?** Android
   d'entrée de gamme (2 Go de mémoire), réseau mobile faible, coupures,
   téléphone partagé. Ce sont les contrôles de `A_TESTER.md` § 1 à § 5 et
   ceux de `HORS_LIGNE.md` A.15 (HL8).
2. **Les élèves s'en servent-ils sans aide ?** Le premier exercice en moins
   de 60 s après l'inscription (critère du lot 2), une séance du jour
   jusqu'au bout, un examen blanc.
3. **Qu'en pensent-ils ?** « Ton avis » (Oui / Un peu / Non, ce qui a
   gêné, un mot), lu dans Console › Terrain.

## 2. Avant tout essai — bloquant

| Préalable | Pourquoi | Qui |
|---|---|---|
| **Domaine en HTTPS** (D11), préproduction ou production | Sans HTTPS, le service worker ne s'inscrit pas sur un téléphone : pas de hors ligne, et la moitié des contrôles sont impossibles | Maurice |
| **Contenu réel** d'au moins une matière phare, relu et publié | Sinon les élèves jugent du contenu d'exemple marqué « EXEMPLE » | Équipe pédagogique |
| **Mots interdits** saisis (Back-office › Modération) | Le commentaire de « Ton avis » et le fil des groupes passent ce filtre | Responsable pédagogique |
| **Accord écrit de l'établissement** (directeur) | L'essai a lieu dans ses murs, avec ses élèves | Maurice |
| **Autorisation écrite d'un parent pour chaque élève** (modèle § 8) | Mineurs ; D9 : aucune donnée d'âge, la loi guinéenne sur les données personnelles reste à vérifier | Établissement, Maurice |
| **Accord oral de l'élève**, le jour même | Un élève peut refuser ou s'arrêter quand il veut, sans conséquence | Animateur |

Ce qui est **interdit** pendant un essai :

- photographier ou filmer le visage d'un élève, enregistrer sa voix ;
- noter son nom de famille, sa date de naissance ou son adresse ;
- garder le numéro de téléphone d'un élève ailleurs que dans son compte ;
- regarder ses réponses par-dessus son épaule sans le lui dire.

Ce qui est permis : une capture de l'écran du téléphone (sans notification
personnelle visible), le **code de diagnostic**, l'heure, le modèle du
téléphone, ce que l'élève dit de l'application.

## 3. Le matériel

- Des **téléphones des élèves** d'abord (c'est eux qu'on veut voir) ; en
  appoint, ceux de l'équipe : au moins un **Android 2 Go**, un Android
  récent, un **iPhone** si possible.
- Une **fiche de passation** par téléphone (§ 6), imprimée.
- `A_TESTER.md` imprimé, sections 1 à 5.
- Une connexion de secours (partage de connexion) : un essai qui s'arrête
  faute de réseau n'apprend rien d'autre que cela.
- Des **codes prépayés d'essai** (Console › Codes prépayés, un lot nommé
  « Essai … ») si l'on veut que les élèves voient l'abonnement ; à
  désactiver après l'essai.

## 4. La veille

1. Console › Terrain › **Nouvelle campagne** : nom (« Essai Ratoma,
   10ᵉ A »), lieu, établissement, dates. Tout ce qui arrive pendant ces
   dates s'y range.
2. Un compte enseignant et un groupe pour la classe (lot 11), pour essayer
   les devoirs.
3. Vérifier en HTTPS, sur un téléphone de l'équipe, les points du § 9 de
   `MISE_EN_PRODUCTION.md` (dont le point 12 : diagnostic et avis).

## 5. Le déroulé d'une demi-journée

| Durée | Moment | Ce qu'on regarde | Contrôles (`A_TESTER.md`) |
|---|---|---|---|
| 10 min | Accueil, autorisations vérifiées, accord oral | — | — |
| 10 min | **Inscription** et premier exercice, sans aide | Chronomètre : moins de 60 s ? Où l'élève hésite | [Lot 2] Premier exercice en moins de 60 s |
| 15 min | **Installer** l'application | Le bouton « Installer », l'icône | § 2 |
| 20 min | **Séance du jour**, puis **mode avion** au milieu | Les réponses gardées, « Tout est envoyé » au retour | § 4 : socle hors ligne, séance du jour en mode avion |
| 20 min | **Téléchargement d'une matière** sur le réseau mobile, interrompu | Le poids affiché avant, la reprise | [Lot 7] Pack sur réseau faible |
| 25 min | **Examen blanc**, extinction forcée du téléphone | Repris à la bonne question | [Lot 5] Extinction forcée |
| 15 min | **Deux profils** sur un téléphone partagé | Chacun ses réponses | § 5 |
| 5 min | **« Ton avis »** (fin de séance, ou Mon compte › Appareils) | — | — |
| 10 min | Pour chaque téléphone qui a eu un souci : **« Envoyer ce diagnostic »**, noter le code | — | — |

On ne corrige rien pendant l'essai : on note.

## 6. La fiche de passation (une par téléphone)

```
Campagne : ……………………   Date : ……………   Animateur : ……………
Téléphone : marque/modèle ……………  Android/iOS …  Mémoire … Go
Réseau : Orange / MTN / Wi-Fi   Forfait restant (si connu) : … Mo
Pseudo de l'élève (jamais le nom) : ……………

| Heure | Contrôle (A_TESTER) | Réussi ? | Ce qui s'est passé | Code diagnostic |
|-------|---------------------|----------|--------------------|-----------------|
|       |                     |          |                    |                 |

Ce que l'élève a dit (ses mots) :
……………………………………………………………………
```

## 7. Après l'essai

1. **Console › Terrain**, la campagne choisie :
   - **Avis des élèves** : lire chaque avis ; « Traiter » avec la décision
     prise (« corrigé dans la version … », « gardé pour plus tard »,
     « rien à changer ») — c'est la trace de la prise en compte ;
   - **Erreurs** : celles de la période, regroupées (combien de fois, sur
     quel navigateur, quelle version) ;
   - **Diagnostics** : chercher chaque code noté sur les fiches.
2. Transmettre les fiches à Claude Code : chaque contrôle exécuté passe
   dans `A_TESTER.md` § 9 « Contrôles faits » (date, appareil, résultat),
   et HL8 avance dans `HORS_LIGNE.md` B.0.
3. Les **corrections** qui en sortent forment le lot 14 bis : chacune avec
   son constat (fiche, avis, erreur), sa décision et sa preuve, dans le
   DEVBOOK.
4. Désactiver les codes prépayés d'essai. Les diagnostics et les erreurs
   s'effacent seuls après 90 jours, les avis après un an
   (`terrain:purger`).

## 8. Modèle d'autorisation parentale

> À adapter avec l'établissement, et à faire relire par un juriste avant
> le premier essai (D9).

```
AUTORISATION — Essai de l'application N'karamögö

Je soussigné(e) ……………………………, parent ou responsable légal de l'élève
……………………………, en classe de …………, à ……………………………,

autorise mon enfant à participer à l'essai de l'application de révision
N'karamögö le ………………, dans son établissement, pendant environ trois heures.

J'ai été informé(e) que :
- mon enfant crée un compte avec son prénom, un pseudo et un numéro de
  téléphone ; aucune photo, aucune date de naissance, aucune adresse ne
  lui est demandée ;
- son visage ne sera ni photographié ni filmé, sa voix pas enregistrée ;
- l'équipe note ce qui marche ou non sur le téléphone, et l'avis de mon
  enfant sur l'application, sans son nom ;
- mon enfant peut refuser ou arrêter à tout moment ;
- je peux demander la suppression de son compte à tout moment
  (contact : ……………………………).

Fait à …………………, le ……………       Signature :
```
