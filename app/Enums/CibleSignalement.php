<?php

namespace App\Enums;

use App\Models\Lecon;
use App\Models\Question;
use App\Models\Sujet;
use Illuminate\Database\Eloquent\Model;

/** Ce qu'un élève peut signaler (PLAN M5, `signalements.cible_type`). */
enum CibleSignalement: string
{
    case Question = 'question';
    case Lecon = 'lecon';
    case Sujet = 'sujet';

    /** @return class-string<Model> */
    public function modele(): string
    {
        return match ($this) {
            self::Question => Question::class,
            self::Lecon => Lecon::class,
            self::Sujet => Sujet::class,
        };
    }

    public function libelle(): string
    {
        return match ($this) {
            self::Question => 'Question',
            self::Lecon => 'Leçon',
            self::Sujet => 'Annale',
        };
    }
}
