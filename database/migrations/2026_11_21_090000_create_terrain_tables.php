<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 14 (PLAN § 12, « Terrain ») : ce qui rend un essai avec de vrais
 * élèves utile et mesurable.
 *
 *  - `campagnes_terrain` : un essai (nom, lieu, établissement facultatif,
 *    dates). La console filtre avis, diagnostics et erreurs par campagne ;
 *  - `avis_eleves` : « Ton avis » — Oui / Un peu / Non, des étiquettes, un
 *    commentaire court filtré. Rattaché au compte (vu par la plateforme
 *    seulement, jamais par un établissement). `uuid` = celui de l'opération
 *    (`avis.donner`). `traite_le` + `decision` : la « prise en compte » ;
 *  - `diagnostics_appareil` : l'état d'un appareil envoyé à la demande
 *    (`diagnostic.envoyer`), retrouvé par son **code court** que l'équipe de
 *    terrain note sur sa fiche. Rien de personnel dans `donnees` ;
 *  - `erreurs_appareil` : les erreurs captées sur les appareils
 *    (`erreurs.signaler`), regroupées par empreinte. Rattachées au dernier
 *    appareil qui l'a vue, jamais à un élève.
 *
 * Diagnostics et erreurs sont effacés après 90 jours, les avis après un an
 * (`terrain:purger`, chaque nuit).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campagnes_terrain', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 120);
            $table->string('lieu', 120);
            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements')->nullOnDelete();
            $table->date('debut');
            $table->date('fin');
            $table->string('notes', 1000)->nullable();
            $table->foreignId('creee_par')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index('debut');
        });

        Schema::create('avis_eleves', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('appareil_id')->nullable()->constrained('appareils')->nullOnDelete();
            $table->string('ecran', 40);
            $table->string('reponse', 10);
            $table->json('etiquettes');
            $table->string('commentaire', 300)->nullable();
            $table->string('version_app', 64)->nullable();
            $table->dateTime('donne_le');
            $table->dateTime('traite_le')->nullable();
            $table->foreignId('traite_par')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decision', 500)->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index('donne_le');
            $table->index(['user_id', 'donne_le']);
        });

        Schema::create('diagnostics_appareil', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('code', 8)->index();
            $table->foreignId('appareil_id')->nullable()->constrained('appareils')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('donnees');
            $table->string('version_app', 64)->nullable();
            $table->dateTime('releve_le');
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index('releve_le');
        });

        Schema::create('erreurs_appareil', function (Blueprint $table) {
            $table->id();
            $table->char('empreinte', 40)->unique();
            $table->string('type', 12);
            $table->string('message', 500);
            $table->string('source', 300)->nullable();
            $table->text('pile')->nullable();
            $table->string('version_app', 64)->nullable();
            $table->string('navigateur', 60)->nullable();
            $table->unsignedInteger('occurrences')->default(1);
            $table->foreignId('dernier_appareil_id')->nullable()->constrained('appareils')->nullOnDelete();
            $table->dateTime('premiere_le');
            $table->dateTime('derniere_le');
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index('derniere_le');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('erreurs_appareil');
        Schema::dropIfExists('diagnostics_appareil');
        Schema::dropIfExists('avis_eleves');
        Schema::dropIfExists('campagnes_terrain');
    }
};
