<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Models\Question;
use App\Models\Seance;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use App\Services\TentativeService;
use App\Support\FormatQuestion;
use Closure;

/**
 * `tentative.enregistrer` (HORS_LIGNE.md A.6, priorité 1) :
 * TentativeService::enregistrer. La charge porte la version vue (A.9) et la
 * réponse dans la forme de son type (FormatQuestion) ; une réponse mal
 * formée mais bien bornée est acceptée et vaut 0.
 */
class EnregistrerTentative implements GestionnaireOperation
{
    public const TYPE = 'tentative.enregistrer';

    public function __construct(private TentativeService $tentatives) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'question' => ['required', 'uuid'],
            'version' => ['required', 'integer', 'min:1'],
            'reponse' => ['required', 'array:option,options,valeur,texte,trous,paires,ordre'],
            'reponse.option' => ['sometimes', 'nullable', 'string', 'max:10'],
            'reponse.options' => ['sometimes', 'array', 'max:6'],
            'reponse.options.*' => ['string', 'max:10'],
            'reponse.valeur' => ['sometimes', 'nullable', function (string $attribut, mixed $valeur, Closure $echec) {
                if (! is_bool($valeur) && ! is_int($valeur) && ! is_float($valeur) && ! (is_string($valeur) && mb_strlen($valeur) <= 40)) {
                    $echec('La valeur est un nombre, un texte court ou vrai / faux.');
                }
            }],
            'reponse.texte' => ['sometimes', 'nullable', 'string', 'max:'.FormatQuestion::REDACTION_MAX],
            'reponse.trous' => ['sometimes', 'array', 'max:10'],
            'reponse.trous.*' => ['nullable', 'string', 'max:'.FormatQuestion::ACCEPTEE_MAX],
            'reponse.paires' => ['sometimes', 'array', 'max:6'],
            'reponse.paires.*' => ['nullable', 'string', 'max:10'],
            'reponse.ordre' => ['sometimes', 'array', 'max:8'],
            'reponse.ordre.*' => ['string', 'max:10'],
            'seance' => ['nullable', 'uuid'],
            'duree_secondes' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'indices_utilises' => ['nullable', 'integer', 'min:0', 'max:'.FormatQuestion::INDICES_MAX],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        $question = Question::query()->where('uuid', $charge['question'])->first()
            ?? throw new OperationRejetee('Cette question n\'existe plus.');
        $seance = null;

        if (($charge['seance'] ?? null) !== null) {
            $seance = Seance::query()->where('uuid', $charge['seance'])->first()
                ?? throw new OperationRejetee('Cette séance n\'existe plus.');
        }

        return $this->tentatives->enregistrer(
            $contexte->auteur,
            $contexte->uuid,
            $question,
            (int) $charge['version'],
            $charge['reponse'],
            $seance,
            isset($charge['duree_secondes']) ? (int) $charge['duree_secondes'] : null,
            $contexte->saisiLe,
            $contexte->recuLe,
            (int) ($charge['indices_utilises'] ?? 0),
        );
    }
}
