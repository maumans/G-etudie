<?php

namespace Tests\Concerns;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie une prop `Inertia::optional()` en en-têtes Inertia réels
 * (CLAUDE.md § 4) : absente du chargement complet, livrée sur rechargement
 * partiel. Le test appelant vérifie en plus que sa fermeture n'a pas été
 * évaluée au chargement complet (compteur, requêtes…).
 *
 *   $this->verifierPropOptionnelle('/lecons/12', 'eleve/lecon', 'avis');
 */
trait VerifiePropsOptionnelles
{
    /**
     * @return TestResponse<Response> la réponse du rechargement partiel
     */
    protected function verifierPropOptionnelle(string $url, string $composant, string $prop): TestResponse
    {
        $complet = $this->get($url, $this->entetesInertia());
        $complet->assertOk();
        expect($complet->json('component'))->toBe($composant);
        expect($complet->json('props'))->not->toHaveKey($prop);

        $partiel = $this->get($url, [
            ...$this->entetesInertia(),
            'X-Inertia-Partial-Component' => $composant,
            'X-Inertia-Partial-Data' => $prop,
        ]);
        $partiel->assertOk();
        expect($partiel->json('props'))->toHaveKey($prop);

        return $partiel;
    }

    /**
     * La version est toujours une chaîne : `null` ferait échouer le test en 409
     * sur les seules machines où `npm run dev` tourne.
     *
     * @return array<string, string>
     */
    protected function entetesInertia(): array
    {
        $version = app(HandleInertiaRequests::class)->version(Request::create('/'));

        return [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version ?? '',
        ];
    }
}
