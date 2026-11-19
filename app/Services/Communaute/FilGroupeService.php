<?php

namespace App\Services\Communaute;

use App\Enums\MotifSignalementPublication;
use App\Models\Groupe;
use App\Models\Matiere;
use App\Models\MembreGroupe;
use App\Models\MotInterdit;
use App\Models\PublicationGroupe;
use App\Models\SignalementPublication;
use App\Models\User;
use App\Services\Organisation\GesteRefuse;
use App\Support\FiltreFil;
use App\Support\JournalAcces;
use App\Support\Perimetre;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Le fil de questions-réponses d'un groupe (lot 12, PLAN M13, décisions du
 * 2026-11-18) — seule autorité :
 *
 *  - **publié tout de suite**, après le filtre à l'envoi (FiltreFil : numéro,
 *    lien, e-mail, mots interdits) ; 500 caractères au plus ; un élève publie
 *    **10 fois par jour** au plus, et pas deux fois en 30 s ;
 *  - signé du **pseudo** de l'élève, jamais de son prénom ni de son numéro ;
 *    l'enseignant signe de son prénom et sa réponse est mise en avant ;
 *  - un élève **signale** une publication d'un autre (une fois) ; à **trois
 *    élèves différents**, elle est masquée provisoirement en attendant
 *    l'enseignant ;
 *  - l'enseignant du groupe **masque en un geste** (critère du lot 12),
 *    garde une publication signalée, retire la parole à un élève pour un
 *    temps, ferme le fil. Chaque geste est consigné au journal des accès.
 *
 * Aucune messagerie privée : on n'écrit qu'au groupe entier (CLAUDE.md § 9).
 * En ligne seulement (niveau C, HORS_LIGNE.md A.2) ; le brouillon reste sur
 * l'appareil si la connexion coupe.
 */
class FilGroupeService
{
    public const TEXTE_MIN = 3;

    public const TEXTE_MAX = 500;

    public const PAR_JOUR = 10;

    public const INTERVALLE_SECONDES = 30;

    public const SIGNALEMENTS_POUR_MASQUER = 3;

    public const QUESTIONS_AFFICHEES = 30;

    public function publier(
        User $auteur,
        Groupe $groupe,
        string $texte,
        ?PublicationGroupe $parent = null,
        ?Matiere $matiere = null,
        ?string $uuid = null,
    ): PublicationGroupe {
        if ($uuid !== null && ($existante = PublicationGroupe::query()->where('uuid', $uuid)->first()) !== null) {
            // Le même envoi reçu deux fois (double appui, réseau qui hésite).
            if ($existante->auteur_id !== $auteur->id) {
                throw new GesteRefuse('Cet envoi n\'est pas le tien.', 'texte');
            }

            return $existante;
        }

        if (! Perimetre::peutParticiperAuFil($auteur, $groupe)) {
            throw new GesteRefuse('Tu ne fais pas partie de ce groupe.', 'texte');
        }

        $enseignant = Perimetre::peutModererFil($auteur, $groupe);

        if ($groupe->archive_le !== null) {
            throw new GesteRefuse('Ce groupe est archivé : son fil ne reçoit plus de message.', 'texte');
        }

        if ($groupe->fil_ferme_le !== null && ! $enseignant) {
            throw new GesteRefuse('Ton enseignant a fermé le fil pour le moment.', 'texte');
        }

        if ($parent !== null && ($parent->groupe_id !== $groupe->id || $parent->parent_id !== null || $parent->masquee_le !== null)) {
            throw new GesteRefuse('Cette question n\'est plus dans le fil.', 'texte');
        }

        $texte = trim((string) preg_replace("/\n{3,}/", "\n\n", str_replace("\r\n", "\n", $texte)));

        if (mb_strlen($texte) < self::TEXTE_MIN) {
            throw new GesteRefuse('Écris au moins quelques mots.', 'texte');
        }

        if (mb_strlen($texte) > self::TEXTE_MAX) {
            throw new GesteRefuse('500 caractères au plus : va à l\'essentiel.', 'texte');
        }

        if (! $enseignant) {
            $this->verifierParoleEtDebit($auteur, $groupe);
        }

        $refus = FiltreFil::refus($texte, MotInterdit::liste());

        if ($refus !== null) {
            throw new GesteRefuse($refus, 'texte');
        }

        return PublicationGroupe::create([
            'uuid' => $uuid ?? (string) Str::uuid7(),
            'groupe_id' => $groupe->id,
            'auteur_id' => $auteur->id,
            'parent_id' => $parent?->id,
            'matiere_id' => $parent === null ? $matiere?->id : null,
            'texte' => $texte,
        ]);
    }

    public function signaler(User $eleve, PublicationGroupe $publication, MotifSignalementPublication $motif): void
    {
        $groupe = $publication->groupe;

        if (! Perimetre::peutParticiperAuFil($eleve, $groupe) || Perimetre::peutModererFil($eleve, $groupe)) {
            throw new GesteRefuse('Tu ne fais pas partie de ce groupe.', 'motif');
        }

        if ($publication->auteur_id === $eleve->id) {
            throw new GesteRefuse('Tu ne peux pas signaler ton propre message.', 'motif');
        }

        DB::transaction(function () use ($eleve, $publication, $motif) {
            PublicationGroupe::query()->whereKey($publication->id)->lockForUpdate()->first();

            SignalementPublication::query()->firstOrCreate(
                ['publication_id' => $publication->id, 'auteur_id' => $eleve->id],
                ['motif' => $motif],
            );

            $publication->refresh();

            if ($publication->masquee_le === null && $this->signalementsEnAttente($publication) >= self::SIGNALEMENTS_POUR_MASQUER) {
                $publication->update([
                    'masquee_le' => CarbonImmutable::now(),
                    'masquee_par' => null,
                    'masquage' => PublicationGroupe::MASQUAGE_SIGNALEMENTS,
                ]);
            }
        });
    }

    /** Le geste du critère : l'enseignant masque une publication (et ses réponses avec elle). */
    public function masquer(User $enseignant, PublicationGroupe $publication): void
    {
        $this->exigerModeration($enseignant, $publication->groupe);

        $publication->update([
            'masquee_le' => CarbonImmutable::now(),
            'masquee_par' => $enseignant->id,
            'masquage' => PublicationGroupe::MASQUAGE_ENSEIGNANT,
        ]);
        JournalAcces::consigner('fil.publication_masquee', $publication, ['groupe_id' => $publication->groupe_id], $enseignant);
    }

    /**
     * L'enseignant garde la publication : elle revient (si un masquage l'avait
     * cachée) et les signalements reçus jusqu'ici sont écartés.
     */
    public function garder(User $enseignant, PublicationGroupe $publication): void
    {
        $this->exigerModeration($enseignant, $publication->groupe);

        $publication->update([
            'masquee_le' => null,
            'masquee_par' => null,
            'masquage' => null,
            'signalements_vus_le' => CarbonImmutable::now(),
        ]);
        JournalAcces::consigner('fil.publication_gardee', $publication, ['groupe_id' => $publication->groupe_id], $enseignant);
    }

    /** Retirer la parole à un élève pour `$jours` jours ; 0 la lui rend. */
    public function parole(User $enseignant, Groupe $groupe, User $eleve, int $jours): void
    {
        $this->exigerModeration($enseignant, $groupe);

        $membre = MembreGroupe::query()->actifs()->where('groupe_id', $groupe->id)->where('eleve_id', $eleve->id)->first()
            ?? throw new GesteRefuse('Cet élève ne fait plus partie du groupe.', 'eleve');

        $jours = max(0, min(30, $jours));
        $membre->update(['muet_jusqu_au' => $jours === 0 ? null : CarbonImmutable::now()->addDays($jours)]);
        JournalAcces::consigner($jours === 0 ? 'fil.parole_rendue' : 'fil.parole_retiree', $groupe, ['eleve_id' => $eleve->id, 'jours' => $jours], $enseignant);
    }

    public function fermer(User $enseignant, Groupe $groupe, bool $ferme): void
    {
        $this->exigerModeration($enseignant, $groupe);

        $groupe->update(['fil_ferme_le' => $ferme ? CarbonImmutable::now() : null]);
        JournalAcces::consigner($ferme ? 'fil.ferme' : 'fil.ouvert', $groupe, [], $enseignant);
    }

    /**
     * Ce que montre l'écran du fil. L'élève ne voit pas ce qui est masqué,
     * sauf ses propres messages (avec la mention « masqué ») ; l'enseignant
     * voit tout, avec les signalements en attente.
     *
     * @return array<string, mixed>
     */
    public function fil(User $acteur, Groupe $groupe): array
    {
        $moderateur = Perimetre::peutModererFil($acteur, $groupe);
        $visible = fn (Builder $q) => $moderateur ? $q : $q->where(fn (Builder $v) => $v->whereNull('masquee_le')->orWhere('auteur_id', $acteur->id));

        $questions = PublicationGroupe::query()
            ->where('groupe_id', $groupe->id)
            ->whereNull('parent_id')
            ->where($visible)
            ->with(['auteur', 'matiere', 'reponses' => fn ($q) => $q->where($visible)->with('auteur')->orderBy('created_at')->orderBy('id')])
            ->withCount(['signalements'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::QUESTIONS_AFFICHEES)
            ->get();

        $ids = $questions->flatMap(fn (PublicationGroupe $q) => [$q->id, ...$q->reponses->modelKeys()])->all();
        $enAttente = $this->signalementsEnAttenteDe($ids);
        $signaleesParMoi = SignalementPublication::query()->where('auteur_id', $acteur->id)->whereIn('publication_id', $ids)->pluck('publication_id')->flip();

        $presenter = fn (PublicationGroupe $p): array => [
            'uuid' => $p->uuid,
            'texte' => $p->texte,
            'auteur' => $this->signature($p, $groupe, $moderateur),
            'est_enseignant' => $p->auteur_id === $groupe->enseignant_id,
            'est_moi' => $p->auteur_id === $acteur->id,
            'cree_le' => $p->created_at->toIso8601ZuluString(),
            'masquee' => $p->masquee_le !== null,
            'masquage' => $p->masquage,
            'signalements' => $moderateur ? (int) ($enAttente[$p->id] ?? 0) : null,
            'signalee_par_moi' => $signaleesParMoi->has($p->id),
            'auteur_id' => $moderateur && $p->auteur_id !== $groupe->enseignant_id ? $p->auteur_id : null,
            'est_exemple' => $p->est_exemple,
        ];

        $membre = $moderateur ? null : MembreGroupe::query()->actifs()->where('groupe_id', $groupe->id)->where('eleve_id', $acteur->id)->first();

        return [
            'questions' => $questions->map(fn (PublicationGroupe $q) => [
                ...$presenter($q),
                'matiere' => $q->matiere === null ? null : ['cle' => $q->matiere->teinte->value, 'nom' => $q->matiere->nom],
                'reponses' => $q->reponses->map($presenter)->values()->all(),
            ])->values()->all(),
            'ferme' => $groupe->fil_ferme_le !== null,
            'muet_jusqu_au' => $membre?->muet_jusqu_au?->isFuture() ? $membre->muet_jusqu_au->toIso8601ZuluString() : null,
            'reste_aujourdhui' => $moderateur ? null : max(0, self::PAR_JOUR - $this->publieesAujourdhui($acteur, $groupe)),
            'a_moderer' => $moderateur ? count(array_filter($enAttente, fn (int $n) => $n > 0)) : null,
        ];
    }

    /** Signalements reçus depuis que l'enseignant a gardé la publication. */
    public function signalementsEnAttente(PublicationGroupe $publication): int
    {
        return (int) ($this->signalementsEnAttenteDe([$publication->id])[$publication->id] ?? 0);
    }

    /**
     * Publications d'un groupe qui attendent l'enseignant : signalées (et pas
     * masquées par lui), ou masquées provisoirement par les signalements.
     */
    public function aModerer(Groupe $groupe): int
    {
        return count($this->signalementsEnAttenteDe(groupe: $groupe));
    }

    /**
     * Les publications choisies par leurs identifiants, ou toutes celles d'un
     * groupe. Seules apparaissent celles qui ont des signalements en attente.
     *
     * @param  array<int, int|string>  $ids  identifiants des publications
     * @return array<int, int> publication => signalements en attente
     */
    private function signalementsEnAttenteDe(array $ids = [], ?Groupe $groupe = null): array
    {
        if ($ids === [] && $groupe === null) {
            return [];
        }

        return SignalementPublication::query()
            ->join('publications_groupe', 'publications_groupe.id', '=', 'signalements_publications.publication_id')
            ->when($groupe !== null, fn (Builder $q) => $q->where('publications_groupe.groupe_id', $groupe?->id))
            ->when($ids !== [], fn (Builder $q) => $q->whereIn('signalements_publications.publication_id', $ids))
            ->where(fn (Builder $q) => $q->whereNull('publications_groupe.signalements_vus_le')
                ->orWhereColumn('signalements_publications.created_at', '>', 'publications_groupe.signalements_vus_le'))
            ->where(fn (Builder $q) => $q->whereNull('publications_groupe.masquage')
                ->orWhere('publications_groupe.masquage', PublicationGroupe::MASQUAGE_SIGNALEMENTS))
            ->groupBy('signalements_publications.publication_id')
            ->selectRaw('signalements_publications.publication_id as publication, count(*) as nombre')
            ->pluck('nombre', 'publication')
            ->map(fn ($n) => (int) $n)
            ->all();
    }

    /** Le pseudo pour les élèves ; « Prénom (pseudo) » pour l'enseignant ; le prénom de l'enseignant pour tous. */
    private function signature(PublicationGroupe $publication, Groupe $groupe, bool $moderateur): string
    {
        $auteur = $publication->auteur;

        if ($publication->auteur_id === $groupe->enseignant_id) {
            return $auteur->prenom;
        }

        return $moderateur ? $auteur->prenom.' ('.$auteur->pseudo.')' : $auteur->pseudo;
    }

    private function verifierParoleEtDebit(User $eleve, Groupe $groupe): void
    {
        $muet = MembreGroupe::query()->actifs()->where('groupe_id', $groupe->id)->where('eleve_id', $eleve->id)->value('muet_jusqu_au');

        if ($muet !== null && CarbonImmutable::parse($muet)->isFuture()) {
            throw new GesteRefuse('Ton enseignant t\'a retiré la parole jusqu\'au '.CarbonImmutable::parse($muet)->translatedFormat('j F').'. Tu peux toujours lire le fil.', 'texte');
        }

        if ($this->publieesAujourdhui($eleve, $groupe) >= self::PAR_JOUR) {
            throw new GesteRefuse('Tu as déjà écrit '.self::PAR_JOUR.' messages aujourd\'hui. Reviens demain !', 'texte');
        }

        $derniere = PublicationGroupe::query()->where('auteur_id', $eleve->id)->max('created_at');

        if ($derniere !== null && CarbonImmutable::parse($derniere)->addSeconds(self::INTERVALLE_SECONDES)->isFuture()) {
            throw new GesteRefuse('Attends quelques secondes avant d\'envoyer un autre message.', 'texte');
        }
    }

    private function publieesAujourdhui(User $eleve, Groupe $groupe): int
    {
        return PublicationGroupe::query()
            ->where('auteur_id', $eleve->id)
            ->where('groupe_id', $groupe->id)
            ->where('created_at', '>=', CarbonImmutable::today())
            ->count();
    }

    private function exigerModeration(User $enseignant, Groupe $groupe): void
    {
        if (! Perimetre::peutModererFil($enseignant, $groupe)) {
            throw new GesteRefuse('Seul l\'enseignant du groupe modère son fil.', 'publication');
        }
    }
}
