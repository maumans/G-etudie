<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des accès sensibles (CLAUDE.md § 9) : action, auteur, cible, IP,
 * agent, horodatage — sans portée par établissement : on y trace justement
 * ce qui traverse les périmètres. Ajout seulement, jamais de mise à jour.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_acces_plateforme', function (Blueprint $table) {
            $table->id();
            $table->string('action', 60)->index();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cible_type', 60)->nullable();
            $table->unsignedBigInteger('cible_id')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('agent', 255)->nullable();
            $table->json('details')->nullable();
            $table->timestamp('cree_le')->useCurrent()->index();

            $table->index(['cible_type', 'cible_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_acces_plateforme');
    }
};
