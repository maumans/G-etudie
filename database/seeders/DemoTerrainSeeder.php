<?php

namespace Database\Seeders;

use App\Enums\EtiquetteAvis;
use App\Enums\ReponseAvis;
use App\Enums\TypeErreurAppareil;
use App\Models\Appareil;
use App\Models\AvisEleve;
use App\Models\CampagneTerrain;
use App\Models\DiagnosticAppareil;
use App\Models\ErreurAppareil;
use App\Models\Etablissement;
use App\Models\User;
use App\Services\TerrainService;
use App\Support\HorlogeDemo;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Lot 14 : un essai **fictif** pour que Console › Terrain ait la forme
 * qu'elle aura après un vrai essai (CLAUDE.md § 3 bis) — une campagne au
 * collège de démonstration, des avis d'élèves de la cohorte d'exemple
 * (dont trois déjà traités), des erreurs et des diagnostics d'appareils.
 * Tout est marqué `est_exemple` : la console affiche le bandeau
 * « EXEMPLE — contenu fictif ». Rien de tout cela n'est une mesure.
 *
 * Idempotent : si la campagne d'exemple existe, rien n'est refait.
 */
class DemoTerrainSeeder extends Seeder
{
    public const CAMPAGNE = 'Essai d’exemple — Ratoma';

    /**
     * [réponse, étiquettes, commentaire, écran, jours avant, décision]
     *
     * @var list<array{0: ReponseAvis, 1: list<EtiquetteAvis>, 2: string|null, 3: string, 4: int, 5: string|null}>
     */
    private const AVIS = [
        [ReponseAvis::Oui, [], 'Le corrigé pas à pas m’a aidée pour Pythagore.', 'seance', 1, null],
        [ReponseAvis::UnPeu, [EtiquetteAvis::Lent], 'La page des annales met du temps à s’ouvrir.', 'seance', 1, null],
        [ReponseAvis::Non, [EtiquetteAvis::PasCompris], 'Je ne savais pas où taper la réponse.', 'seance', 2, 'Champ de réponse agrandi et mis en avant (version suivante).'],
        [ReponseAvis::Oui, [EtiquetteAvis::Facile], null, 'quiz', 2, null],
        [ReponseAvis::UnPeu, [EtiquetteAvis::Donnees], 'Le téléchargement des maths est lourd.', 'appareils', 3, 'Poids affiché avant : déjà en place. Images allégées à vérifier.'],
        [ReponseAvis::Oui, [], 'J’aime la série de jours.', 'seance', 3, null],
        [ReponseAvis::Non, [EtiquetteAvis::Bug], 'Ma réponse est restée en attente longtemps.', 'seance', 4, null],
        [ReponseAvis::Oui, [EtiquetteAvis::Difficile], null, 'devoir', 4, null],
        [ReponseAvis::UnPeu, [EtiquetteAvis::Lent, EtiquetteAvis::Donnees], null, 'menu', 5, null],
        [ReponseAvis::Oui, [], 'Les indices sont bien.', 'seance', 5, 'Rien à changer : noté pour le bilan.'],
        [ReponseAvis::Oui, [], null, 'quiz', 6, null],
        [ReponseAvis::UnPeu, [EtiquetteAvis::Difficile], 'Les questions de physique sont dures.', 'seance', 6, null],
    ];

    public function run(): void
    {
        if (CampagneTerrain::query()->where('nom', self::CAMPAGNE)->exists()) {
            return;
        }

        $maintenant = HorlogeDemo::instant() ?? CarbonImmutable::now();
        $college = Etablissement::query()->where('nom', DemoOrganisationSeeder::ETABLISSEMENT)->value('id');
        $sekou = User::query()->where('telephone', DemoSeeder::COMPTES[7]['telephone'])->first();

        CampagneTerrain::query()->create([
            'nom' => self::CAMPAGNE,
            'lieu' => 'Conakry, Ratoma',
            'etablissement_id' => $college,
            'debut' => $maintenant->subDays(6)->toDateString(),
            'fin' => $maintenant->addDay()->toDateString(),
            'notes' => 'Deux classes, une demi-journée chacune. Autorisations des parents reçues (exemple).',
            'creee_par' => $sekou?->id,
            'est_exemple' => true,
        ]);

        // Les élèves de la cohorte d'exemple rattachés au collège.
        $eleves = User::query()
            ->where('pseudo', 'like', DemoPlateformeSeeder::PREFIXE_PSEUDO.'%')
            ->whereHas('profilEleve', fn ($q) => $q->where('etablissement_id', $college))
            ->orderBy('id')->limit(count(self::AVIS))->get();

        $appareils = collect(['Android · Chrome', 'Android · Opera', 'iPhone · Safari'])->map(fn (string $libelle) => Appareil::query()->create([
            'uuid' => (string) Str::uuid7(),
            'jeton_hache' => hash('sha256', Str::random(40)),
            'libelle' => $libelle,
            'premier_contact_le' => $maintenant->subDays(6),
            'dernier_contact_le' => $maintenant->subHours(3),
        ]));

        foreach (self::AVIS as $rang => [$reponse, $etiquettes, $commentaire, $ecran, $jours, $decision]) {
            $eleve = $eleves[$rang % max(1, $eleves->count())] ?? null;

            if ($eleve === null) {
                break;
            }

            $donneLe = $maintenant->subDays($jours)->setTime(17 + $rang % 4, 10 + $rang * 3);
            AvisEleve::query()->create([
                'uuid' => (string) Str::uuid7(),
                'user_id' => $eleve->id,
                'appareil_id' => $appareils[$rang % 3]->id,
                'ecran' => $ecran,
                'reponse' => $reponse,
                'etiquettes' => array_map(fn (EtiquetteAvis $e) => $e->value, $etiquettes),
                'commentaire' => $commentaire,
                'version_app' => 'exemple-14',
                'donne_le' => $donneLe,
                'traite_le' => $decision === null ? null : $donneLe->addDay(),
                'traite_par' => $decision === null ? null : $sekou?->id,
                'decision' => $decision,
                'est_exemple' => true,
            ]);
        }

        $erreurs = [
            [TypeErreurAppareil::Import, 'Failed to fetch dynamically imported module', '/build/assets/annales-B2x9.js', 7, 1],
            [TypeErreurAppareil::Promesse, 'QuotaExceededError: The quota has been exceeded.', '/eleve/telechargements', 3, 2],
            [TypeErreurAppareil::Script, 'TypeError: Cannot read properties of undefined (reading \'uuid\')', '/build/assets/seance-C81a.js', 12, 1],
            [TypeErreurAppareil::File, 'Envoi en échec après 8 essais (délai dépassé)', '/sync/operations', 2, 4],
        ];

        foreach ($erreurs as $rang => [$type, $message, $source, $fois, $jours]) {
            ErreurAppareil::query()->create([
                'empreinte' => TerrainService::empreinte($type, $message, $source, 'exemple-14'),
                'type' => $type,
                'message' => $message,
                'source' => $source,
                'pile' => null,
                'version_app' => 'exemple-14',
                'navigateur' => $appareils[$rang % 3]->libelle,
                'occurrences' => $fois,
                'dernier_appareil_id' => $appareils[$rang % 3]->id,
                'premiere_le' => $maintenant->subDays($jours + 1),
                'derniere_le' => $maintenant->subDays($jours),
                'est_exemple' => true,
            ]);
        }

        foreach (['7K3FQX', 'M4T9ZA'] as $rang => $code) {
            $releveLe = $maintenant->subDays(2 + $rang)->setTime(10, 15);
            DiagnosticAppareil::query()->create([
                'uuid' => (string) Str::uuid7(),
                'code' => $code,
                'appareil_id' => $appareils[$rang]->id,
                'user_id' => $eleves[$rang]->id ?? null,
                'donnees' => TerrainService::nettoyerDiagnostic([
                    'version_app' => 'exemple-14',
                    'service_worker' => 'actif',
                    'installee' => $rang === 0,
                    'stockage_utilise' => [3_400_000, 1_200_000][$rang],
                    'stockage_quota' => [1_100_000_000, 300_000_000][$rang],
                    'stockage_persistant' => $rang === 0,
                    'packs' => [1, 0][$rang],
                    'packs_poids' => [1_850_000, 0][$rang],
                    'en_attente' => [0, 6][$rang],
                    'a_corriger' => 0,
                    'derniere_synchro' => $releveLe->subMinutes(4)->toIso8601ZuluString(),
                    'decalage_horloge_ms' => [-1200, 360_000][$rang],
                    'profils' => [2, 1][$rang],
                    'navigateur' => ['Chrome 131', 'Opera 85'][$rang],
                    'systeme' => 'Android 11',
                    'memoire_go' => 2,
                    'coeurs' => 4,
                    'reseau' => ['3g', '2g'][$rang],
                    'economie_donnees' => $rang === 1,
                    'ecran' => '360×740',
                    'theme' => 'sombre',
                    'langue' => 'fr-FR',
                    'erreurs_gardees' => [0, 3][$rang],
                ]),
                'version_app' => 'exemple-14',
                'releve_le' => $releveLe,
                'est_exemple' => true,
            ]);
        }
    }
}
