<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registre des opérations reçues de la file de l'appareil (HORS_LIGNE.md
 * A.3.6). L'index unique **global** sur `uuid` fait l'idempotence : la ligne
 * est insérée en premier, dans la même transaction que le travail, et un envoi
 * concurrent identique bute dessus.
 *
 * Seuls `acceptee` et `rejetee` y entrent : `reporte` et `erreur` ne sont
 * jamais mémorisés.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operations_synchronisees', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('type', 60)->index();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('appareil_id')->nullable()->constrained('appareils')->nullOnDelete();
            $table->timestamp('saisi_le', 3);
            $table->timestamp('recu_le', 3);
            $table->boolean('horloge_suspecte')->default(false);
            $table->string('verdict', 12);
            $table->json('resultat')->nullable();
            // Gardés pour les refus seulement, que l'équipe peut relire.
            $table->json('charge')->nullable();
            $table->string('motif', 255)->nullable();

            $table->index(['auteur_id', 'saisi_le']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operations_synchronisees');
    }
};
