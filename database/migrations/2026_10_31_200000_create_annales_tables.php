<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 4 : annales (PLAN M6), import assisté (M17) et signalements (M5, M17).
 *
 *  - `sujets` suit le circuit des leçons et des questions (brouillon → en
 *    relecture → publié) ; une version fige la structure (parties, ordre des
 *    questions). Rattaché à l'examen, la série, la filière et la matière —
 *    pas à une ligne `epreuves`, propre à une année scolaire : un sujet de
 *    2015 reste un sujet de 2015. Durée et coefficient : ceux **imprimés sur
 *    le document**, vides sinon (CLAUDE.md § 5) ;
 *  - `sujet_parties` : les exercices du sujet ; leurs questions sont des
 *    `questions` ordinaires (`source = annale`), qui alimentent aussi les
 *    séances (M5) ;
 *  - `imports_sujets` : un document téléversé et ce qu'en a tiré l'IA ;
 *  - `signalements` : « Signaler une erreur », par la file
 *    (`signalement.creer`, HORS_LIGNE.md A.6) ; l'`uuid` est celui de
 *    l'opération.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sujets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->string('filiere', 20);
            $table->unsignedSmallInteger('session');
            // `officiel` (annale) ou `blanc_maison` (sujet écrit par l'équipe).
            $table->string('type', 20);
            $table->string('titre', 160);
            $table->unsignedSmallInteger('duree_minutes')->nullable();
            $table->string('coefficient', 10)->nullable();
            // Référence de l'autorisation de publier (D5) ; vide pendant le test fermé.
            $table->string('droits', 255)->nullable();
            $table->string('document_chemin')->nullable();
            $table->string('document_nom', 255)->nullable();
            $table->string('document_type', 60)->nullable();
            $table->unsignedInteger('document_octets')->nullable();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('statut', 20);
            $table->unsignedInteger('revision')->default(0);
            $table->unsignedBigInteger('version_publiee_id')->nullable();
            $table->timestamp('publie_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->foreign('version_publiee_id')->references('id')->on('versions_contenu')->nullOnDelete();
            $table->index(['examen_id', 'matiere_id', 'session']);
        });

        Schema::create('sujet_parties', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('sujet_id')->constrained('sujets')->cascadeOnDelete();
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->string('titre', 160);
            // Points de la partie, tels qu'imprimés (« Exercice 1 (4 points) »).
            $table->decimal('bareme', 5, 2)->nullable();
            $table->json('consigne');
            $table->timestamps();

            $table->index(['sujet_id', 'ordre']);
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->foreignId('sujet_partie_id')->nullable()->after('notion_id')->constrained('sujet_parties')->restrictOnDelete();
            $table->unsignedSmallInteger('ordre_sujet')->default(0)->after('sujet_partie_id');
            // Réponse et corrigé proposés par l'IA, pas encore vérifiés par un
            // rédacteur : le sujet ne part pas en relecture tant qu'il en reste.
            $table->boolean('reponse_a_verifier')->default(false)->after('corrige');
        });

        Schema::create('imports_sujets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('auteur_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->string('filiere', 20);
            $table->unsignedSmallInteger('session');
            $table->string('type', 20);
            $table->string('document_chemin');
            $table->string('document_nom', 255);
            $table->string('document_type', 60);
            $table->unsignedInteger('document_octets');
            $table->string('statut', 20);
            $table->string('extracteur', 20);
            $table->string('modele', 60)->nullable();
            $table->text('erreur')->nullable();
            $table->json('avertissements')->nullable();
            $table->unsignedInteger('jetons_entree')->nullable();
            $table->unsignedInteger('jetons_sortie')->nullable();
            $table->foreignId('sujet_id')->nullable()->constrained('sujets')->nullOnDelete();
            $table->timestamp('commence_le')->nullable();
            $table->timestamp('termine_le')->nullable();
            $table->timestamps();

            $table->index(['statut', 'created_at']);
        });

        Schema::create('signalements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('cible_type', 20);
            $table->unsignedBigInteger('cible_id');
            // Version vue par l'élève (question, leçon ou sujet publiés).
            $table->unsignedInteger('version')->nullable();
            $table->string('motif', 30);
            $table->text('message')->nullable();
            $table->string('statut', 20);
            $table->text('reponse')->nullable();
            $table->foreignId('traite_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('traite_le')->nullable();
            $table->timestamp('reponse_vue_le')->nullable();
            $table->timestamp('saisi_le', 3);
            $table->timestamp('recu_le', 3);
            $table->timestamps();

            $table->index(['cible_type', 'cible_id']);
            $table->index(['user_id', 'saisi_le']);
            $table->index(['statut', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signalements');
        Schema::dropIfExists('imports_sujets');

        Schema::table('questions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sujet_partie_id');
            $table->dropColumn(['ordre_sujet', 'reponse_a_verifier']);
        });

        Schema::dropIfExists('sujet_parties');
        Schema::dropIfExists('sujets');
    }
};
