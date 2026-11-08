<?php

namespace Tests;

use Database\Seeders\SocleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Features;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Rôles, permissions et badges semés une fois, à la création de la base de test :
     * comme en production, où chaque déploiement lance `db:seed`.
     */
    protected bool $seed = true;

    protected string $seeder = SocleSeeder::class;

    /**
     * Les tests ne dépendent pas d'un build : une page ajoutée et pas encore
     * construite ne doit pas faire échouer sa route en 500.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        // Le disque `local` des tests est un disque à part : sans cela, le
        // semis de démonstration d'un test (SeederDemonstrationTest) récrivait
        // l'instant du semis de la base de développement (HorlogeDemo,
        // storage/app/private/demo/horloge.txt), et les captures dérivaient
        // après chaque `php artisan test` (vu le 2026-11-08, lot 9).
        Storage::fake('local');
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }

    /**
     * Les traits (RefreshDatabase en tête) s'installent ici, une fois
     * l'application créée : c'est le dernier moment pour refuser une base qui
     * ne serait pas la base de test, avant qu'elle ne soit vidée.
     *
     * (Le crochet beforeRefreshingDatabase() ne convient pas : défini ici, il
     * serait masqué par celui, vide, du trait RefreshDatabase.)
     *
     * @return array<class-string, class-string>
     */
    protected function setUpTraits()
    {
        $connexion = config('database.default');
        $base = (string) config("database.connections.{$connexion}.database");

        if (! str_ends_with($base, '_test')) {
            throw new RuntimeException(
                "Base de test refusée : « {$base} » ne finit pas par « _test ». Vérifier phpunit.xml."
            );
        }

        return parent::setUpTraits();
    }
}
