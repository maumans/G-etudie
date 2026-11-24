<?php

namespace App\Support;

use Inertia\Response;

/**
 * Les balises de référencement et de partage d'une page publique (lot 8,
 * PLAN M1) : titre, description, adresse canonique, Open Graph (WhatsApp,
 * Facebook), Twitter, robots, données structurées JSON-LD, préchargements.
 *
 * Elles sont écrites **dans le HTML du serveur** (`app.blade.php`, via les
 * données de vue d'Inertia) : WhatsApp et les autres lecteurs de liens
 * n'exécutent pas le JavaScript, un `<Head>` React ne leur servirait à rien.
 *
 * Une page sans ces balises reçoit la description générale et n'est pas
 * indexée si elle demande un compte (elle redirige de toute façon).
 */
class Seo
{
    public const DESCRIPTION = 'Cours, sujets corrigés depuis 2010, exercices et examens blancs pour réussir le CEE, le BEPC et le Baccalauréat unique (SM, SE, SS) en Guinée, même hors connexion.';

    /**
     * @param  list<array<string, mixed>>  $jsonLd  données structurées (schema.org)
     * @param  list<string|array{href: string, srcset?: string|null, tailles?: string|null}>  $precharger  images à précharger (élément le plus grand de l'écran) ; avec `srcset`, le navigateur précharge la version qu'il affichera
     * @return array<string, mixed>
     */
    public static function page(
        string $titre,
        string $description = self::DESCRIPTION,
        ?string $canonique = null,
        ?string $image = null,
        bool $indexer = true,
        array $jsonLd = [],
        array $precharger = [],
        string $type = 'website',
    ): array {
        return [
            // Même forme que le titre posé par React (`title` de createInertiaApp).
            'titre' => $titre === '' ? config('app.name') : $titre.' · '.config('app.name'),
            'titre_partage' => $titre === '' ? config('app.name') : $titre,
            'description' => $description,
            'canonique' => $canonique ?? url()->current(),
            'image' => $image ?? route('partage.image.generale'),
            'robots' => $indexer && self::indexationPermise() ? 'index, follow, max-image-preview:large' : 'noindex, follow',
            'type' => $type,
            'json_ld' => $jsonLd,
            'precharger' => array_map(
                fn (string|array $image) => is_string($image) ? ['href' => $image, 'srcset' => null, 'tailles' => null] : [
                    'href' => $image['href'],
                    'srcset' => $image['srcset'] ?? null,
                    'tailles' => $image['tailles'] ?? null,
                ],
                $precharger,
            ),
        ];
    }

    /**
     * Les moteurs peuvent-ils indexer ce site ? Non en préproduction
     * (`VITRINE_INDEXER=false`) : sinon Google la référence à la place du
     * vrai site. Seule réponse, lue par la balise robots et `/robots.txt`.
     */
    public static function indexationPermise(): bool
    {
        return (bool) config('vitrine.indexer', true);
    }

    /**
     * @param  array<string, mixed>  $seo
     */
    public static function appliquer(Response $reponse, array $seo): Response
    {
        return $reponse->withViewData(['seo' => $seo]);
    }

    /**
     * Le site lui-même (accueil) : `WebSite` et l'organisation éditrice.
     *
     * @return list<array<string, mixed>>
     */
    public static function site(): array
    {
        return [[
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('app.name'),
            'alternateName' => 'G-Étudie',
            'url' => url('/'),
            'inLanguage' => 'fr-GN',
            'description' => self::DESCRIPTION,
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'VISION FUTURE – ENTREPRISES Sarlu',
                'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'Kountya (Coyah)', 'addressCountry' => 'GN'],
            ],
        ]];
    }
}
