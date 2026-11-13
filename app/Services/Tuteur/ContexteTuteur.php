<?php

namespace App\Services\Tuteur;

use App\Enums\TypeQuestion;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\ProfilEleve;
use App\Models\VersionContenu;
use App\Support\BlocsEnTexte;
use App\Support\CatalogueEleve;

/**
 * Ce que le tuteur lit avant de répondre (PLAN M11 : « le tuteur reçoit la
 * question, le corrigé validé et la notion du cours »). Rien sur l'élève
 * sinon son examen (BEPC, Bac SE…) et, quand il en a donné une, sa réponse.
 * Ni prénom, ni pseudo, ni numéro, ni établissement.
 */
final class ContexteTuteur
{
    /**
     * @param  array<string, mixed>|null  $reponse  la réponse de l'élève (format de FormatQuestion)
     */
    public static function question(ProfilEleve $profil, VersionContenu $version, Notion $notion, ?array $reponse, ?int $etape): string
    {
        $blocs = $version->blocs;
        $type = TypeQuestion::from($blocs['type']);
        $donnees = (array) ($blocs['donnees'] ?? []);
        $corrige = array_values((array) ($blocs['corrige'] ?? []));

        $lignes = [
            '<contexte>',
            'Examen : '.self::examen($profil),
            'Matière : '.$notion->chapitre->matiere->nom,
            'Chapitre › notion : '.$notion->chapitre->titre.' › '.$notion->titre,
            'Type de question : '.$type->libelle(),
            '',
            'Énoncé :',
            BlocsEnTexte::convertir($blocs['enonce'] ?? null),
        ];

        $choix = self::choix($type, $donnees);

        if ($choix !== '') {
            array_push($lignes, '', $choix);
        }

        $attendue = self::attendue($type, $donnees, (array) ($blocs['attendue'] ?? []));

        if ($attendue !== '') {
            array_push($lignes, '', 'Réponse attendue : '.$attendue);
        }

        if ($reponse !== null && $reponse !== []) {
            array_push($lignes, '', 'Réponse de l’élève : '.self::reponse($type, $donnees, $reponse));
        }

        if ($corrige !== []) {
            $lignes[] = '';
            $lignes[] = 'Corrigé validé par nos enseignants :';

            foreach ($corrige as $rang => $e) {
                $titre = trim((string) ($e['titre'] ?? ''));
                $lignes[] = ($rang + 1).'. '.($titre !== '' ? $titre.' — ' : '').BlocsEnTexte::convertir($e['blocs'] ?? null);
            }
        }

        if ($etape !== null && isset($corrige[$etape])) {
            array_push($lignes, '', 'L’élève bloque sur l’étape '.($etape + 1).' du corrigé : explique cette étape-là, en t’appuyant sur les précédentes.');
        }

        $lignes[] = '</contexte>';

        return implode("\n", $lignes);
    }

    /**
     * Une question libre : la matière, et le programme que l'élève étudie
     * (chapitres et notions), pour que le tuteur reste à son niveau.
     */
    public static function libre(ProfilEleve $profil, Matiere $matiere): string
    {
        $programme = CatalogueEleve::chapitres($profil, $matiere)
            ->with(['notions' => fn ($q) => $q->orderBy('ordre')->orderBy('id')])
            ->orderBy('ordre')
            ->orderBy('id')
            ->get()
            ->map(fn ($chapitre) => '- '.$chapitre->titre.($chapitre->notions->isEmpty() ? '' : ' : '.$chapitre->notions->pluck('titre')->implode(' ; ')))
            ->take(40)
            ->implode("\n");

        return implode("\n", [
            '<contexte>',
            'Examen : '.self::examen($profil),
            'Matière : '.$matiere->nom,
            'Question libre de l’élève, dans cette matière.',
            '',
            'Programme étudié :',
            $programme !== '' ? $programme : '(programme pas encore saisi)',
            '</contexte>',
        ]);
    }

    private static function examen(ProfilEleve $profil): string
    {
        $examen = $profil->examen->nom;

        return $profil->serie !== null ? $examen.', série '.$profil->serie->code->value : $examen;
    }

    /**
     * @param  array<string, mixed>  $donnees
     */
    private static function choix(TypeQuestion $type, array $donnees): string
    {
        return match ($type) {
            TypeQuestion::QcmUne, TypeQuestion::QcmPlusieurs => 'Choix proposés :'."\n".self::elements($donnees['options'] ?? []),
            TypeQuestion::Appariement => 'À gauche :'."\n".self::elements($donnees['gauche'] ?? [])."\nÀ droite :\n".self::elements($donnees['droite'] ?? []),
            TypeQuestion::Ordre => 'Éléments à remettre en ordre :'."\n".self::elements($donnees['elements'] ?? []),
            TypeQuestion::Trous => 'Texte à trous : '.self::segments($donnees['segments'] ?? []),
            TypeQuestion::Ouverte => 'Barème :'."\n".implode("\n", array_map(
                fn (array $c) => '- '.($c['critere'] ?? '').' ('.($c['points'] ?? 0).' pt)',
                array_filter((array) ($donnees['bareme'] ?? []), 'is_array'),
            )),
            default => '',
        };
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function attendue(TypeQuestion $type, array $donnees, array $attendue): string
    {
        return match ($type) {
            TypeQuestion::QcmUne => self::libelleOption($donnees['options'] ?? [], (string) ($attendue['option'] ?? '')),
            TypeQuestion::QcmPlusieurs => implode(' ; ', array_map(fn ($id) => self::libelleOption($donnees['options'] ?? [], (string) $id), (array) ($attendue['options'] ?? []))),
            TypeQuestion::VraiFaux => ($attendue['valeur'] ?? false) ? 'Vrai' : 'Faux',
            TypeQuestion::Numerique => trim(str_replace('.', ',', (string) ($attendue['valeur'] ?? '')).' '.($donnees['unite'] ?? '')),
            TypeQuestion::Courte => (string) (((array) ($attendue['acceptees'] ?? []))[0] ?? ''),
            TypeQuestion::Trous => implode(' ; ', array_map(fn ($formes) => (string) (((array) $formes)[0] ?? ''), (array) ($attendue['trous'] ?? []))),
            TypeQuestion::Appariement => implode(' ; ', array_map(
                fn ($g, $d) => self::libelleOption($donnees['gauche'] ?? [], (string) $g).' ↔ '.self::libelleOption($donnees['droite'] ?? [], (string) $d),
                array_keys((array) ($attendue['paires'] ?? [])),
                (array) ($attendue['paires'] ?? []),
            )),
            TypeQuestion::Ordre => implode(' → ', array_map(fn ($id) => self::libelleOption($donnees['elements'] ?? [], (string) $id), (array) ($attendue['ordre'] ?? []))),
            TypeQuestion::Ouverte => '',
        };
    }

    /**
     * La réponse de l'élève, dans les mots de l'énoncé. Une rédaction est
     * coupée (le tuteur n'en a pas besoin entière pour expliquer).
     *
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $reponse
     */
    private static function reponse(TypeQuestion $type, array $donnees, array $reponse): string
    {
        $texte = match ($type) {
            TypeQuestion::QcmUne => self::libelleOption($donnees['options'] ?? [], (string) ($reponse['option'] ?? '')),
            TypeQuestion::QcmPlusieurs => implode(' ; ', array_map(fn ($id) => self::libelleOption($donnees['options'] ?? [], (string) $id), (array) ($reponse['options'] ?? []))),
            TypeQuestion::VraiFaux => ($reponse['valeur'] ?? null) === null ? '' : (($reponse['valeur']) ? 'Vrai' : 'Faux'),
            TypeQuestion::Numerique => (string) ($reponse['valeur'] ?? ''),
            TypeQuestion::Courte, TypeQuestion::Ouverte => (string) ($reponse['texte'] ?? ''),
            TypeQuestion::Trous => implode(' ; ', array_map('strval', (array) ($reponse['trous'] ?? []))),
            TypeQuestion::Appariement => implode(' ; ', array_map(
                fn ($g, $d) => self::libelleOption($donnees['gauche'] ?? [], (string) $g).' ↔ '.self::libelleOption($donnees['droite'] ?? [], (string) $d),
                array_keys((array) ($reponse['paires'] ?? [])),
                (array) ($reponse['paires'] ?? []),
            )),
            TypeQuestion::Ordre => implode(' → ', array_map(fn ($id) => self::libelleOption($donnees['elements'] ?? [], (string) $id), (array) ($reponse['ordre'] ?? []))),
        };

        $texte = Confidentialite::nettoyer($texte);

        return mb_strlen($texte) > 600 ? mb_substr($texte, 0, 600).'…' : ($texte !== '' ? $texte : '(pas de réponse)');
    }

    private static function elements(mixed $liste): string
    {
        return implode("\n", array_map(
            fn (array $e) => '- '.self::texteElement($e),
            array_filter(is_array($liste) ? $liste : [], 'is_array'),
        ));
    }

    private static function libelleOption(mixed $liste, string $id): string
    {
        foreach (is_array($liste) ? $liste : [] as $element) {
            if (is_array($element) && ($element['id'] ?? null) === $id) {
                return self::texteElement($element);
            }
        }

        return $id;
    }

    /**
     * @param  array<string, mixed>  $element
     */
    private static function texteElement(array $element): string
    {
        return trim(((string) ($element['texte'] ?? '')).(isset($element['latex']) ? ' $'.$element['latex'].'$' : ''));
    }

    private static function segments(mixed $segments): string
    {
        return implode('', array_map(
            fn (array $s) => isset($s['trou']) ? ' ___ ' : (string) ($s['texte'] ?? ''),
            array_filter(is_array($segments) ? $segments : [], 'is_array'),
        ));
    }
}
