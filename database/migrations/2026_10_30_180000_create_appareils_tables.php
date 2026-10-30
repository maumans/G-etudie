<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Appareils et profils rattachés (HORS_LIGNE.md A.7). Le jeton en clair ne vit
 * que sur l'appareil (table locale `meta`) et dans le corps des requêtes de
 * synchronisation ; la base n'en garde que l'empreinte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appareils', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->char('jeton_hache', 64)->unique();
            $table->string('libelle', 80);
            $table->timestamp('premier_contact_le');
            $table->timestamp('dernier_contact_le');
            $table->timestamp('revoque_le')->nullable();
        });

        Schema::create('appareil_profils', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appareil_id')->constrained('appareils')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('ajoute_le');

            $table->unique(['appareil_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appareil_profils');
        Schema::dropIfExists('appareils');
    }
};
