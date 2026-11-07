<?php

use App\Models\Sujet;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 8 : l'adresse publique d'un sujet (`/sujets/bac-se-chimie-2024`),
 * ce que les élèves tapent dans Google (PLAN M1). Stable une fois posée : un
 * lien partagé sur WhatsApp ne doit jamais casser.
 *
 * Les sujets déjà présents reçoivent la leur ici : c'est une colonne dérivée
 * de leurs propres champs, pas une donnée semée (CLAUDE.md § 4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sujets', function (Blueprint $table) {
            $table->string('slug', 120)->nullable()->unique()->after('uuid');
        });

        // Sans toucher `updated_at` : les listes du back-office trient par là.
        Sujet::query()->whereNull('slug')->orderBy('id')
            ->each(fn (Sujet $sujet) => DB::table('sujets')->where('id', $sujet->id)->update(['slug' => Sujet::slugLibre($sujet)]));
    }

    public function down(): void
    {
        Schema::table('sujets', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
