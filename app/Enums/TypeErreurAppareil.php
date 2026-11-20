<?php

namespace App\Enums;

/** Lot 14 : d'où vient une erreur captée sur un appareil. */
enum TypeErreurAppareil: string
{
    /** `window.onerror` : une exception non rattrapée. */
    case Script = 'script';
    /** `unhandledrejection` : une promesse rejetée sans traitement. */
    case Promesse = 'promesse';
    /** L'import d'une page a échoué (HORS_LIGNE.md A.3.3). */
    case Import = 'import';
    /** Un geste de la file passé « À corriger » sur échec technique (A.3.5). */
    case File = 'file';

    public function libelle(): string
    {
        return match ($this) {
            self::Script => 'Erreur de script',
            self::Promesse => 'Promesse rejetée',
            self::Import => 'Page qui ne se charge pas',
            self::File => 'Envoi en échec',
        };
    }
}
