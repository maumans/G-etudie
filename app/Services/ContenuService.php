<?php

namespace App\Services;

use App\Enums\DecisionRelecture;
use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Models\Lecon;
use App\Models\Notion;
use App\Models\User;
use App\Models\VersionContenu;
use App\Support\BlocsContenu;
use App\Support\Perimetre;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Le circuit d'un contenu (PLAN M17) : brouillon → en relecture → publié
 * (→ archivé), renvoi avec commentaire, historique des versions. Seule porte
 * qui change le statut d'une leçon : les contrôleurs et les seeders passent
 * par ici, et chaque transition revérifie, sous verrou, le statut et le
 * rattachement de l'acteur (la policy ne suffit pas : deux onglets, deux
 * relecteurs peuvent agir en même temps).
 *
 * Règle d'or : **rien n'est publié sans un relecteur différent de
 * l'auteur** — ni l'auteur de la leçon, ni celui de la version relue.
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

        if ($erreur !== null) {
            throw ValidationException::withMessages(['blocs' => $erreur]);
        }

        return $this->transition($lecon, function (Lecon $lecon) use ($acteur, $titre, $blocs, $revision, $notion) {
            $this->exiger(Perimetre::peutRedigerLecon($acteur, $lecon), 'Vous ne pouvez pas modifier cette leçon.');
            $this->exigerStatut($lecon, [StatutContenu::Brouillon], 'Seul un brouillon se modifie. Ouvrez d\'abord une modification.');

            if ($lecon->revision !== $revision) {
                throw ValidationException::withMessages([
                    'revision' => 'Cette leçon a été enregistrée ailleurs (autre onglet ou autre personne). Rechargez-la avant de continuer : vos dernières modifications n\'ont pas été enregistrées.',
                ]);
            }

            $lecon->forceFill([
                'titre' => $titre,
                'brouillon' => $blocs,
                'notion_id' => $notion->id ?? $lecon->notion_id,
                'revision' => $lecon->revision + 1,
            ])->save();
        });
    }

    /** Une leçon publiée repasse en brouillon ; sa version publiée reste en ligne. */
    public function ouvrirModification(Lecon $lecon, User $acteur): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($acteur) {
            $this->exiger(Perimetre::peutRedigerLecon($acteur, $lecon), 'Vous ne pouvez pas modifier cette leçon.');
            $this->exigerStatut($lecon, [StatutContenu::Publie], 'Seule une leçon publiée s\'ouvre à la modification.');

            $lecon->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /** Fige une version et la confie à un relecteur. */
    public function soumettre(Lecon $lecon, User $acteur): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($acteur) {
            $this->exiger(Perimetre::peutRedigerLecon($acteur, $lecon), 'Vous ne pouvez pas envoyer cette leçon en relecture.');
            $this->exigerStatut($lecon, [StatutContenu::Brouillon], 'Seul un brouillon part en relecture.');

            if (($lecon->brouillon['content'] ?? []) === [] || trim($lecon->titre) === '') {
                throw ValidationException::withMessages(['blocs' => 'Une leçon vide ne part pas en relecture.']);
            }

            $lecon->versions()->create([
                'numero' => ((int) $lecon->versions()->max('numero')) + 1,
                'titre' => $lecon->titre,
                'blocs' => $lecon->brouillon,
                'auteur_id' => $acteur->id,
                'soumise_le' => now(),
            ]);

            $lecon->forceFill(['statut' => StatutContenu::EnRelecture])->save();
        });
    }

    /** L'auteur reprend sa leçon avant toute décision du relecteur. */
    public function reprendre(Lecon $lecon, User $acteur): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($acteur) {
            $this->exiger(Perimetre::peutRedigerLecon($acteur, $lecon), 'Vous ne pouvez pas reprendre cette leçon.');
            $this->exigerStatut($lecon, [StatutContenu::EnRelecture], 'Cette leçon n\'est plus en relecture.');

            $this->decider($lecon, $acteur, DecisionRelecture::Retiree, null);
            $lecon->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    public function publier(Lecon $lecon, User $relecteur, ?string $commentaire = null): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($relecteur, $commentaire) {
            $this->exigerStatut($lecon, [StatutContenu::EnRelecture], 'Cette leçon n\'attend plus de relecture.');
            $this->exigerRelecteur($lecon, $relecteur);

            $version = $this->decider($lecon, $relecteur, DecisionRelecture::Publiee, $commentaire);

            $lecon->forceFill([
                'statut' => StatutContenu::Publie,
                'version_publiee_id' => $version->id,
                'publie_le' => now(),
            ])->save();
        });
    }

    public function renvoyer(Lecon $lecon, User $relecteur, string $commentaire): Lecon
    {
        if (mb_strlen(trim($commentaire)) < 10) {
            throw ValidationException::withMessages(['commentaire' => 'Dites à l\'auteur ce qu\'il faut reprendre (10 caractères au moins).']);
        }

        return $this->transition($lecon, function (Lecon $lecon) use ($relecteur, $commentaire) {
            $this->exigerStatut($lecon, [StatutContenu::EnRelecture], 'Cette leçon n\'attend plus de relecture.');
            $this->exigerRelecteur($lecon, $relecteur);

            $this->decider($lecon, $relecteur, DecisionRelecture::Renvoyee, trim($commentaire));
            $lecon->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /** Retire une leçon du catalogue (l'élève ne la voit plus) ; ses versions restent. */
    public function archiver(Lecon $lecon, User $acteur): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($acteur) {
            $this->exiger($acteur->can(Permission::AdministrerContenu->value), 'Seul le responsable pédagogique archive une leçon.');
            $this->exigerStatut($lecon, [StatutContenu::Brouillon, StatutContenu::Publie], 'Une leçon en relecture ne s\'archive pas : décidez d\'abord.');

            $lecon->forceFill(['statut' => StatutContenu::Archive])->save();
        });
    }

    /** Une leçon archivée revient en brouillon (sa dernière version publiée reste notée). */
    public function restaurer(Lecon $lecon, User $acteur): Lecon
    {
        return $this->transition($lecon, function (Lecon $lecon) use ($acteur) {
            $this->exiger($acteur->can(Permission::AdministrerContenu->value), 'Seul le responsable pédagogique restaure une leçon.');
            $this->exigerStatut($lecon, [StatutContenu::Archive], 'Cette leçon n\'est pas archivée.');

            $lecon->forceFill(['statut' => StatutContenu::Brouillon])->save();
        });
    }

    /**
     * Exécute une transition sous verrou, sur la ligne relue en base.
     *
     * @param  Closure(Lecon): void  $etape
     */
    private function transition(Lecon $lecon, Closure $etape): Lecon
    {
        return DB::transaction(function () use ($lecon, $etape) {
            $fraiche = Lecon::query()->whereKey($lecon->getKey())->lockForUpdate()->firstOrFail();
            $etape($fraiche);

            return $fraiche;
        });
    }

    private function decider(Lecon $lecon, User $acteur, DecisionRelecture $decision, ?string $commentaire): VersionContenu
    {
        $version = $lecon->versionEnRelecture()
            ?? throw ValidationException::withMessages(['statut' => 'Aucune version n\'attend de relecture.']);

        $version->forceFill([
            'decision' => $decision,
            'decide_par_id' => $acteur->id,
            'decide_le' => now(),
            'commentaire' => $commentaire !== null && trim($commentaire) !== '' ? trim($commentaire) : null,
        ])->save();

        return $version;
    }

    private function exigerRelecteur(Lecon $lecon, User $relecteur): void
    {
        $this->exiger(
            Perimetre::peutRelireLecon($relecteur, $lecon),
            Perimetre::estAuteurDe($relecteur, $lecon)
                ? 'Vous avez écrit cette leçon : un autre relecteur doit la relire.'
                : 'Vous ne pouvez pas relire cette leçon.',
        );
    }

    /**
     * @param  list<StatutContenu>  $permis
     */
    private function exigerStatut(Lecon $lecon, array $permis, string $message): void
    {
        if (! in_array($lecon->statut, $permis, true)) {
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
