<?php

namespace App\Services\HorsLigne;

use App\Enums\Permission;
use App\Models\Appareil;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use stdClass;

/**
 * Appareils et profils du téléphone (HORS_LIGNE.md A.7).
 *
 * - Enregistrement automatique (HL-D8 : pas de limite avant le lot 9) : au
 *   premier contact après connexion (`GET /sync/etat`), l'appareil sans
 *   jeton en reçoit un ; le profil connecté lui est rattaché. Le jeton en
 *   clair n'est rendu qu'une fois ; la base garde son empreinte.
 * - **Jeton de profil** (lot 7, HL6) : un élève rattaché reçoit, une fois,
 *   un jeton propre à ce téléphone. Il sert à **changer de profil** sans mot
 *   de passe (le code local à 4 chiffres protège l'accès entre frères et
 *   sœurs, HL-D9) et à **envoyer les réponses** d'un profil qui n'est pas
 *   celui de la session. Valable 30 jours glissants (HL-D10) ; retiré à la
 *   déconnexion du profil sur ce téléphone. Jamais pour le personnel, ni sur
 *   un ordinateur partagé.
 */
class AppareilService
{
    public const DUREE_JETON_PROFIL_JOURS = 30;

    /**
     * @return array{appareil: Appareil, jeton: string|null, jeton_profil: string|null}
     *                                                                                  `jeton` : le jeton d'appareil neuf à garder, ou null si l'appareil était connu ;
     *                                                                                  `jeton_profil` : le jeton de profil neuf, ou null si celui de l'appareil vaut encore
     */
    public function reconnaitre(?string $jeton, User $user, string $agent, ?string $jetonProfil = null, bool $partage = false): array
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
        $rattachement = $this->rattachement($appareil, $user);

        // Revenu sur ce téléphone après s'en être retiré : de nouveau rattaché.
        if ($rattachement?->retire_le !== null) {
            $this->rattachements($appareil, $user)->update(['retire_le' => null, 'jeton_profil_hache' => null]);
            $rattachement = $this->rattachement($appareil, $user);
        }

        $nouveauJetonProfil = null;

        if (! $partage && self::peutAvoirUnJetonDeProfil($user)) {
            $valable = $jetonProfil !== null
                && $rattachement?->jeton_profil_hache !== null
                && hash_equals($rattachement->jeton_profil_hache, hash('sha256', $jetonProfil));

            if ($valable) {
                $this->rattachements($appareil, $user)->update(['jeton_utilise_le' => now()]);
            } else {
                $nouveauJetonProfil = Str::random(64);
                $this->rattachements($appareil, $user)->update([
                    'jeton_profil_hache' => hash('sha256', $nouveauJetonProfil),
                    'jeton_utilise_le' => now(),
                ]);
            }
        }

        return ['appareil' => $appareil, 'jeton' => $nouveauJeton, 'jeton_profil' => $nouveauJetonProfil];
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

    /**
     * Le profil que ce jeton désigne sur cet appareil, s'il vaut encore :
     * rattaché, pas retiré, utilisé il y a moins de 30 jours, compte actif.
     * Un usage le prolonge (30 jours glissants).
     */
    public function profilParJeton(Appareil $appareil, int $userId, ?string $jetonProfil): ?User
    {
        if ($jetonProfil === null || $jetonProfil === '') {
            return null;
        }

        $user = User::find($userId);

        if ($user === null || $user->estDesactive() || ! self::peutAvoirUnJetonDeProfil($user)) {
            return null;
        }

        $rattachement = $this->rattachement($appareil, $user);

        if ($rattachement === null
            || $rattachement->retire_le !== null
            || $rattachement->jeton_profil_hache === null
            || ! hash_equals($rattachement->jeton_profil_hache, hash('sha256', $jetonProfil))
            || $rattachement->jeton_utilise_le === null
            || CarbonImmutable::parse($rattachement->jeton_utilise_le)->addDays(self::DUREE_JETON_PROFIL_JOURS)->isPast()) {
            return null;
        }

        $this->rattachements($appareil, $user)->update(['jeton_utilise_le' => now()]);

        return $user;
    }

    /** Le profil quitte ce téléphone : son jeton ne vaut plus, ses gestes restent reportés. */
    public function retirerProfil(Appareil $appareil, User $user): void
    {
        $this->rattachements($appareil, $user)->update(['retire_le' => now(), 'jeton_profil_hache' => null]);
    }

    /** Seul un élève (ou un parent, plus tard) change de profil sans mot de passe ; jamais le personnel. */
    public static function peutAvoirUnJetonDeProfil(User $user): bool
    {
        return ! $user->estPersonnel() && $user->can(Permission::EspaceEleve->value);
    }

    /** La ligne `appareil_profils` : jeton_profil_hache, jeton_utilise_le, retire_le. */
    private function rattachement(Appareil $appareil, User $user): ?stdClass
    {
        return $this->rattachements($appareil, $user)->first(['jeton_profil_hache', 'jeton_utilise_le', 'retire_le']);
    }

    private function rattachements(Appareil $appareil, User $user): Builder
    {
        return DB::table('appareil_profils')->where('appareil_id', $appareil->id)->where('user_id', $user->getKey());
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
