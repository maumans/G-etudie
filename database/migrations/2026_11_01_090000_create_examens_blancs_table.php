<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 5 : l'examen blanc (PLAN M7, HORS_LIGNE.md A.8, HL3).
 *
 *  - `examens_blancs` : un examen passé sur une annale publiée, en
 *    « conditions réelles ». Il vit sur l'appareil pendant le passage
 *    (Dexie) et n'arrive ici qu'à la fin, par `examen_blanc.terminer` :
 *    l'`uuid` est celui de l'examen, créé sur l'appareil (v7). La note du
 *    serveur fait foi (recorrection contre les versions vues) ;
 *  - `examens.moyenne_admission` : saisie par l'équipe pédagogique, vide
 *    tant qu'elle ne l'est pas (aucune règle officielle inventée) ;
 *  - `tentatives.mode` prend la valeur `examen_blanc` (colonne texte).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examens_blancs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sujet_id')->constrained('sujets')->restrictOnDelete();
            // Numéro de la version de l'annale que l'élève a passée.
            $table->unsignedInteger('version');
            $table->string('mode', 30);
            $table->unsignedSmallInteger('duree_minutes');
            // D'où vient la durée : imprimée, épreuve, ou choisie par l'élève.
            $table->string('origine_duree', 20);
            $table->timestamp('commence_le', 3);
            $table->timestamp('termine_le', 3);
            $table->boolean('temps_ecoule')->default(false);
            $table->decimal('note_sur_20', 5, 2);
            // Note calculée par l'appareil : un écart avec celle du serveur
            // est expliqué à l'élève.
            $table->decimal('note_appareil', 5, 2)->nullable();
            $table->json('details');
            $table->boolean('horloge_suspecte')->default(false);
            $table->string('motif_horloge', 255)->nullable();
            $table->timestamp('recu_le', 3);
            $table->timestamps();

            $table->index(['user_id', 'termine_le']);
        });

        Schema::table('examens', function (Blueprint $table) {
            $table->decimal('moyenne_admission', 4, 2)->nullable()->after('date_prochaine_session');
        });
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn('moyenne_admission');
        });

        Schema::dropIfExists('examens_blancs');
    }
};
