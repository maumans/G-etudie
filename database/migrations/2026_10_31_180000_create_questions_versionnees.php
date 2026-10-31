<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 3 : le moteur de questions (PLAN M5, HORS_LIGNE.md A.9).
 *
 *  - `questions` suit le circuit des leçons (M17) : les colonnes portent le
 *    brouillon de travail ; chaque envoi en relecture fige une version dans
 *    `versions_contenu` (énoncé, données, réponse, indices et corrigé
 *    ensemble) ; `version_publiee_id` est ce que voit l'élève. `version`
 *    (lot 2) disparaît : le numéro vu est celui de la version publiée ;
 *    `explication` devient la première étape du `corrige` pas à pas ;
 *  - `tentatives` reçoit un **score** de 0 à 100 (juste seulement à 100) ;
 *    `correcte` est vide tant qu'une question ouverte n'est pas
 *    auto-évaluée (`criteres`, `auto_evaluee_le`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            // Vide pour les questions semées avant le lot 3.
            $table->foreignId('auteur_id')->nullable()->after('notion_id')->constrained('users')->restrictOnDelete();
            // Le début de l'énoncé en texte : listes et recherche du back-office.
            $table->string('extrait', 160)->default('')->after('type');
            $table->json('indices')->nullable()->after('reponse_attendue');
            $table->json('corrige')->nullable()->after('indices');
            // `maison` ; `annale` au lot 4 (sujet et partie d'origine).
            $table->string('source', 20)->default('maison')->after('difficulte');
            $table->unsignedInteger('revision')->default(0)->after('statut');
            $table->unsignedBigInteger('version_publiee_id')->nullable()->after('revision');
            $table->timestamp('publie_le')->nullable()->after('version_publiee_id');

            $table->foreign('version_publiee_id')->references('id')->on('versions_contenu')->nullOnDelete();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['explication', 'version']);
        });

        Schema::table('tentatives', function (Blueprint $table) {
            $table->boolean('correcte')->nullable()->change();
            $table->unsignedTinyInteger('score')->nullable()->after('correcte');
            $table->json('criteres')->nullable()->after('score');
            $table->timestamp('auto_evaluee_le', 3)->nullable()->after('criteres');
        });
    }

    public function down(): void
    {
        Schema::table('tentatives', function (Blueprint $table) {
            $table->dropColumn(['score', 'criteres', 'auto_evaluee_le']);
            $table->boolean('correcte')->nullable(false)->change();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->json('explication')->nullable();
            $table->unsignedInteger('version')->default(1);
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['version_publiee_id']);
            $table->dropConstrainedForeignId('auteur_id');
            $table->dropColumn(['extrait', 'indices', 'corrige', 'source', 'revision', 'version_publiee_id', 'publie_le']);
        });
    }
};
