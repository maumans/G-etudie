<?php

namespace App\Services\HorsLigne;

/**
 * Un type d'opération de la file (HORS_LIGNE.md A.3.6, « brancher un type »).
 *
 * `executer()` appelle le service métier, et seulement lui : jamais de règle
 * métier ici. Si une route en ligne fait le même geste, elle appelle la même
 * méthode du même service. Refuser = lever OperationRejetee ; un geste déjà
 * dépassé est accepté sans rien rejouer.
 */
interface GestionnaireOperation
{
    /** La permission exigée de l'auteur : la même que la route en ligne. */
    public function permission(): string;

    /**
     * La même validation que le FormRequest de la route en ligne.
     *
     * @return array<string, mixed>
     */
    public function regles(): array;

    /**
     * @param  array<string, mixed>  $charge  charge déjà validée
     * @return array<string, mixed> le résultat renvoyé à l'appareil
     */
    public function executer(ContexteOperation $contexte, array $charge): array;
}
