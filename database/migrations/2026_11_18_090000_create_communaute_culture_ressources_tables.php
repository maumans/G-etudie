<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 12 (PLAN M10, M13, M19) : culture générale, ressources externes,
 * communauté encadrée.
 *
 *  - `matieres.transversale` : une matière que tout élève voit, quel que
 *    soit son examen, **hors jauge et hors coefficients** (la culture
 *    générale) ; ses chapitres (des thèmes) n'ont pas de classe
 *    (`chapitres.classe_id` vide, seulement pour elle) ;
 *  - `questions.sources` : d'où vient le fait (M10 : contenu « sourcé ») ;
 *    figé dans la version comme le reste de la question ;
 *  - `seances.culture` : un quiz de culture générale, jamais la séance du
 *    jour (comme la séance d'un devoir, lot 11) ;
 *  - `ressources_externes` : un lien sortant par notion, proposé par un
 *    rédacteur, vérifié par un relecteur différent ;
 *  - `publications_groupe`, `signalements_publications` : le fil de
 *    questions-réponses d'un groupe, et ce que les élèves y signalent ;
 *    `mots_interdits` : refusés à l'envoi ;
 *  - `groupes.fil_ferme_le`, `membres_groupes.muet_jusqu_au` : l'enseignant
 *    ferme le fil, retire la parole à un élève ;
 *  - `devoirs.defi`, `membres_groupes.classement_accepte` : le défi du
 *    groupe, et le classement par pseudo des seuls élèves qui l'acceptent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matieres', function (Blueprint $table) {
            $table->boolean('transversale')->default(false)->after('teinte');
        });

        Schema::table('chapitres', function (Blueprint $table) {
            $table->foreignId('classe_id')->nullable()->change();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->text('sources')->nullable()->after('corrige');
        });

        Schema::table('seances', function (Blueprint $table) {
            $table->boolean('culture')->default(false)->after('devoir_id');
        });

        Schema::create('ressources_externes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('notion_id')->constrained('notions')->cascadeOnDelete();
            $table->string('url', 500);
            $table->string('domaine', 120);
            $table->string('titre', 160);
            $table->string('type', 20);
            $table->string('description', 300)->nullable();
            $table->unsignedInteger('poids_ko')->nullable();
            $table->unsignedSmallInteger('duree_minutes')->nullable();
            $table->string('statut', 20);
            $table->foreignId('auteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verifiee_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verifiee_le')->nullable();
            $table->string('motif_retrait', 300)->nullable();
            $table->timestamp('lien_casse_le')->nullable();
            $table->timestamp('controle_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['notion_id', 'statut']);
            $table->index(['statut', 'controle_le']);
        });

        Schema::create('mots_interdits', function (Blueprint $table) {
            $table->id();
            $table->string('mot', 60)->unique();
            $table->foreignId('ajoute_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('groupes', function (Blueprint $table) {
            $table->timestamp('fil_ferme_le')->nullable()->after('archive_le');
        });

        Schema::table('membres_groupes', function (Blueprint $table) {
            $table->timestamp('muet_jusqu_au')->nullable()->after('retire_par');
            $table->boolean('classement_accepte')->default(false)->after('muet_jusqu_au');
        });

        Schema::table('devoirs', function (Blueprint $table) {
            $table->boolean('defi')->default(false)->after('consigne');
        });

        Schema::create('publications_groupe', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('groupe_id')->constrained('groupes')->cascadeOnDelete();
            $table->foreignId('auteur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('publications_groupe')->cascadeOnDelete();
            $table->foreignId('matiere_id')->nullable()->constrained('matieres')->nullOnDelete();
            $table->text('texte');
            $table->timestamp('masquee_le')->nullable();
            $table->foreignId('masquee_par')->nullable()->constrained('users')->nullOnDelete();
            $table->string('masquage', 20)->nullable();
            $table->timestamp('signalements_vus_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['groupe_id', 'parent_id', 'created_at']);
            $table->index(['auteur_id', 'created_at']);
        });

        Schema::create('signalements_publications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained('publications_groupe')->cascadeOnDelete();
            $table->foreignId('auteur_id')->constrained('users')->cascadeOnDelete();
            $table->string('motif', 30);
            $table->timestamps();

            $table->unique(['publication_id', 'auteur_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signalements_publications');
        Schema::dropIfExists('publications_groupe');

        Schema::table('devoirs', function (Blueprint $table) {
            $table->dropColumn('defi');
        });

        Schema::table('membres_groupes', function (Blueprint $table) {
            $table->dropColumn(['muet_jusqu_au', 'classement_accepte']);
        });

        Schema::table('groupes', function (Blueprint $table) {
            $table->dropColumn('fil_ferme_le');
        });

        Schema::dropIfExists('mots_interdits');
        Schema::dropIfExists('ressources_externes');

        Schema::table('seances', function (Blueprint $table) {
            $table->dropColumn('culture');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('sources');
        });

        Schema::table('chapitres', function (Blueprint $table) {
            $table->foreignId('classe_id')->nullable(false)->change();
        });

        Schema::table('matieres', function (Blueprint $table) {
            $table->dropColumn('transversale');
        });
    }
};
