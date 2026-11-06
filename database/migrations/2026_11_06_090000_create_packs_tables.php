<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 7 (HORS_LIGNE.md HL5, HL6) :
 *
 *  - `packs` : tout le contenu publié d'une matière pour un examen, une série
 *    et une filière (A.5), avec sa version (empreinte de ses éléments) ;
 *  - `pack_elements` : chaque élément (leçon, fiche, annale, matière) avec
 *    les props mêmes de son écran, son empreinte et son morceau (~500 Ko) :
 *    la mise à jour ne retélécharge que ce qui a changé ;
 *  - `packs_eleves` : les packs qu'un élève a pris (HL-D3 : un pack gratuit),
 *    et leur expiration (HL-D4) ;
 *  - `seances.matiere_id` : trois séances préparées par matière téléchargée
 *    (A.10, écart n° 23) ;
 *  - `appareil_profils.jeton_profil_hache` : le jeton qui permet de passer
 *    d'un profil à l'autre sur le même téléphone sans mot de passe (A.7,
 *    HL-D9, HL-D10), et d'envoyer les réponses d'un profil qui n'est pas
 *    celui de la session.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packs', function (Blueprint $table) {
            $table->id();
            $table->string('cle', 120)->unique();
            $table->foreignId('examen_id')->constrained('examens')->cascadeOnDelete();
            $table->foreignId('serie_id')->nullable()->constrained('series')->cascadeOnDelete();
            $table->string('filiere', 20);
            $table->foreignId('matiere_id')->constrained('matieres')->cascadeOnDelete();
            $table->char('version', 16)->nullable();
            $table->unsignedInteger('taille_octets')->default(0);
            $table->unsignedInteger('taille_sans_images')->default(0);
            $table->unsignedSmallInteger('morceaux')->default(0);
            $table->json('compte')->nullable();
            $table->boolean('est_exemple')->default(false);
            $table->timestamp('genere_le')->nullable();

            $table->unique(['examen_id', 'serie_id', 'filiere', 'matiere_id'], 'packs_unicite');
        });

        Schema::create('pack_elements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pack_id')->constrained('packs')->cascadeOnDelete();
            $table->string('cle', 120);
            $table->string('type', 20);
            $table->unsignedInteger('version')->default(0);
            $table->char('empreinte', 32);
            $table->unsignedInteger('taille');
            $table->unsignedSmallInteger('morceau');
            $table->longText('props');

            $table->unique(['pack_id', 'cle']);
            $table->index(['pack_id', 'morceau']);
        });

        Schema::create('packs_eleves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pack_id')->constrained('packs')->cascadeOnDelete();
            $table->timestamp('pris_le');
            $table->timestamp('expire_le')->nullable();
            $table->timestamp('retire_le')->nullable();

            $table->unique(['user_id', 'pack_id']);
        });

        Schema::table('seances', function (Blueprint $table) {
            $table->foreignId('matiere_id')->nullable()->after('rang')->constrained('matieres')->nullOnDelete();
        });

        Schema::table('appareil_profils', function (Blueprint $table) {
            $table->char('jeton_profil_hache', 64)->nullable()->unique()->after('ajoute_le');
            $table->timestamp('jeton_utilise_le')->nullable()->after('jeton_profil_hache');
            $table->timestamp('retire_le')->nullable()->after('jeton_utilise_le');
        });
    }

    public function down(): void
    {
        Schema::table('appareil_profils', function (Blueprint $table) {
            $table->dropUnique(['jeton_profil_hache']);
            $table->dropColumn(['jeton_profil_hache', 'jeton_utilise_le', 'retire_le']);
        });

        Schema::table('seances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('matiere_id');
        });

        Schema::dropIfExists('packs_eleves');
        Schema::dropIfExists('pack_elements');
        Schema::dropIfExists('packs');
    }
};
