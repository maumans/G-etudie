<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel pédagogique (PLAN M3 et § 6) : examens → séries → classes →
 * matières → épreuves (coefficient, durée) → chapitres → notions. Source
 * unique pour les cours, les exercices, les annales, la jauge et l'examen
 * blanc. Les migrations ne sèment rien (ReferentielSeeder).
 *
 * La filière n'a pas de table : c'est l'énumération App\Enums\Filiere
 * (DEVBOOK, écart du lot 1).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annees_scolaires', function (Blueprint $table) {
            $table->id();
            $table->string('libelle', 20)->unique();
            $table->date('debut');
            $table->date('fin');
            $table->boolean('courante')->default(false);
            $table->timestamps();
        });

        Schema::create('examens', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('nom', 120);
            $table->unsignedTinyInteger('ordre');
            $table->timestamps();
        });

        Schema::create('series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->string('code', 10);
            $table->string('nom', 120);
            $table->timestamps();

            $table->unique(['examen_id', 'code']);
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 60)->unique();
            $table->unsignedTinyInteger('ordre');
            // Classe d'examen : 6e année (CEE), 10e année (BEPC), Terminale (Bac).
            $table->foreignId('examen_id')->nullable()->unique()->constrained('examens')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('matieres', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 80)->unique();
            $table->string('slug', 80)->unique();
            $table->string('teinte', 20);
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();
        });

        Schema::create('epreuves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annee_scolaire_id')->constrained('annees_scolaires')->restrictOnDelete();
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->string('filiere', 20);
            // Données officielles : vides tant que l'équipe pédagogique ne les a
            // pas saisies (CLAUDE.md § 5).
            $table->decimal('coefficient', 4, 1)->nullable();
            $table->unsignedSmallInteger('duree_minutes')->nullable();
            // Matière phare (D1) : priorité de rédaction, pas une donnée officielle.
            $table->boolean('phare')->default(false);
            // Une série nulle (CEE, BEPC) ne compte pas dans un index unique
            // MySQL : `cle_unicite` (Epreuve::cleUnicite) la remplace par 0.
            $table->string('cle_unicite', 80)->unique();
            $table->timestamps();
        });

        Schema::create('chapitres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->foreignId('classe_id')->constrained('classes')->restrictOnDelete();
            $table->string('titre', 160);
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['matiere_id', 'classe_id', 'ordre']);
        });

        Schema::create('notions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chapitre_id')->constrained('chapitres')->restrictOnDelete();
            $table->string('titre', 160);
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->boolean('est_exemple')->default(false);
            $table->timestamps();

            $table->index(['chapitre_id', 'ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notions');
        Schema::dropIfExists('chapitres');
        Schema::dropIfExists('epreuves');
        Schema::dropIfExists('matieres');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('series');
        Schema::dropIfExists('examens');
        Schema::dropIfExists('annees_scolaires');
    }
};
