<?php

namespace Database\Seeders;

use App\Enums\CodeExamen;
use App\Enums\CodeSerie;
use App\Enums\Filiere;
use App\Enums\TeinteMatiere;
use App\Models\AnneeScolaire;
use App\Models\Classe;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Serie;
use Illuminate\Database\Seeder;

/**
 * Structure du référentiel (PLAN M3), lancée à chaque déploiement, y
 * compris en production. **Aucune donnée officielle** (CLAUDE.md § 5) :
 * coefficients et durées restent vides, le programme (chapitres, notions)
 * n'est pas semé.
 *
 * Deux régimes :
 *  - la structure fixe (examens, séries, classes d'examen) est recopiée à
 *    chaque passage (`updateOrCreate`) ;
 *  - ce que le responsable pédagogique modifie ensuite (année scolaire,
 *    matières, épreuves phares) n'est semé qu'une fois, sur une table vide :
 *    un `db:seed` de déploiement ne défait jamais son travail.
 */
class ReferentielSeeder extends Seeder
{
    /**
     * Matières de départ (noms et teintes de DESIGN.md § 2.4).
     *
     * @var array<string, string> teinte => nom
     */
    public const MATIERES = [
        'maths' => 'Mathématiques',
        'physique' => 'Physique',
        'chimie' => 'Chimie',
        'biologie' => 'Biologie-Géologie',
        'francais' => 'Français',
        'anglais' => 'Anglais',
        'histoire' => 'Histoire-Géographie',
        'philosophie' => 'Philosophie',
        'economie' => 'Économie',
        'culture' => 'Culture générale',
    ];

    /**
     * Matières phares au lancement (D1, choix du 2026-10-31) : priorité de
     * rédaction, à confirmer par l'équipe pédagogique, modifiable dans le
     * back-office. Le CEE vient au trimestre suivant : aucune phare.
     *
     * @var array<string, list<string>> « EXAMEN » ou « BAC-SERIE » => slugs
     */
    public const PHARES = [
        'BEPC' => ['maths', 'francais', 'physique', 'biologie'],
        'BAC-SM' => ['maths', 'physique', 'chimie'],
        'BAC-SE' => ['biologie', 'chimie', 'physique', 'maths'],
        'BAC-SS' => ['philosophie', 'histoire', 'francais', 'economie'],
    ];

    /** @var array<string, string> code d'examen => classe d'examen */
    private const CLASSES = [
        'CEE' => '6e année',
        'BEPC' => '10e année',
        'BAC' => 'Terminale',
    ];

    public function run(): void
    {
        $this->structure();
        $annee = $this->anneeCourante();
        $this->matieres();
        $this->epreuvesPhares($annee);
    }

    private function structure(): void
    {
        foreach (CodeExamen::cases() as $ordre => $code) {
            $examen = Examen::updateOrCreate(['code' => $code], ['nom' => $code->nom(), 'ordre' => $ordre + 1]);

            Classe::updateOrCreate(['nom' => self::CLASSES[$code->value]], [
                'ordre' => $ordre + 1,
                'examen_id' => $examen->id,
            ]);

            if ($code->aDesSeries()) {
                foreach (CodeSerie::cases() as $serie) {
                    Serie::updateOrCreate(['examen_id' => $examen->id, 'code' => $serie], ['nom' => $serie->nom()]);
                }
            }
        }
    }

    private function anneeCourante(): AnneeScolaire
    {
        if (AnneeScolaire::query()->doesntExist()) {
            return AnneeScolaire::create([
                'libelle' => '2026-2027',
                'debut' => '2026-09-01',
                'fin' => '2027-08-31',
                'courante' => true,
            ]);
        }

        return AnneeScolaire::courante() ?? AnneeScolaire::query()->latest('debut')->firstOrFail();
    }

    private function matieres(): void
    {
        if (Matiere::query()->exists()) {
            return;
        }

        $ordre = 0;

        foreach (self::MATIERES as $teinte => $nom) {
            Matiere::create([
                'nom' => $nom,
                'slug' => $teinte,
                'teinte' => TeinteMatiere::from($teinte),
                'ordre' => ++$ordre,
            ]);
        }
    }

    private function epreuvesPhares(AnneeScolaire $annee): void
    {
        if ($annee->epreuves()->exists()) {
            return;
        }

        foreach (self::PHARES as $cle => $slugs) {
            [$codeExamen, $codeSerie] = array_pad(explode('-', $cle), 2, null);
            $examen = Examen::where('code', $codeExamen)->sole();
            $serie = $codeSerie !== null ? Serie::where('examen_id', $examen->id)->where('code', $codeSerie)->sole() : null;

            foreach ($slugs as $slug) {
                $matiere = Matiere::where('slug', $slug)->first();

                if ($matiere === null) {
                    continue;
                }

                Epreuve::create([
                    'annee_scolaire_id' => $annee->id,
                    'examen_id' => $examen->id,
                    'serie_id' => $serie?->id,
                    'matiere_id' => $matiere->id,
                    'filiere' => Filiere::Generale,
                    'phare' => true,
                ]);
            }
        }
    }
}
