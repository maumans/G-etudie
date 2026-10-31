<?php

namespace App\Services;

use App\Enums\DecisionRelecture;
use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Models\Contracts\ContenuRelisable;
use App\Models\Lecon;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use App\Models\VersionContenu;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use App\Support\Perimetre;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Le circuit d'un contenu (PLAN M17) — leçons, questions et annales (les
 * questions d'une annale suivent leur sujet : App\Services\Annales\SujetService) : brouillon →
 * en relecture → publié (→ archivé), renvoi avec commentaire, historique
 * des versions. Seule porte qui change le statut d'un contenu : les
 * contrôleurs et les seeders passent par ici, et chaque transition
 * revérifie, sous verrou, le statut et le rattachement de l'acteur (la
 * policy ne suffit pas : deux onglets, deux relecteurs peuvent agir en même
 * temps).
 *
 * Règle d'or : **rien n'est publié sans un relecteur différent de
 * l'auteur** — ni l'auteur du contenu, ni celui de la version relue.
 */
class ContenuService
{
    public function creerLecon(User $auteur, Notion $notion, string $titre, bool $estExemple = false): Lecon
    {
        $this->exiger($auteur->can(Permission::RedigerContenu->value), 'Vous ne pouvez pas rédiger de leçon.');

        return Lecon::create([
            'uuid' => (string) Str::uuid7(),
            'notion_id' => $notion->id,
            'titre' => $titre,
            'statut' => StatutContenu::Brouillon,
            'auteur_id' => $auteur->id,
            'brouillon' => BlocsContenu::vide(),
            'revision' => 0,
            'est_exemple' => $estExemple,
        ]);
    }

    /**
     * Enregistre le brouillon. `revision` est celle que l'éditeur a chargée :
     * si la leçon a été enregistrée ailleurs entre-temps, rien n'est écrasé.
     *
     * @param  array<string, mixed>  $blocs
     */
    public function enregistrerBrouillon(Lecon $lecon, User $acteur, string $titre, array $blocs, int $revision, ?Notion $notion = null): Lecon
    {
        $erreur = BlocsContenu::erreur($blocs);

        if ($erreur === null) {
            $citees = BlocsContenu::questionsCitees($blocs);

            if (Question::query()->whereIn('uuid', $citees)->count() !== count($citees)) {
                $erreur = 'Une mini-question renvoie à une question qui n\'existe pas.';
            }
        }

        if ($erreur !== null) {
            throw ValidationException::withMessages(['blocs' => $erreur]);
        }

        return $this->ecrireBrouillon($lecon, $acteur, $revision, fn (Lecon $lecon) => $lecon->forceFill([
            'titre' => $titre,
            'brouillon' => $blocs,
            'notion_id' => $notion->id ?? $lecon->notion_id,
        ]));
    }

    public function creerQuestion(User $auteur, Notion $notion, TypeQuestion $type, bool $estExemple = false): Question
    {
        $this->exiger($auteur->can(Permission::RedigerContenu->value), 'Vous ne pouvez pas rédiger de question.');

        return Question::create([
            'uuid' => (string) Str::uuid7(),
            'notion_id' => $notion->id,
            'auteur_id' => $auteur->id,
            'type' => $type,
            'enonce' => BlocsContenu::vide(),
            'donnees' => [],
            'reponse_attendue' => [],
            'indices' => [],
            'corrige' => [],
            'difficulte' => 2,
            'source' => 'maison',
            'statut' => StatutContenu::Brouillon,
            'revision' => 0,
            'est_exemple' => $estExemple,
        ]);
    }

    /**
     * Enregistre le brouillon d'une question. Un brouillon peut être
     * incomplet (options pas encore écrites) mais jamais mal formé ; la
     * vérification complète (FormatQuestion) se fait à l'envoi en relecture.
     * Les indices et les étapes laissés vides ne sont pas gardés.
     *
     * @param  array{enonce: array<string, mixed>, donnees: array<string, mixed>, attendue: array<string, mixed>, indices: list<mixed>, corrige: list<mixed>, difficulte: int}  $champs
     */
    public function enregistrerQuestion(Question $question, User $acteur, array $champs, int $revision, ?Notion $notion = null): Question
    {
        $nonVide = fn (mixed $doc) => is_array($doc) && ($doc['content'] ?? []) !== [];
        $indices = array_values(array_filter($champs['indices'], $nonVide));
        $corrige = array_values(array_filter($champs['corrige'], fn (mixed $etape) => is_array($etape) && $nonVide($etape['blocs'] ?? null)));

        $erreur = BlocsContenu::erreur($champs['enonce'])
            ?? FormatQuestion::erreurAides($indices, $corrige);

        if ($erreur === null && strlen((string) json_encode([$champs['donnees'], $champs['attendue']])) > BlocsContenu::POIDS_MAX_OCTETS) {
            $erreur = 'La question est trop lourde (100 Ko au plus).';
        }

        if ($erreur !== null) {
            throw ValidationException::withMessages(['question' => $erreur]);
        }

        return $this->ecrireBrouillon($question, $acteur, $revision, fn (Question $question) => $question->forceFill([
            'enonce' => $champs['enonce'],
            'extrait' => Question::titreDe($champs['enonce']),
            'donnees' => $champs['donnees'],
            'reponse_attendue' => $champs['attendue'],
            'indices' => $indices,
            'corrige' => $corrige,
            'difficulte' => $champs['difficulte'],
            'notion_id' => $notion->id ?? $question->notion_id,
        ]));
    }

    /**
     * Enregistre les renseignements d'une annale (titre, durée et coefficient
     * imprimés, référence des droits), avec le même verrou que les autres
     * brouillons. Parties et questions : App\Services\Annales\SujetService.
     *
     * @param  array{titre: string, session: int, duree_minutes: int|null, coefficient: string|null, droits: string|null}  $champs
     */
    public function enregistrerSujet(Sujet $sujet, User $acteur, array $champs, int $revision): Sujet
    {
        return $this->ecrireBrouillon($sujet, $acteur, $revision, fn (Sujet $sujet) => $sujet->forceFill($champs));
    }

    /**
     * Un contenu publié repasse en brouillon ; sa version publiée reste en ligne.
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function ouvrirModification(ContenuRelisable $contenu, User $acteur): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur) {
            $nom = $contenu->nomContenu();
            $this->exiger(Perimetre::peutRediger($acteur, $contenu), "Vous ne pouvez pas modifier cette {$nom}.");
            $this->exigerStatut($contenu, [StatutContenu::Publie], "Seule une {$nom} publiée s'ouvre à la modification.");

            $contenu->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /**
     * Fige une version et la confie à un relecteur.
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function soumettre(ContenuRelisable $contenu, User $acteur): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur) {
            $nom = $contenu->nomContenu();
            $this->exiger(Perimetre::peutRediger($acteur, $contenu), "Vous ne pouvez pas envoyer cette {$nom} en relecture.");
            $this->exigerStatut($contenu, [StatutContenu::Brouillon], 'Seul un brouillon part en relecture.');

            $erreur = $contenu->erreurAvantRelecture();

            if ($erreur !== null) {
                throw ValidationException::withMessages(['blocs' => $erreur]);
            }

            $instantane = $contenu->instantane();

            $contenu->versions()->create([
                'numero' => ((int) $contenu->versions()->max('numero')) + 1,
                'titre' => $instantane['titre'],
                'blocs' => $instantane['blocs'],
                'auteur_id' => $acteur->id,
                'soumise_le' => now(),
            ]);

            $contenu->forceFill(['statut' => StatutContenu::EnRelecture])->save();
        });
    }

    /**
     * L'auteur reprend son contenu avant toute décision du relecteur.
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function reprendre(ContenuRelisable $contenu, User $acteur): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur) {
            $nom = $contenu->nomContenu();
            $this->exiger(Perimetre::peutRediger($acteur, $contenu), "Vous ne pouvez pas reprendre cette {$nom}.");
            $this->exigerStatut($contenu, [StatutContenu::EnRelecture], "Cette {$nom} n'est plus en relecture.");

            $this->decider($contenu, $acteur, DecisionRelecture::Retiree, null);
            $contenu->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /**
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function publier(ContenuRelisable $contenu, User $relecteur, ?string $commentaire = null): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($relecteur, $commentaire) {
            $this->exigerStatut($contenu, [StatutContenu::EnRelecture], "Cette {$contenu->nomContenu()} n'attend plus de relecture.");
            $this->exigerRelecteur($contenu, $relecteur);

            $version = $this->decider($contenu, $relecteur, DecisionRelecture::Publiee, $commentaire);

            $contenu->forceFill([
                'statut' => StatutContenu::Publie,
                'version_publiee_id' => $version->id,
                'publie_le' => now(),
            ])->save();
        });
    }

    /**
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function renvoyer(ContenuRelisable $contenu, User $relecteur, string $commentaire): ContenuRelisable
    {
        if (mb_strlen(trim($commentaire)) < 10) {
            throw ValidationException::withMessages(['commentaire' => 'Dites à l\'auteur ce qu\'il faut reprendre (10 caractères au moins).']);
        }

        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($relecteur, $commentaire) {
            $this->exigerStatut($contenu, [StatutContenu::EnRelecture], "Cette {$contenu->nomContenu()} n'attend plus de relecture.");
            $this->exigerRelecteur($contenu, $relecteur);

            $this->decider($contenu, $relecteur, DecisionRelecture::Renvoyee, trim($commentaire));
            $contenu->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /**
     * Retire un contenu du catalogue (l'élève ne le voit plus) ; ses versions
     * restent, et les tentatives d'une question retirée aussi (A.9).
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function archiver(ContenuRelisable $contenu, User $acteur): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur) {
            $nom = $contenu->nomContenu();
            $this->exiger($acteur->can(Permission::AdministrerContenu->value), "Seul le responsable pédagogique archive une {$nom}.");
            $this->exigerStatut($contenu, [StatutContenu::Brouillon, StatutContenu::Publie], "Une {$nom} en relecture ne s'archive pas : décidez d'abord.");

            $contenu->forceFill(['statut' => StatutContenu::Archive])->save();
        });
    }

    /**
     * Un contenu archivé revient en brouillon (sa dernière version publiée reste notée).
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @return T
     */
    public function restaurer(ContenuRelisable $contenu, User $acteur): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur) {
            $nom = $contenu->nomContenu();
            $this->exiger($acteur->can(Permission::AdministrerContenu->value), "Seul le responsable pédagogique restaure une {$nom}.");
            $this->exigerStatut($contenu, [StatutContenu::Archive], "Cette {$nom} n'est pas archivée.");

            $contenu->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /**
     * Écrit un brouillon sous verrou, avec le verrou optimiste `revision` :
     * deux onglets ne s'écrasent pas en silence.
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @param  Closure(T): Model  $remplir
     * @return T
     */
    private function ecrireBrouillon(ContenuRelisable $contenu, User $acteur, int $revision, Closure $remplir): ContenuRelisable
    {
        return $this->transition($contenu, function (ContenuRelisable $contenu) use ($acteur, $revision, $remplir) {
            $nom = $contenu->nomContenu();
            $this->exiger(Perimetre::peutRediger($acteur, $contenu), "Vous ne pouvez pas modifier cette {$nom}.");
            $this->exigerStatut($contenu, [StatutContenu::Brouillon], 'Seul un brouillon se modifie. Ouvrez d\'abord une modification.');

            if ($contenu->revisionCourante() !== $revision) {
                throw ValidationException::withMessages([
                    'revision' => "Cette {$nom} a été enregistrée ailleurs (autre onglet ou autre personne). Rechargez-la avant de continuer : vos dernières modifications n'ont pas été enregistrées.",
                ]);
            }

            $remplir($contenu)->forceFill(['revision' => $contenu->revisionCourante() + 1])->save();
        });
    }

    /**
     * Exécute une transition sous verrou, sur la ligne relue en base.
     *
     * @template T of Model&ContenuRelisable
     *
     * @param  T  $contenu
     * @param  Closure(T): void  $etape
     * @return T
     */
    private function transition(ContenuRelisable $contenu, Closure $etape): ContenuRelisable
    {
        return DB::transaction(function () use ($contenu, $etape) {
            /** @var T $fraiche */
            $fraiche = $contenu->newQuery()->whereKey($contenu->getKey())->lockForUpdate()->firstOrFail();
            $etape($fraiche);

            return $fraiche;
        });
    }

    private function decider(ContenuRelisable $contenu, User $acteur, DecisionRelecture $decision, ?string $commentaire): VersionContenu
    {
        $version = $contenu->versionEnRelecture()
            ?? throw ValidationException::withMessages(['statut' => 'Aucune version n\'attend de relecture.']);

        $version->forceFill([
            'decision' => $decision,
            'decide_par_id' => $acteur->id,
            'decide_le' => now(),
            'commentaire' => $commentaire !== null && trim($commentaire) !== '' ? trim($commentaire) : null,
        ])->save();

        return $version;
    }

    private function exigerRelecteur(ContenuRelisable $contenu, User $relecteur): void
    {
        $nom = $contenu->nomContenu();

        $this->exiger(
            Perimetre::peutRelire($relecteur, $contenu),
            Perimetre::estAuteurDe($relecteur, $contenu)
                ? "Vous avez écrit cette {$nom} : un autre relecteur doit la relire."
                : "Vous ne pouvez pas relire cette {$nom}.",
        );
    }

    /**
     * @param  list<StatutContenu>  $permis
     */
    private function exigerStatut(ContenuRelisable $contenu, array $permis, string $message): void
    {
        if (! in_array($contenu->statutDuContenu(), $permis, true)) {
            throw ValidationException::withMessages(['statut' => $message]);
        }
    }

    private function exiger(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new AuthorizationException($message);
        }
    }
}
