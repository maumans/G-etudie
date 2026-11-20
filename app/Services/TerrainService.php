<?php

namespace App\Services;

use App\Enums\EtiquetteAvis;
use App\Enums\ReponseAvis;
use App\Enums\TypeErreurAppareil;
use App\Models\Appareil;
use App\Models\AvisEleve;
use App\Models\DiagnosticAppareil;
use App\Models\ErreurAppareil;
use App\Models\MotInterdit;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\FiltreFil;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Lot 14 (PLAN § 12, « Terrain ») : seule autorité des gestes qui rendent
 * un essai mesurable — « Ton avis », le diagnostic d'un appareil, les
 * erreurs captées — et de leur purge. Les trois arrivent par la file
 * (`avis.donner`, `diagnostic.envoyer`, `erreurs.signaler`).
 *
 * Données minimales (CLAUDE.md § 9) : un diagnostic et une erreur ne
 * portent rien de personnel ; une erreur n'est rattachée qu'à l'appareil.
 * Diagnostics et erreurs ne sont **jamais refusés** (un refus s'afficherait
 * à l'élève dans « À corriger », pour un geste qu'il n'a pas fait) : au-delà
 * des plafonds, ils sont acceptés et ignorés.
 */
class TerrainService
{
    public const COMMENTAIRE_MAX = 300;

    /** Avis par élève et par jour, au-delà : refus avec sa phrase. */
    public const AVIS_PAR_JOUR = 5;

    /** Erreurs par envoi (l'appareil en garde 50 au plus). */
    public const ERREURS_PAR_ENVOI = 20;

    /** Empreintes nouvelles qu'un même appareil peut créer par jour. */
    public const NOUVELLES_ERREURS_PAR_JOUR = 30;

    /** Diagnostics par appareil et par jour. */
    public const DIAGNOSTICS_PAR_JOUR = 10;

    public const JOURS_AVANT_PURGE = 90;

    public const JOURS_AVANT_PURGE_AVIS = 365;

    /**
     * Les seules clés gardées d'un diagnostic, et leur type. Tout le reste
     * est jeté : rien de libre, rien de personnel.
     *
     * @var array<string, 'chaine'|'entier'|'booleen'>
     */
    public const CHAMPS_DIAGNOSTIC = [
        'version_app' => 'chaine',
        'service_worker' => 'chaine',
        'installee' => 'booleen',
        'stockage_utilise' => 'entier',
        'stockage_quota' => 'entier',
        'stockage_persistant' => 'booleen',
        'packs' => 'entier',
        'packs_poids' => 'entier',
        'en_attente' => 'entier',
        'a_corriger' => 'entier',
        'derniere_synchro' => 'chaine',
        'decalage_horloge_ms' => 'entier',
        'profils' => 'entier',
        'navigateur' => 'chaine',
        'systeme' => 'chaine',
        'memoire_go' => 'entier',
        'coeurs' => 'entier',
        'reseau' => 'chaine',
        'economie_donnees' => 'booleen',
        'ecran' => 'chaine',
        'theme' => 'chaine',
        'langue' => 'chaine',
        'erreurs_gardees' => 'entier',
    ];

    /** Écrans d'où un avis peut venir. */
    public const ECRANS = ['seance', 'quiz', 'devoir', 'appareils', 'menu'];

    /**
     * « Ton avis ». Le commentaire passe le filtre du fil (FiltreFil) : pas
     * de numéro, de lien, d'adresse ni de mot interdit. Cinq par jour.
     *
     * @param  list<string>  $etiquettes
     * @return array{avis: int}
     */
    public function donnerAvis(
        User $eleve,
        ?Appareil $appareil,
        string $uuid,
        string $ecran,
        ReponseAvis $reponse,
        array $etiquettes,
        ?string $commentaire,
        ?string $versionApp,
        CarbonImmutable $donneLe,
    ): array {
        $commentaire = $commentaire === null ? null : trim((string) preg_replace('/\s+/u', ' ', $commentaire));
        $commentaire = $commentaire === '' ? null : $commentaire;

        if ($commentaire !== null) {
            $refus = FiltreFil::refus($commentaire, MotInterdit::liste());

            if ($refus !== null) {
                throw new OperationRejetee(str_replace('dans le fil', 'dans ton avis', $refus));
            }
        }

        $duJour = AvisEleve::query()
            ->where('user_id', $eleve->id)
            ->where('donne_le', '>=', $donneLe->startOfDay())
            ->where('donne_le', '<', $donneLe->startOfDay()->addDay())
            ->count();

        if ($duJour >= self::AVIS_PAR_JOUR) {
            throw new OperationRejetee('Tu as déjà donné '.self::AVIS_PAR_JOUR.' avis aujourd\'hui. Merci ! Reviens demain.');
        }

        // Une étiquette inconnue est déjà refusée par la validation ; ici,
        // dédoublonnées et dans l'ordre de l'énumération.
        $gardees = array_values(array_filter(
            array_map(fn (EtiquetteAvis $e) => $e->value, EtiquetteAvis::cases()),
            fn (string $cle) => in_array($cle, $etiquettes, true),
        ));

        $avis = AvisEleve::query()->create([
            'uuid' => $uuid,
            'user_id' => $eleve->id,
            'appareil_id' => $appareil?->id,
            'ecran' => $ecran,
            'reponse' => $reponse,
            'etiquettes' => $gardees,
            'commentaire' => $commentaire === null ? null : Str::limit($commentaire, self::COMMENTAIRE_MAX, ''),
            'version_app' => $versionApp === null ? null : Str::limit($versionApp, 64, ''),
            'donne_le' => $donneLe,
        ]);

        return ['avis' => $avis->id];
    }

    /**
     * Le diagnostic d'un appareil, retrouvé par son code court (choisi par
     * l'appareil pour s'afficher même hors ligne). Seules les clés de
     * CHAMPS_DIAGNOSTIC sont gardées, chacune dans son type.
     *
     * @param  array<string, mixed>  $donnees
     * @return array{code: string, garde: bool}
     */
    public function enregistrerDiagnostic(User $compte, Appareil $appareil, string $uuid, string $code, array $donnees, CarbonImmutable $releveLe): array
    {
        $code = Str::upper($code);
        $duJour = DiagnosticAppareil::query()
            ->where('appareil_id', $appareil->id)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        if ($duJour >= self::DIAGNOSTICS_PAR_JOUR) {
            return ['code' => $code, 'garde' => false];
        }

        $propres = self::nettoyerDiagnostic($donnees);

        DiagnosticAppareil::query()->create([
            'uuid' => $uuid,
            'code' => $code,
            'appareil_id' => $appareil->id,
            'user_id' => $compte->id,
            'donnees' => $propres,
            'version_app' => $propres['version_app'] ?? null,
            'releve_le' => $releveLe,
        ]);

        return ['code' => $code, 'garde' => true];
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @return array<string, string|int|bool|null>
     */
    public static function nettoyerDiagnostic(array $donnees): array
    {
        $propres = [];

        foreach (self::CHAMPS_DIAGNOSTIC as $cle => $type) {
            $valeur = $donnees[$cle] ?? null;

            $propres[$cle] = match (true) {
                $valeur === null => null,
                $type === 'entier' && is_numeric($valeur) => (int) $valeur,
                $type === 'booleen' && is_bool($valeur) => $valeur,
                $type === 'chaine' && is_scalar($valeur) => Str::limit((string) $valeur, 64, ''),
                default => null,
            };
        }

        return $propres;
    }

    /**
     * Les erreurs captées par un appareil, regroupées par empreinte : une
     * erreur déjà connue voit son compte monter ; une nouvelle n'est créée
     * que sous le plafond du jour de l'appareil.
     *
     * @param  list<array{type: string, message: string, source?: string|null, pile?: string|null, version_app?: string|null, fois?: int|null, vue_le?: string|null}>  $erreurs
     * @return array{gardees: int, ignorees: int}
     */
    public function signalerErreurs(Appareil $appareil, array $erreurs, ?string $navigateur, CarbonImmutable $recuLe): array
    {
        $gardees = 0;
        $ignorees = 0;
        $nouvellesDuJour = ErreurAppareil::query()
            ->where('dernier_appareil_id', $appareil->id)
            ->where('premiere_le', '>=', $recuLe->startOfDay())
            ->count();

        foreach (array_slice($erreurs, 0, self::ERREURS_PAR_ENVOI) as $erreur) {
            $type = TypeErreurAppareil::tryFrom($erreur['type']);

            if ($type === null) {
                $ignorees++;

                continue;
            }

            $message = Str::limit(self::anonymiser($erreur['message']), 500, '');
            $source = self::source($erreur['source'] ?? null);
            $version = isset($erreur['version_app']) ? Str::limit($erreur['version_app'], 64, '') : null;
            $fois = max(1, min(1000, (int) ($erreur['fois'] ?? 1)));
            $vueLe = self::instant($erreur['vue_le'] ?? null, $recuLe);
            $empreinte = self::empreinte($type, $message, $source, $version);

            $gardee = DB::transaction(function () use ($empreinte, $type, $message, $source, $version, $fois, $vueLe, $erreur, $appareil, $navigateur, &$nouvellesDuJour): bool {
                $existante = ErreurAppareil::query()->where('empreinte', $empreinte)->lockForUpdate()->first();

                if ($existante !== null) {
                    $existante->forceFill([
                        'occurrences' => $existante->occurrences + $fois,
                        'dernier_appareil_id' => $appareil->id,
                        'navigateur' => $navigateur ?? $existante->navigateur,
                        'derniere_le' => $vueLe->greaterThan($existante->derniere_le) ? $vueLe : $existante->derniere_le,
                    ])->save();

                    return true;
                }

                if ($nouvellesDuJour >= self::NOUVELLES_ERREURS_PAR_JOUR) {
                    return false;
                }

                ErreurAppareil::query()->create([
                    'empreinte' => $empreinte,
                    'type' => $type,
                    'message' => $message,
                    'source' => $source,
                    'pile' => isset($erreur['pile']) ? Str::limit(self::anonymiser($erreur['pile']), 2000, '') : null,
                    'version_app' => $version,
                    'navigateur' => $navigateur,
                    'occurrences' => $fois,
                    'dernier_appareil_id' => $appareil->id,
                    'premiere_le' => $vueLe,
                    'derniere_le' => $vueLe,
                ]);
                $nouvellesDuJour++;

                return true;
            });

            $gardee ? $gardees++ : $ignorees++;
        }

        return ['gardees' => $gardees, 'ignorees' => $ignorees + max(0, count($erreurs) - self::ERREURS_PAR_ENVOI)];
    }

    /** La « prise en compte » d'un avis : la décision prise, qui, quand. */
    public function traiterAvis(AvisEleve $avis, User $traitant, string $decision): void
    {
        $avis->forceFill([
            'traite_le' => now(),
            'traite_par' => $traitant->id,
            'decision' => Str::limit(trim($decision), 500, ''),
        ])->save();
    }

    /**
     * Efface ce qui a dépassé sa durée de garde.
     *
     * @return array{diagnostics: int, erreurs: int, avis: int}
     */
    public function purger(): array
    {
        $limite = now()->subDays(self::JOURS_AVANT_PURGE);

        return [
            'diagnostics' => DiagnosticAppareil::query()->where('releve_le', '<', $limite)->delete(),
            'erreurs' => ErreurAppareil::query()->where('derniere_le', '<', $limite)->delete(),
            'avis' => AvisEleve::query()->where('donne_le', '<', now()->subDays(self::JOURS_AVANT_PURGE_AVIS))->delete(),
        ];
    }

    /**
     * Même erreur, même empreinte : les nombres (identifiants, positions)
     * sont remplacés par « # » avant le calcul, sinon chaque occurrence
     * ferait sa ligne.
     */
    public static function empreinte(TypeErreurAppareil $type, string $message, ?string $source, ?string $version): string
    {
        $normalise = (string) preg_replace('/\d+/', '#', Str::lower($message));

        return sha1(implode('|', [$type->value, $normalise, $source ?? '', $version ?? '']));
    }

    /**
     * Rien de personnel dans un message ou une pile : un numéro de
     * téléphone, une adresse e-mail ou un jeton qui s'y serait glissé est
     * masqué.
     */
    public static function anonymiser(string $texte): string
    {
        $texte = (string) preg_replace('/[\w.+-]+@[\w-]+\.[a-z]{2,}/iu', '[adresse]', $texte);
        $texte = (string) preg_replace('/(?:\+?\d[\s.\-]?){9,}/u', '[numéro]', $texte);

        return (string) preg_replace('/\b[A-Za-z0-9_\-]{32,}\b/', '[jeton]', $texte);
    }

    /** Le chemin seul : ni domaine, ni paramètres, ni fragment. */
    public static function source(?string $source): ?string
    {
        if ($source === null || trim($source) === '') {
            return null;
        }

        $chemin = parse_url(trim($source), PHP_URL_PATH);

        return is_string($chemin) && $chemin !== '' ? Str::limit($chemin, 300, '') : null;
    }

    private static function instant(?string $valeur, CarbonImmutable $parDefaut): CarbonImmutable
    {
        if ($valeur === null) {
            return $parDefaut;
        }

        try {
            $instant = CarbonImmutable::parse($valeur);
        } catch (\Throwable) {
            return $parDefaut;
        }

        // Une heure d'appareil dans le futur ou trop ancienne ne fait pas foi.
        return $instant->greaterThan($parDefaut) || $instant->lessThan($parDefaut->subDays(self::JOURS_AVANT_PURGE))
            ? $parDefaut
            : $instant;
    }
}
