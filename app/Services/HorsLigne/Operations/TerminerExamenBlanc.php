<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Models\Sujet;
use App\Services\ExamenBlancService;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Rule;

/**
 * `examen_blanc.terminer` (HORS_LIGNE.md A.6, **priorité 0**, A.8) :
 * ExamenBlancService::terminer. La charge porte tout l'examen : l'annale et
 * la version passées, l'heure de début et de fin (horloge de l'appareil),
 * la durée et d'où elle vient, chaque réponse avec la version vue de sa
 * question (et les critères cochés d'une rédaction), la note affichée.
 *
 * L'`uuid` de l'opération est celui de l'examen, créé au lancement.
 */
class TerminerExamenBlanc implements GestionnaireOperation
{
    public const TYPE = 'examen_blanc.terminer';

    public const QUESTIONS_MAX = 200;

    public function __construct(private ExamenBlancService $examens) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        // La forme d'une réponse : celle de `tentative.enregistrer`.
        $reponse = [];

        foreach (app(EnregistrerTentative::class)->regles() as $champ => $regle) {
            if (str_starts_with($champ, 'reponse.')) {
                $reponse['reponses.*.'.$champ] = $regle;
            }
        }

        return [
            'sujet' => ['required', 'uuid'],
            'version' => ['required', 'integer', 'min:1'],
            'commence_le' => ['required', 'date'],
            'termine_le' => ['required', 'date'],
            'duree_minutes' => ['required', 'integer', 'between:5,600'],
            'origine_duree' => ['required', Rule::in(['imprimee', 'epreuve', 'choisie'])],
            'temps_ecoule' => ['required', 'boolean'],
            'note_appareil' => ['nullable', 'numeric', 'between:0,20'],
            'horloge_suspecte' => ['required', 'boolean'],
            'motif_horloge' => ['nullable', 'string', 'max:255'],
            'reponses' => ['present', 'array', 'max:'.self::QUESTIONS_MAX],
            'reponses.*.version' => ['required', 'integer', 'min:1'],
            'reponses.*.reponse' => ['present', 'nullable', 'array:option,options,valeur,texte,trous,paires,ordre'],
            ...$reponse,
            'reponses.*.criteres' => ['present', 'nullable', 'array', 'max:8'],
            'reponses.*.criteres.*' => ['string', 'max:10'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        $sujet = Sujet::query()->where('uuid', $charge['sujet'])->first()
            ?? throw new OperationRejetee('Cette annale n\'existe plus.');

        return $this->examens->terminer(
            $contexte->auteur,
            $contexte->uuid,
            $sujet,
            (int) $charge['version'],
            CarbonImmutable::parse($charge['commence_le']),
            CarbonImmutable::parse($charge['termine_le']),
            array_map(fn (array $r) => [
                'version' => (int) $r['version'],
                'reponse' => $r['reponse'],
                'criteres' => $r['criteres'] === null ? null : array_values($r['criteres']),
            ], $charge['reponses']),
            [
                'duree_minutes' => (int) $charge['duree_minutes'],
                'origine_duree' => $charge['origine_duree'],
                'temps_ecoule' => (bool) $charge['temps_ecoule'],
                'note_appareil' => isset($charge['note_appareil']) ? (float) $charge['note_appareil'] : null,
                'horloge_suspecte' => (bool) $charge['horloge_suspecte'],
                'motif_horloge' => $charge['motif_horloge'] ?? null,
            ],
            $contexte->horlogeSuspecte,
            $contexte->recuLe,
        );
    }
}
