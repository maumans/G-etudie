<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 11 (PLAN M14, M15) : parents, enseignants, établissements, devoirs.
 *
 *  - `liens_parents` : un parent suit un enfant (lecture seule, et paiement
 *    de son abonnement). Le lien naît d'un **code de liaison** que l'élève
 *    donne lui-même (`codes_liaison`, seule l'empreinte est gardée, 24 h) :
 *    c'est l'élève qui consent. Révoqué, il reste daté (`revoque_le`) ;
 *  - `rattachements_etablissement` : un gestionnaire ou un enseignant
 *    rattaché à un établissement (DEVBOOK § 7) ;
 *  - `groupes` : la classe d'un enseignant, pour un examen, une série et une
 *    filière (les questions des devoirs en viennent) ; on la rejoint par un
 *    **code de groupe** que l'enseignant annonce en classe ;
 *  - `membres_groupes` : élève ↔ groupe ; quitter ou être retiré date la
 *    ligne (`quitte_le`), rejoindre de nouveau la rouvre ;
 *  - `devoirs`, `devoirs_questions` : une série de questions publiées, avec
 *    une échéance. **Le rendu est une séance** (`seances.devoir_id`, une
 *    par élève et par devoir) : les réponses passent par la file
 *    d'opérations comme toutes les autres (HORS_LIGNE.md A.6) ;
 *  - `licences_etablissement` : des places d'abonnement achetées par une
 *    école (contrat hors application), que son gestionnaire attribue ;
 *    l'abonnement ainsi ouvert porte `licence_id` ;
 *  - `paiements.beneficiaire_id` : le parent paie l'abonnement de son
 *    enfant (lot 9 : « parents payeurs ») ;
 *  - `etablissements.est_exemple` : l'établissement de démonstration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('etablissements', function (Blueprint $table) {
            $table->boolean('est_exemple')->default(false);
        });

        Schema::create('liens_parents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('eleve_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('lie_le');
            $table->timestamp('revoque_le')->nullable();
            $table->timestamps();

            $table->unique(['parent_id', 'eleve_id']);
            $table->index(['eleve_id', 'revoque_le']);
        });

        Schema::create('codes_liaison', function (Blueprint $table) {
            $table->id();
            $table->foreignId('eleve_id')->constrained('users')->cascadeOnDelete();
            $table->char('empreinte', 64)->index();
            $table->timestamp('expire_le');
            $table->foreignId('utilise_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('utilise_le')->nullable();
            $table->timestamps();

            $table->index(['eleve_id', 'utilise_le']);
        });

        Schema::create('rattachements_etablissement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('etablissement_id')->constrained('etablissements')->cascadeOnDelete();
            $table->string('role', 40);
            $table->timestamp('rattache_le');
            $table->timestamp('retire_le')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'etablissement_id']);
            $table->index(['etablissement_id', 'role', 'retire_le'], 'rattachements_etab_role');
        });

        Schema::create('groupes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enseignant_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements')->nullOnDelete();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->string('filiere', 20);
            $table->foreignId('classe_id')->constrained('classes')->restrictOnDelete();
            $table->string('nom', 80);
            $table->string('code', 8)->unique();
            $table->timestamp('archive_le')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['enseignant_id', 'archive_le']);
            $table->index(['etablissement_id', 'archive_le']);
        });

        Schema::create('membres_groupes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('groupe_id')->constrained('groupes')->cascadeOnDelete();
            $table->foreignId('eleve_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('rejoint_le');
            $table->timestamp('quitte_le')->nullable();
            $table->foreignId('retire_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['groupe_id', 'eleve_id']);
            $table->index(['eleve_id', 'quitte_le']);
        });

        Schema::create('devoirs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('groupe_id')->constrained('groupes')->cascadeOnDelete();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('titre', 120);
            $table->text('consigne')->nullable();
            $table->timestamp('echeance_le');
            $table->timestamp('publie_le');
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['groupe_id', 'echeance_le']);
        });

        Schema::create('devoirs_questions', function (Blueprint $table) {
            $table->foreignId('devoir_id')->constrained('devoirs')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->restrictOnDelete();
            $table->unsignedSmallInteger('ordre');

            $table->primary(['devoir_id', 'question_id']);
        });

        Schema::table('seances', function (Blueprint $table) {
            $table->foreignId('devoir_id')->nullable()->after('matiere_id')->constrained('devoirs')->nullOnDelete();
            $table->unique(['devoir_id', 'user_id']);
        });

        Schema::create('licences_etablissement', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etablissement_id')->constrained('etablissements')->cascadeOnDelete();
            $table->unsignedInteger('places');
            $table->timestamp('debut');
            $table->timestamp('fin');
            $table->string('reference', 120)->nullable();
            $table->foreignId('cree_par')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['etablissement_id', 'fin']);
        });

        Schema::table('abonnements', function (Blueprint $table) {
            $table->foreignId('licence_id')->nullable()->after('code_acces_id')->constrained('licences_etablissement')->restrictOnDelete();
            $table->index(['licence_id', 'fin']);
        });

        Schema::table('paiements', function (Blueprint $table) {
            $table->foreignId('beneficiaire_id')->nullable()->after('user_id')->constrained('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('beneficiaire_id');
        });

        Schema::table('abonnements', function (Blueprint $table) {
            $table->dropForeign(['licence_id']);
            $table->dropIndex(['licence_id', 'fin']);
            $table->dropColumn('licence_id');
        });

        Schema::dropIfExists('licences_etablissement');

        Schema::table('seances', function (Blueprint $table) {
            $table->dropForeign(['devoir_id']);
            $table->dropUnique(['devoir_id', 'user_id']);
            $table->dropColumn('devoir_id');
        });

        Schema::dropIfExists('devoirs_questions');
        Schema::dropIfExists('devoirs');
        Schema::dropIfExists('membres_groupes');
        Schema::dropIfExists('groupes');
        Schema::dropIfExists('rattachements_etablissement');
        Schema::dropIfExists('codes_liaison');
        Schema::dropIfExists('liens_parents');

        Schema::table('etablissements', function (Blueprint $table) {
            $table->dropColumn('est_exemple');
        });
    }
};
