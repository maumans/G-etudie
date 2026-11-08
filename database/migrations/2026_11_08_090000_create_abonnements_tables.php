<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 9 (PLAN M16) : abonnements, paiements par mobile money, codes prépayés.
 *
 *  - `paiements` : un paiement par mobile money (Orange Money, MTN MoMo), du
 *    lancement à la confirmation par l'opérateur. Le numéro du payeur est
 *    chiffré (PLAN § 10 : aucun numéro de compte en clair) ;
 *  - `notifications_paiement` : chaque webhook reçu, une fois. L'unicité
 *    (passerelle, identifiant d'événement) rend le traitement idempotent ;
 *  - `lots_codes`, `codes_acces` : codes prépayés vendus en librairie ou par
 *    des revendeurs. Seule l'**empreinte** du code est gardée ; les codes en
 *    clair d'un lot attendent, chiffrés, que l'administrateur les ait remis ;
 *  - `abonnements` : une période d'abonnement, et sa source. `paiement_id`
 *    et `code_acces_id` sont uniques : un paiement ou un code ne crée jamais
 *    deux abonnements, même rejoué (critère du lot 9) ;
 *  - `sujets.corrige_libre` : le corrigé détaillé de cette annale est ouvert
 *    à tous (case cochée par l'équipe ; la session la plus récente de chaque
 *    épreuve l'est d'office, App\Support\DroitsAbonne) ;
 *  - `pack_elements.variante` et `packs.version_libre` : le pack d'un élève
 *    non abonné ne contient pas les corrigés réservés (variante « libre »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('formule', 20);
            $table->unsignedInteger('montant_gnf');
            $table->string('moyen', 20);
            $table->string('passerelle', 30);
            // Chiffré (cast `encrypted`) ; les deux derniers chiffres seuls à l'écran.
            $table->text('numero_payeur');
            $table->char('numero_fin', 2);
            $table->string('reference_operateur', 120)->nullable()->unique();
            $table->string('statut', 20);
            $table->string('motif_echec', 255)->nullable();
            $table->text('url_paiement')->nullable();
            $table->timestamp('initie_le');
            $table->timestamp('conclu_le')->nullable();
            $table->timestamp('expire_le');
            $table->timestamps();

            $table->index(['user_id', 'initie_le']);
            $table->index(['statut', 'initie_le']);
        });

        Schema::create('notifications_paiement', function (Blueprint $table) {
            $table->id();
            $table->string('passerelle', 30);
            $table->string('identifiant_evenement', 120);
            $table->foreignId('paiement_id')->nullable()->constrained('paiements')->nullOnDelete();
            $table->json('charge');
            $table->string('resultat', 40)->nullable();
            $table->timestamp('recu_le');
            $table->timestamp('traite_le')->nullable();

            $table->unique(['passerelle', 'identifiant_evenement'], 'notifications_paiement_unicite');
        });

        Schema::create('lots_codes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('libelle', 120);
            $table->string('formule', 20);
            $table->unsignedInteger('quantite');
            $table->string('revendeur', 120)->nullable();
            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            // Les codes en clair, chiffrés, jusqu'à ce qu'ils soient remis.
            $table->longText('codes_en_attente')->nullable();
            $table->timestamp('codes_remis_le')->nullable();
            $table->timestamp('desactive_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();
        });

        Schema::create('codes_acces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_id')->constrained('lots_codes')->cascadeOnDelete();
            $table->char('empreinte', 64)->unique();
            $table->char('fin', 4);
            $table->foreignId('utilise_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('utilise_le')->nullable();

            $table->index(['lot_id', 'utilise_le']);
        });

        Schema::create('abonnements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('formule', 20);
            $table->timestamp('debut');
            $table->timestamp('fin');
            $table->string('source', 20);
            $table->foreignId('paiement_id')->nullable()->unique()->constrained('paiements')->restrictOnDelete();
            $table->foreignId('code_acces_id')->nullable()->unique()->constrained('codes_acces')->restrictOnDelete();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'fin']);
        });

        Schema::table('sujets', function (Blueprint $table) {
            $table->boolean('corrige_libre')->default(false)->after('droits');
        });

        Schema::table('pack_elements', function (Blueprint $table) {
            $table->string('variante', 10)->default('commun')->after('cle');
        });

        Schema::table('pack_elements', function (Blueprint $table) {
            $table->unique(['pack_id', 'cle', 'variante'], 'pack_elements_unicite');
        });

        Schema::table('pack_elements', function (Blueprint $table) {
            $table->dropUnique(['pack_id', 'cle']);
        });

        Schema::table('packs', function (Blueprint $table) {
            $table->char('version_libre', 16)->nullable()->after('version');
            $table->unsignedInteger('taille_libre')->default(0)->after('taille_sans_images');
        });
    }

    public function down(): void
    {
        Schema::table('packs', function (Blueprint $table) {
            $table->dropColumn(['version_libre', 'taille_libre']);
        });

        Schema::table('pack_elements', function (Blueprint $table) {
            $table->unique(['pack_id', 'cle']);
        });

        Schema::table('pack_elements', function (Blueprint $table) {
            $table->dropUnique('pack_elements_unicite');
            $table->dropColumn('variante');
        });

        Schema::table('sujets', function (Blueprint $table) {
            $table->dropColumn('corrige_libre');
        });

        Schema::dropIfExists('abonnements');
        Schema::dropIfExists('codes_acces');
        Schema::dropIfExists('lots_codes');
        Schema::dropIfExists('notifications_paiement');
        Schema::dropIfExists('paiements');
    }
};
