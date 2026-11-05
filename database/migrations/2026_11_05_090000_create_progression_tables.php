<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 6 : progression et motivation (PLAN M8, M9, § 6).
 *
 *  - `maitrises` : la maîtrise d'un élève sur une notion (0 à 100), son
 *    palier de révision espacée et la date où elle revient. **Recalculée à
 *    partir de toutes ses réponses** par App\Services\MaitriseService, seule
 *    autorité : l'ordre d'arrivée des réponses (hors ligne) ne change rien ;
 *  - `series_jours` : un jour d'activité (réponses, temps, objectif
 *    atteint), au **jour du geste** (`saisi_le`, HORS_LIGNE.md A.6) ;
 *  - `points_effort` : journal en ajout seulement, une ligne par source
 *    (réponse, séance, examen blanc, badge, défi) ; l'unicité de la source
 *    rend chaque gain idempotent ; compté **à la réception** (`recu_le`) ;
 *  - `badges` (catalogue, semé), `badges_obtenus` ;
 *  - `defis` (un par semaine, matière, type et objectif) et
 *    `participations_defis` ;
 *  - `seances` : les séances **préparées d'avance** (HL4, A.10) n'ont pas
 *    encore de jour ; `rang` les ordonne ; `remplacee_le` marque celles
 *    qu'une séance plus fraîche a remplacées (elles acceptent toujours les
 *    réponses d'un appareil resté hors ligne).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maitrises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('notion_id')->constrained('notions')->cascadeOnDelete();
            $table->unsignedTinyInteger('score');
            $table->unsignedSmallInteger('reponses');
            $table->unsignedTinyInteger('palier')->default(0);
            $table->date('prochaine_revision_le')->nullable();
            $table->timestamp('derniere_reponse_le', 3);
            $table->timestamp('maj_le', 3);

            $table->unique(['user_id', 'notion_id']);
            $table->index(['user_id', 'prochaine_revision_le']);
        });

        Schema::create('series_jours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('jour');
            $table->unsignedSmallInteger('reponses')->default(0);
            $table->unsignedInteger('secondes')->default(0);
            $table->boolean('objectif_atteint')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'jour']);
        });

        Schema::create('points_effort', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source', 20);
            $table->string('source_cle', 64);
            $table->unsignedSmallInteger('points');
            $table->timestamp('recu_le', 3);
            $table->timestamps();

            $table->unique(['user_id', 'source', 'source_cle']);
            $table->index(['user_id', 'recu_le']);
        });

        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('cle', 40)->unique();
            $table->string('nom', 80);
            $table->string('description', 200);
            $table->string('icone', 40);
            $table->unsignedSmallInteger('points');
            $table->unsignedSmallInteger('ordre');
            $table->timestamps();
        });

        Schema::create('badges_obtenus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained('badges')->cascadeOnDelete();
            $table->timestamp('obtenu_le', 3);
            $table->timestamps();

            $table->unique(['user_id', 'badge_id']);
        });

        Schema::create('defis', function (Blueprint $table) {
            $table->id();
            $table->date('semaine');
            $table->foreignId('matiere_id')->constrained('matieres')->cascadeOnDelete();
            $table->string('type', 30);
            $table->unsignedSmallInteger('objectif');
            $table->timestamps();

            $table->unique(['semaine', 'matiere_id', 'type', 'objectif']);
        });

        Schema::create('participations_defis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('defi_id')->constrained('defis')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('reussi_le', 3)->nullable();
            $table->timestamps();

            $table->unique(['defi_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::table('seances', function (Blueprint $table) {
            $table->date('jour')->nullable()->change();
            $table->unsignedTinyInteger('rang')->nullable()->after('jour');
            $table->timestamp('remplacee_le')->nullable()->after('termine_le');
        });
    }

    public function down(): void
    {
        Schema::table('seances', function (Blueprint $table) {
            $table->dropColumn(['rang', 'remplacee_le']);
        });

        Schema::dropIfExists('participations_defis');
        Schema::dropIfExists('defis');
        Schema::dropIfExists('badges_obtenus');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('points_effort');
        Schema::dropIfExists('series_jours');
        Schema::dropIfExists('maitrises');
    }
};
