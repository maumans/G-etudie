<?php

namespace App\Services\Plateforme;

use Carbon\CarbonImmutable;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Le rapport d'impact en PDF (critère du lot 13 : « exportable en PDF pour
 * un partenaire »). Il reprend les chiffres de PlateformeService::impact —
 * les mêmes que l'écran — et les met en page (vue Blade `rapports.impact`)
 * avec dompdf, en PHP pur : rien à installer sur le serveur.
 *
 * Police : Bricolage Grotesque en trois instances statiques TTF
 * (`resources/fonts/pdf`, OFL), dompdf ne lisant ni le woff2 ni les polices
 * variables. Aucune ressource distante (`isRemoteEnabled` faux).
 */
class RapportImpact
{
    public static function nomFichier(CarbonImmutable $le): string
    {
        return 'rapport-impact-nkaramogo-'.$le->toDateString().'.pdf';
    }

    /**
     * @param  array<string, mixed>  $impact
     */
    public function pdf(array $impact, CarbonImmutable $le): string
    {
        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setChroot([resource_path()]);
        $options->setFontDir(storage_path('framework/cache/dompdf'));
        $options->setFontCache(storage_path('framework/cache/dompdf'));
        $options->setDefaultFont('bricolage');
        $options->setDpi(96);

        if (! is_dir(storage_path('framework/cache/dompdf'))) {
            mkdir(storage_path('framework/cache/dompdf'), 0775, true);
        }

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('A4');
        $dompdf->loadHtml(view('rapports.impact', [
            'impact' => $impact,
            'le' => $le,
            'polices' => self::polices(),
            'courbe' => self::courbe($impact['courbe']),
        ])->render(), 'UTF-8');
        $dompdf->render();
        $dompdf->addInfo('Title', 'Rapport d’impact — N’karamögö');
        $dompdf->addInfo('Creator', 'N’karamögö · G-Étudie');

        return (string) $dompdf->output();
    }

    /**
     * @return array<int, string> graisse => chemin du fichier
     */
    private static function polices(): array
    {
        return [
            '400' => resource_path('fonts/pdf/bricolage-grotesque-regular.ttf'),
            '600' => resource_path('fonts/pdf/bricolage-grotesque-semibold.ttf'),
            '700' => resource_path('fonts/pdf/bricolage-grotesque-bold.ttf'),
        ];
    }

    /**
     * La jauge moyenne semaine par semaine, assidus et autres, en SVG
     * (image en ligne : dompdf la dessine sans réseau).
     *
     * @param  list<array{semaine: string, assidus: float|null, autres: float|null}>  $points
     */
    public static function courbe(array $points): string
    {
        $largeur = 640;
        $hauteur = 170;
        $marge = ['haut' => 12, 'droite' => 12, 'bas' => 24, 'gauche' => 32];
        $l = $largeur - $marge['gauche'] - $marge['droite'];
        $h = $hauteur - $marge['haut'] - $marge['bas'];
        $n = max(1, count($points) - 1);
        $x = fn (int $i) => round($marge['gauche'] + $l * $i / $n, 1);
        $y = fn (float $v) => round($marge['haut'] + $h * (1 - $v / 100), 1);

        $grille = '';
        foreach ([0, 25, 50, 75, 100] as $palier) {
            $grille .= sprintf(
                '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="#e9e2d6" stroke-width="1"/><text x="%s" y="%s" font-size="10" fill="#7a6f62" text-anchor="end">%d %%</text>',
                $marge['gauche'], $y($palier), $largeur - $marge['droite'], $y($palier), $marge['gauche'] - 6, $y($palier) + 3, $palier,
            );
        }

        $trace = function (string $cle, string $couleur, string $tirets) use ($points, $x, $y): string {
            $segments = [];
            $courant = [];
            foreach ($points as $i => $point) {
                if ($point[$cle] === null) {
                    if (count($courant) > 0) {
                        $segments[] = $courant;
                    }
                    $courant = [];

                    continue;
                }
                $courant[] = $x($i).','.$y((float) $point[$cle]);
            }
            if (count($courant) > 0) {
                $segments[] = $courant;
            }

            $svg = '';
            foreach ($segments as $segment) {
                $svg .= count($segment) === 1
                    ? sprintf('<circle cx="%s" cy="%s" r="3" fill="%s"/>', ...[...explode(',', $segment[0]), $couleur])
                    : sprintf('<polyline points="%s" fill="none" stroke="%s" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"%s/>', implode(' ', $segment), $couleur, $tirets);
            }

            return $svg;
        };

        $etiquettes = '';
        foreach ($points as $i => $point) {
            if ($i === 0 || $i === count($points) - 1 || $i % 4 === 0) {
                $etiquettes .= sprintf(
                    '<text x="%s" y="%s" font-size="10" fill="#7a6f62" text-anchor="middle">%s</text>',
                    $x($i), $hauteur - 6, CarbonImmutable::parse($point['semaine'])->format('d/m'),
                );
            }
        }

        $svg = sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" font-family="Helvetica">%s%s%s%s</svg>',
            $largeur, $hauteur, $largeur, $hauteur,
            $grille,
            $trace('autres', '#8a7f72', ' stroke-dasharray="5 4"'),
            $trace('assidus', '#e0641b', ''),
            $etiquettes,
        );

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
}
