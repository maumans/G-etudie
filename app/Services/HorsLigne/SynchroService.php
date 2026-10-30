<?php

namespace App\Services\HorsLigne;

use App\Models\Appareil;
use App\Models\OperationSynchronisee;
use App\Models\User;
use App\Support\Uuid7;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Exécute un lot d'opérations venu de la file de l'appareil (HORS_LIGNE.md
 * A.3.6). Cinq verdicts :
 *
 * - `acceptee` : exécutée, mémorisée ;
 * - `deja_recue` : même `uuid` déjà traité, verdict d'origine renvoyé, rien
 *   n'est rejoué ;
 * - `rejetee` : refus métier définitif, mémorisé avec sa charge ;
 * - `reporte` : dépendance pas encore arrivée, ou auteur pas connecté sur cet
 *   appareil — jamais mémorisé ;
 * - `erreur` : exception inattendue — jamais mémorisée, l'opération sera
 *   renvoyée.
 *
 * @phpstan-type Verdict array{uuid: string, verdict: string, origine?: string, resultat?: array<string, mixed>|null, motif?: string}
 */
class SynchroService
{
    public const ACCEPTEE = 'acceptee';

    public const DEJA_RECUE = 'deja_recue';

    public const REJETEE = 'rejetee';

    public const REPORTE = 'reporte';

    public const ERREUR = 'erreur';

    public function __construct(private RegistreOperations $registre) {}

    /**
     * @param  list<array<string, mixed>>  $operations
     * @return list<Verdict>
     */
    public function traiter(User $connecte, Appareil $appareil, Horloge $horloge, array $operations): array
    {
        $recuLe = CarbonImmutable::now();

        return array_map(
            fn (array $operation) => $this->traiterUne($connecte, $appareil, $horloge, $recuLe, $operation),
            $operations,
        );
    }

    /**
     * @param  array<string, mixed>  $operation
     * @return Verdict
     */
    private function traiterUne(User $connecte, Appareil $appareil, Horloge $horloge, CarbonImmutable $recuLe, array $operation): array
    {
        $uuid = (string) ($operation['uuid'] ?? '');

        // Un identifiant qui n'est pas un v7 ne peut pas servir de clé
        // d'idempotence ordonnée : refusé, sans rien mémoriser.
        if (! Uuid7::estValide($uuid)) {
            return ['uuid' => $uuid, 'verdict' => self::REJETEE, 'motif' => 'Identifiant de geste invalide.'];
        }

        $existante = OperationSynchronisee::where('uuid', $uuid)->first();

        if ($existante !== null) {
            return $this->dejaRecue($existante, (int) ($operation['auteur_id'] ?? 0));
        }

        $auteur = User::find((int) ($operation['auteur_id'] ?? 0));

        // Lot 0 : une seule session par appareil, celle de l'auteur. Les
        // gestes d'un autre profil attendent sa connexion (HL6, lot 7).
        if ($auteur === null || $auteur->isNot($connecte) || ! $appareil->aPourProfil($auteur)) {
            return ['uuid' => $uuid, 'verdict' => self::REPORTE, 'motif' => 'Profil non connecté sur cet appareil.'];
        }

        $saisiLeAppareil = CarbonImmutable::parse((string) ($operation['saisi_le'] ?? $recuLe->toIso8601String()));
        $contexte = new ContexteOperation(
            auteur: $auteur,
            appareil: $appareil,
            uuid: $uuid,
            saisiLe: $horloge->corriger($saisiLeAppareil),
            recuLe: $recuLe,
            decalageSecondes: $horloge->decalageSecondes(),
            horlogeSuspecte: $horloge->estSuspecte($saisiLeAppareil, $recuLe),
        );
        $type = (string) ($operation['type'] ?? '');
        $charge = is_array($operation['charge'] ?? null) ? $operation['charge'] : [];

        $dependance = $operation['depend_de'] ?? null;

        if (is_string($dependance) && $dependance !== '') {
            $prealable = OperationSynchronisee::where('uuid', $dependance)->first();

            if ($prealable === null) {
                return ['uuid' => $uuid, 'verdict' => self::REPORTE, 'motif' => 'Un geste précédent n\'est pas encore arrivé.'];
            }

            if ($prealable->verdict === self::REJETEE) {
                return $this->rejeter($contexte, $type, $charge, 'Ce geste dépend d\'un geste refusé.');
            }
        }

        $gestionnaire = $this->registre->gestionnaire($type);

        if ($gestionnaire === null) {
            return $this->rejeter($contexte, $type, $charge, 'Ce geste n\'est pas reconnu par le serveur.');
        }

        if ($auteur->estDesactive() && $auteur->desactive_le->lessThanOrEqualTo($contexte->saisiLe)) {
            return $this->rejeter($contexte, $type, $charge, 'Ce compte était désactivé au moment du geste.');
        }

        if (! $auteur->can($gestionnaire->permission())) {
            return $this->rejeter($contexte, $type, $charge, 'Ce compte ne peut pas faire ce geste.');
        }

        try {
            $valide = Validator::make($charge, $gestionnaire->regles())->validate();
        } catch (ValidationException $exception) {
            return $this->rejeter($contexte, $type, $charge, (string) collect($exception->errors())->flatten()->first());
        }

        return $this->executer($contexte, $type, $gestionnaire, $valide, $charge);
    }

    /**
     * La ligne est insérée **en premier**, dans la même transaction que le
     * travail : un envoi concurrent identique bute sur l'index unique.
     *
     * @param  array<string, mixed>  $valide
     * @param  array<string, mixed>  $charge
     * @return Verdict
     */
    private function executer(ContexteOperation $contexte, string $type, GestionnaireOperation $gestionnaire, array $valide, array $charge): array
    {
        try {
            return DB::transaction(function () use ($contexte, $type, $gestionnaire, $valide) {
                $ligne = OperationSynchronisee::create($this->ligne($contexte, $type, self::ACCEPTEE));

                $resultat = $this->enTantQue($contexte->auteur, fn () => $gestionnaire->executer($contexte, $valide));

                $ligne->update(['resultat' => $resultat]);

                return ['uuid' => $contexte->uuid, 'verdict' => self::ACCEPTEE, 'resultat' => $resultat];
            });
        } catch (UniqueConstraintViolationException) {
            return $this->apresConcurrence($contexte);
        } catch (OperationRejetee $refus) {
            return $this->rejeter($contexte, $type, $charge, $refus->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return ['uuid' => $contexte->uuid, 'verdict' => self::ERREUR, 'motif' => 'Erreur passagère du serveur.'];
        }
    }

    /**
     * Fait de l'auteur l'utilisateur courant le temps du geste : sur un
     * téléphone partagé, sans cela, tout serait attribué à la personne
     * connectée au retour du réseau.
     *
     * @template T
     *
     * @param  Closure(): T  $geste
     * @return T
     */
    public function enTantQue(User $auteur, Closure $geste): mixed
    {
        $garde = Auth::guard('web');
        $precedent = $garde->user();
        $garde->setUser($auteur);

        try {
            return $geste();
        } finally {
            $precedent === null ? $garde->forgetUser() : $garde->setUser($precedent);
        }
    }

    /**
     * @param  array<string, mixed>  $charge
     * @return Verdict
     */
    private function rejeter(ContexteOperation $contexte, string $type, array $charge, string $motif): array
    {
        try {
            OperationSynchronisee::create([
                ...$this->ligne($contexte, $type, self::REJETEE),
                'charge' => $charge,
                'motif' => mb_substr($motif, 0, 255),
            ]);
        } catch (UniqueConstraintViolationException) {
            return $this->apresConcurrence($contexte);
        }

        return ['uuid' => $contexte->uuid, 'verdict' => self::REJETEE, 'motif' => $motif];
    }

    /**
     * Le même `uuid` vient d'être tranché par un envoi concurrent. Lecture
     * verrouillante : elle voit la dernière version validée, pas l'instantané
     * de la transaction en cours.
     *
     * @return Verdict
     */
    private function apresConcurrence(ContexteOperation $contexte): array
    {
        $gagnante = OperationSynchronisee::where('uuid', $contexte->uuid)->sharedLock()->first();

        return $gagnante === null
            ? ['uuid' => $contexte->uuid, 'verdict' => self::ERREUR, 'motif' => 'Erreur passagère du serveur.']
            : $this->dejaRecue($gagnante, $contexte->auteur->getKey());
    }

    /**
     * @return Verdict
     */
    private function dejaRecue(OperationSynchronisee $existante, int $auteurId): array
    {
        // Un même identifiant envoyé par un autre compte ne révèle rien du
        // geste d'origine.
        if ($existante->auteur_id !== null && $existante->auteur_id !== $auteurId) {
            return ['uuid' => $existante->uuid, 'verdict' => self::REJETEE, 'motif' => 'Identifiant de geste déjà utilisé.'];
        }

        return [
            'uuid' => $existante->uuid,
            'verdict' => self::DEJA_RECUE,
            'origine' => $existante->verdict,
            'resultat' => $existante->resultat,
            ...($existante->motif !== null ? ['motif' => $existante->motif] : []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ligne(ContexteOperation $contexte, string $type, string $verdict): array
    {
        return [
            'uuid' => $contexte->uuid,
            'type' => mb_substr($type, 0, 60),
            'auteur_id' => $contexte->auteur->getKey(),
            'appareil_id' => $contexte->appareil->getKey(),
            'saisi_le' => $contexte->saisiLe,
            'recu_le' => $contexte->recuLe,
            'horloge_suspecte' => $contexte->horlogeSuspecte,
            'verdict' => $verdict,
        ];
    }
}
