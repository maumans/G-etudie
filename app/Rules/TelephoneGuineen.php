<?php

namespace App\Rules;

use App\Support\Telephone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Un numéro mobile guinéen valide (App\Support\Telephone). */
class TelephoneGuineen implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || Telephone::normaliser($value) === null) {
            $fail('Le numéro doit être un mobile guinéen à 9 chiffres commençant par 6 (exemple : 622 12 34 56).');
        }
    }
}
