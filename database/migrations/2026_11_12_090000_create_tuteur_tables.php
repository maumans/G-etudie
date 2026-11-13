<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 10 (PLAN M11, § 6 : `conversations_tuteur`, `messages_tuteur` « avec
 * jetons consommés et coût ») : le tuteur N'karamögö.
 *
 *  - une conversation part d'un objet de notre contenu (une question, une
 *    étape de son corrigé) ou d'une question libre dans une matière de
 *    l'élève ;
 *  - chaque message du tuteur garde son modèle, ses jetons, son coût (en
 *    micro-dollars), le temps avant le premier mot, et s'il compte dans le
 *    quota du jour ;
 *  - `explications_tuteur` : la première explication d'un même objet, servie
 *    de nouveau sans appel (PLAN M11 : « mise en cache des explications
 *    identiques »). La clé contient la version : un corrigé republié en
 *    appelle une nouvelle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations_tuteur', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('objet', 20);
            $table->foreignId('question_id')->nullable()->constrained('questions')->nullOnDelete();
            $table->unsignedSmallInteger('version')->nullable();
            $table->unsignedTinyInteger('etape')->nullable();
            $table->foreignId('matiere_id')->nullable()->constrained('matieres')->nullOnDelete();
            $table->foreignId('notion_id')->nullable()->constrained('notions')->nullOnDelete();
            // La réponse que l'élève avait donnée (format de FormatQuestion),
            // relue à chaque relance ; nettoyée (Confidentialite) avant d'être gardée.
            $table->json('reponse')->nullable();
            $table->string('titre', 160);
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['question_id', 'version']);
        });

        Schema::create('messages_tuteur', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('conversation_id')->constrained('conversations_tuteur')->cascadeOnDelete();
            // Copié de la conversation : le quota du jour se lit sans jointure.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 10);
            $table->string('demande', 20);
            $table->text('texte');
            $table->string('statut', 20)->nullable();
            $table->string('modele', 60)->nullable();
            $table->unsignedInteger('jetons_entree')->default(0);
            $table->unsignedInteger('jetons_sortie')->default(0);
            $table->unsignedInteger('jetons_cache_lus')->default(0);
            $table->unsignedInteger('jetons_cache_ecrits')->default(0);
            $table->unsignedBigInteger('cout_micro_usd')->default(0);
            $table->unsignedInteger('premier_mot_ms')->nullable();
            $table->unsignedInteger('duree_ms')->nullable();
            $table->boolean('depuis_cache')->default(false);
            $table->boolean('compte')->default(false);
            $table->timestamp('signale_le')->nullable();
            $table->string('signale_motif', 30)->nullable();
            // Le back-office a lu le signalement (et corrigé ce qu'il fallait).
            $table->timestamp('signalement_classe_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'compte', 'created_at']);
            $table->index(['role', 'created_at']);
            $table->index('signale_le');
        });

        Schema::create('explications_tuteur', function (Blueprint $table) {
            $table->id();
            $table->string('cle', 64)->unique();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->unsignedSmallInteger('version');
            $table->string('demande', 20);
            $table->unsignedTinyInteger('etape')->nullable();
            $table->text('texte');
            $table->string('modele', 60);
            $table->unsignedInteger('servie')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('explications_tuteur');
        Schema::dropIfExists('messages_tuteur');
        Schema::dropIfExists('conversations_tuteur');
    }
};
