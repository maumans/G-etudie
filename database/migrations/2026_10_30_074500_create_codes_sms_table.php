<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Codes envoyés par SMS : vérification du numéro, récupération du mot de
 * passe, changement de numéro (D3). Le code n'est jamais gardé en clair.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('codes_sms', function (Blueprint $table) {
            $table->id();
            $table->string('telephone', 16);
            $table->string('motif', 20);
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code_hache');
            $table->unsignedTinyInteger('essais')->default(0);
            $table->timestamp('expire_le');
            $table->timestamp('utilise_le')->nullable();
            $table->timestamps();

            $table->index(['telephone', 'motif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codes_sms');
    }
};
