<?php

namespace Database\Seeders;

use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\User;
use App\Services\ContenuService;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Contenu de démonstration du back-office (développement seulement) :
 * quelques chapitres, notions et leçons **fictifs**, tous marqués
 * `est_exemple` et affichés avec le bandeau « EXEMPLE — contenu fictif »
 * (CLAUDE.md § 5). Ce n'est pas le programme officiel : il sert à voir les
 * écrans pleins et à essayer le circuit de relecture à chaque statut.
 *
 * Les leçons passent par ContenuService, comme celles des rédacteurs : leur
 * historique est celui d'un vrai circuit. Semé une seule fois.
 */
class DemoContenuSeeder extends Seeder
{
    public function run(ContenuService $contenu): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Le contenu de démonstration n\'est jamais semé en production.');
        }

        if (Lecon::query()->where('est_exemple', true)->exists()) {
            return;
        }

        $redacteur = User::where('pseudo', 'redacteur_demo')->firstOrFail();
        $relectrice = User::where('pseudo', 'relectrice_demo')->firstOrFail();
        $pedagogie = User::where('pseudo', 'pedagogie_demo')->firstOrFail();

        $geometrie = $this->chapitre('maths', '10e année', 'Géométrie du triangle rectangle', 1, [
            'Le théorème de Pythagore',
            'La réciproque du théorème de Pythagore',
            'Le cosinus d\'un angle aigu',
        ]);
        $calcul = $this->chapitre('maths', '10e année', 'Calcul littéral', 2, [
            'Les identités remarquables',
            'Factoriser une expression',
        ]);
        $this->chapitre('maths', '10e année', 'Équations et inéquations', 3, [
            'Équations du premier degré',
            'Inéquations du premier degré',
        ]);
        $mecanique = $this->chapitre('physique', 'Terminale', 'Mécanique', 1, [
            'Le mouvement rectiligne uniforme',
            'Les lois de Newton',
        ]);
        $this->chapitre('physique', '10e année', 'Électricité', 1, ['La loi d\'Ohm']);

        // Publiée, avec son historique : un renvoi puis une publication.
        $pythagore = $this->rediger($contenu, $redacteur, $geometrie[0], 'Le théorème de Pythagore', $this->pythagore(false));
        $contenu->soumettre($pythagore, $redacteur);
        $contenu->renvoyer($pythagore, $relectrice, 'Ajoutez un exemple résolu avec des longueurs : les élèves en ont besoin avant l\'exercice.');
        $pythagore = $contenu->enregistrerBrouillon($pythagore->fresh(), $redacteur, 'Le théorème de Pythagore', $this->pythagore(true), $pythagore->fresh()->revision);
        $contenu->publier($contenu->soumettre($pythagore, $redacteur), $relectrice, 'Clair, juste, et l\'exemple du marché parle aux élèves.');

        // En relecture : ce que la relectrice de démonstration trouve dans sa file.
        $reciproque = $this->rediger($contenu, $redacteur, $geometrie[1], 'Démontrer qu\'un triangle est rectangle', $this->reciproque());
        $contenu->soumettre($reciproque, $redacteur);

        // Renvoyée avec un commentaire : ce que le rédacteur doit reprendre.
        $identites = $this->rediger($contenu, $redacteur, $calcul[0], 'Les identités remarquables', $this->identites());
        $contenu->soumettre($identites, $redacteur);
        $contenu->renvoyer($identites, $relectrice, 'La troisième identité manque, et le piège sur (a + b)² mérite un encadré à lui.');

        // Brouillon tout juste commencé.
        $this->rediger($contenu, $redacteur, $calcul[1], 'Factoriser une expression', [
            'type' => 'doc',
            'content' => [$this->paragraphe('Factoriser, c\'est écrire une somme sous la forme d\'un produit.')],
        ]);

        // Du responsable pédagogique, en relecture : il ne peut pas la relire lui-même.
        $mru = $this->rediger($contenu, $pedagogie, $mecanique[0], 'Le mouvement rectiligne uniforme', $this->mru());
        $contenu->soumettre($mru, $pedagogie);
    }

    /**
     * @param  list<string>  $notions
     * @return list<Notion>
     */
    private function chapitre(string $matiere, string $classe, string $titre, int $ordre, array $notions): array
    {
        $chapitre = Chapitre::firstOrCreate(
            [
                'matiere_id' => Matiere::where('slug', $matiere)->value('id'),
                'classe_id' => Classe::where('nom', $classe)->value('id'),
                'titre' => $titre,
            ],
            ['ordre' => $ordre, 'est_exemple' => true],
        );

        return array_map(fn (string $notion, int $rang) => Notion::firstOrCreate(
            ['chapitre_id' => $chapitre->id, 'titre' => $notion],
            ['ordre' => $rang + 1, 'est_exemple' => true],
        ), $notions, array_keys($notions));
    }

    /**
     * @param  array<string, mixed>  $blocs
     */
    private function rediger(ContenuService $contenu, User $auteur, Notion $notion, string $titre, array $blocs): Lecon
    {
        $lecon = $contenu->creerLecon($auteur, $notion, $titre, estExemple: true);

        return $contenu->enregistrerBrouillon($lecon, $auteur, $titre, $blocs, 0);
    }

    /**
     * @return array<string, mixed>
     */
    private function pythagore(bool $avecExemple): array
    {
        $contenu = [
            $this->paragraphe('Dans un triangle rectangle, le côté opposé à l\'angle droit s\'appelle l\'hypoténuse. C\'est le plus long des trois côtés.'),
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [['type' => 'text', 'text' => 'Le théorème']]],
            [
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => 'Si le triangle '],
                    ['type' => 'formule', 'attrs' => ['latex' => 'ABC']],
                    ['type' => 'text', 'text' => ' est rectangle en '],
                    ['type' => 'formule', 'attrs' => ['latex' => 'A']],
                    ['type' => 'text', 'text' => ', alors :'],
                ],
            ],
            ['type' => 'formuleBloc', 'attrs' => ['latex' => 'BC^2 = AB^2 + AC^2']],
            [
                'type' => 'encadre',
                'attrs' => ['genre' => 'a_retenir'],
                'content' => [$this->paragraphe('Le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés.')],
            ],
        ];

        if ($avecExemple) {
            $contenu[] = [
                'type' => 'encadre',
                'attrs' => ['genre' => 'exemple'],
                'content' => [
                    $this->paragraphe('Au marché de Madina, un commerçant pose une planche contre un mur : son pied est à 1,2 m du mur et elle touche le mur à 1,6 m de haut. Quelle est la longueur de la planche ?'),
                    ['type' => 'formuleBloc', 'attrs' => ['latex' => 'L^2 = 1{,}2^2 + 1{,}6^2 = 1{,}44 + 2{,}56 = 4']],
                    $this->paragraphe('Donc la planche mesure 2 m.'),
                ],
            ];
        }

        $contenu[] = [
            'type' => 'encadre',
            'attrs' => ['genre' => 'piege'],
            'content' => [$this->paragraphe('Le théorème ne s\'applique qu\'à un triangle rectangle, et l\'hypoténuse est toujours seule de son côté de l\'égalité.')],
        ];

        return ['type' => 'doc', 'content' => $contenu];
    }

    /**
     * @return array<string, mixed>
     */
    private function reciproque(): array
    {
        return ['type' => 'doc', 'content' => [
            $this->paragraphe('Pour montrer qu\'un triangle est rectangle, on compare le carré du plus grand côté à la somme des carrés des deux autres.'),
            [
                'type' => 'encadre',
                'attrs' => ['genre' => 'methode'],
                'content' => [[
                    'type' => 'orderedList',
                    'attrs' => ['start' => 1, 'type' => null],
                    'content' => [
                        ['type' => 'listItem', 'content' => [$this->paragraphe('Repérer le plus grand côté.')]],
                        ['type' => 'listItem', 'content' => [$this->paragraphe('Calculer son carré, puis la somme des carrés des deux autres.')]],
                        ['type' => 'listItem', 'content' => [$this->paragraphe('Si les deux résultats sont égaux, le triangle est rectangle.')]],
                    ],
                ]],
            ],
            ['type' => 'formuleBloc', 'attrs' => ['latex' => '5^2 = 25 \quad\text{et}\quad 3^2 + 4^2 = 9 + 16 = 25']],
            $this->paragraphe('Le triangle de côtés 3, 4 et 5 est donc rectangle.'),
        ]];
    }

    /**
     * @return array<string, mixed>
     */
    private function identites(): array
    {
        return ['type' => 'doc', 'content' => [
            $this->paragraphe('Trois égalités à connaître par cœur, valables pour tous nombres a et b :'),
            ['type' => 'formuleBloc', 'attrs' => ['latex' => '(a + b)^2 = a^2 + 2ab + b^2']],
            ['type' => 'formuleBloc', 'attrs' => ['latex' => '(a - b)^2 = a^2 - 2ab + b^2']],
        ]];
    }

    /**
     * @return array<string, mixed>
     */
    private function mru(): array
    {
        return ['type' => 'doc', 'content' => [
            $this->paragraphe('Un mobile est en mouvement rectiligne uniforme si sa trajectoire est une droite et sa vitesse reste constante.'),
            ['type' => 'formuleBloc', 'attrs' => ['latex' => 'x(t) = v \cdot t + x_0']],
            [
                'type' => 'encadre',
                'attrs' => ['genre' => 'a_retenir'],
                'content' => [$this->paragraphe('La position varie de la même quantité pendant des durées égales.')],
            ],
        ]];
    }

    /**
     * @return array<string, mixed>
     */
    private function paragraphe(string $texte): array
    {
        return ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]];
    }
}
