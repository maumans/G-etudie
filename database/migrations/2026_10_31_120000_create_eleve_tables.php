<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 2 : l'élève (PLAN § 6, « Élève et apprentissage »).
 *
 *  - `examens.date_prochaine_session` : saisie par le responsable
 *    pédagogique, jamais semée (CLAUDE.md § 5) ; vide = « pas encore
 *    annoncée » ;
 *  - `etablissements` : liste à constituer (vide tant qu'elle n'est pas
 *    fournie ; le parcours d'accueil saute alors l'étape) ;
 *  - `profils_eleves` : examen, série, filière, classe, objectif du soir ;
 *  - `progressions_lecons` : « compris / à revoir » et position de lecture,
 *    chaque champ daté de sa saisie (la plus récente gagne, HORS_LIGNE.md A.6) ;
 *  - `questions` : QCM à une réponse au lot 2, conçue pour tous les types du
 *    lot 3 ;
 *  - `seances`, `tentatives` : la séance du jour et les réponses (ajout
 *    seulement), reçues par la file d'opérations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->date('date_prochaine_session')->nullable()->after('ordre');
        });

        Schema::create('etablissements', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 160);
            $table->string('type', 20);
            $table->string('prefecture', 80)->nullable();
            $table->string('commune', 80)->nullable();
            $table->string('region', 80)->nullable();
            $table->timestamps();

            $table->index('nom');
        });

        Schema::create('profils_eleves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->string('filiere', 20);
            $table->foreignId('classe_id')->constrained('classes')->restrictOnDelete();
            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements')->nullOnDelete();
            $table->unsignedTinyInteger('objectif_minutes');
            $table->timestamps();
        });

        Schema::create('progressions_lecons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lecon_id')->constrained('lecons')->cascadeOnDelete();
            $table->string('etat', 20)->nullable();
            $table->timestamp('etat_saisi_le', 3)->nullable();
            $table->unsignedTinyInteger('position')->default(0);
            $table->timestamp('position_saisie_le', 3)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'lecon_id']);
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('notion_id')->constrained('notions')->restrictOnDelete();
            $table->string('type', 30);
            $table->json('enonce');
            $table->json('donnees');
            $table->json('reponse_attendue');
            $table->json('explication')->nullable();
            $table->unsignedTinyInteger('difficulte')->default(2);
            $table->string('statut', 20)->index();
            $table->unsignedInteger('version')->default(1);
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();
        });

        Schema::create('seances', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('jour');
            $table->json('questions');
            $table->unsignedTinyInteger('duree_minutes');
            $table->timestamp('genere_le');
            $table->timestamp('termine_le', 3)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'jour']);
        });

        Schema::create('tentatives', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->foreignId('seance_id')->nullable()->constrained('seances')->nullOnDelete();
            $table->string('mode', 20);
            $table->json('reponse');
            $table->boolean('correcte');
            $table->unsignedSmallInteger('duree_secondes')->nullable();
            $table->unsignedTinyInteger('indices_utilises')->default(0);
            $table->timestamp('saisi_le', 3);
            $table->timestamp('recu_le', 3);
            $table->timestamps();

            $table->index(['user_id', 'saisi_le']);
            $table->index(['user_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tentatives');
        Schema::dropIfExists('seances');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('progressions_lecons');
        Schema::dropIfExists('profils_eleves');
        Schema::dropIfExists('etablissements');

        Schema::table('examens', function (Blueprint $table) {
            $table->dropColumn('date_prochaine_session');
        });
    }
};
