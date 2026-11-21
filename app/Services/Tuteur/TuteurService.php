<?php

namespace App\Services\Tuteur;

use App\Enums\DecisionRelecture;
use App\Enums\DemandeTuteur;
use App\Enums\MotifSignalementTuteur;
use App\Enums\ObjetTuteur;
use App\Enums\StatutReponseTuteur;
use App\Models\ConversationTuteur;
use App\Models\ExplicationTuteur;
use App\Models\Matiere;
use App\Models\MessageTuteur;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\User;
use App\Models\VersionContenu;
use App\Support\CatalogueEleve;
use App\Support\DroitsAbonne;
use Closure;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Seule autorité du tuteur N'karamögö (lot 10, PLAN M11) : qui peut lui
 * demander quoi, ce qu'il lit, combien de fois par jour, ce qui se garde,
 * ce que ça coûte.
 *
 *  - **Ancré sur notre contenu** : une question publiée que l'élève peut
 *    recevoir (CatalogueEleve), à la version qu'il avait sous les yeux, avec
 *    le corrigé validé ; ou une question libre dans une de ses matières.
 *    Un sujet dont le corrigé est réservé aux abonnés (DroitsAbonne)
 *    n'ouvre pas le tuteur : il le dévoilerait.
 *  - **Quota par jour** : `config('tuteur.quota_gratuit')` ou
 *    `quota_abonne`. Seule une explication complète décompte.
 *  - **Refus propre** : le marqueur `[HORS_SUJET]` ou `[INADAPTE]` des
 *    consignes, ou un refus du modèle, est remplacé par une phrase écrite par
 *    nous ; l'élève ne voit jamais le marqueur.
 *  - **Cache** : la première explication d'une question (ou d'une étape),
 *    pour une même réponse de l'élève, se sert de nouveau sans appel.
 *  - **Journal** : chaque demande et chaque réponse sont gardées, avec
 *    jetons, coût et temps avant le premier mot (console, back-office).
 *
 * Une explication à la fois par élève (verrou) : deux onglets ne doublent ni
 * le coût ni le décompte.
 */
class TuteurService
{
    public const RECENTRAGE = 'Je suis là pour t’aider à réviser : tes cours, tes exercices, tes sujets d’examen. Pose-moi une question sur une de tes matières, et on la travaille ensemble.';

    public const REFUS = 'Je ne peux pas répondre à cette demande. Revenons à ta révision : dis-moi ce que tu ne comprends pas dans ton cours.';

    private const VERROU_SECONDES = 120;

    public function __construct(
        private MoteurTuteur $moteur,
        private DroitsAbonne $droits,
    ) {}

    /**
     * @return array{limite: int, utilises: int, restants: int, abonne: bool}
     */
    public function quota(User $eleve): array
    {
        $abonne = $this->droits->estAbonne($eleve);
        $limite = (int) config($abonne ? 'tuteur.quota_abonne' : 'tuteur.quota_gratuit');
        $utilises = MessageTuteur::query()
            ->where('user_id', $eleve->id)
            ->where('compte', true)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        return ['limite' => $limite, 'utilises' => $utilises, 'restants' => max(0, $limite - $utilises), 'abonne' => $abonne];
    }

    /**
     * Vérifie la demande et prend le verrou de l'élève. Tout refus arrive
     * ici, avant le flux.
     *
     * Champs : `demande` (DemandeTuteur), et selon le cas `conversation`,
     * `question`, `version`, `etape`, `reponse`, `matiere`, `texte`
     * (validés par le contrôleur).
     *
     * @param  array<string, mixed>  $champs
     *
     * @throws DemandeRefusee
     * @throws ModelNotFoundException hors du périmètre de l'élève (404)
     */
    public function preparer(User $eleve, array $champs): Preparation
    {
        $profil = CatalogueEleve::profil($eleve) ?? throw new ModelNotFoundException;
        $demande = DemandeTuteur::from($champs['demande']);
        $texte = Confidentialite::nettoyer(trim((string) ($champs['texte'] ?? '')));

        if ($demande === DemandeTuteur::Question && $texte === '') {
            throw new DemandeRefusee('Écris ta question.', 'texte_vide');
        }

        $conversation = null;
        $nouvelle = [];
        $cle = null;

        if (($champs['conversation'] ?? null) !== null) {
            /** @var ConversationTuteur $conversation */
            $conversation = ConversationTuteur::query()
                ->where('uuid', $champs['conversation'])
                ->where('user_id', $eleve->id)
                ->firstOrFail();

            if ($demande->ouvre()) {
                throw new DemandeRefusee('Cette conversation est déjà ouverte.', 'demande_invalide');
            }

            $relances = $conversation->messages()->where('role', MessageTuteur::ELEVE)->count() - 1;

            if ($relances >= (int) config('tuteur.relances_max')) {
                throw new DemandeRefusee('Cette conversation est finie. Ouvre-en une nouvelle depuis la question.', 'conversation_finie');
            }

            $contexte = $this->contexteDe($conversation, $profil);
        } elseif ($demande->ouvre()) {
            [$nouvelle, $contexte, $cle] = $this->ouvrirSurQuestion($eleve, $profil, $demande, $champs);
        } elseif ($demande === DemandeTuteur::Question) {
            /** @var Matiere $matiere */
            $matiere = Matiere::query()->where('slug', (string) ($champs['matiere'] ?? ''))->firstOrFail();

            if (! CatalogueEleve::voitMatiere($profil, $matiere)) {
                throw new ModelNotFoundException;
            }

            $nouvelle = [
                'objet' => ObjetTuteur::Libre,
                'matiere_id' => $matiere->id,
                'titre' => Str::limit($texte, 150, '…'),
            ];
            $contexte = ContexteTuteur::libre($profil, $matiere);
        } else {
            throw new DemandeRefusee('Commence par « Explique-moi » sous une question.', 'demande_invalide');
        }

        $quota = $this->quota($eleve);

        if ($quota['restants'] <= 0) {
            throw new DemandeRefusee(
                $quota['abonne']
                    ? "Tu as demandé tes {$quota['limite']} explications d’aujourd’hui. Le tuteur revient demain matin."
                    : "Tu as demandé tes {$quota['limite']} explications gratuites d’aujourd’hui. Avec l’abonnement, tu en as {$this->quotaAbonne()} par jour.",
                'quota',
                429,
            );
        }

        $verrou = Cache::lock('tuteur|'.$eleve->id, self::VERROU_SECONDES);

        if (! $verrou->get()) {
            throw new DemandeRefusee('Une explication est déjà en train de s’écrire. Attends qu’elle finisse.', 'en_cours', 409);
        }

        return new Preparation(
            eleve: $eleve,
            conversation: $conversation,
            nouvelle: $nouvelle,
            demande: $demande,
            texteEleve: $demande === DemandeTuteur::Question ? $texte : $demande->libelle(),
            contexte: $contexte,
            historique: $conversation !== null ? $this->historique($conversation) : [],
            cleCache: $cle,
            quotaRestant: $quota['restants'],
            verrou: $verrou,
        );
    }

    /**
     * Écrit la réponse en flux. `$emettre(evenement, donnees)` reçoit :
     * `debut` (conversation), `texte` (un morceau), `refus` (le texte entier
     * à afficher à la place), `erreur` (panne : rien n'est décompté), `fin`.
     *
     * @param  Closure(string, array<string, mixed>): void  $emettre
     */
    public function diffuser(Preparation $p, Closure $emettre): MessageTuteur
    {
        $depart = hrtime(true);
        $premierMot = null;
        $conversation = null;

        try {
            $conversation = $p->conversation ?? ConversationTuteur::create([
                ...$p->nouvelle,
                'uuid' => (string) Str::uuid7(),
                'user_id' => $p->eleve->id,
            ]);

            MessageTuteur::create([
                'uuid' => (string) Str::uuid7(),
                'conversation_id' => $conversation->id,
                'user_id' => $p->eleve->id,
                'role' => MessageTuteur::ELEVE,
                'demande' => $p->demande,
                'texte' => $p->texteEleve,
            ]);

            $emettre('debut', ['conversation' => $conversation->uuid, 'demande' => $p->texteEleve]);

            $marquer = function () use (&$premierMot, $depart): void {
                $premierMot ??= intdiv(hrtime(true) - $depart, 1_000_000);
            };

            $enCache = $p->cleCache !== null
                ? ExplicationTuteur::query()->where('cle', $p->cleCache)->first()
                : null;

            if ($enCache !== null) {
                foreach (preg_split('/(?<=\s)/u', $enCache->texte) ?: [] as $morceau) {
                    $marquer();
                    $emettre('texte', ['t' => $morceau]);
                }

                $enCache->increment('servie');

                return $this->conclure($p, $conversation, $emettre, [
                    'texte' => $enCache->texte,
                    'statut' => StatutReponseTuteur::Complete,
                    'modele' => $enCache->modele,
                    'depuis_cache' => true,
                ], $depart, $premierMot);
            }

            [$reponse, $marqueur] = $this->ecrire($p, $emettre, $marquer);

            if ($marqueur !== null || $reponse->fin === 'refus') {
                $texte = $marqueur === Consignes::HORS_SUJET ? self::RECENTRAGE : self::REFUS;
                $statut = $marqueur === Consignes::HORS_SUJET ? StatutReponseTuteur::HorsSujet : StatutReponseTuteur::Refus;
                $marquer();
                $emettre('refus', ['texte' => $texte, 'statut' => $statut->value]);
            } else {
                $texte = $reponse->texte;
                $statut = StatutReponseTuteur::Complete;

                if ($p->cleCache !== null && $reponse->fin === 'complete') {
                    ExplicationTuteur::query()->firstOrCreate(['cle' => $p->cleCache], [
                        'question_id' => $conversation->question_id,
                        'version' => $conversation->version,
                        'demande' => $p->demande,
                        'etape' => $conversation->etape,
                        'texte' => $texte,
                        'modele' => $reponse->modele,
                    ]);
                }
            }

            return $this->conclure($p, $conversation, $emettre, [
                'texte' => $texte,
                'statut' => $statut,
                'modele' => $reponse->modele,
                'jetons_entree' => $reponse->jetonsEntree,
                'jetons_sortie' => $reponse->jetonsSortie,
                'jetons_cache_lus' => $reponse->jetonsCacheLus,
                'jetons_cache_ecrits' => $reponse->jetonsCacheEcrits,
                'cout_micro_usd' => Couts::microUsd($reponse),
            ], $depart, $premierMot);
        } catch (TuteurIndisponible $e) {
            $emettre('erreur', ['message' => $e->getMessage()]);

            return $this->conclure($p, $conversation, $emettre, [
                'texte' => $e->getMessage(),
                'statut' => StatutReponseTuteur::Erreur,
            ], $depart, $premierMot, avecFin: false);
        } finally {
            $p->verrou->release();
        }
    }

    /**
     * Le moteur écrit ; les premiers caractères sont retenus le temps de
     * savoir s'ils forment un marqueur (l'élève ne doit jamais le voir).
     *
     * @param  Closure(string, array<string, mixed>): void  $emettre
     * @return array{0: ReponseMoteur, 1: string|null}
     */
    private function ecrire(Preparation $p, Closure $emettre, Closure $marquer): array
    {
        $tampon = '';
        $decide = false;
        $marqueur = null;

        $requete = new RequeteTuteur(
            contexte: $p->contexte,
            messages: [...$p->historique, ['role' => 'user', 'content' => $p->texteEleve]],
            utilisateur: substr(hash_hmac('sha256', 'tuteur|'.$p->eleve->id, (string) config('app.key')), 0, 32),
        );

        $reponse = $this->moteur->repondre($requete, function (string $morceau) use (&$tampon, &$decide, &$marqueur, $emettre, $marquer): void {
            if ($marqueur !== null) {
                return;
            }

            if ($decide) {
                $marquer();
                $emettre('texte', ['t' => $morceau]);

                return;
            }

            $tampon .= $morceau;
            $debut = ltrim($tampon);

            foreach ([Consignes::HORS_SUJET, Consignes::INADAPTE] as $candidat) {
                if (str_starts_with($debut, $candidat)) {
                    $marqueur = $candidat;

                    return;
                }

                if (str_starts_with($candidat, $debut)) {
                    return; // pas encore assez de caractères pour trancher
                }
            }

            $decide = true;
            $marquer();
            $emettre('texte', ['t' => $tampon]);
        });

        if (! $decide && $marqueur === null && $tampon !== '') {
            $marquer();
            $emettre('texte', ['t' => $tampon]);
        }

        return [$reponse, $marqueur];
    }

    /**
     * @param  array<string, mixed>  $champs
     * @param  Closure(string, array<string, mixed>): void  $emettre
     */
    private function conclure(Preparation $p, ?ConversationTuteur $conversation, Closure $emettre, array $champs, int $depart, ?int $premierMot, bool $avecFin = true): MessageTuteur
    {
        if ($conversation === null) {
            // Panne avant même la création de la conversation : rien à garder.
            return new MessageTuteur($champs);
        }

        $statut = $champs['statut'];
        $message = MessageTuteur::create([
            ...$champs,
            'uuid' => (string) Str::uuid7(),
            'conversation_id' => $conversation->id,
            'user_id' => $p->eleve->id,
            'role' => MessageTuteur::TUTEUR,
            'demande' => $p->demande,
            'premier_mot_ms' => $premierMot,
            'duree_ms' => intdiv(hrtime(true) - $depart, 1_000_000),
            'compte' => $statut === StatutReponseTuteur::Complete,
        ]);

        $conversation->touch();

        if ($avecFin) {
            $emettre('fin', [
                'message' => $message->uuid,
                'statut' => $statut->value,
                'depuis_cache' => $message->depuis_cache,
                'quota_restant' => max(0, $p->quotaRestant - ($message->compte ? 1 : 0)),
                'relances_restantes' => $this->relancesRestantes($conversation),
            ]);
        }

        return $message;
    }

    /**
     * @param  array<string, mixed>  $champs
     * @return array{0: array<string, mixed>, 1: string, 2: string}
     */
    private function ouvrirSurQuestion(User $eleve, ProfilEleve $profil, DemandeTuteur $demande, array $champs): array
    {
        /** @var Question $question */
        $question = Question::query()->where('uuid', (string) ($champs['question'] ?? ''))->firstOrFail();

        if (! CatalogueEleve::peutRecevoirQuestion($eleve, $question)) {
            throw new ModelNotFoundException;
        }

        $version = $this->version($question, (int) ($champs['version'] ?? 0)) ?? throw new ModelNotFoundException;
        $sujet = $question->partie?->sujet;

        if ($sujet !== null && ! $this->droits->corrigeOuvert($eleve, $sujet)) {
            throw new DemandeRefusee('Le corrigé détaillé de ce sujet est réservé aux abonnés : le tuteur ne peut pas l’expliquer.', 'corrige_reserve', 403);
        }

        $corrige = array_values((array) ($version->blocs['corrige'] ?? []));
        $etape = $demande === DemandeTuteur::Etape ? (int) ($champs['etape'] ?? -1) : null;

        if ($etape !== null && ! isset($corrige[$etape])) {
            throw new DemandeRefusee('Cette étape n’existe pas dans le corrigé.', 'etape_inconnue');
        }

        $reponse = self::nettoyerReponse($champs['reponse'] ?? null);
        $titre = Question::titreDe($version->blocs['enonce'] ?? []) ?: 'Question';

        if ($etape !== null) {
            $nomEtape = trim((string) ($corrige[$etape]['titre'] ?? ''));
            $titre = 'Étape '.($etape + 1).($nomEtape !== '' ? ' : '.$nomEtape : '').' — '.$titre;
        }

        $notion = $question->notion;

        return [
            [
                'objet' => $etape !== null ? ObjetTuteur::Etape : ObjetTuteur::Question,
                'question_id' => $question->id,
                'version' => $version->numero,
                'etape' => $etape,
                'matiere_id' => $notion->chapitre->matiere_id,
                'notion_id' => $notion->id,
                'reponse' => $reponse,
                'titre' => Str::limit($titre, 150, '…'),
                'est_exemple' => $question->est_exemple,
            ],
            ContexteTuteur::question($profil, $version, $notion, $reponse, $etape),
            hash('sha256', implode('|', [
                $question->id, $version->numero, $demande->value, $etape ?? '-',
                hash('sha256', (string) json_encode($reponse)), config('tuteur.modele'),
            ])),
        ];
    }

    private function contexteDe(ConversationTuteur $conversation, ProfilEleve $profil): string
    {
        if ($conversation->objet === ObjetTuteur::Libre) {
            $matiere = $conversation->matiere ?? throw new ModelNotFoundException;

            return ContexteTuteur::libre($profil, $matiere);
        }

        $question = $conversation->question ?? throw new ModelNotFoundException;
        $version = $this->version($question, (int) $conversation->version) ?? throw new ModelNotFoundException;

        return ContexteTuteur::question($profil, $version, $question->notion, $conversation->reponse, $conversation->etape);
    }

    /**
     * La conversation déjà écrite, pour la relance : demandes de l'élève et
     * réponses complètes du tuteur, en alternance.
     *
     * @return list<array{role: 'user'|'assistant', content: string}>
     */
    private function historique(ConversationTuteur $conversation): array
    {
        $tours = [];
        $demande = null;

        foreach ($conversation->messages as $message) {
            if ($message->role === MessageTuteur::ELEVE) {
                $demande = $message->texte;
            } elseif ($demande !== null && $message->statut === StatutReponseTuteur::Complete) {
                $tours[] = ['role' => 'user', 'content' => $demande];
                $tours[] = ['role' => 'assistant', 'content' => $message->texte];
                $demande = null;
            }
        }

        return $tours;
    }

    public function relancesRestantes(ConversationTuteur $conversation): int
    {
        $demandes = $conversation->messages()->where('role', MessageTuteur::ELEVE)->count();

        return max(0, (int) config('tuteur.relances_max') - ($demandes - 1));
    }

    private function version(Question $question, int $numero): ?VersionContenu
    {
        /** @var VersionContenu|null */
        return $question->versions()
            ->where('numero', $numero)
            ->where('decision', DecisionRelecture::Publiee->value)
            ->first();
    }

    /**
     * La réponse de l'élève : un tableau du format de FormatQuestion, ses
     * textes nettoyés (Confidentialite), 2 000 caractères au plus.
     *
     * @return array<string, mixed>|null
     */
    private static function nettoyerReponse(mixed $reponse): ?array
    {
        if (! is_array($reponse) || $reponse === []) {
            return null;
        }

        array_walk_recursive($reponse, function (mixed &$valeur): void {
            if (is_string($valeur)) {
                $valeur = Str::limit(Confidentialite::nettoyer($valeur), 2000, '…');
            }
        });

        return $reponse;
    }

    private function quotaAbonne(): int
    {
        return (int) config('tuteur.quota_abonne');
    }

    /**
     * « Signaler cette réponse » : la réponse passe en tête du journal du
     * back-office. Une fois suffit (le premier motif reste).
     */
    public function signaler(User $eleve, MessageTuteur $message, MotifSignalementTuteur $motif): void
    {
        if ($message->user_id !== $eleve->id || $message->role !== MessageTuteur::TUTEUR) {
            throw new ModelNotFoundException;
        }

        if ($message->signale_le === null) {
            $message->forceFill(['signale_le' => now(), 'signale_motif' => $motif])->save();
        }
    }
}
