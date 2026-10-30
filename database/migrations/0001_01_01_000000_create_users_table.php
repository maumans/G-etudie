<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Comptes : connexion par téléphone (D3), données minimales (PLAN § 10) —
 * téléphone, prénom, pseudo. Le nom et l'e-mail sont facultatifs (personnel
 * du back-office). Aucune date de naissance, aucune photo.
 *
 * Réécrite sur place au lot 0 (étape 4), avant tout déploiement : la table
 * du kit (connexion par e-mail) n'a jamais servi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('prenom', 60);
            $table->string('nom', 80)->nullable();
            $table->string('pseudo', 30)->unique();
            $table->string('telephone', 16)->unique()->comment('Format +224XXXXXXXXX');
            $table->timestamp('telephone_verifie_le')->nullable();
            $table->string('email')->nullable()->unique();
            $table->string('password');
            $table->rememberToken();
            $table->timestamp('desactive_le')->nullable();
            $table->timestamps();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('sessions');
    }
};
