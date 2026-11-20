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
| PHP | 8.3 ou plus récent (développé en 8.4), extensions : `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`, `zlib` | `zlib` : poids compressé des packs (lot 7) ; `gd` : images du rapport PDF (lot 13) |
| Composer | 2.x | |
| Node.js | 22 LTS ou plus récent (développé en 26) | construire l'interface ; **depuis le lot 8**, faire tourner le rendu serveur de la vitrine (§ 4.3) |
| MySQL | 8.0 ou plus récent, base `utf8mb4` dédiée | |
| Nginx | avec compression gzip (ou brotli) | les packs et les réponses JSON sont compressés par le serveur web (lot 7) |
| Supervisor | | garde vivants la file d'attente (§ 4.1) et le rendu serveur (§ 4.3) |
| cron | | lance le planificateur chaque minute (§ 4.2) |
| Clé de l'API Claude | à créer sur console.anthropic.com | import assisté des annales (lot 4) |

Paquets, sur Ubuntu 24.04 par exemple :

```bash
sudo apt update
sudo apt install nginx mysql-server supervisor unzip git
sudo apt install php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-intl php8.3-bcmath php8.3-gd
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

# Lot 8 — vitrine (facultatives : valeurs par défaut dans config/vitrine.php)
TARIF_MENSUEL_GNF=15000       # prix de l'abonnement mensuel, en GNF entiers
TARIF_ANNEE_GNF=100000        # prix de l'année scolaire
VITRINE_QUESTION_DEMO=        # uuid d'une question publiée à faire jouer sur la vitrine ; vide = la question d'exemple
VITRINE_INDEXER=true          # false sur une PRÉPRODUCTION : noindex partout, robots.txt fermé

# Lot 8 — rendu serveur de la vitrine (facultatives : valeurs par défaut dans config/inertia.php)
INERTIA_SSR_ENABLED=true      # false : la vitrine est construite par le navigateur (plus lente, rien ne casse)
INERTIA_SSR_URL=http://127.0.0.1:13714
INERTIA_SSR_TIMEOUT=1         # secondes ; au-delà, la page part sans rendu serveur

# Lot 9 — abonnements et paiements (config/paiements.php)
PAIEMENT_PASSERELLE=aucune    # « simulee » est REFUSÉE en production ; le nom du vrai fournisseur une fois son pilote écrit
CODES_ACCES_CLE=…             # clé des codes prépayés (64 caractères au hasard) ; NE JAMAIS LA CHANGER une fois des codes vendus
PAIEMENT_DELAI_MINUTES=30     # facultatif : au-delà, un paiement non confirmé expire

# Lot 10 — tuteur N'karamögö (config/tuteur.php ; la clé est ANTHROPIC_API_KEY, plus haut)
TUTEUR_MODELE=claude-sonnet-5-5   # choisi par Maurice ; un autre modèle demande son prix dans config/tuteur.php
TUTEUR_EFFORT=low                 # premier mot rapide (critère : moins de 3 s)
TUTEUR_QUOTA_GRATUIT=3            # explications par jour sans abonnement
TUTEUR_QUOTA_ABONNE=30            # avec abonnement
TUTEUR_GNF_PAR_DOLLAR=8600        # taux indicatif pour lire les coûts en GNF dans la console
# TUTEUR_MOTEUR : ne pas le mettre. En production, c'est toujours « claude » ; sans clé, le tuteur se dit fermé.

# NE PAS mettre DEMO_MOT_DE_PASSE en production : les comptes de démonstration n'existent pas en production.
```

`CODES_ACCES_CLE` se crée une fois : `php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'`.
Elle sert à reconnaître les codes prépayés (seule leur empreinte est
gardée) : la perdre ou la changer rend **tous** les codes vendus invalides.
La garder aussi hors du serveur (gestionnaire de mots de passe).

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
npm run build:ssr
test ! -f public/hot && echo "OK : pas de public/hot"
test -f bootstrap/ssr/ssr.js && echo "OK : rendu serveur construit"
```

`npm run build:ssr` construit l'interface (`public/build`) **et** le rendu
serveur de la vitrine (`bootstrap/ssr/ssr.js`, lot 8). Ensuite, mettre en
place le service du rendu serveur (§ 4.3).

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
                                     # lot 9 : à relancer (variante « libre » des packs, sans les corrigés réservés)
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
        # Lot 10 : la réponse du tuteur arrive en flux ; Laravel envoie
        # « X-Accel-Buffering: no », ce délai laisse finir une longue réponse.
        fastcgi_read_timeout 120s;
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
| `paiements:verifier` | toutes les 5 min | 9 | un paiement dont le webhook s'est perdu est redemandé à l'opérateur ; sans réponse au bout de 30 min, il expire |
| `codes:effacer-oublies` | chaque nuit à 4 h | 9 | les codes prépayés en clair d'un lot jamais marqué « remis » sont effacés au bout de 14 jours |
| `jauges:relever` | le dimanche à 22 h | 13 | la jauge de chaque élève est relevée pour la semaine : l'impact (console, rapport PDF) se lit dans ces relevés. Sans cette tâche, l'évolution de la jauge ne se mesure pas, et un dimanche manqué ne se rattrape qu'en relançant la commande le lundi (`--jour=` la veille) |
| `ressources:verifier` | le lundi à 5 h | 12 | les liens des ressources externes vérifiées répondent-ils encore ? Un lien muet sort de la vue élève et apparaît « Lien cassé » au back-office (appels HTTPS sortants vers les sites de `config/ressources.php`) |

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

### 4.3 Le rendu serveur de la vitrine (`inertia:start-ssr`) — depuis le lot 8

Un petit processus Node construit les pages de la vitrine (accueil,
`/sujets`, `/sujets/…`) avant de les envoyer : l'élève voit la page avant
que le JavaScript n'arrive, et Google comme WhatsApp lisent la page entière.
Les espaces connectés ne passent **pas** par lui (ils sont servis hors ligne
par le service worker).

S'il est arrêté, rien ne casse : la vitrine est construite par le
navigateur, comme avant le lot 8 — seulement plus lente (Lighthouse
performance ~80 au lieu de ~92).

`/etc/supervisor/conf.d/nkaramogo-ssr.conf` :

```ini
[program:nkaramogo-ssr]
command=php /var/www/nkaramogo/artisan inertia:start-ssr
directory=/var/www/nkaramogo
user=www-data
numprocs=1
autostart=true
autorestart=true
stopwaitsecs=10
redirect_stderr=true
stdout_logfile=/var/www/nkaramogo/storage/logs/rendu-serveur.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status nkaramogo-ssr
php artisan inertia:check-ssr          # « Inertia SSR server is running. »
```

Il écoute sur `127.0.0.1:13714` : **jamais** ouvert à l'extérieur (pas de
règle de pare-feu, pas de bloc Nginx).

---

## 5. Chaque déploiement suivant

Dans l'ordre, à chaque nouvelle version :

```bash
cd /var/www/nkaramogo
php artisan down --retry=60
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build:ssr
test ! -f public/hot && echo "OK : pas de public/hot"
php artisan migrate --force
php artisan db:seed --force
php artisan optimize
php artisan queue:restart
php artisan inertia:stop-ssr
php artisan up
```

Puis : les opérations « une seule fois » du ou des lots déployés (§ 8), s'il
y en a ; et `php artisan packs:generer` si le déploiement change ce que
contient un pack (le § 8 le dit).

`php artisan queue:restart` est indispensable : sans lui, le travailleur
continue avec l'**ancien** code. Il finit son travail en cours, puis
Supervisor le relance avec le nouveau.

`php artisan inertia:stop-ssr` de même (lot 8) : le rendu serveur garde en
mémoire l'**ancien** `bootstrap/ssr/ssr.js` ; Supervisor le relance avec
le nouveau. Sans lui, la vitrine sort construite par l'ancienne version et
le navigateur la reconstruit (plus lente, sans erreur pour le visiteur).

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

### Lot 8 — vitrine finale, annales publiques, partage, installation

- **Une seule fois** : rien de plus que `migrate` (la migration
  `add_slug_to_sujets_table` donne leur adresse publique aux sujets déjà
  présents). Pas de commande à lancer.
- **`.env`** (§ 2) : `TARIF_MENSUEL_GNF`, `TARIF_ANNEE_GNF`,
  `VITRINE_QUESTION_DEMO`, `VITRINE_INDEXER` — toutes facultatives. Après un
  changement : `php artisan config:cache` (fait par `php artisan optimize`).
  **Une préproduction met `VITRINE_INDEXER=false`**, sinon Google la
  référence à la place du vrai site.
- **`public/robots.txt` n'existe plus** : `/robots.txt` est servi par
  Laravel (il donne l'adresse absolue de `/sitemap.xml`). Ne pas le
  recréer en fichier : Nginx le servirait à la place (`try_files $uri`).
- **Images de partage** : dessinées par GD à la première demande et rangées
  dans `storage/app/private/partage/` (disque `local`) ; le dossier
  `storage` doit rester inscriptible par `www-data` (§ 3, étape 9). PHP
  doit avoir l'extension **GD avec FreeType** (`php -r
  'var_dump(gd_info()["FreeType Support"]);'` → `true` ; paquet
  `php8.3-gd`).
- **Nginx** : rien de plus. Les pages `/sujets/*` et `/partage/*.png`
  passent par Laravel (`location /`).
- **D5** : une annale officielle n'est publique qu'une fois le champ
  « Droits de publication » rempli au back-office. Sans convention, `/sujets`
  est vide (« Pas encore de sujet publié ici ») : c'est voulu.
- **Équipe** : saisir la date de la prochaine session de chaque examen
  (Référentiel › Épreuves) pour le compte à rebours de la vitrine ;
  choisir une vraie question de BEPC pour la vitrine
  (`VITRINE_QUESTION_DEMO`).
- **Rendu serveur de la vitrine** (ajouté le 2026-11-07, pour le critère
  Lighthouse) : **une seule fois**, le programme Supervisor
  `nkaramogo-ssr` (§ 4.3) ; **à chaque déploiement**, `npm run build:ssr`
  au lieu de `npm run build`, puis `php artisan inertia:stop-ssr` (§ 5).
  Node.js reste donc installé sur le serveur. Variables `INERTIA_SSR_*`
  facultatives (§ 2).

### Lot 9 — abonnements, paiements mobiles, codes prépayés

- **Une seule fois** : `migrate` (tables `paiements`,
  `notifications_paiement`, `lots_codes`, `codes_acces`, `abonnements` ;
  colonnes `sujets.corrige_libre`, `pack_elements.variante`,
  `packs.version_libre`), `db:seed` (trois permissions nouvelles :
  `abonnement.souscrire`, `codes.gerer`, `paiements.voir`), puis
  **`php artisan packs:generer`** : chaque pack gagne sa variante « libre »
  (sans les corrigés réservés aux abonnés). Tant qu'elle manque, un pack
  s'affiche « En préparation ».
- **`.env`** (§ 2) : `CODES_ACCES_CLE` (à créer une fois, **à ne jamais
  changer**), `PAIEMENT_PASSERELLE`. En production, la passerelle
  `simulee` est refusée : tant qu'aucun vrai fournisseur n'est branché, le
  paiement mobile est fermé (l'écran le dit) et **seuls les codes
  prépayés** ouvrent un abonnement.
- **Planificateur** (§ 4.2) : `paiements:verifier` toutes les 5 minutes,
  `codes:effacer-oublies` chaque nuit.
- **Nginx** : rien de plus. Le webhook (`POST /paiements/notifications/{passerelle}`)
  passe par Laravel ; pas de jeton CSRF, c'est la **signature** qui fait foi
  (HMAC). Limité à 120 appels par minute et par adresse.
- **Vrai fournisseur** (Orange Money, MTN MoMo ou un agrégateur) : son
  pilote s'écrit dans `app/Services/Paiements` (interface
  `PasserellePaiement`), s'inscrit dans `Passerelles::PILOTES`, ses clés
  vont dans `.env` et `config/paiements.php`. Donner à l'opérateur l'adresse
  du webhook : `https://nkaramogo.example/paiements/notifications/<nom>`.
  Puis dérouler `A_TESTER.md` § 7.
- **Codes prépayés** : Console › Codes prépayés › « Fabriquer un lot » ;
  imprimer les cartes (A4, dix par page) ou télécharger le CSV ; une fois
  remis au revendeur, « Codes remis » les efface de l'écran. Un lot perdu
  se **désactive**.
- Journal des accès : `abonnement.active`, `code.utilise`,
  `lot_codes.cree`, `lot_codes.remis`, `lot_codes.desactive`.

### Lot 10 — tuteur N'karamögö (IA)

- **Une seule fois** : `migrate` (tables `conversations_tuteur`,
  `messages_tuteur`, `explications_tuteur`), `db:seed` (trois permissions
  nouvelles : `tuteur.utiliser` pour les élèves, `tuteur.journal` pour le
  responsable pédagogique et l'administrateur, `tuteur.couts` pour
  l'administrateur). Rien à recalculer.
- **`.env`** (§ 2) : `ANTHROPIC_API_KEY` (la même que pour l'import des
  annales) ; facultatifs : `TUTEUR_MODELE`, `TUTEUR_EFFORT`,
  `TUTEUR_QUOTA_GRATUIT`, `TUTEUR_QUOTA_ABONNE`, `TUTEUR_GNF_PAR_DOLLAR`.
  Sans clé, le tuteur ne casse rien : chaque demande répond « Le tuteur
  n'est pas encore ouvert » et ne décompte rien.
- **Pas de file d'attente** pour le tuteur (écart au PLAN M11, DEVBOOK
  point 26) : la réponse est diffusée **depuis la requête** (SSE), pour
  que le premier mot arrive en moins de 3 s. Chaque explication en cours
  occupe un processus PHP-FPM de 3 à 15 s : compter
  `pm.max_children` en conséquence (une explication à la fois par élève,
  8 demandes par minute au plus par élève).
- **Nginx** : `fastcgi_read_timeout 120s` (§ 3, étape 10) ; ne pas ajouter
  `text/event-stream` à `gzip_types` (la compression retient le flux).
  Derrière un CDN : `/eleve/tuteur/*` ni en cache ni compressé.
- **Planificateur, file** : rien de plus.
- **Suivi** : Console › Tuteur (coût du mois en dollars et en GNF, part
  servie par le cache, premier mot médian et 9 sur 10). Fixer une **limite
  de dépense** dans console.anthropic.com (« Limits ») : elle protège la
  facture si un quota est mal réglé.
- **Contrôles** : § 9, point 7 ; `A_TESTER.md`, lot 10 (vraie API, vrai
  téléphone).

### Lot 11 — parents, enseignants, établissements, devoirs

- **Une seule fois** : `migrate` (tables `liens_parents`, `codes_liaison`,
  `rattachements_etablissement`, `groupes`, `membres_groupes`, `devoirs`,
  `devoirs_questions`, `licences_etablissement` ; colonnes
  `seances.devoir_id`, `abonnements.licence_id`,
  `paiements.beneficiaire_id`, `etablissements.est_exemple`), puis
  `db:seed` (huit permissions nouvelles, et les espaces des rôles parent,
  enseignant et gestionnaire). Rien à recalculer, aucun pack à regénérer.
- **Session** : l'enseignant et le gestionnaire d'établissement sont
  désormais du **personnel** (décision 4) : session de 12 h, double
  authentification proposée. Au premier déploiement, leurs sessions
  ouvertes de plus de 12 h se ferment (ils se reconnectent) ; le parent
  garde ses 30 jours.
- **`.env`, planificateur, file, Nginx** : rien de plus.
- **Premier partenaire** : Console › Établissements › « Nouvel
  établissement », puis « Nommer un gestionnaire » (prénom, numéro) : le
  mot de passe provisoire s'affiche **une fois**, à transmettre de vive
  voix ; puis « Accorder une licence » (places, dates, référence du
  contrat signé). Le gestionnaire rattache ensuite ses enseignants.
- **Contrôles** : § 9, point 9 ; `A_TESTER.md`, lot 11.

### Lot 12 — culture générale, ressources externes, communauté encadrée

- **Une seule fois** : `migrate` (tables `ressources_externes`,
  `mots_interdits`, `publications_groupe`, `signalements_publications` ;
  colonnes `matieres.transversale`, `questions.sources`, `seances.culture`,
  `groupes.fil_ferme_le`, `membres_groupes.muet_jusqu_au` et
  `classement_accepte`, `devoirs.defi` ; `chapitres.classe_id` devient
  facultatif), puis `db:seed` (deux permissions, `communaute.participer` et
  `communaute.moderer` ; la matière « Culture générale » devient
  transversale), puis **`php artisan packs:generer`** : les leçons des packs
  portent désormais leurs ressources externes (une mise à jour
  différentielle, quelques Ko par pack).
- **Liste des mots refusés** : la base de production n'en a aucun (la
  liste de démonstration n'est semée qu'en développement). Le responsable
  pédagogique la saisit dans Back-office › Modération **avant** d'ouvrir
  les fils aux élèves ; numéros, liens et e-mails sont refusés sans liste.
- **Planificateur** (§ 4.2) : `ressources:verifier` chaque lundi à 5 h.
  Le serveur doit pouvoir appeler en HTTPS les sites de
  `config/ressources.php` (pare-feu sortant ouvert sur le port 443).
- **`.env`, file, Nginx** : rien de plus.
- **Contenu** : la culture générale n'apparaît qu'avec des questions
  **publiées et sourcées** (Référentiel › Programme › Culture générale :
  thèmes communs à toutes les classes ; puis Questions). Sans elles,
  l'écran dit que l'équipe les prépare.
- **Contrôles** : § 9, point 10 ; `A_TESTER.md`, lot 12.

### Lot 13 — console plateforme (activité, contenu, revenus, impact)

- **Une seule fois** : `composer install --no-dev` installe la nouvelle
  dépendance **`dompdf/dompdf`** (PHP pur ; extensions `dom` et `mbstring`
  déjà demandées au § 1, **`gd` ajoutée au § 1** — `sudo apt install
  php8.3-gd` sur un serveur déjà installé) ; puis
  `migrate` (table `releves_jauge`, colonne `profils_eleves.est_exemple`),
  puis `db:seed` (trois permissions : `console.impact`, `console.journal`,
  `comptes.administrer`).
- **Planificateur** (§ 4.2) : `jauges:relever` chaque dimanche à 22 h.
  **L'historique de la jauge commence au premier dimanche après la mise
  en ligne** : le rapport d'impact dira « pas encore assez de mesures »
  pendant les premières semaines, c'est normal. Pour un premier relevé
  tout de suite : `php artisan jauges:relever`.
- **Disque** : dompdf garde le cache de ses polices dans
  `storage/framework/cache/dompdf` (créé au premier rapport, droits de
  `www-data` comme le reste de `storage`).
- **`.env`, file, Nginx** : rien de plus. Le rapport n'est jamais mis en
  cache (`Cache-Control: no-store, private`).
- **Contrôles** : § 9, point 11 ; `A_TESTER.md`, lot 13.

---

## 9. Vérifications après la mise en ligne

Après **chaque** déploiement :

```bash
curl -sI https://nkaramogo.example/up | head -1                      # « 200 »
curl -sI https://nkaramogo.example/sw.js | grep -iE "content-type|service-worker-allowed|cache-control"
sudo supervisorctl status nkaramogo-file                            # RUNNING
sudo supervisorctl status nkaramogo-ssr                             # RUNNING (lot 8)
php artisan inertia:check-ssr                                        # running
curl -s https://nkaramogo.example/ | grep -c 'data-server-rendered'  # 1 : la vitrine arrive construite
php artisan tinker --execute="echo config('tuteur.moteur'), ' ', config('tuteur.modele');"   # « claude claude-sonnet-5-5 » (lot 10)
php artisan schedule:list                                            # packs:generer à 3 h, paiements:verifier toutes les 5 min (lot 9), ressources:verifier le lundi (lot 12)
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
5. (Lot 9) Console › Paiements s'ouvre ; un webhook mal signé est refusé :
   `curl -s -o /dev/null -w "%{http_code}" -X POST https://nkaramogo.example/paiements/notifications/simulee -d '{}'`
   → `401` (et rien dans `notifications_paiement`).
6. (Lot 8) `https://nkaramogo.example/robots.txt` finit par
   `Sitemap: https://nkaramogo.example/sitemap.xml` ; `/sitemap.xml`
   s'ouvre ; `/partage/n-karamogo.png` affiche la carte orange et noire ;
   coller l'adresse de la vitrine dans WhatsApp montre cette carte.
7. (Lot 10) Avec un compte élève : une question ratée › « Explique-moi » ;
   le premier mot arrive en moins de 3 s et s'écrit au fil de l'eau (s'il
   tombe d'un bloc à la fin, Nginx retient le flux : vérifier
   `X-Accel-Buffering` et l'absence de `text/event-stream` dans
   `gzip_types`). Console › Tuteur : la ligne du jour et son coût.
8. (Lot 8) PageSpeed Insights (pagespeed.web.dev) sur l'accueil, profil
   mobile : performance, accessibilité et SEO notés dans le DEVBOOK.
9. (Lot 11) Console › Établissements s'ouvre ; avec un compte enseignant
   de test : créer un groupe, le rejoindre avec un compte élève de test
   (code du groupe), et voir l'élève dans le groupe ; un second
   enseignant reçoit **404** sur l'adresse de ce groupe.
10. (Lot 12) Back-office › Modération : la liste des mots refusés n'est
   pas vide. Avec le compte élève de test du point 9 : écrire « appelle-moi
   au 622 12 34 56 » dans « Questions du groupe » → refusé ; une vraie
   question → publiée ; l'enseignant de test la voit, « Masquer » → elle
   disparaît chez l'élève. `php artisan ressources:verifier` →
   « N liens contrôlés ».

11. (Lot 13) `php artisan schedule:list` montre `jauges:relever` ;
   `php artisan jauges:relever` → « N jauges relevées ». Avec le compte
   administrateur : Console › Impact s'ouvre, « Télécharger le rapport
   (PDF) » donne un fichier lisible (polices de la marque, une page) ;
   Console › Journal des accès montre « Rapport d'impact exporté (PDF) ».
   Console › Personnel : désactiver un compte de test connecté ailleurs →
   sa page suivante le renvoie à la connexion ; le réactiver.

Puis dérouler les contrôles « bloqués tant que le domaine HTTPS n'existe
pas » de `A_TESTER.md` (vrais téléphones, mode avion, deux profils,
installation, iPhone).

---

## 10. En cas de problème

| Symptôme | Cause probable | Que faire |
|---|---|---|
| Pages blanches, fichiers `/build/…` introuvables, hors ligne qui ne marche plus | `public/hot` présent | `rm public/hot`, puis `php artisan optimize` |
| Chaque navigation recharge la page entière (409) | build et version servie différents | `npm run build`, puis `php artisan optimize` |
| Vitrine lente, `grep data-server-rendered` donne 0 | rendu serveur arrêté, ou `bootstrap/ssr/ssr.js` absent | `sudo supervisorctl status nkaramogo-ssr` ; `npm run build:ssr`, puis `sudo supervisorctl restart nkaramogo-ssr` ; `storage/logs/rendu-serveur.log` |
| Un import d'annale reste « En file » | travailleur arrêté | `sudo supervisorctl status nkaramogo-file`, `sudo supervisorctl restart nkaramogo-file` |
| « En préparation » sur un pack qui ne change pas | travailleur arrêté, ou génération en échec | `php artisan queue:failed`, puis `php artisan packs:generer` |
| Un pack téléchargé n'est pas mis à jour après une correction | travailleur avec l'ancien code | `php artisan queue:restart` |
| Hors ligne indisponible, pas de bouton « Installer » | pas de HTTPS, ou certificat invalide | vérifier le certificat ; le service worker exige HTTPS |
| Erreur « No application encryption key » | `APP_KEY` vide | restaurer la clé sauvegardée (§ 7) ; ne **jamais** en régénérer une nouvelle en production : toutes les sessions tombent |
| Les élèves sont déconnectés à chaque visite | `SESSION_SECURE_COOKIE=true` sans HTTPS, ou `APP_URL` en `http://` | corriger `.env`, puis `php artisan optimize` |
| L'explication du tuteur arrive d'un bloc, après un long blanc | flux retenu par Nginx ou par un proxy (CDN) | `curl -N -i …/eleve/tuteur/demandes` doit montrer `X-Accel-Buffering: no` ; ne pas mettre `text/event-stream` dans `gzip_types` ; sur le CDN, ne pas mettre en cache ni compresser `/eleve/tuteur/*` |
| « Le tuteur n'est pas encore ouvert sur la plateforme » | `ANTHROPIC_API_KEY` vide | renseigner la clé, puis `php artisan optimize` |
| « Le tuteur est momentanément fermé » | clé refusée par l'API (révoquée, crédit épuisé) | console.anthropic.com : clé et facturation ; `storage/logs/laravel.log` (« clé de l'API Claude refusée ») |
| Une modification de `.env` n'est pas prise en compte | configuration en cache | `php artisan optimize` (et `php artisan queue:restart`) |
