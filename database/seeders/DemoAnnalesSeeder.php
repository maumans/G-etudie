<?php

namespace Database\Seeders;

use App\Enums\CibleSignalement;
use App\Enums\CodeExamen;
use App\Enums\CodeSerie;
use App\Enums\Filiere;
use App\Enums\MotifSignalement;
use App\Enums\StatutImport;
use App\Enums\StatutSignalement;
use App\Enums\TypeSujet;
use App\Models\Examen;
use App\Models\ImportSujet;
use App\Models\Matiere;
use App\Models\Question;
use App\Models\Serie;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Models\User;
use App\Services\Annales\ImportSujetService;
use App\Services\Annales\ResultatExtraction;
use App\Services\Annales\SujetService;
use App\Services\SignalementService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Annales de démonstration (lot 4, développement seulement) : **des sujets
 * fictifs**, marqués `est_exemple` et affichés avec le bandeau « EXEMPLE —
 * contenu fictif » (CLAUDE.md § 5). Aucun vrai sujet d'examen n'est recopié
 * ni inventé comme officiel.
 *
 * Ils passent par le même chemin qu'un vrai import (une proposition au
 * format de l'extracteur, ImportSujetService::construire) puis par le
 * circuit (SujetService) : vérifiés et envoyés par le rédacteur, publiés
 * par la relectrice. Un troisième reste en brouillon, réponses à vérifier,
 * pour essayer le back-office ; deux signalements d'Aïssatou montrent la
 * file et la réponse.
 */
class DemoAnnalesSeeder extends Seeder
{
    public function run(ImportSujetService $imports, SujetService $sujets, SignalementService $signalements): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les annales de démonstration ne sont jamais semées en production.');
        }

        if (Sujet::query()->where('est_exemple', true)->exists()) {
            return;
        }

        $redacteur = User::where('pseudo', 'redacteur_demo')->firstOrFail();
        $relectrice = User::where('pseudo', 'relectrice_demo')->firstOrFail();
        $bepc = Examen::where('code', CodeExamen::Bepc)->sole();
        $bac = Examen::where('code', CodeExamen::Bac)->sole();
        $se = Serie::where('examen_id', $bac->id)->where('code', CodeSerie::Se)->sole();
        $maths = Matiere::where('slug', 'maths')->firstOrFail();
        $chimie = Matiere::where('slug', 'chimie')->firstOrFail();

        $publies = [
            [$bepc, null, $maths, 2024, self::bepcMaths2024()],
            [$bepc, null, $maths, 2023, self::bepcMaths2023()],
            [$bac, $se, $chimie, 2024, self::bacChimie2024()],
        ];

        $premier = null;

        foreach ($publies as [$examen, $serie, $matiere, $session, $proposition]) {
            $sujet = $this->importer($imports, $redacteur, $examen, $serie, $matiere, $session, $proposition);

            if ($sujet === null) {
                continue;
            }

            foreach ($sujet->questions()->get() as $question) {
                $sujets->verifierReponse($question, $redacteur);
            }

            $sujets->publier($sujets->soumettre($sujet, $redacteur), $relectrice, 'Transcription fidèle, corrigés vérifiés.');
            $premier ??= $sujet;
        }

        // En brouillon : ce que voit un rédacteur juste après un import.
        $this->importer($imports, $redacteur, $bepc, null, $maths, 2022, self::bepcMaths2022());

        if ($premier !== null) {
            $this->signalements($signalements, $premier);
        }
    }

    /**
     * @param  array<string, mixed>  $proposition
     */
    private function importer(ImportSujetService $imports, User $auteur, Examen $examen, ?Serie $serie, Matiere $matiere, int $session, array $proposition): ?Sujet
    {
        $notions = $imports->notions($examen, $matiere);

        if ($notions === []) {
            return null;
        }

        $uuid = (string) Str::uuid7();
        $chemin = config('annales.dossier')."/{$uuid}.pdf";
        $pdf = self::pdfExemple("{$matiere->nom} - {$examen->code->value} {$session}");
        Storage::disk(config('annales.disque'))->put($chemin, $pdf);

        $import = ImportSujet::create([
            'uuid' => $uuid,
            'auteur_id' => $auteur->id,
            'examen_id' => $examen->id,
            'serie_id' => $serie?->id,
            'matiere_id' => $matiere->id,
            'filiere' => Filiere::Generale,
            'session' => $session,
            'type' => TypeSujet::Officiel,
            'document_chemin' => $chemin,
            'document_nom' => Str::slug("sujet-exemple-{$matiere->nom}-{$session}").'.pdf',
            'document_type' => 'application/pdf',
            'document_octets' => strlen($pdf),
            'statut' => StatutImport::EnCours,
            'extracteur' => 'simule',
            'commence_le' => now(),
        ]);
        $import->load(['examen', 'serie', 'matiere', 'auteur']);

        // Les notions proposées : les premières du programme, dans l'ordre.
        $ids = array_keys($notions);
        array_walk_recursive($proposition, function (mixed &$valeur, string|int $cle) use ($ids) {
            if ($cle === 'notion_id' && is_int($valeur)) {
                $valeur = $ids[min($valeur, count($ids) - 1)];
            }
        });

        [$sujet, $avertissements] = $imports->construire($import, new ResultatExtraction($proposition, estExemple: true), $notions);

        $import->forceFill([
            'statut' => StatutImport::Pret,
            'sujet_id' => $sujet->id,
            'avertissements' => $avertissements,
            'termine_le' => now(),
        ])->save();

        return $sujet;
    }

    private function signalements(SignalementService $signalements, Sujet $sujet): void
    {
        $aissatou = User::where('pseudo', 'aissatou_demo')->firstOrFail();
        $alpha = User::where('pseudo', 'pedagogie_demo')->firstOrFail();
        $questions = Question::query()->whereIn('sujet_partie_id', $sujet->parties()->select('id'))->orderBy('id')->get();
        $hier = CarbonImmutable::now()->subDay()->setTime(19, 40);

        if ($questions->count() < 2 || ! $aissatou->profilEleve()->exists()) {
            return;
        }

        $signalements->creer($aissatou, (string) Str::uuid7(), CibleSignalement::Question, $questions[1]->uuid, $questions[1]->numeroPublie(), MotifSignalement::Corrige, 'À l\'étape 2, il manque l\'unité du résultat.', $hier, $hier);

        $plusTot = $hier->subDay();
        $signalements->creer($aissatou, $uuid = (string) Str::uuid7(), CibleSignalement::Question, $questions[0]->uuid, $questions[0]->numeroPublie(), MotifSignalement::ReponseRefusee, 'J\'ai écrit 11,0 et c\'était compté faux.', $plusTot, $plusTot);
        $signalements->repondre(
            Signalement::query()->where('uuid', $uuid)->firstOrFail(),
            $alpha,
            StatutSignalement::Rejete,
            'Merci d\'avoir vérifié ! « 11,0 » est bien accepté : ta réponse avait été saisie « 1,10 ». Le corrigé est juste.',
        );

        // Déjà lue : l'accueil d'Aïssatou (captures des lots 2 et 3) ne
        // change pas ; la pastille « l'équipe a répondu » est testée à part.
        Signalement::query()->where('uuid', $uuid)->update(['reponse_vue_le' => $plusTot->addHours(2)]);
    }

    /**
     * Un PDF d'une page, sans dépendance : il porte « EXEMPLE — contenu
     * fictif », pour qu'aucune capture ne passe pour un vrai sujet.
     */
    public static function pdfExemple(string $titre): string
    {
        $titre = preg_replace('/[^A-Za-z0-9 \-]/', '', Str::ascii($titre));
        $flux = "BT /F1 22 Tf 72 740 Td (SUJET D EXEMPLE) Tj ET\n"
            ."BT /F1 14 Tf 72 712 Td ({$titre}) Tj ET\n"
            ."BT /F1 12 Tf 72 680 Td (Contenu fictif, cree pour la demonstration de N karamogo.) Tj ET\n"
            ."BT /F1 12 Tf 72 662 Td (Ce document n est pas un sujet officiel.) Tj ET\n";
        $objets = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($flux)." >>\nstream\n{$flux}endstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $positions = [];

        foreach ($objets as $rang => $objet) {
            $positions[] = strlen($pdf);
            $pdf .= ($rang + 1)." 0 obj\n{$objet}\nendobj\n";
        }

        $table = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objets) + 1)."\n0000000000 65535 f \n";

        foreach ($positions as $position) {
            $pdf .= sprintf("%010d 00000 n \n", $position);
        }

        return $pdf.'trailer << /Size '.(count($objets) + 1)." /Root 1 0 R >>\nstartxref\n{$table}\n%%EOF\n";
    }

    /**
     * Une question au format de l'extracteur (ExtracteurClaude::schema()).
     *
     * @param  array<string, mixed>  $champs
     * @param  list<array{0: string, 1: string}>  $corrige  [titre, texte] par étape
     * @return array<string, mixed>
     */
    private static function q(string $enonce, string $type, int $notion, array $champs, array $corrige, int $difficulte = 2): array
    {
        return [
            'enonce' => $enonce,
            'type' => $type,
            'options' => [],
            'bonnes_options' => [],
            'vrai' => null,
            'valeur' => null,
            'unite' => null,
            'tolerance' => null,
            'acceptees' => [],
            'bareme' => [],
            ...$champs,
            'corrige' => array_map(fn (array $e) => ['titre' => $e[0], 'texte' => $e[1]], $corrige),
            'notion_id' => $notion,
            'difficulte' => $difficulte,
        ];
    }

    /** @return array<string, mixed> */
    private static function bepcMaths2024(): array
    {
        return [
            'titre' => 'Mathématiques — sujet d\'exemple, session 2024',
            'duree_minutes' => 120,
            'coefficient' => null,
            'avertissements' => [],
            'parties' => [
                [
                    'titre' => 'Exercice 1',
                    'bareme' => 5,
                    'consigne' => 'Un terrain a la forme d\'un triangle $ABC$ rectangle en $A$, avec $AB = 6$ m et $AC = 8$ m.',
                    'questions' => [
                        self::q('Calcule la longueur $BC$, en mètres.', 'numerique', 0, ['valeur' => '10', 'unite' => 'm', 'tolerance' => '0'], [
                            ['Le théorème de Pythagore', 'Le triangle est rectangle en $A$ : $BC^2 = AB^2 + AC^2$.'],
                            ['Le calcul', '$BC^2 = 36 + 64 = 100$, donc $BC = 10$ m.'],
                        ]),
                        self::q('Quel est le périmètre du terrain ?', 'qcm_une', 0, ['options' => ['14 m', '24 m', '48 m'], 'bonnes_options' => [1]], [
                            ['Additionner les trois côtés', '$6 + 8 + 10 = 24$ m.'],
                        ], 1),
                    ],
                ],
                [
                    'titre' => 'Exercice 2',
                    'bareme' => 5,
                    'consigne' => 'On donne l\'expression $E = (x + 3)^2 - 9$.',
                    'questions' => [
                        self::q('Développe et réduis $E$.', 'ouverte', 3, ['bareme' => [
                            ['critere' => 'J\'applique l\'identité remarquable (a + b)² = a² + 2ab + b².', 'points' => 2],
                            ['critere' => 'J\'obtiens E = x² + 6x.', 'points' => 2],
                        ]], [
                            ['L\'identité remarquable', '$(x + 3)^2 = x^2 + 6x + 9$.'],
                            ['Réduire', '$E = x^2 + 6x + 9 - 9 = x^2 + 6x$.'],
                        ], 3),
                        self::q('Pour $x = 0$, l\'expression $E$ vaut 0.', 'vrai_faux', 3, ['vrai' => true], [
                            ['Remplacer', '$E = (0 + 3)^2 - 9 = 9 - 9 = 0$ : c\'est vrai.'],
                        ], 1),
                    ],
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private static function bepcMaths2023(): array
    {
        return [
            'titre' => 'Mathématiques — sujet d\'exemple, session 2023',
            'duree_minutes' => 120,
            'coefficient' => null,
            'avertissements' => [],
            'parties' => [[
                'titre' => 'Exercice 1',
                'bareme' => 6,
                'consigne' => 'On considère l\'équation $3x - 5 = 7$.',
                'questions' => [
                    self::q('Résous l\'équation.', 'numerique', 5, ['valeur' => '4', 'tolerance' => '0'], [
                        ['Isoler le terme en $x$', '$3x = 7 + 5 = 12$.'],
                        ['Diviser', '$x = 12 \div 3 = 4$.'],
                    ]),
                    self::q('Un triangle dont les côtés mesurent 5 cm, 12 cm et 13 cm est rectangle.', 'vrai_faux', 1, ['vrai' => true], [
                        ['La réciproque de Pythagore', '$5^2 + 12^2 = 25 + 144 = 169 = 13^2$ : le triangle est rectangle.'],
                    ]),
                    self::q('Factorise $x^2 - 16$.', 'courte', 4, ['acceptees' => ['(x-4)(x+4)', '(x+4)(x-4)']], [
                        ['Une différence de deux carrés', '$x^2 - 16 = x^2 - 4^2 = (x - 4)(x + 4)$.'],
                    ], 3),
                ],
            ]],
        ];
    }

    /** @return array<string, mixed> */
    private static function bepcMaths2022(): array
    {
        return [
            'titre' => 'Mathématiques — sujet d\'exemple, session 2022',
            'duree_minutes' => null,
            'coefficient' => null,
            'avertissements' => ['Page 2 : une ligne est en partie illisible (« [illisible] » dans la question 2).'],
            'parties' => [[
                'titre' => 'Exercice 1',
                'bareme' => 4,
                'consigne' => 'Dans un triangle $MNP$ rectangle en $M$, $MN = 3$ cm et $MP = 4$ cm.',
                'questions' => [
                    self::q('Calcule $NP$.', 'numerique', 0, ['valeur' => '5', 'unite' => 'cm', 'tolerance' => '0'], [
                        ['Pythagore', '$NP^2 = 9 + 16 = 25$, donc $NP = 5$ cm.'],
                    ]),
                    self::q('Calcule le cosinus de l\'angle $\widehat{MNP}$ [illisible].', 'qcm_une', 2, ['options' => ['$\frac{3}{5}$', '$\frac{4}{5}$'], 'bonnes_options' => [0, 1]], [
                        ['La définition', '$\cos \widehat{MNP} = \frac{MN}{NP} = \frac{3}{5}$.'],
                    ]),
                ],
            ]],
        ];
    }

    /** @return array<string, mixed> */
    private static function bacChimie2024(): array
    {
        return [
            'titre' => 'Chimie — sujet d\'exemple, session 2024',
            'duree_minutes' => 180,
            'coefficient' => null,
            'avertissements' => [],
            'parties' => [[
                'titre' => 'Exercice 1 : solutions aqueuses',
                'bareme' => 6,
                'consigne' => 'On prépare une solution d\'acide chlorhydrique de concentration $c = 1{,}0 \times 10^{-2}$ mol/L.',
                'questions' => [
                    self::q('Calcule le pH de cette solution.', 'numerique', 0, ['valeur' => '2', 'tolerance' => '0.05'], [
                        ['Un acide fort', '$[\mathrm{H_3O^+}] = c = 1{,}0 \times 10^{-2}$ mol/L.'],
                        ['La définition du pH', '$\mathrm{pH} = -\log(10^{-2}) = 2$.'],
                    ]),
                    self::q('Cette solution est :', 'qcm_une', 0, ['options' => ['acide', 'neutre', 'basique'], 'bonnes_options' => [0]], [
                        ['Comparer à 7', 'À 25 °C, un pH inférieur à 7 indique une solution acide.'],
                    ], 1),
                    self::q('Explique ce que devient le pH si l\'on dilue la solution dix fois.', 'ouverte', 0, ['bareme' => [
                        ['critere' => 'La concentration est divisée par dix.', 'points' => 1],
                        ['critere' => 'Le pH augmente d\'une unité et vaut 3.', 'points' => 2],
                    ]], [
                        ['La dilution', 'Diluer dix fois divise la concentration en ions oxonium par dix : $10^{-3}$ mol/L.'],
                        ['Le nouveau pH', '$\mathrm{pH} = -\log(10^{-3}) = 3$ : il augmente d\'une unité.'],
                    ], 3),
                ],
            ]],
        ];
    }
}
