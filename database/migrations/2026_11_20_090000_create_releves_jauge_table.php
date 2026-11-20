<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 13 (PLAN M18, « Impact ») : la console plateforme.
 *
 *  - `releves_jauge` : la jauge de chaque élève, relevée une fois par
 *    semaine (`jauges:relever`, le dimanche soir). La jauge est recalculée
 *    à chaque fois depuis les maîtrises : sans relevé, son évolution ne se
 *    lit nulle part. Examen, série et établissement y sont recopiés au jour
 *    du relevé (un élève qui change d'examen ne réécrit pas son passé).
 *    `semaine` est le lundi de la semaine relevée ;
 *  - `profils_eleves.est_exemple` : un élève fictif des données de
 *    démonstration — la console affiche le bandeau « EXEMPLE » dès qu'il en
 *    entre un dans ses chiffres.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('releves_jauge', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('semaine');
            $table->unsignedTinyInteger('pourcentage');
            $table->foreignId('examen_id')->constrained('examens')->restrictOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->restrictOnDelete();
            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'semaine']);
            $table->index('semaine');
        });

        Schema::table('profils_eleves', function (Blueprint $table) {
            $table->boolean('est_exemple')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('profils_eleves', function (Blueprint $table) {
            $table->dropColumn('est_exemple');
        });

        Schema::dropIfExists('releves_jauge');
    }
};
