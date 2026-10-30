<?php

namespace App\Services;

use App\Enums\MotifCode;
use App\Models\CodeSms;
use App\Models\User;
use App\Services\Sms\EnvoiSms;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Codes à 6 chiffres envoyés par SMS (D3) : valables 10 minutes, 5 essais,
 * gardés seulement sous forme hachée. Seule autorité pour créer et vérifier
 * un code, quel que soit le motif.
 */
class CodeSmsService
{
    public const LONGUEUR = 6;

    public const VALIDITE_MINUTES = 10;

    public const ESSAIS_MAX = 5;

    /** Envois par numéro (et par motif) sur 15 minutes. */
    public const ENVOIS_PAR_NUMERO = 3;

    /** Envois par adresse IP sur une heure. */
    public const ENVOIS_PAR_IP = 10;

    public function __construct(private EnvoiSms $sms) {}

    /**
     * Envoie un nouveau code et rend caducs les codes précédents du même
     * numéro pour le même motif.
     *
     * @throws ValidationException trop de demandes
     */
    public function envoyer(string $telephone, MotifCode $motif, ?User $user = null, string $champ = 'telephone'): void
    {
        $cleNumero = 'sms-numero:'.$motif->value.':'.$telephone;
        $cleIp = 'sms-ip:'.request()->ip();

        foreach ([[$cleNumero, self::ENVOIS_PAR_NUMERO], [$cleIp, self::ENVOIS_PAR_IP]] as [$cle, $maximum]) {
            if (RateLimiter::tooManyAttempts($cle, $maximum)) {
                $minutes = (int) ceil(RateLimiter::availableIn($cle) / 60);

                throw ValidationException::withMessages([
                    $champ => "Trop de codes demandés. Réessayer dans {$minutes} min.",
                ]);
            }
        }

        RateLimiter::hit($cleNumero, 15 * 60);
        RateLimiter::hit($cleIp, 60 * 60);

        CodeSms::query()->valables($telephone, $motif)->update(['utilise_le' => now()]);

        $code = str_pad((string) random_int(0, 10 ** self::LONGUEUR - 1), self::LONGUEUR, '0', STR_PAD_LEFT);

        CodeSms::create([
            'telephone' => $telephone,
            'motif' => $motif,
            'user_id' => $user?->getKey(),
            'code_hache' => Hash::make($code),
            'expire_le' => now()->addMinutes(self::VALIDITE_MINUTES),
        ]);

        $this->sms->envoyer(
            $telephone,
            "N'karamögö : ton code est {$code}. Il expire dans ".self::VALIDITE_MINUTES.' minutes. Ne le donne à personne.',
        );
    }

    /**
     * Vérifie un code et le consomme. Un numéro inconnu, un code expiré ou
     * jamais envoyé donnent le même message : rien ne dit si un compte existe.
     *
     * @throws ValidationException code faux, expiré ou trop d'essais
     */
    public function verifier(string $telephone, MotifCode $motif, string $code, string $champ = 'code'): CodeSms
    {
        $codeSms = CodeSms::query()->valables($telephone, $motif)->latest('id')->first();

        if ($codeSms === null || $codeSms->essais >= self::ESSAIS_MAX) {
            throw ValidationException::withMessages([
                $champ => "Ce code n'est plus valable. Demande un nouveau code.",
            ]);
        }

        if (! Hash::check($code, $codeSms->code_hache)) {
            $codeSms->increment('essais');
            $restants = self::ESSAIS_MAX - $codeSms->essais;

            throw ValidationException::withMessages([
                $champ => $restants > 0
                    ? "Code incorrect. Il te reste {$restants} essai".($restants > 1 ? 's' : '').'.'
                    : "Code incorrect. Ce code n'est plus valable : demande un nouveau code.",
            ]);
        }

        $codeSms->forceFill(['utilise_le' => now()])->save();

        return $codeSms;
    }
}
