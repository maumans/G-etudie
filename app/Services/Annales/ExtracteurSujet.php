<?php

namespace App\Services\Annales;

use App\Models\ImportSujet;

/**
 * Lit un document de sujet (PDF, photo) et en propose une structure
 * (PLAN M17, « import assisté »). Deux pilotes, choisis par
 * `config('annales.extracteur')` : ExtracteurClaude (API Claude en vision) et
 * ExtracteurSimule (sans réseau, pour le développement et les tests).
 *
 * La proposition suit `ExtracteurClaude::SCHEMA` ; ImportSujetService la
 * vérifie entièrement avant d'en faire un sujet en brouillon. Un extracteur
 * ne publie rien et ne touche pas à la base.
 */
interface ExtracteurSujet
{
    /**
     * @param  string  $contenu  les octets du document
     * @param  array<int, string>  $notions  identifiant → « Chapitre › Notion » (programme de la matière)
     *
     * @throws ExtractionImpossible avec une phrase pour le rédacteur
     */
    public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction;
}
