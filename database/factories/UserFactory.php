<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Un compte comme ceux que crée l'inscription : numéro mobile guinéen
     * vérifié, prénom, pseudo. Mot de passe : « password ».
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'prenom' => fake()->firstName(),
            'nom' => null,
            'pseudo' => 'eleve_'.Str::lower(Str::random(8)),
            'telephone' => '+2246'.fake()->unique()->numerify('########'),
            'telephone_verifie_le' => now(),
            'email' => null,
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'desactive_le' => null,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ];
    }

    /** Numéro pas encore vérifié par code SMS (la vérification n'est pas bloquante, D3). */
    public function numeroNonVerifie(): static
    {
        return $this->state(fn (array $attributes) => [
            'telephone_verifie_le' => null,
        ]);
    }

    /** Compte désactivé par un administrateur. */
    public function desactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'desactive_le' => now(),
        ]);
    }

    /**
     * Indicate that the model has two-factor authentication configured.
     */
    public function withTwoFactor(): static
    {
        return $this->state(fn (array $attributes) => [
            'two_factor_secret' => encrypt('secret'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-1'])),
            'two_factor_confirmed_at' => now(),
        ]);
    }
}
