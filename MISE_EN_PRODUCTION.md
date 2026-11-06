# MISE_EN_PRODUCTION.md — Mettre N'karamögö en ligne, et l'y garder

> **Le seul guide à suivre pour déployer.** Toutes les commandes à taper, les
> réglages, les services qui doivent tourner en permanence (file d'attente,
> tâches planifiées), les journaux, les sauvegardes — du premier déploiement
> aux suivants.
>
> **Tenu à jour à chaque lot** par Claude Code (`CLAUDE.md` § 7) : un lot qui
> ajoute une commande, une variable de `.env`, une tâche de fond ou une
> opération « une seule fois » l'écrit ici, dans sa section du § 8 **et** à
> sa place dans les étapes. Dernière mise à jour : **lot 7 (2026-11-06)**.
>
> Les commandes supposent un serveur Linux (Ubuntu ou Debian) avec Nginx,
> PHP-FPM, MySQL, Supervisor et cron, l'application dans
> `/var/www/nkaramogo`, exécutée par l'utilisateur `www-data`. Adapter les
> chemins si l'hébergeur choisi (D11) en impose d'autres.

---

## Sommaire

1. [Ce qu'il faut avant de commencer](#1-ce-quil-faut-avant-de-commencer)
2. [Le fichier `.env` de production](#2-le-fichier-env-de-production)
3. [Premier déploiement, pas à pas](#3-premier-déploiement-pas-à-pas)
4. [Les services qui tournent en permanence](#4-les-services-qui-tournent-en-permanence)
5. [Chaque déploiement suivant](#5-chaque-déploiement-suivant)
6. [Journaux : où regarder, quoi surveiller](#6-journaux--où-regarder-quoi-surveiller)
7. [Sauvegardes](#7-sauvegardes)
8. [Lot par lot : ce que chaque lot demande au déploiement](#8-lot-par-lot--ce-que-chaque-lot-demande-au-déploiement)
9. [Vérifications après la mise en ligne](#9-vérifications-après-la-mise-en-ligne)
10. [En cas de problème](#10-en-cas-de-problème)

---

## 1. Ce qu'il faut avant de commencer

| Élément | Exigence | Pourquoi |
|---|---|---|
| Domaine | `nkaramogo.*` réservé (D11) | |
| **HTTPS** | certificat valide sur tout le domaine, HTTP redirigé vers HTTPS | **sans HTTPS, pas de service worker** : ni hors ligne, ni installation, ni packs (`HORS_LIGNE.md` A.3.1) |
| PHP | 8.3 ou plus récent (développé en 8.4), extensions : `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`, `zlib` | `zlib` : poids compressé des packs (lot 7) |
| Composer | 2.x | |
| Node.js | 22 LTS ou plus récent (développé en 26), **seulement pour construire** l'interface | |
| MySQL | 8.0 ou plus récent, base `utf8mb4` dédiée | |
| Nginx | avec compression gzip (ou brotli) | les packs et les réponses JSON sont compressés par le serveur web (lot 7) |
| Supervisor | | garde la file d'attente vivante (§ 4.1) |
| cron | | lance le planificateur chaque minute (§ 4.2) |
| Clé de l'API Claude | à créer sur console.anthropic.com | import assisté des annales (lot 4) |

Paquets, sur Ubuntu 24.04 par exemple :

```bash
sudo apt update
sudo apt install nginx mysql-server supervisor unzip git
sudo apt install php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-intl php8.3-bcmath
```

Le certificat HTTPS (Let's Encrypt) :

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d nkaramogo.example -d www.nkaramogo.example
```

La base de données (remplacer le mot de passe) :

```bash
sudo mysql -e "CREATE DATABASE g_etudie CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'nkaramogo'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT'; GRANT ALL ON g_etudie.* TO 'nkaramogo'@'localhost'; FLUSH PRIVILEGES;"
```

---

## 2. Le fichier `.env` de production

Partir de `.env.example`, puis **changer ou ajouter** ces lignes. Le fichier
`.env` n'est **jamais** dans le dépôt.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://nkaramogo.example
APP_KEY=                      # généré une seule fois (§ 3, étape 4), puis gardé à vie

DB_DATABASE=g_etudie
DB_USERNAME=nkaramogo
DB_PASSWORD=MOT_DE_PASSE_FORT

SESSION_DRIVER=database
SESSION_LIFETIME=43200        # 30 jours glissants pour les élèves (HL-D10) ; le personnel est limité à 12 h par le code
SESSION_SECURE_COOKIE=true    # HTTPS obligatoire

QUEUE_CONNECTION=database
DB_QUEUE_RETRY_AFTER=960      # plus long qu'une lecture d'annale (lot 4), sinon un second travailleur reprend le travail

CACHE_STORE=database

LOG_CHANNEL=stack
LOG_STACK=daily               # un fichier par jour (§ 6)
LOG_DAILY_DAYS=30
LOG_LEVEL=warning

ANTHROPIC_API_KEY=sk-ant-…    # lot 4 : import assisté ; sans elle, l'import échoue avec sa raison
ANNALES_MODELE=claude-opus-5-5

# NE PAS mettre DEMO_MOT_DE_PASSE en production : les comptes de démonstration n'existent pas en production.
```

Fournisseur SMS : **aucun pour l'instant** (D3) ; en production, l'envoi
d'un code est seulement signalé dans le journal. Quand le fournisseur sera
choisi, ses variables s'ajouteront ici.

---

## 3. Premier déploiement, pas à pas

Dans l'ordre. Chaque étape se fait d'abord sur la **préproduction**, puis sur
la production.

**1. Récupérer le code**

```bash
sudo mkdir -p /var/www/nkaramogo && sudo chown $USER:www-data /var/www/nkaramogo
git clone <adresse-du-dépôt> /var/www/nkaramogo
cd /var/www/nkaramogo
```

**2. Le `.env`** : le créer d'après le § 2.

```bash
cp .env.example .env
nano .env
```

**3. Dépendances PHP** (avant l'interface : la construction de l'interface
interroge Laravel pour générer les routes TypeScript)

```bash
composer install --no-dev --optimize-autoloader
```

**4. La clé de l'application** — une seule fois, jamais à refaire (elle
chiffre les sessions et les cookies) :

```bash
php artisan key:generate
```

**5. L'interface**

```bash
npm ci
npm run build
test ! -f public/hot && echo "OK : pas de public/hot"
```

`public/hot` ne doit **jamais** exister en production : s'il existe, le
service worker se désinstalle et l'application charge des fichiers
introuvables.

**6. La base**, tables **puis** référentiels (rôles, permissions, examens,
séries, matières, badges) — toujours dans cet ordre :

```bash
php artisan migrate --force
php artisan db:seed --force
```

`db:seed` est sans danger à chaque déploiement : il met à jour les
référentiels, ne réinitialise aucun mot de passe et **refuse** de créer les
comptes de démonstration en production.

**7. Les opérations « une seule fois » des lots** (détail au § 8) :

```bash
php artisan progression:recalculer   # lot 6 : maîtrises, séries, points et badges des réponses déjà reçues
php artisan packs:generer            # lot 7 : packs hors ligne de toutes les épreuves de l'année
```

Les deux sont sans danger si on les relance.

**8. Les caches de production**

```bash
php artisan optimize
```

**9. Les droits sur les dossiers écrits par l'application**

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwX storage bootstrap/cache
```

**10. Nginx** : `/etc/nginx/sites-available/nkaramogo` (le bloc HTTPS que
certbot a créé, complété) :

```nginx
server {
    server_name nkaramogo.example www.nkaramogo.example;
    root /var/www/nkaramogo/public;
    index index.php;
    charset utf-8;
    client_max_body_size 25m;          # import d'annales : 20 Mo au plus (lot 4)

    gzip on;
    gzip_comp_level 6;
    gzip_min_length 512;
    gzip_types application/json application/javascript text/css image/svg+xml application/manifest+json text/plain;

    # Fichiers du build : noms hachés, donc immuables.
    location /build/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location = /manifest.webmanifest {
        default_type application/manifest+json;
    }

    # /sw.js n'est PAS un fichier : il passe par Laravel (ses en-têtes en dépendent).
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known) { deny all; }

    listen 443 ssl;   # lignes ssl_certificate… ajoutées par certbot
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**11. Les services permanents** : file d'attente et planificateur, § 4.

**12. Le premier administrateur plateforme** (aucun compte n'existe en
production). Remplacer le numéro, le prénom, le pseudo et le mot de passe :

```bash
php artisan tinker --execute '$u = App\Models\User::create(["telephone" => App\Support\Telephone::normaliser("620000000"), "prenom" => "Prénom", "pseudo" => "admin", "password" => "UN_MOT_DE_PASSE_LONG"]); $u->forceFill(["telephone_verifie_le" => now()])->save(); $u->syncRoles(["superadmin"]); echo "Compte créé : ", $u->id, PHP_EOL;'
```

Puis se connecter, ouvrir « Mon compte › Sécurité » et **activer la double
authentification** tout de suite.

Les **autres comptes du personnel** (la console ne sait pas encore en créer)
se créent de la même façon, en changeant le rôle dans `syncRoles([...])` :

| Rôle | Pour qui |
|---|---|
| `redacteur` | écrit leçons, questions, annales |
| `relecteur` | relit et publie |
| `admin_contenu` | responsable pédagogique : référentiel, relecture, signalements |
| `superadmin` | administrateur plateforme (console) |

Chacun active ensuite sa double authentification (« Mon compte ›
Sécurité »). Les élèves, eux, s'inscrivent seuls.

**13. Vérifier** : § 9.

---

## 4. Les services qui tournent en permanence

### 4.1 La file d'attente (`queue:work`) — obligatoire depuis le lot 4

Ce qui passe par la file :
- **lot 4** : la lecture d'une annale importée (API Claude, plusieurs minutes) ;
- **lot 7** : la regénération des packs d'une matière à chaque publication,
  retrait ou correction d'une leçon, d'une question ou d'une annale.

Sans travailleur, un import reste « En file » et les packs ne se mettent plus
à jour. Supervisor le relance s'il s'arrête.

`/etc/supervisor/conf.d/nkaramogo-file.conf` :

```ini
[program:nkaramogo-file]
command=php /var/www/nkaramogo/artisan queue:work database --sleep=3 --tries=1 --timeout=900 --max-time=3600
directory=/var/www/nkaramogo
user=www-data
numprocs=1
autostart=true
autorestart=true
stopwaitsecs=960
redirect_stderr=true
stdout_logfile=/var/www/nkaramogo/storage/logs/file-attente.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status nkaramogo-file
```

`--timeout=900` : une lecture d'annale peut durer longtemps ; il doit rester
**sous** `DB_QUEUE_RETRY_AFTER=960` (§ 2).

### 4.2 Le planificateur (`schedule:run`) — obligatoire depuis le lot 7

Ce qu'il lance :

| Tâche | Quand | Lot | Pourquoi |
|---|---|---|---|
| `packs:generer` | chaque nuit à 3 h | 7 | filet : un titre de chapitre modifié, une épreuve ajoutée ne regénèrent pas les packs d'eux-mêmes |

Une seule ligne dans la crontab de `www-data` :

```bash
sudo crontab -u www-data -e
```

```cron
* * * * * cd /var/www/nkaramogo && php artisan schedule:run >> /dev/null 2>&1
```

Vérifier ce qui est planifié :

```bash
php artisan schedule:list
```

---

## 5. Chaque déploiement suivant

Dans l'ordre, à chaque nouvelle version :

```bash
cd /var/www/nkaramogo
php artisan down --retry=60
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
test ! -f public/hot && echo "OK : pas de public/hot"
php artisan migrate --force
php artisan db:seed --force
php artisan optimize
php artisan queue:restart
php artisan up
```

Puis : les opérations « une seule fois » du ou des lots déployés (§ 8), s'il
y en a ; et `php artisan packs:generer` si le déploiement change ce que
contient un pack (le § 8 le dit).

`php artisan queue:restart` est indispensable : sans lui, le travailleur
continue avec l'**ancien** code. Il finit son travail en cours, puis
Supervisor le relance avec le nouveau.

Le hors ligne survit au déploiement : les téléphones gardent leurs réponses
en file et ne passent à la nouvelle version qu'une fois leur file vide et
sans examen blanc en cours (`HORS_LIGNE.md` A.3.1). Mettre en ligne de
préférence en dehors des soirées de révision (18 h – 22 h).

---

## 6. Journaux : où regarder, quoi surveiller

| Journal | Où | Contenu |
|---|---|---|
| Application | `storage/logs/laravel-AAAA-MM-JJ.log` (un par jour, 30 jours) | erreurs, exceptions, codes SMS non envoyés |
| File d'attente | `storage/logs/file-attente.log` | travaux lancés, terminés, en échec |
| Travaux en échec | table `failed_jobs` | imports d'annales et générations de packs qui ont échoué |
| Accès sensibles | table `journal_acces_plateforme` (visible dans la console) | création et suppression de comptes, changements de mot de passe et de numéro, double authentification, **changement de profil sur un téléphone partagé** et **retrait d'un appareil** (lot 7) |
| Synchronisation hors ligne | table `operations_synchronisees` | chaque geste reçu des téléphones, son verdict ; les **refus** gardent leur charge et leur motif |
| Nginx | `/var/log/nginx/access.log`, `error.log` | |

Commandes utiles :

```bash
tail -f storage/logs/laravel-$(date +%F).log
php artisan queue:failed
php artisan queue:retry all
php artisan queue:monitor database:default --max=50
```

À surveiller :
- des `ERROR` répétés dans le journal de l'application ;
- des travaux dans `queue:failed` (un import d'annale ou une génération de
  pack) ;
- une file qui grossit (`queue:monitor`) : le travailleur est arrêté ;
- beaucoup de refus dans `operations_synchronisees` (`verdict = 'rejetee'`) :
  l'équipe peut relire leurs motifs.

---

## 7. Sauvegardes

Chaque jour, **hors du serveur** :
- la base MySQL ;
- `storage/app/private/` (documents originaux des annales, lot 4) ;
- le fichier `.env` (une fois, en lieu sûr : il contient `APP_KEY`, sans
  laquelle les sessions et les données chiffrées sont illisibles).

```bash
mysqldump --single-transaction -u nkaramogo -p g_etudie | gzip > /sauvegardes/g_etudie-$(date +%F).sql.gz
tar czf /sauvegardes/annales-$(date +%F).tgz -C /var/www/nkaramogo storage/app/private
```

Les packs n'ont pas besoin d'être sauvegardés : `php artisan packs:generer`
les reconstruit depuis la base.

---

## 8. Lot par lot : ce que chaque lot demande au déploiement

> Chaque lot ajoute ici sa section. Les commandes « une seule fois » se
> lancent **après** `migrate` et `db:seed`.

### Lot 0 — socle

- **HTTPS** obligatoire (service worker, application installable).
- `.env` : `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://…`,
  `SESSION_SECURE_COOKIE=true`, `SESSION_LIFETIME=43200`.
- Nginx : `/sw.js` **passe par PHP** (pas de fichier statique de ce nom),
  `/build/` en cache long, `/manifest.webmanifest` en
  `application/manifest+json` (§ 3, étape 10).
- Premier administrateur plateforme (§ 3, étape 12), double
  authentification activée.
- Personnel : sessions de 12 h, rien à régler.

### Lot 1 — référentiel et back-office contenu

- Rien de plus. `db:seed` pose le référentiel (examens, séries, matières,
  classes) ; coefficients, durées et programme sont **saisis par l'équipe**
  au back-office, jamais semés.

### Lot 2 — cours, accueil élève

- Rien de plus. L'équipe saisit la **date de la prochaine session** de
  chaque examen (Référentiel › Épreuves) pour le compte à rebours.

### Lot 3 — moteur de questions

- Rien de plus.

### Lot 4 — annales et import assisté

- `.env` : `ANTHROPIC_API_KEY`, `ANNALES_MODELE`, `DB_QUEUE_RETRY_AFTER=960`.
- **File d'attente** (§ 4.1) : sans elle, un import reste « En file ».
- Nginx : `client_max_body_size 25m` (documents de 20 Mo au plus).
- Sauvegarder `storage/app/private/annales` (§ 7).
- Convention D5 avant toute publication publique des annales.

### Lot 5 — examen blanc

- Rien de plus. L'équipe saisit la **moyenne d'admission** de chaque
  examen (Référentiel › Épreuves) pour le verdict.

### Lot 6 — progression et motivation

- **Une seule fois**, au déploiement du lot 6 :
  ```bash
  php artisan progression:recalculer
  ```
  Calcule maîtrises, séries de jours, points et badges des réponses reçues
  avant le lot 6. Sans danger si relancée.
- `db:seed` pose les badges (catalogue modifiable dans
  `database/seeders/BadgeSeeder.php`).

### Lot 7 — hors ligne complet (packs, profils du téléphone)

- **Une seule fois**, au déploiement du lot 7 :
  ```bash
  php artisan packs:generer
  ```
  Construit les packs de toutes les épreuves de l'année (affiche le poids
  de chacun). Sans danger si relancée.
- **Planificateur** (§ 4.2) : `packs:generer` chaque nuit à 3 h.
- **File d'attente** (§ 4.1) : regénère les packs d'une matière à chaque
  publication ; après un déploiement, `php artisan queue:restart`.
- Nginx : compression gzip de `application/json` (les morceaux de pack
  sont compressés par le serveur web, § 3 étape 10).
- **Chaque nouvelle année scolaire** (nouvelles épreuves saisies) :
  `php artisan packs:generer` après la saisie, sans attendre la nuit.
- Journal des accès : `profil.bascule` (changement de profil sur un
  téléphone partagé), `appareil.retire`.
- Abonnements : aucun avant le lot 9 ; chaque élève a **un** pack gratuit.

---

## 9. Vérifications après la mise en ligne

Après **chaque** déploiement :

```bash
curl -sI https://nkaramogo.example/up | head -1                      # « 200 »
curl -sI https://nkaramogo.example/sw.js | grep -iE "content-type|service-worker-allowed|cache-control"
sudo supervisorctl status nkaramogo-file                            # RUNNING
php artisan schedule:list                                            # packs:generer à 3 h
php artisan queue:failed                                             # aucun travail en échec
test ! -f public/hot && echo "OK : pas de public/hot"
```

Dans un navigateur, en HTTPS :
1. La vitrine s'ouvre ; « Se connecter » ; un compte élève arrive sur son
   accueil.
2. Outils du navigateur › Application › Service workers : `/sw.js` est
   « activated ».
3. « Téléchargements » : chaque matière a un poids (pas « En préparation »
   indéfiniment) ; télécharger une matière, puis couper le réseau : sa leçon
   s'ouvre.
4. Back-office : importer un sujet d'essai ; la ligne passe de « En file » à
   « Vérifier l'annale » en quelques minutes.

Puis dérouler les contrôles « bloqués tant que le domaine HTTPS n'existe
pas » de `A_TESTER.md` (vrais téléphones, mode avion, deux profils,
installation, iPhone).

---

## 10. En cas de problème

| Symptôme | Cause probable | Que faire |
|---|---|---|
| Pages blanches, fichiers `/build/…` introuvables, hors ligne qui ne marche plus | `public/hot` présent | `rm public/hot`, puis `php artisan optimize` |
| Chaque navigation recharge la page entière (409) | build et version servie différents | `npm run build`, puis `php artisan optimize` |
| Un import d'annale reste « En file » | travailleur arrêté | `sudo supervisorctl status nkaramogo-file`, `sudo supervisorctl restart nkaramogo-file` |
| « En préparation » sur un pack qui ne change pas | travailleur arrêté, ou génération en échec | `php artisan queue:failed`, puis `php artisan packs:generer` |
| Un pack téléchargé n'est pas mis à jour après une correction | travailleur avec l'ancien code | `php artisan queue:restart` |
| Hors ligne indisponible, pas de bouton « Installer » | pas de HTTPS, ou certificat invalide | vérifier le certificat ; le service worker exige HTTPS |
| Erreur « No application encryption key » | `APP_KEY` vide | restaurer la clé sauvegardée (§ 7) ; ne **jamais** en régénérer une nouvelle en production : toutes les sessions tombent |
| Les élèves sont déconnectés à chaque visite | `SESSION_SECURE_COOKIE=true` sans HTTPS, ou `APP_URL` en `http://` | corriger `.env`, puis `php artisan optimize` |
| Une modification de `.env` n'est pas prise en compte | configuration en cache | `php artisan optimize` (et `php artisan queue:restart`) |
