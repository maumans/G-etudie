<?php

namespace App\Http\Controllers\Compte;

use App\Http\Controllers\Controller;
use App\Http\Middleware\SessionCourtePersonnel;
use App\Models\EntreeJournalAcces;
use App\Models\User;
use App\Support\JournalAcces;
use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Fortify;

/**
 * « Mon compte › Sécurité » : double authentification proposée au personnel
 * (DA4), jamais imposée. Les gestes (activer, confirmer, désactiver,
 * régénérer les codes) passent par les routes de Fortify ; cet écran montre
 * l'état. Il est derrière `password.confirm` : la clé et les codes de secours
 * ne s'affichent qu'après avoir retapé son mot de passe (3 h).
 */
class SecuriteController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $cle = $user->two_factor_secret !== null
            ? Fortify::currentEncrypter()->decrypt($user->two_factor_secret)
            : null;

        $etat = match (true) {
            $user->hasEnabledTwoFactorAuthentication() => 'active',
            $cle !== null => 'a_confirmer',
            default => 'inactive',
        };

        return Inertia::render('compte/securite', [
            'etat' => $etat,
            'configuration' => $etat === 'a_confirmer' ? [
                'qrSvg' => $this->qrCode($user->adresseDoubleAuthentification()),
                'cle' => $cle,
            ] : null,
            'codesSecours' => $etat === 'active' ? $user->recoveryCodes() : [],
            'session' => $this->session($request),
            'activite' => $this->activite($user),
        ]);
    }

    /**
     * Début et fin de la session de travail de 12 h (SessionCourtePersonnel
     * a déjà posé le début : cet écran est réservé au personnel).
     *
     * @return array{debut: string, fin: string}
     */
    private function session(Request $request): array
    {
        $debut = CarbonImmutable::createFromTimestamp(
            (int) $request->session()->get(SessionCourtePersonnel::CLE, now()->getTimestamp()),
            config('app.timezone'),
        );

        return [
            'debut' => $debut->toIso8601String(),
            'fin' => $debut->addSeconds(SessionCourtePersonnel::DUREE_SECONDES)->toIso8601String(),
        ];
    }

    /**
     * Les cinq derniers gestes sensibles faits par ce compte ou sur lui : un
     * changement qu'on n'a pas fait soi-même doit se voir.
     *
     * @return array<int, array{id: int, libelle: string, le: string}>
     */
    private function activite(User $user): array
    {
        return EntreeJournalAcces::query()
            ->where(fn (Builder $requete) => $requete
                ->where('auteur_id', $user->getKey())
                ->orWhere(fn (Builder $cible) => $cible
                    ->where('cible_type', class_basename($user))
                    ->where('cible_id', $user->getKey())))
            ->latest('cree_le')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (EntreeJournalAcces $entree) => [
                'id' => $entree->id,
                'libelle' => JournalAcces::libelle($entree->action),
                'le' => $entree->cree_le->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * QR code à l'encre du design (#1e1814) sur blanc : celui de Fortify est
     * gris bleuté. Le blanc reste en sombre — un lecteur de QR en a besoin.
     */
    private function qrCode(string $adresse): string
    {
        $svg = (new Writer(new ImageRenderer(
            new RendererStyle(192, 1, null, null, Fill::uniformColor(new Rgb(255, 255, 255), new Rgb(30, 24, 20))),
            new SvgImageBackEnd,
        )))->writeString($adresse);

        // Sans la déclaration XML de tête : le SVG est inséré dans la page.
        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }
}
