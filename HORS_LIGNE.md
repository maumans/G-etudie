# HORS_LIGNE.md — Le mode hors ligne de N'karamögö

> **Partie A** : la spécification — ce qu'on construit, comment, et pourquoi.
> **Partie B** : le suivi d'exécution — ce qui est fait, où ça vit, avec quelle
> preuve. Tenue à jour par Claude Code à la fin de chaque lot.
>
> Convention : `[ ]` à faire · `[~]` en cours · `[x]` fait **et** vérifié (test
> ou exécution). Une case cochée par optimisme rend ce fichier inutile.

---

# PARTIE A — SPÉCIFICATION

## A.1 La règle d'or

> **Un élève qui a téléchargé sa matière peut réviser une soirée entière sans
> réseau, et rien de ce qu'il a fait ne se perd.**

Concrètement :
- une réponse donnée sans réseau compte ; elle part toute seule au retour du
  réseau, **une seule fois** ;
- un examen blanc commencé sans réseau se termine sans réseau, et sa note arrive
  au serveur plus tard ;
- une coupure de courant, une batterie vide, un onglet fermé ou un téléphone
  redémarré **ne font rien perdre** ;
- l'élève ne paie pas deux fois en données le même contenu ;
- l'application ne montre **jamais un écran blanc** et ne laisse **jamais un clic
  sans réponse**.

Deux enjeux, donc : **ne pas perdre une réponse**, et **avoir le contenu sur le
téléphone avant la coupure**.

## A.2 Trois niveaux d'écrans

### Niveau A — on agit hors ligne (file d'opérations)

| Geste | Type d'opération |
|---|---|
| Répondre à une question (indices utilisés compris) | `tentative.enregistrer` |
| Auto-évaluer une question ouverte | `tentative.auto_evaluer` |
| Terminer une séance | `seance.terminer` |
| Terminer un examen blanc (sauvegarde locale continue pendant le passage) | `examen_blanc.terminer` |
| Marquer une leçon « comprise / à revoir », position de lecture | `lecon.progression` |
| Signaler une erreur dans un contenu | `signalement.creer` |
| Réglages d'affichage (thème, taille du texte, mode données) | **local seulement**, jamais synchronisés |

### Niveau B — on consulte hors ligne

| Écran | Source hors ligne |
|---|---|
| Leçons, fiches de révision, exercices, annales, corrigés | **packs** téléchargés (A.5) |
| Accueil (jauge, compte à rebours, séance du jour, trace) | dernière réponse du serveur + gestes en attente (A.10) |
| Progression par matière / notion, historique des examens blancs | copie datée de l'écran (A.3.8) |
| Profil, téléchargements | local |

### Niveau C — en ligne seulement

Inscription, connexion, récupération du mot de passe · paiement, abonnement,
code d'accès · tuteur IA · classements · téléchargement et mise à jour des packs
· liaison parent · changement de mot de passe ou de numéro · groupes et devoirs ·
back-office contenu · console plateforme.

Hors ligne, un lien vers un écran C ouvre un **dialogue** « Cet écran demande une
connexion » et laisse l'élève où il est (A.3.7).

---

## A.3 Le socle technique (lot HL0)

Tout ce qui suit est construit au lot 0, **avant** le premier geste élève, et
réutilisé par tous les lots suivants. Il est décrit ici en entier : c'est la
seule source à suivre.

### A.3.1 Le service worker

**Où il vit.** Le script source est `resources/service-worker/sw.js`. Il est
servi à **`/sw.js`** par un contrôleur Laravel (`ServiceWorkerController`), sur
une route publique (il doit pouvoir s'installer même session expirée ; il ne
contient aucune donnée), avec :
`Content-Type: application/javascript`, `Service-Worker-Allowed: /`,
`Cache-Control: no-cache`.

**Pourquoi pas `vite-plugin-pwa` ni Workbox.** Laravel construit dans
`public/build/` : un service worker émis là ne contrôlerait que `/build/*`, donc
aucune page, et forcer sa sortie à la racine se bat contre
`laravel-vite-plugin`. Un script maison d'environ 300 lignes, lisible d'un bloc,
est préférable pour du code qui s'interpose entre l'application et le réseau.

**Ce que le contrôleur injecte** en tête du script, au moment de le servir :
- `VERSION` : empreinte de `public/build/manifest.json` ;
- `PRECACHE` : la liste de **tous** les fichiers du manifeste Vite, plus les
  polices et les fichiers KaTeX ;
- `PAGES` : la liste blanche des écrans gardés (`config('hors_ligne.pages')`) ;
- `REPLI` : le HTML de la page de repli autonome (A.3.7).

**En développement** (fichier `public/hot` présent) : le contrôleur sert un script
qui **se désinstalle** et vide ses caches. ⚠ Un `public/hot` resté après un
`npm run dev` arrêté fait croire au contrôleur qu'on est en développement :
le vérifier avant toute vérification de build.

**Les caches** :

| Cache | Stratégie | Contenu |
|---|---|---|
| `build-<VERSION>` | précache à l'installation, puis cache d'abord | tous les fichiers du build. **Les trois dernières versions sont gardées** : un onglet ouvert avant un déploiement redemande d'anciens fragments, qui doivent rester servis |
| `pages-u<id utilisateur>` | réseau d'abord (délai 6 s), puis copie | les écrans de la liste blanche, **par utilisateur** ; vidé à la déconnexion |
| `medias-<pack>` | cache d'abord | images et figures des packs, partagées entre les profils du téléphone |
| `polices` | cache d'abord | polices auto-hébergées, KaTeX |

**Les requêtes** :
- **Jamais** mises en cache : toute requête autre que GET, `/sync/*`, `/api/*`,
  les écrans d'authentification, le paiement.
- **Visite d'un écran de la liste blanche** (document HTML ou requête Inertia,
  en-tête `X-Inertia`) : réseau d'abord ; la réponse complète est rangée.
  - Un **rechargement partiel** (en-tête `X-Inertia-Partial-Data`) n'est **jamais**
    rangé tel quel : ses props sont **fusionnées** dans la copie complète du même
    écran, qui garde son heure d'origine. Sans copie complète, rien n'est rangé.
    (Sinon un rechargement partiel remplace la copie entière par deux props, et
    l'écran ne se rouvre plus hors ligne.)
  - Si l'adresse exacte n'a pas de copie mais que le **même écran** avec d'autres
    paramètres en a une, servir celle-là.
  - Quand une **copie est servie** (pas quand elle est rangée), y glisser son
    heure : `props.copie_hors_ligne` pour une réponse Inertia, une balise
    `<meta name="copie-hors-ligne" content="…">` pour un document.
- **Écran hors liste blanche, hors ligne** : document → page de repli `REPLI` ;
  requête Inertia → `Response.error()` (l'application la rattrape, A.3.7).

**La liste blanche** : préfixes d'URL comparés **par segment** (`/lecons` couvre
`/lecons/12`, pas `/lecons-admin`) ; un `$` final borne le préfixe (`/annales$`
= la liste seulement). La **même** fonction existe dans `sw.js` et dans
`lib/hors-ligne/ecrans.js` ; un test Vitest vérifie qu'elles donnent le même
résultat sur une série d'URL.

**Mise à jour du service worker** : la nouvelle version s'installe et précache
en arrière-plan. Elle n'est **activée** (`skipWaiting`) que lorsque la page lui
signale que **la file d'opérations est vide et qu'aucun examen blanc n'est en
cours**. Jamais de rechargement forcé de la page pendant un examen.

**HTTPS est obligatoire** : sans lui, l'enregistrement du service worker échoue.
L'application doit alors fonctionner comme un site normal (sans hors ligne) et
le signaler en console.

### A.3.2 L'application installable

`public/manifest.webmanifest` (nom « N'karamögö », nom court « N'karamögö »,
`display: standalone`, couleurs du thème `DESIGN.md`), icônes 192, 512, 512
masquable, `apple-touch-icon`. Un bouton « Installer » apparaît quand le
navigateur le permet (`beforeinstallprompt`) ; sur iPhone, une notice explique
« Partager → Sur l'écran d'accueil ».

**Pourquoi c'est vital sur iPhone** : Safari efface le stockage d'un site non
installé après sept jours sans visite — donc les packs et la file d'opérations.

### A.3.3 Jamais d'écran blanc après un déploiement

Deux défauts à prévenir, tous deux silencieux.

**1. Fragment de page supprimé.** Chaque build remplace les fichiers JS
(noms hachés). Un onglet ouvert avant le déploiement demande, au clic suivant,
un fragment qui n'existe plus : l'import échoue, **aucune page n'est posée et
rien ne le signale** — la barre de progression se termine normalement et l'écran
ne change pas. Dans `app.jsx`, la fonction `resolve` des pages Inertia
intercepte l'échec d'import :
- **en ligne** et pas encore tenté (`sessionStorage`) → recharger la page une fois ;
- **hors ligne** → ne pas recharger (le même document redemanderait le même
  fragment absent) : afficher tout de suite l'écran de repli, motif « la nouvelle
  version n'est pas encore sur ce téléphone », et recharger seul à l'événement
  `online` ;
- l'échec persiste après le rechargement → écran de dernier recours, **sans
  layout ni composant du design system** (c'est leur chargement qui échoue), avec
  la cause probable et un bouton « Recharger ».

Le service worker conservant trois versions du build (A.3.1), ce cas devient rare.

**2. Coupure dans la seconde qui suit un déploiement.** Le document de la
nouvelle version est arrivé, son `app.jsx` non, et le service worker n'a pas
encore précaché cette version : **aucun code de l'application ne tourne**, donc
aucun de ses écrans de repli. Le filet doit donc vivre **dans le document**
(`resources/views/app.blade.php`), en script et HTML en ligne, sans aucune
dépendance :
- il écoute les erreurs de chargement **en phase de capture** (elles ne
  remontent pas la hiérarchie) et ne regarde **que** les fichiers dont l'URL
  commence par `location.origin + '/build/'` — hors ligne, les polices ou toute
  ressource tierce échouent sans que l'application soit en cause ;
- il s'ouvre 1,5 s après un tel échec, ou au bout de 12 s si l'application ne
  s'est pas déclarée prête ;
- `app.jsx` pose `window.__nkaramogoPret = true` au démarrage et le referme —
  sans ce signal, impossible de distinguer un démarrage lent d'un code absent ;
- il dit d'abord ce qui compte : « Tes réponses déjà faites sont gardées sur ce
  téléphone », puis « La nouvelle version arrive dès que le réseau revient », et
  **recharge seul** à l'événement `online` ;
- il est caché par un **`style="display:none"` en ligne**, pas par l'attribut
  `hidden` : son propre `display:flex` en ligne l'emporterait sur la feuille du
  navigateur et il serait visible en permanence.

### A.3.4 La base locale (Dexie / IndexedDB)

Base `nkaramogo`, fichier `resources/js/lib/hors-ligne/base.js` :

| Table | Contenu | Partagée entre profils ? |
|---|---|---|
| `operations` | file d'opérations (A.3.5) | non — chaque opération porte son auteur |
| `anomalies` | opérations refusées ou en échec technique répété | non |
| `acquittees` | dernières opérations acceptées (7 jours), pour l'affichage et le débogage | non |
| `packs` | manifestes des packs téléchargés, version, expiration | **oui** |
| `contenus` | éléments des packs (clé `type:id`, version, JSON) | **oui** |
| `progression` | dernière copie serveur de la maîtrise, de la jauge, de la trace | non |
| `seances` | séances pré-calculées et leur avancement | non |
| `examens_blancs` | examen en cours : réponses, temps, état | non |
| `profils` | profils du téléphone : identifiant, prénom, pseudo, empreinte du code local | — |
| `brouillons` | saisies en cours (réponse ouverte en rédaction…) | non |
| `meta` | jeton d'appareil, décalage d'horloge et heure de sa mesure, version | — |

Partager les packs entre profils, c'est **payer une fois** en données pour toute
la fratrie.

### A.3.5 La file d'opérations (côté appareil)

**Identifiants : UUID v7**, générés par `lib/hors-ligne/uuid7.js` — horodatage
en millisecondes sur 48 bits, version 7, compteur **monotone** dans une même
milliseconde (deux gestes rapides restent ordonnés). Jamais de v4 : l'ordre des
UUID est l'ordre des gestes. Le serveur **refuse** tout identifiant qui n'est pas
un v7.

**Une opération** :

```js
{
  uuid,                 // UUID v7, clé d'idempotence
  type,                 // 'tentative.enregistrer', …
  charge,               // données du geste
  auteur_id,            // l'élève qui a fait le geste (profil actif)
  saisi_le,             // ISO 8601, horloge de l'appareil
  priorite,             // 0 = la plus haute
  depend_de,            // uuid d'une opération qui doit passer avant, ou null
  essais,               // nombre d'échecs techniques
  statut,               // 'en_attente' | 'envoi' | 'reporte'
  derniere_erreur
}
```

**Point d'entrée unique** — `lib/hors-ligne/index.js` :

```js
const uuid = await enregistrer({ type, charge, priorite, depend_de });
// option pour un écran en ligne qui veut afficher un refus sur place :
const verdict = await enregistrer({ …, attendreVerdict: 8000 });
```

Écrit dans Dexie **avant** toute tentative d'envoi, puis réveille le moteur.
**Tout geste élève passe par là, en ligne comme hors ligne** : il n'y a pas de
second chemin « en ligne » à maintenir, et un geste ne peut pas se perdre entre
deux.

**Le moteur** — `lib/hors-ligne/moteur.js` :
- **un seul envoi à la fois** ;
- lots de 50 opérations au plus, ordonnées par `[priorite, uuid]` ;
- une opération dont `depend_de` n'est pas encore acquittée n'est pas envoyée ;
- déclencheurs : un enregistrement, l'événement `online`, le retour au premier
  plan (`visibilitychange`), et toutes les 30 s tant que la file n'est pas vide ;
- échec réseau ou 5xx : délai croissant 2 s, 4 s, 8 s… plafonné à 5 min ;
- **419** (jeton CSRF expiré) : appeler `GET /sync/etat` pour obtenir un jeton
  neuf, puis renvoyer ;
- **401** (session expirée) : **pause** sans rien perdre, état « session
  expirée » affiché ; reprise automatique après reconnexion ;
- après 8 échecs techniques sur une même opération : elle passe en
  `anomalies` avec le motif `erreur` (réessayable par l'élève) ;
- événements émis : `acquittee(uuid, resultat)`, `rejetee(uuid, motif)`,
  `etat(enAttente, anomalies, reseau)`. Les écrans s'y abonnent pour confirmer
  ou défaire ce qu'ils avaient affiché d'avance.

**L'horloge** : à chaque contact, le serveur renvoie son heure ; l'appareil
garde `decalage_horloge_ms` et l'heure de cette mesure (`meta`). Chaque lot les
envoie.

### A.3.6 La synchronisation (côté serveur)

**`POST /sync/operations`** (authentifié ; l'autorisation se fait **par
opération**, la route figure donc avec sa raison dans
`AccesParRoleTest::OUVERTES_A_TOUS`) :

```json
// requête
{ "appareil": "<jeton>", "decalage_horloge_ms": -4200, "mesure_le": "…",
  "operations": [ { "uuid": "…", "type": "…", "auteur_id": 12,
                    "saisi_le": "…", "depend_de": null, "charge": { } } ] }
// réponse
{ "heure_serveur": "…",
  "resultats": [ { "uuid": "…", "verdict": "acceptee", "resultat": { } },
                 { "uuid": "…", "verdict": "rejetee",  "motif": "…" } ] }
```

**`GET /sync/etat`** : heure du serveur, jeton CSRF, utilisateur connecté,
versions courantes des packs présents sur l'appareil. Sert aussi de **battement**
de connectivité (≤ 1 Ko, toutes les 20 s quand l'application est visible).

**Table `operations_synchronisees`** : `uuid` (index unique **global**), `type`,
`auteur_id`, `appareil_id`, `saisi_le` (corrigé du décalage), `recu_le`,
`verdict`, `resultat` (JSON), `charge` et `motif` (conservés pour les refus, que
l'équipe peut relire).

**Cinq verdicts** :

| Verdict | Sens | Mémorisé ? |
|---|---|---|
| `acceptee` | exécutée | oui |
| `deja_recue` | même `uuid` déjà traité : renvoyer le verdict d'origine, ne rien rejouer | — |
| `rejetee` | refus métier définitif (`OperationRejetee` avec une phrase lisible par un élève) | oui |
| `reporte` | dépendance pas encore arrivée, ou auteur pas connecté sur cet appareil | **non** |
| `erreur` | exception inattendue | **non** — sera renvoyée |

`reporte` et `erreur` ne sont **jamais** mémorisés : une panne passagère ne doit
pas transformer une réponse en refus définitif.

**Idempotence par la base** : la ligne `operations_synchronisees` est insérée
**en premier**, dans la même transaction que le travail. Un envoi concurrent
identique bute sur l'index unique et reçoit le verdict du premier.

**Exécution en tant que l'auteur** : `SynchroService::enTantQue($auteur, fn)`
fait de l'auteur l'utilisateur courant pendant l'exécution, après avoir vérifié
que ce profil est **rattaché à cet appareil** et que son compte était actif au
moment du geste (`users.desactive_le` postérieur à `saisi_le`, ou nul). Sur un
téléphone partagé, sans cela, tout serait attribué à la personne connectée au
retour du réseau.

**Les deux horloges** : `saisi_le` corrigé = heure de l'appareil + décalage
mesuré. L'horloge est **suspecte** si le décalage n'a jamais été mesuré, s'il
dépasse 10 min, si l'heure corrigée est dans le futur, ou si l'âge de la mesure
est négatif (horloge reculée depuis le dernier contact). L'**âge** d'une saisie
n'est pas un décalage : une réponse de la veille restée en file n'est pas
suspecte.

**Brancher un type d'opération** :
1. Une classe dans `app/Services/HorsLigne/Operations/` qui implémente
   `GestionnaireOperation` :
   ```php
   public function permission(): string;           // la même que la route en ligne
   public function regles(): array;                // la même validation que le FormRequest
   public function executer(ContexteOperation $ctx, array $charge): array; // rend le résultat
   ```
   `ContexteOperation` porte l'auteur, l'appareil, `saisiLe` (corrigé), `recuLe`,
   `decalageSecondes` et `horlogeSuspecte`.
2. `executer()` **appelle le service métier** : jamais de règle métier dans le
   gestionnaire. Si une route en ligne existe pour le même geste, elle appelle la
   même méthode du même service.
3. Refuser = lever `OperationRejetee` (jamais une `RuntimeException`, qui serait
   renvoyée indéfiniment).
4. Un geste **déjà dépassé** (séance déjà terminée, tentative déjà reçue sous un
   autre chemin) est **accepté sans rien rejouer**, pas refusé : un refus
   finirait dans « À corriger », où l'élève ne pourrait que l'abandonner.
5. Inscrire le type dans `RegistreOperations::TYPES`, son libellé dans
   `lib/hors-ligne/libelles.js`.

### A.3.7 Écrans en ligne seulement : jamais de clic mort

Sans précaution, hors ligne, un clic vers un écran non gardé ne fait **rien** :
le service worker rend une erreur réseau, Inertia l'avale, la barre de
progression s'arrête. L'élève reclique.

- La liste blanche (`config('hors_ligne.pages')`) est **partagée** à chaque page
  (prop `hors_ligne_pages`) ; `lib/hors-ligne/ecrans.js` la lit (sans React ni
  Inertia, pour être testable).
- `initialiserGardeNavigation()`, inscrit **avant** la barre de progression :
  - `router.on('before')` : hors ligne, une visite vers un écran indisponible est
    **annulée** et le dialogue `EcranIndisponible` s'ouvre ; un préchargement au
    survol est annulé **en silence** ;
  - sur une visite partie quand même et tombée en erreur réseau : dialogue
    « Cet écran n'a pas encore été ouvert sur ce téléphone », ou, pour une
    écriture, « Cette action demande une connexion — rien n'a été enregistré » ;
    un rechargement partiel de l'écran courant échoue **en silence** (le bandeau
    dit déjà « pas de connexion ») ;
  - un échec réseau fait passer l'indicateur en « hors ligne » **aussitôt**, sans
    attendre le prochain battement.
- On **reste sur l'écran ouvert** (qui peut contenir une séance en cours) : un
  dialogue, pas une navigation vers une page vide.
- Dans la navigation, hors ligne, les écrans indisponibles sont estompés, avec
  une icône de nuage barré et « — demande une connexion » au survol ; toujours
  cliquables (le clic explique).
- `EcranIndisponible.jsx` est monté **une fois à la racine** de l'application,
  pour couvrir tous les habillages.
- Page de repli du service worker (rechargement complet ou adresse tapée) : deux
  messages, « Cet écran demande une connexion » et « Pas encore ouvert sur ce
  téléphone », et un lien vers l'accueil, lui-même gardé.

### A.3.8 Les copies datées

`BandeauCopie.jsx`, sous l'indicateur réseau, lit `props.copie_hors_ligne` :
« Progression au 21:14 — dernière version gardée sur ce téléphone ». Le sujet
dépend de l'écran (`lib/hors-ligne/copies.js`) ; une copie d'hier ou plus ancienne
dit sa date. Au retour du réseau, un écran de **lecture** s'actualise seul,
**une seule fois par retour** (sur un réseau plus lent que le délai de 6 s du
service worker, une actualisation par copie relancerait en boucle) ; un écran de
**saisie** ne bouge jamais. Tant que la copie est affichée en ligne, un bouton
« Actualiser » est offert.

### A.3.9 Ce que voit l'élève

- `useHorsLigne()` : `{ reseau: 'en_ligne' | 'hors_ligne' | 'session_expiree',
  enAttente, anomalies }`. Hors ligne est décidé par l'**échec** d'une requête ou
  du battement, pas par `navigator.onLine` seul (qui ment souvent).
- Pastille dans la barre du haut : « Tout est envoyé » / « 12 réponses à
  envoyer » / « Hors ligne ».
- Bandeau non bloquant hors ligne : « Pas de connexion. Tes réponses sont
  gardées sur le téléphone et partiront toutes seules. » Session expirée :
  « Reconnecte-toi pour envoyer tes 12 réponses — elles sont gardées. »
- Toucher la pastille ouvre la liste « À envoyer » et « À corriger » : un refus
  dit pourquoi, avec « Abandonner » ; une erreur technique propose « Réessayer ».
- **Déconnexion prévenue** : si des opérations attendent, « Tu as 12 réponses
  pas encore envoyées. Elles partiront à ta prochaine connexion sur ce
  téléphone. » avant de confirmer.
- iPhone non installé : bandeau « Installe N'karamögö sur ton écran d'accueil,
  sinon iPhone efface tes téléchargements après quelques jours sans ouverture ».

---

## A.4 Le contenu se télécharge comme des données, pas comme des pages

Garder des **pages** (une copie par écran visité) ne suffit pas ici : 500 sujets,
des centaines de leçons et des milliers de questions feraient autant de pages à
ouvrir une à une avant la coupure.

Le contenu est donc téléchargé **par pack** (A.5), et les écrans de lecture
savent s'afficher **depuis la base locale** :

```
Écran Leçon / Exercice / Annale
   ├─ élément présent dans un pack local ? → afficher depuis Dexie (0 octet réseau)
   └─ sinon → props Inertia (en ligne) ; hors ligne : « Télécharge Maths BEPC pour lire hors ligne »
```

**Conséquence d'architecture, à poser au lot 2** : le composant qui affiche une
leçon, une question ou un corrigé reçoit un **objet de contenu** (blocs JSON) et
ne sait pas d'où il vient. Une seule autorité pour le format des blocs :
`app/Support/BlocsContenu` (PHP) et `lib/contenu/blocs.js` (JS), avec un test qui
vérifie que les deux acceptent et refusent les mêmes exemples.

## A.5 Les packs

**Ce qu'est un pack** : tout le contenu **publié** d'une matière pour un examen,
une série et une filière — `(examen, série|null, filière, matière)`, par exemple
« Maths · BEPC » ou « Physique · Bac SE ». Il contient le référentiel (chapitres,
notions), les leçons, fiches, questions, indices, corrigés, sujets d'annales
structurés, les **séances pré-calculées** (A.10) et la liste des médias.

**Format** :
- un **manifeste** : `{ pack_id, version, genere_le, taille_octets,
  taille_sans_images, expire_le, elements: [{ type, id, version, empreinte }] }` ;
- les éléments en JSON, compressés par le serveur web (gzip ou brotli), découpés
  en **morceaux d'environ 500 Ko** : une coupure ne fait recommencer qu'un morceau ;
- les médias en WebP, largeur maximale 1200 px, rangés dans `medias-<pack>`.

**Téléchargement** :
- toujours **demandé par l'élève**, jamais automatique sur données mobiles ;
- poids affiché **avant** : « Maths · BEPC — 4,2 Mo (1,1 Mo sans images) » ;
- option « sans images » (mode économie de données) : les figures arrivent plus
  tard, ou sur demande ;
- reprise morceau par morceau, progression affichée, jamais depuis zéro ;
- après le premier pack : `navigator.storage.persist()` (stockage persistant) et
  `navigator.storage.estimate()` pour afficher la place restante.

**Mise à jour** :
- à chaque `GET /sync/etat`, le serveur indique la version courante des packs
  présents ;
- mise à jour **différentielle** : seuls les éléments dont l'empreinte a changé
  sont retéléchargés (un corrigé corrigé après un signalement = quelques Ko) ;
- un élément **retiré** est supprimé de l'appareil à la synchro suivante.

**Droits** :
- qui peut télécharger quoi : HL-D3 ;
- un pack d'abonné porte une **date d'expiration** (fin d'abonnement + délai de
  grâce, HL-D4), vérifiée à chaque synchro. Hors ligne, l'appareil la vérifie avec
  sa propre horloge, falsifiable — et on l'accepte. **Aucune protection
  technique ne rend inviolable un contenu téléchargé dans un navigateur.** On
  protège le service (mises à jour, nouveaux packs, tuteur), pas le fichier ;
- un pack ne contient **aucune donnée personnelle**.

## A.6 Les opérations du produit

| Type | Priorité | Service appelé | Règles |
|---|---|---|---|
| `examen_blanc.terminer` | 0 | `ExamenBlancService::terminer` | A.8 ; la note d'examen blanc est ce que l'élève tient le plus à ne pas perdre |
| `tentative.enregistrer` | 1 | `TentativeService::enregistrer` | **le serveur recorrige** contre la **version** de la question vue par l'élève (`version_id` dans la charge) ; met à jour la maîtrise |
| `tentative.auto_evaluer` | 1 | `TentativeService::autoEvaluer` | `depend_de` la tentative |
| `seance.terminer` | 2 | `SeanceService::terminer` | séances propres à chaque profil ; déjà terminée → acceptée sans rien rejouer |
| `lecon.progression` | 3 | `ProgressionService::lecon` | la saisie la plus récente (`saisi_le`) gagne, quel que soit l'ordre de réception |
| `signalement.creer` | 3 | `SignalementService::creer` | limite par jour et par élève |

Deux règles propres au produit :
- **La correction de l'appareil n'est qu'un affichage.** L'appareil corrige pour
  répondre tout de suite ; le serveur recorrige pour la jauge, les points et les
  classements. Un appareil trafiqué ne peut pas s'inventer 20/20.
- **Les points des classements comptent à la réception** (`recu_le`) ; **la série
  de jours compte au jour du geste** (`saisi_le` corrigé). Reculer son horloge
  pour sauver une série n'a pas de gravité ; la reculer pour gonfler un classement
  en aurait.

## A.7 Profils, appareils, session

- **Appareil enregistré automatiquement** à la première connexion : table
  `appareils` (`uuid`, jeton **haché**, libellé déduit du navigateur, premier et
  dernier contact, `revoque_le`) et `appareil_profils` (appareil, utilisateur,
  ajouté le). Le jeton en clair ne vit que dans `meta` sur l'appareil et dans
  le corps des requêtes de synchro. Limites : HL-D8.
- **Plusieurs profils** sur un téléphone (HL-D9), chacun protégé par un **code à
  4 chiffres local** (empreinte salée dans `profils`), pour passer de l'un à
  l'autre sans mot de passe ni réseau.
- La file contient les gestes de **tous** les profils ; la synchro les exécute en
  tant que leur auteur (A.3.6). Un profil dont la session serveur n'est pas
  active voit ses gestes `reporte` jusqu'à sa prochaine connexion — **jamais
  attribués à un autre**.
- **Session longue** sur appareil installé (HL-D10) : l'élève ne retape pas son
  mot de passe chaque soir ; le code local protège l'accès entre frères et sœurs.
- Déconnexion d'un profil : ses données locales sont effacées une fois sa file
  vide ; **les packs restent** (partagés).

## A.8 L'examen blanc hors ligne

- **Lancement** possible hors ligne si le sujet est dans un pack.
- **Sauvegarde continue** : chaque réponse et chaque changement de question sont
  écrits dans `examens_blancs` **à chaque geste**, pas sur un minuteur. Rouvrir
  l'application rouvre l'examen à la question en cours (« Examen repris »).
- **Chronomètre** (HL-D5) : en « conditions réelles », le temps **continue de
  courir** application fermée, comme le jour de l'examen — il est calculé depuis
  l'heure de début, jamais en additionnant des secondes. Une horloge qui recule ou
  saute de plus de 5 min pendant l'examen est **signalée** sur le résultat, pas
  sanctionnée. En « entraînement », la pause est permise.
- **Fin** : correction locale immédiate (affichage), puis `examen_blanc.terminer`
  dans la file. Le résultat est marqué « en attente d'envoi » jusqu'à
  l'acquittement ; la note du serveur fait foi, et un écart est expliqué en une
  phrase.
- La **carte de partage** (image) est générée sur l'appareil : elle marche hors
  ligne et ne consomme rien jusqu'au partage.

## A.9 La correction et les versions de contenu

Un corrigé peut être corrigé après un signalement. Chaque question publiée a une
**version** ; une tentative référence la version vue. Le serveur corrige contre
cette version, et la maîtrise n'est pas recalculée rétroactivement quand une
nouvelle version sort (un élève ne perd pas des points pour l'erreur de
l'équipe). Une question **retirée** n'est plus proposée, ses tentatives restent.

## A.10 Jauge, séance du jour et trace hors ligne

Une règle = une autorité : maîtrise et jauge sont calculées **sur le serveur**
(`MaitriseService`), jamais dupliquées en JavaScript.

- Hors ligne, l'accueil affiche **la dernière jauge du serveur** et, en dessous,
  « 12 réponses pas encore comptées » — l'élève voit que son travail est gardé.
- **Séances pré-calculées** : à chaque synchro, le serveur envoie les **3
  prochaines séances** de chaque matière téléchargée. Hors ligne, l'élève passe à
  la suivante. Aucun algorithme de sélection côté appareil.
- **Trace (série de jours)** : calculée sur l'appareil à partir des tentatives du
  jour, confirmée par le serveur à la synchro.

## A.11 Budgets (exigences testées)

| Mesure | Budget |
|---|---|
| Coquille de l'application, premier chargement (hors polices) | < 500 Ko transférés |
| Une tentative dans la file | < 2 Ko |
| Un lot de 50 tentatives | < 40 Ko compressé |
| Mise à jour d'un pack après correction d'un corrigé | < 20 Ko |
| Pack d'une matière, sans images | objectif < 2 Mo |
| Battement de connectivité | ≤ 1 Ko, toutes les 20 s, seulement application visible |

Un test Playwright mesure le poids transféré de l'accueil et d'une séance
(réseau « 3G lente », processeur ralenti ×4) et échoue au-delà du budget.

## A.12 Décisions à arbitrer

| # | Question | Proposition |
|---|---|---|
| HL-D1 | Périmètre du niveau A | Tableau A.2 |
| HL-D2 | Contenu hors ligne en packs de données plutôt qu'en pages gardées | Oui (A.4) |
| HL-D3 | Qui télécharge quoi | Gratuit : 1 pack au choix ; abonné : tous les packs de son examen et de sa série |
| HL-D4 | Expiration d'un pack d'abonné | Fin d'abonnement + 7 jours, vérifiée à chaque synchro |
| HL-D5 | Chronomètre de l'examen blanc | « Conditions réelles » : le temps court application fermée ; « entraînement » : pause permise |
| HL-D6 | Qui fait foi pour la correction | Le serveur, contre la version vue par l'élève |
| HL-D7 | Jauge hors ligne | Dernière valeur du serveur + nombre de réponses pas encore comptées |
| HL-D8 | Appareils | Enregistrement automatique ; un compte payant sur 2 appareils au plus |
| HL-D9 | Profils par téléphone | 4 au plus, code local à 4 chiffres |
| HL-D10 | Session sur appareil installé | 30 jours glissants ; code local pour changer de profil |
| HL-D11 | Stockage | `storage.persist()` après le premier pack ; installation fortement poussée sur iPhone |
| HL-D12 | Tests côté appareil | Vitest + `fake-indexeddb` |

## A.13 Découpage

**Le hors ligne ajouté après coup oblige à refaire les écrans.** La file
d'opérations est donc utilisée **dès le premier geste élève**, en ligne comme
hors ligne ; les packs viennent ensuite.

| Lot HL | Contenu | Lot de `PLAN_NKARAMOGO.md` |
|---|---|---|
| **HL0** | Socle A.3 complet | Lot 0 |
| **HL1** | Rendu des contenus indépendant de leur source (A.4) | Lot 2 |
| **HL2** | Tentatives et séances par la file, correction serveur, versions (A.6, A.9) | Lot 3 |
| **HL3** | Examen blanc : sauvegarde continue, chronomètre, `examen_blanc.terminer` (A.8) | Lot 5 |
| **HL4** | Jauge, séances pré-calculées, trace (A.10) | Lot 6 |
| **HL5** | Packs : génération, téléchargement par morceaux, médias, différentiel, droits, expiration, écran Téléchargements (A.5) | Lot 7 |
| **HL6** | Profils multiples, code local, session longue (A.7) | Lot 7 |
| **HL7** | Budgets mesurés (A.11) | Lot 7 |
| **HL8** | Terrain sur vrais téléphones (A.15) | Lot 14 |

## A.14 Tests

| # | Test | Bloquant |
|---|---|---|
| 1 | `SynchroIdempotenteTest` — même `uuid` envoyé deux fois, y compris en parallèle : exécuté une fois, verdict `deja_recue` | ✓✓ |
| 2 | `SynchroVerdictsTest` — `reporte` et `erreur` jamais mémorisés ; `OperationRejetee` mémorisée avec sa charge | ✓✓ |
| 3 | `SynchroEnTantQueLAuteurTest` — deux profils sur un appareil, chaque geste attribué au bon élève ; profil non rattaché → `reporte` | ✓✓ |
| 4 | `SynchroUuidV7Test` — un UUID v4 est refusé | ✓ |
| 5 | `HorlogeSuspecteTest` — les quatre cas de A.3.6 ; l'âge d'une saisie n'est pas un décalage | ✓ |
| 6 | `CorrectionServeurTest` — tentative déclarée juste par l'appareil mais fausse : recorrigée ; la version vue fait foi | ✓✓ |
| 7 | `ExamenBlancHorsLigneTest` — note recalculée, horloge suspecte signalée | ✓✓ |
| 8 | `PackDifferentielTest` — après modification d'un corrigé, seul cet élément change d'empreinte | ✓ |
| 9 | `PackDroitsTest` — pas d'abonnement, pas de pack réservé ; pack expiré non mis à jour | ✓ |
| 10 | `ProgressionLeconTest` — la saisie la plus récente gagne quel que soit l'ordre | ✓ |
| 11 | `ServiceWorkerTest` — `/sw.js` servi sans authentification, en-têtes, liste de précache = manifeste Vite, script de désinstallation si `public/hot` | ✓ |
| 12 | `DemarrageInterrompuTest` — le filet est dans le document, caché par un style en ligne, annonce que les réponses sont gardées | ✓ |
| 13 | Vitest — la file survit au redémarrage | ✓✓ |
| 14 | Vitest — ordre `[priorite, uuid]` et `depend_de` | ✓ |
| 15 | Vitest — 401 = pause sans perte ; 419 = jeton rafraîchi puis renvoi | ✓ |
| 16 | Vitest — UUID v7 monotones dans une même milliseconde ; aucun v4 | ✓ |
| 17 | Vitest — règle de la liste blanche identique dans `sw.js` et `ecrans.js` | ✓ |
| 18 | Vitest — garde de navigation : visite annulée, préchargement tu, message selon l'échec | ✓ |
| 19 | Vitest — échec d'import : rechargement une fois en ligne, jamais hors ligne | ✓ |
| 20 | Vitest — examen blanc rouvert à la bonne question après redémarrage | ✓✓ |
| 21 | Vitest — chronomètre calculé depuis l'heure de début | ✓ |
| 22 | Vitest — reprise d'un téléchargement interrompu au morceau suivant | ✓ |
| 23 | Vitest — les packs survivent à la déconnexion d'un profil, pas ses réponses | ✓ |
| 24 | Playwright — séance complète en contexte `offline`, rechargement, retour réseau : un seul envoi | ✓✓ |
| 25 | Playwright — budgets de poids (A.11) | ✓ |

## A.15 Contrôles sur vrai matériel (à reporter dans `A_TESTER.md`)

1. Android d'entrée de gamme : mode avion pendant une séance → rechargement → retour réseau → un seul envoi.
2. Extinction forcée du téléphone pendant un examen blanc → examen repris à la bonne question.
3. Téléchargement d'un pack sur réseau mobile faible, interrompu puis repris.
4. Deux profils sur le même téléphone, réponses hors ligne des deux, synchro → chacun ses réponses.
5. iPhone installé, 7 jours sans ouverture → packs toujours présents.
6. Déploiement pendant que la file n'est pas vide → rien de perdu, nouvelle version activée une fois la file vidée.
7. Coupure du réseau dans la seconde qui suit le chargement d'une page juste après un déploiement → filet de démarrage, puis rechargement seul au retour du réseau.

---

# PARTIE B — SUIVI D'EXÉCUTION

> Rempli par Claude Code. Une ligne par élément livré : le fichier où il vit et
> la preuve (test, capture, vérification).

## B.0 Tableau de bord

| Lot | Intitulé | État | Avancement |
|---|---|---|---|
| — | Arbitrage HL-D1 à HL-D12 | ✅ fait (2026-10-30) | 12 / 12 |
| HL0 | Socle | ⬜ à faire | 0 / 12 |
| HL1 | Rendu indépendant de la source | ⬜ à faire | 0 / 2 |
| HL2 | Tentatives et séances | ⬜ à faire | 0 / 4 |
| HL3 | Examen blanc | ⬜ à faire | 0 / 4 |
| HL4 | Jauge, séances pré-calculées, trace | ⬜ à faire | 0 / 3 |
| HL5 | Packs | ⬜ à faire | 0 / 7 |
| HL6 | Profils et session | ⬜ à faire | 0 / 4 |
| HL7 | Budgets | ⬜ à faire | 0 / 2 |
| HL8 | Terrain | ⬜ à faire | 0 / 7 |

## B.1 Décisions

- [x] HL-D1 … HL-D12 (A.12) — tranchées par Maurice le 2026-10-30 : toutes les
  propositions retenues, avec ces précisions :
  - **HL-D8** : au lot 0, les appareils sont enregistrés mais pas limités ; la
    limite de 2 appareils d'un compte payant arrive au lot 9, sous forme de
    révocation par l'élève dans « Mon compte », pas de blocage.
  - **HL-D9** : 4 profils locaux ; au lot 7, prévoir une connexion simple sans
    profil local pour les ordinateurs partagés d'une école (sinon la limite les
    bloque).
  - **HL-D10** : 30 jours glissants pour élèves et parents ; **12 h** pour les
    rôles back-office et console.
  - **HL-D12** : Vitest 5 (fourni par Vite+) + `fake-indexeddb`.

## B.2 HL0 — Socle

- [ ] HTTPS vérifié sur l'hébergement de production
- [ ] Service worker servi à `/sw.js`, précache du manifeste Vite, trois versions gardées (A.3.1)
- [ ] Caches `pages-u<id>` (copies complètes, fusion des partiels, heure glissée), `polices`
- [ ] Manifeste et icônes ; installation vérifiée sur Android ; notice iPhone (A.3.2)
- [~] Échec d'import de page rattrapé ; filet de démarrage dans `app.blade.php` (A.3.3)
  — fait : `resolve` maison, `resources/js/lib/chargement-page.ts`, test
  Vitest 19 (lot 0, étape 2) ; `window.__nkaramogoPret` posé par `app.tsx`.
  Reste : le filet de démarrage dans `app.blade.php`, et « hors ligne » à
  lire dans `useHorsLigne` au lieu de `navigator.onLine` (étape 6).
- [ ] Base Dexie `nkaramogo` (A.3.4)
- [ ] UUID v7 monotone ; refus serveur des autres versions (A.3.5)
- [ ] `enregistrer()` et moteur : lots, ordre, `depend_de`, délais, 401/419 (A.3.5)
- [ ] `POST /sync/operations`, `GET /sync/etat`, `operations_synchronisees`, cinq verdicts, `enTantQue`, registre (A.3.6)
- [ ] Appareil et `appareil_profils` enregistrés à la connexion (A.7)
- [ ] Garde de navigation, `EcranIndisponible`, navigation signalée hors ligne, page de repli (A.3.7)
- [ ] `useHorsLigne`, pastille, bandeaux, liste « À envoyer / À corriger », déconnexion prévenue, `BandeauCopie` (A.3.8, A.3.9)

## B.3 HL1 à HL8

*(détaillés par Claude Code au début de chaque lot, sur le modèle de B.2)*

## B.4 Tests

*(cocher les lignes de A.14 au fur et à mesure)*

- [x] 19 — Vitest : échec d'import, rechargement une fois en ligne, jamais
  hors ligne (`tests/js/chargement-page.test.ts`, lot 0 étape 2).

## B.5 Journal des écarts

*(chaque écart à cette spécification : ce qui a changé, pourquoi, avec la preuve)*

1. **2026-10-30 — Fichiers en TypeScript.** Le projet est en TypeScript (kit
   Laravel + React, décision DA1) : `app.jsx` → `app.tsx`, `lib/hors-ligne/*.js`
   → `*.ts`, `EcranIndisponible.jsx` → `components/ecran-indisponible.tsx`, etc.
   Seul `resources/service-worker/sw.js` reste en JavaScript (servi tel quel
   par `ServiceWorkerController`).
2. **2026-10-30 — Inertia v3.** A.3.3 et A.3.7 ont été écrits pour Inertia v2.
   En v3 : `router.cancel()` devient `router.cancelAll()`, les événements
   `exception` et `invalid` deviennent `networkError` et `httpException`, et le
   plugin `@inertiajs/vite` résout les pages lui-même. Le rattrapage de l'échec
   d'import (A.3.3) passe donc par un `resolve` fourni explicitement à
   `createInertiaApp`. À valider à l'étape 2 du lot 0.
3. **2026-10-30 — Précache des polices.** Les polices (Sora, Lexend) sont
   importées depuis Fontsource par `app.css` : leurs fichiers figurent dans
   `public/build/manifest.json` comme les autres ressources, `PRECACHE` (A.3.1)
   n'a rien d'autre à lire. Fontsource livre aussi des WOFF que les navigateurs
   visés ne demandent jamais : les écarter du précache (`.woff`, `.ttf`), pour
   ne pas faire payer à l'élève des fichiers inutiles. (Corrige la première
   version de cet écart, écrite quand les polices passaient encore par
   l'option `fonts` du plugin et un `fonts-manifest.json`.)

## B.6 Points de vigilance

*(pièges rencontrés, données de test laissées en base, limites connues)*
