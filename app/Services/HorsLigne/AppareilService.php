<?php

namespace App\Services\HorsLigne;

use App\Models\Appareil;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Enregistrement automatique des appareils (HORS_LIGNE.md A.7, HL-D8 : pas de
 * limite au lot 0). Au premier contact après connexion (`GET /sync/etat`),
 * l'appareil sans jeton en reçoit un ; le profil connecté lui est rattaché.
 * Le jeton en clair n'est rendu qu'une fois ; la base garde son empreinte.
 */
class AppareilService
{
    /**
     * @return array{appareil: Appareil, jeton: string|null} `jeton` : le jeton
     *                                                       neuf à garder, ou null si l'appareil était connu
     */
    public function reconnaitre(?string $jeton, User $user, string $agent): array
    {
        $appareil = $this->retrouver($jeton);
        $nouveauJeton = null;

        if ($appareil === null) {
            $nouveauJeton = Str::random(64);
            $appareil = Appareil::create([
                'uuid' => (string) Str::uuid7(),
                'jeton_hache' => hash('sha256', $nouveauJeton),
                'libelle' => self::libelle($agent),
                'premier_contact_le' => now(),
                'dernier_contact_le' => now(),
            ]);
        } else {
            $appareil->forceFill(['dernier_contact_le' => now()])->save();
        }

        $appareil->profils()->syncWithoutDetaching([$user->getKey() => ['ajoute_le' => now()]]);

        return ['appareil' => $appareil, 'jeton' => $nouveauJeton];
    }

    /** Un appareil révoqué ou inconnu n'est pas retrouvé. */
    public function retrouver(?string $jeton): ?Appareil
    {
        if ($jeton === null || $jeton === '') {
            return null;
        }

        return Appareil::where('jeton_hache', hash('sha256', $jeton))
            ->whereNull('revoque_le')
            ->first();
    }

    /** « Chrome sur Android », « Safari sur iPhone »… — rien de plus précis. */
    public static function libelle(string $agent): string
    {
        $systeme = match (true) {
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'iPhone') => 'iPhone',
            str_contains($agent, 'iPad') => 'iPad',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Mac OS') => 'Mac',
            str_contains($agent, 'Linux') => 'Linux',
            default => 'appareil inconnu',
        };
        $navigateur = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($agent, 'Firefox') => 'Firefox',
            str_contains($agent, 'Chrome') => 'Chrome',
            str_contains($agent, 'Safari') => 'Safari',
            default => 'Navigateur',
        };

        return "{$navigateur} sur {$systeme}";
    }
}
