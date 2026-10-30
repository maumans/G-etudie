<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * Un compte : connexion par téléphone (D3), données minimales (PLAN § 10).
 * `telephone_verifie_le` et `desactive_le` ne se remplissent pas en masse :
 * le premier par la vérification du code SMS, le second par un administrateur.
 *
 * @property int $id
 * @property string $prenom
 * @property string|null $nom
 * @property string $pseudo
 * @property string $telephone
 * @property Carbon|null $telephone_verifie_le
 * @property string|null $email
 * @property Carbon|null $desactive_le
 */
#[Fillable(['prenom', 'nom', 'pseudo', 'telephone', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected function casts(): array
    {
        return [
            'telephone_verifie_le' => 'datetime',
            'desactive_le' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function telephoneVerifie(): bool
    {
        return $this->telephone_verifie_le !== null;
    }

    public function estDesactive(): bool
    {
        return $this->desactive_le !== null;
    }
}
