<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * L'horloge des captures d'écran (développement seulement).
 *
 * Les données de démonstration sont datées par rapport au moment où
 * `db:seed` les a créées (« il y a trois soirs », série, révision espacée).
 * Le serveur, lui, calcule avec la vraie date : un jour plus tard, la série,
 * les badges et « À revoir » ont changé, et les captures Playwright avec.
 *
 * `DemoSeeder` note donc l'instant du semis ; une requête qui porte le
 * cookie `horloge_demo=1` (posé par les tests visuels, `figerHorloges`) est
 * traitée à cet instant (`FigerHorlogeDemo`). Jamais en production : ni le
 * cookie, ni le fichier n'y ont d'effet.
 */
class HorlogeDemo
{
    public const COOKIE = 'horloge_demo';

    private const FICHIER = 'demo/horloge.txt';

    public static function autorisee(): bool
    {
        return app()->environment(['local', 'testing']);
    }

    public static function noter(CarbonImmutable $instant): void
    {
        Storage::disk('local')->put(self::FICHIER, $instant->toIso8601String());
    }

    /**
     * L'instant noté par `DemoSeeder` ; à défaut (base semée avant le
     * 2026-11-07), la création du premier compte de démonstration — le
     * moment du semis après un `migrate:fresh --seed`.
     */
    public static function instant(): ?CarbonImmutable
    {
        $contenu = Storage::disk('local')->get(self::FICHIER);

        if (is_string($contenu) && trim($contenu) !== '') {
            try {
                return CarbonImmutable::parse(trim($contenu));
            } catch (Throwable) {
                // Fichier abîmé : on se rabat sur le compte de démonstration.
            }
        }

        $cree = User::query()
            ->where('telephone', DemoSeeder::COMPTES[0]['telephone'])
            ->value('created_at');

        return $cree === null ? null : CarbonImmutable::parse($cree);
    }
}
