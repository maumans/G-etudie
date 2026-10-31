<?php

namespace Database\Seeders;

use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\User;
use App\Services\ContenuService;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Cours de démonstration côté élève (lot 2, développement seulement) :
 * leçons **publiées** et QCM **fictifs** pour les matières phares du BEPC et
 * du Bac SE, tous marqués `est_exemple` (bandeau « EXEMPLE — contenu
 * fictif », CLAUDE.md § 5). Ni sujet d'annale, ni programme officiel : de
 * quoi voir les écrans pleins et faire un premier exercice.
 *
 * Les leçons passent par ContenuService (rédigées par le rédacteur, publiées
 * par la relectrice). Les questions n'ont pas encore d'écran de saisie
 * (lot 3) : elles sont écrites ici, vérifiées par FormatQuestion. Semé une
 * seule fois.
 */
class DemoCoursSeeder extends Seeder
{
    public function run(ContenuService $contenu): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Le contenu de démonstration n\'est jamais semé en production.');
        }

        if (Question::query()->where('est_exemple', true)->exists()) {
            return;
        }

        $redacteur = User::where('pseudo', 'redacteur_demo')->firstOrFail();
        $relectrice = User::where('pseudo', 'relectrice_demo')->firstOrFail();

        foreach ($this->programme() as [$matiere, $classe, $chapitre, $ordre, $notions]) {
            $chapitreModele = Chapitre::firstOrCreate(
                [
                    'matiere_id' => Matiere::where('slug', $matiere)->value('id'),
                    'classe_id' => Classe::where('nom', $classe)->value('id'),
                    'titre' => $chapitre,
                ],
                ['ordre' => $ordre, 'est_exemple' => true],
            );

            foreach ($notions as $rang => [$titreNotion, $lecon, $questions]) {
                $notion = Notion::firstOrCreate(
                    ['chapitre_id' => $chapitreModele->id, 'titre' => $titreNotion],
                    ['ordre' => $rang + 1, 'est_exemple' => true],
                );

                if ($lecon !== null && Lecon::query()->where('notion_id', $notion->id)->doesntExist()) {
                    [$titre, $blocs] = $lecon;
                    $modele = $contenu->creerLecon($redacteur, $notion, $titre, estExemple: true);
                    $modele = $contenu->enregistrerBrouillon($modele, $redacteur, $titre, $blocs, 0);
                    $contenu->publier($contenu->soumettre($modele, $redacteur), $relectrice);
                }

                foreach ($questions as $question) {
                    $this->question($notion, ...$question);
                }
            }
        }
    }

    /**
     * @param  list<array{0: string, 1: string, 2?: string}>  $options  [lettre, texte, latex]
     */
    private function question(Notion $notion, string $enonce, ?string $latex, array $options, string $bonne, string $explication): void
    {
        $doc = ['type' => 'doc', 'content' => [self::paragraphe($enonce)]];

        if ($latex !== null) {
            $doc['content'][] = ['type' => 'formuleBloc', 'attrs' => ['latex' => $latex]];
        }

        $donnees = ['options' => array_map(fn (array $option) => array_filter([
            'id' => $option[0],
            'texte' => $option[1],
            'latex' => $option[2] ?? null,
        ], fn ($valeur) => $valeur !== null), $options)];
        $attendue = ['option' => $bonne];
        $erreur = FormatQuestion::erreur(TypeQuestion::QcmUne, $doc, $donnees, $attendue);

        if ($erreur !== null) {
            throw new RuntimeException("Question de démonstration invalide ({$enonce}) : {$erreur}");
        }

        Question::create([
            'uuid' => (string) Str::uuid7(),
            'notion_id' => $notion->id,
            'type' => TypeQuestion::QcmUne,
            'enonce' => $doc,
            'donnees' => $donnees,
            'reponse_attendue' => $attendue,
            'explication' => ['type' => 'doc', 'content' => [self::paragraphe($explication)]],
            'difficulte' => 2,
            'statut' => StatutContenu::Publie,
            'version' => 1,
            'est_exemple' => true,
        ]);
    }

    /**
     * [matière, classe, chapitre, ordre, [[notion, [titre, blocs] | null, questions]]].
     *
     * @return list<array{0: string, 1: string, 2: string, 3: int, 4: list<array{0: string, 1: array{0: string, 1: array<string, mixed>}|null, 2: list<array<int, mixed>>}>}>
     */
    private function programme(): array
    {
        return [
            // BEPC : Mathématiques (les chapitres du DemoContenuSeeder sont complétés).
            ['maths', '10e année', 'Géométrie du triangle rectangle', 1, [
                ['Le théorème de Pythagore', null, [
                    ['Le triangle ABC est rectangle en A, avec AB = 3 cm et AC = 4 cm. Combien mesure BC ?', null, [['a', '5 cm'], ['b', '7 cm'], ['c', '12 cm'], ['d', '25 cm']], 'a', 'BC² = 3² + 4² = 9 + 16 = 25, donc BC = 5 cm.'],
                    ['Dans un triangle rectangle, comment s\'appelle le côté opposé à l\'angle droit ?', null, [['a', 'La médiane'], ['b', 'L\'hypoténuse'], ['c', 'La hauteur']], 'b', 'L\'hypoténuse est le côté opposé à l\'angle droit, et le plus long des trois.'],
                    ['Un écran de téléphone mesure 6 cm sur 8 cm. Quelle est la longueur de sa diagonale ?', null, [['a', '14 cm'], ['b', '10 cm'], ['c', '48 cm'], ['d', '12 cm']], 'b', '6² + 8² = 36 + 64 = 100, et la racine de 100 est 10.'],
                ]],
                ['La réciproque du théorème de Pythagore', null, [
                    ['Un triangle a pour côtés 5, 12 et 13. Est-il rectangle ?', null, [['a', 'Oui, car 13² = 5² + 12²'], ['b', 'Non, car 13 ≠ 5 + 12'], ['c', 'On ne peut pas savoir']], 'a', '13² = 169 et 5² + 12² = 25 + 144 = 169 : l\'égalité est vraie, le triangle est rectangle.'],
                ]],
                ['Le cosinus d\'un angle aigu', ['Le cosinus d\'un angle aigu', self::doc([
                    self::paragraphe('Dans un triangle rectangle, le cosinus d\'un angle aigu relie le côté adjacent à cet angle et l\'hypoténuse.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => '\cos \widehat{B} = \dfrac{\text{côté adjacent}}{\text{hypoténuse}}']],
                    self::encadre('a_retenir', 'Le cosinus d\'un angle aigu est toujours compris entre 0 et 1.'),
                    self::encadre('methode', 'Repère d\'abord l\'angle, puis le côté qui le touche (adjacent) et l\'hypoténuse.'),
                ])], [
                    ['Dans un triangle ABC rectangle en A, que vaut cos B ?', null, [['a', 'AB ÷ BC'], ['b', 'AC ÷ BC'], ['c', 'AB ÷ AC']], 'a', 'Le côté adjacent à B est AB, l\'hypoténuse est BC.'],
                ]],
            ]],
            ['maths', '10e année', 'Équations et inéquations', 3, [
                ['Équations du premier degré', ['Résoudre une équation du premier degré', self::doc([
                    self::paragraphe('Résoudre une équation, c\'est trouver la valeur de l\'inconnue qui rend l\'égalité vraie.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => '3x + 5 = 20 \iff 3x = 15 \iff x = 5']],
                    self::encadre('a_retenir', 'On peut ajouter, soustraire, multiplier ou diviser les deux membres par un même nombre (non nul pour la division).'),
                    self::encadre('exemple', 'Une vendeuse de Madina a 12 000 GNF de plus qu\'hier, soit 47 000 GNF. Hier : x + 12 000 = 47 000, donc x = 35 000 GNF.'),
                    self::encadre('piege', 'Quand on change un terme de membre, on change son signe : 3x + 5 = 20 devient 3x = 20 − 5.'),
                ])], [
                    ['Quelle est la solution de l\'équation suivante ?', '2x - 6 = 10', [['a', '', 'x = 2'], ['b', '', 'x = 8'], ['c', '', 'x = 16']], 'b', '2x = 10 + 6 = 16, donc x = 8.'],
                    ['Quelle est la solution de l\'équation suivante ?', '5x + 3 = 3x + 11', [['a', '', 'x = 4'], ['b', '', 'x = 7'], ['c', '', 'x = 1']], 'a', '5x − 3x = 11 − 3, donc 2x = 8 et x = 4.'],
                ]],
            ]],
            // BEPC : Physique.
            ['physique', '10e année', 'Électricité', 1, [
                ['La loi d\'Ohm', ['La loi d\'Ohm', self::doc([
                    self::paragraphe('Aux bornes d\'un conducteur ohmique, la tension est proportionnelle à l\'intensité du courant qui le traverse.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => 'U = R \times I']],
                    self::encadre('a_retenir', 'U en volts (V), R en ohms (Ω), I en ampères (A).'),
                    self::encadre('piege', 'Une intensité donnée en milliampères se convertit en ampères avant le calcul : 200 mA = 0,2 A.'),
                ])], [
                    ['Une résistance de 100 Ω est traversée par un courant de 0,2 A. Quelle est la tension à ses bornes ?', null, [['a', '20 V'], ['b', '500 V'], ['c', '0,002 V']], 'a', 'U = R × I = 100 × 0,2 = 20 V.'],
                    ['Quelle est l\'unité de la résistance électrique ?', null, [['a', 'Le volt'], ['b', 'L\'ampère'], ['c', 'L\'ohm']], 'c', 'La résistance se mesure en ohms (Ω).'],
                ]],
            ]],
            // BEPC : Français.
            ['francais', '10e année', 'Grammaire', 1, [
                ['L\'accord du participe passé', ['L\'accord du participe passé avec avoir', self::doc([
                    self::paragraphe('Avec l\'auxiliaire avoir, le participe passé ne s\'accorde pas avec le sujet.'),
                    self::encadre('a_retenir', 'Il s\'accorde avec le complément d\'objet direct seulement si celui-ci est placé avant le verbe.'),
                    self::encadre('exemple', 'Les mangues que Fanta a achetées étaient mûres : « que », mis pour « les mangues », est placé avant.'),
                ])], [
                    ['Quelle phrase est correctement écrite ?', null, [['a', 'Les lettres que j\'ai écrit.'], ['b', 'Les lettres que j\'ai écrites.'], ['c', 'Les lettres que j\'ai écrits.']], 'b', 'Le COD « que » (les lettres, féminin pluriel) est placé avant le verbe : écrites.'],
                    ['« Elles ont … toute la journée. » Quel mot convient ?', null, [['a', 'marché'], ['b', 'marchées'], ['c', 'marchés']], 'a', 'Pas de COD : avec avoir, le participe passé reste invariable.'],
                ]],
            ]],
            // BEPC : Biologie-Géologie.
            ['biologie', '10e année', 'La cellule', 1, [
                ['L\'organisation de la cellule', ['La cellule, unité du vivant', self::doc([
                    self::paragraphe('Tous les êtres vivants sont formés de cellules. Une cellule comprend une membrane, un cytoplasme et, le plus souvent, un noyau.'),
                    self::encadre('a_retenir', 'Le noyau contient l\'information génétique ; la membrane sépare la cellule de son milieu.'),
                ])], [
                    ['Quelle partie de la cellule contient l\'information génétique ?', null, [['a', 'La membrane'], ['b', 'Le cytoplasme'], ['c', 'Le noyau']], 'c', 'L\'information génétique (l\'ADN) se trouve dans le noyau.'],
                    ['Quelle structure trouve-t-on dans une cellule végétale mais pas dans une cellule animale ?', null, [['a', 'La paroi'], ['b', 'Le noyau'], ['c', 'La membrane']], 'a', 'La paroi, rigide, entoure la membrane des cellules végétales.'],
                ]],
            ]],
            // Bac SE : Biologie-Géologie.
            ['biologie', 'Terminale', 'La génétique', 1, [
                ['Les lois de Mendel', ['Le monohybridisme', self::doc([
                    self::paragraphe('On croise deux lignées pures qui diffèrent par un seul caractère. En première génération, tous les individus se ressemblent.'),
                    self::encadre('a_retenir', 'En F2, un allèle dominant et un récessif donnent les proportions 3/4 et 1/4.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => 'F_1 \times F_1 \to \tfrac{3}{4}\,[A] + \tfrac{1}{4}\,[a]']],
                ])], [
                    ['Un croisement F1 × F1 donne 300 plantes à fleurs rouges et 100 à fleurs blanches. Quel est le rapport observé ?', null, [['a', '1/2 – 1/2'], ['b', '3/4 – 1/4'], ['c', '9/16 – 7/16']], 'b', '300 sur 400 font 3/4, 100 sur 400 font 1/4 : c\'est le rapport du monohybridisme avec dominance.'],
                ]],
            ]],
            // Bac SE : Chimie.
            ['chimie', 'Terminale', 'Acides et bases', 1, [
                ['Le pH d\'une solution', ['Le pH d\'une solution aqueuse', self::doc([
                    self::paragraphe('Le pH mesure l\'acidité d\'une solution aqueuse.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => '\mathrm{pH} = -\log\,[\mathrm{H_3O^+}]']],
                    self::encadre('a_retenir', 'À 25 °C : pH < 7 acide, pH = 7 neutre, pH > 7 basique.'),
                ])], [
                    ['Une solution a une concentration en ions oxonium de 10⁻³ mol/L. Quel est son pH ?', null, [['a', 'pH = 3'], ['b', 'pH = −3'], ['c', 'pH = 11']], 'a', 'pH = −log(10⁻³) = 3.'],
                    ['À 25 °C, une solution de pH 9 est :', null, [['a', 'acide'], ['b', 'neutre'], ['c', 'basique']], 'c', 'Un pH supérieur à 7 indique une solution basique.'],
                ]],
            ]],
            // Bac SE : Physique.
            ['physique', 'Terminale', 'Mécanique', 1, [
                ['Les lois de Newton', ['Le principe fondamental de la dynamique', self::doc([
                    self::paragraphe('Dans un référentiel galiléen, la somme des forces appliquées à un solide est égale au produit de sa masse par son accélération.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => '\sum \vec{F} = m\,\vec{a}']],
                    self::encadre('methode', 'Choisir le système et le référentiel, faire le bilan des forces, projeter sur des axes.'),
                ])], [
                    ['Une force de 10 N s\'exerce seule sur une masse de 2 kg. Quelle est son accélération ?', null, [['a', '5 m/s²'], ['b', '20 m/s²'], ['c', '0,2 m/s²']], 'a', 'a = F ÷ m = 10 ÷ 2 = 5 m/s².'],
                ]],
            ]],
            // Bac SE : Mathématiques.
            ['maths', 'Terminale', 'Suites numériques', 1, [
                ['Les suites arithmétiques', ['Les suites arithmétiques', self::doc([
                    self::paragraphe('Une suite est arithmétique si l\'on passe d\'un terme au suivant en ajoutant toujours le même nombre r, la raison.'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => 'u_n = u_0 + n\,r']],
                    self::encadre('a_retenir', 'Somme de termes consécutifs : nombre de termes × (premier + dernier) ÷ 2.'),
                ])], [
                    ['Suite arithmétique de premier terme 4 et de raison 3 : que vaut le terme suivant ?', 'u_0 = 4,\; r = 3,\; u_5 = \;?', [['a', '19'], ['b', '15'], ['c', '12']], 'a', 'u₅ = 4 + 5 × 3 = 19.'],
                ]],
            ]],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $contenu
     * @return array<string, mixed>
     */
    private static function doc(array $contenu): array
    {
        $doc = ['type' => 'doc', 'content' => $contenu];

        if (! BlocsContenu::estValide($doc)) {
            throw new RuntimeException('Leçon de démonstration invalide : '.BlocsContenu::erreur($doc));
        }

        return $doc;
    }

    /**
     * @return array<string, mixed>
     */
    private static function paragraphe(string $texte): array
    {
        return ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]];
    }

    /**
     * @return array<string, mixed>
     */
    private static function encadre(string $genre, string $texte): array
    {
        return ['type' => 'encadre', 'attrs' => ['genre' => $genre], 'content' => [self::paragraphe($texte)]];
    }
}
