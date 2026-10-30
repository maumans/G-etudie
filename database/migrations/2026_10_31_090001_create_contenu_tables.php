<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Leçons et historique des versions (PLAN M4, M17). Une version est figée à
 * chaque envoi en relecture ; la décision du relecteur s'y inscrit. La leçon
 * garde son brouillon de travail et pointe vers la version publiée, celle que
 * voit l'élève, même pendant qu'un nouveau brouillon est en cours.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecons', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('notion_id')->constrained('notions')->restrictOnDelete();
            $table->string('titre', 160);
            $table->string('statut', 20)->index();
            // Auteur : celui qui l'a créée ; il ne peut jamais la relire.
            $table->foreignId('auteur_id')->constrained('users')->restrictOnDelete();
            $table->json('brouillon');
            // Verrou optimiste : deux onglets ne s'écrasent pas en silence.
            $table->unsignedInteger('revision')->default(0);
            $table->unsignedBigInteger('version_publiee_id')->nullable();
            $table->timestamp('publie_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();
        });

        Schema::create('versions_contenu', function (Blueprint $table) {
            $table->id();
            $table->morphs('contenu');
            $table->unsignedInteger('numero');
            $table->string('titre', 160);
            $table->json('blocs');
            // Celui qui l'a envoyée en relecture (le responsable pédagogique
            // peut le faire sur le brouillon d'un autre) : il ne peut pas la relire.
            $table->foreignId('auteur_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('soumise_le');
            $table->string('decision', 20)->nullable();
            $table->foreignId('decide_par_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('decide_le')->nullable();
            $table->text('commentaire')->nullable();
            $table->timestamps();

            $table->unique(['contenu_type', 'contenu_id', 'numero']);
        });

        Schema::table('lecons', function (Blueprint $table) {
            $table->foreign('version_publiee_id')->references('id')->on('versions_contenu')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lecons', function (Blueprint $table) {
            $table->dropForeign(['version_publiee_id']);
        });
        Schema::dropIfExists('versions_contenu');
        Schema::dropIfExists('lecons');
    }
};
