<?php

namespace App\Support;

use App\Enums\StatutContenu;
use App\Models\Question;

/**
 * La question jouable de la vitrine (lot 8, PLAN M1 : « montrer plutôt que
 * dire ») : un visiteur sans compte répond, voit le verdict, déplie le
 * corrigé pas à pas.
 *
 * Source : la question publiée choisie par l'équipe
 * (`config('vitrine.question_demo')`) ; sinon une question d'exemple écrite
 * pour la vitrine, **marquée `est_exemple`** — un exercice d'entraînement de
 * niveau BEPC, pas un sujet d'examen (CLAUDE.md § 5).
 *
 * Rien n'est enregistré : un visiteur n'est pas un élève, la réponse reste
 * dans la page (écart n° 30 du journal, HORS_LIGNE.md B.5).
 */
class QuestionDemonstration
{
    /** UUID v7 fixe de la question d'exemple (jamais en base). */
    public const UUID_EXEMPLE = '019a5c00-0000-7000-8000-00000000d3e0';

    /**
     * @return array<string, mixed> au format QuestionEleve
     */
    public static function question(): array
    {
        $uuid = config('vitrine.question_demo');

        if (is_string($uuid) && $uuid !== '') {
            $question = Question::query()
                ->with(['versionPubliee', 'notion.chapitre.matiere'])
                ->where('uuid', $uuid)
                ->whereNotNull('version_publiee_id')
                ->where('statut', '!=', StatutContenu::Archive->value)
                ->first();

            $presentee = $question === null ? null : PresentationQuestion::publiee($question);

            if ($presentee !== null) {
                return $presentee;
            }
        }

        return self::exemple();
    }

    /**
     * @return array<string, mixed>
     */
    public static function exemple(): array
    {
        return [
            'uuid' => self::UUID_EXEMPLE,
            'version' => 1,
            'type' => 'qcm_une',
            'enonce' => TexteEnBlocs::convertir(
                "Mariama achète 3 cahiers au même prix et paie aussi 5 000 GNF de stylos. Elle dépense 20 000 GNF en tout.\n\n"
                .'Quel est le prix $x$ d’un cahier ? On résout $3x + 5\,000 = 20\,000$.'
            ),
            'donnees' => (object) [
                'options' => [
                    ['id' => 'a', 'texte' => '15 000 GNF'],
                    ['id' => 'b', 'texte' => '5 000 GNF'],
                    ['id' => 'c', 'texte' => '8 333 GNF'],
                    ['id' => 'd', 'texte' => '25 000 GNF'],
                ],
            ],
            'attendue' => (object) ['option' => 'b'],
            'indices' => [
                TexteEnBlocs::convertir('Commence par retirer le prix des stylos des deux côtés de l’égalité.'),
                TexteEnBlocs::convertir('Il reste $3x = 15\,000$ : que vaut un seul cahier ?'),
            ],
            'corrige' => [
                [
                    'titre' => 'Retirer le prix des stylos',
                    'blocs' => TexteEnBlocs::convertir('$3x + 5\,000 - 5\,000 = 20\,000 - 5\,000$, donc $3x = 15\,000$.'),
                ],
                [
                    'titre' => 'Diviser par 3',
                    'blocs' => TexteEnBlocs::convertir('$x = \dfrac{15\,000}{3} = 5\,000$ : un cahier coûte 5 000 GNF.'),
                ],
                [
                    'titre' => 'Vérifier',
                    'blocs' => TexteEnBlocs::convertir('$3 \times 5\,000 + 5\,000 = 20\,000$ : le compte est bon.'),
                ],
            ],
            'est_exemple' => true,
            'matiere' => 'maths',
            'matiere_nom' => 'Mathématiques',
            'notion' => 'Équations du premier degré',
            'annale' => null,
        ];
    }
}
