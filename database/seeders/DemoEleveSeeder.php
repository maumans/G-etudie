<?php

namespace Database\Seeders;

use App\Enums\CodeExamen;
use App\Enums\CodeSerie;
use App\Enums\EtatLecon;
use App\Models\Examen;
use App\Models\Serie;
use App\Models\Tentative;
use App\Models\User;
use App\Services\ProfilEleveService;
use App\Services\ProgressionService;
use App\Services\TentativeService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Profils d'examen des élèves de démonstration (lot 2, développement
 * seulement) :
 *  - Aïssatou (01) prépare le BEPC et a déjà quelques soirs derrière elle
 *    (réponses et leçons ouvertes, passées par les vrais services) : son
 *    accueil montre un tableau de bord vivant ;
 *  - Ousmane (09) prépare le Bac SE et n'a encore rien fait : l'accueil
 *    d'un élève qui vient de finir son parcours.
 *
 * Un profil existant n'est jamais modifié ; l'historique n'est semé qu'une
 * fois.
 */
class DemoEleveSeeder extends Seeder
{
    public function run(ProfilEleveService $profils, TentativeService $tentatives, ProgressionService $progression): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les élèves de démonstration ne sont jamais semés en production.');
        }

        $bepc = Examen::where('code', CodeExamen::Bepc)->sole();
        $bac = Examen::where('code', CodeExamen::Bac)->sole();
        $se = Serie::where('examen_id', $bac->id)->where('code', CodeSerie::Se)->sole();

        $aissatou = User::where('pseudo', 'aissatou_demo')->firstOrFail();
        $ousmane = User::where('pseudo', 'ousmane_demo')->firstOrFail();

        if ($aissatou->profilEleve()->doesntExist()) {
            $profils->enregistrer($aissatou, $bepc->id, null, null, 15);
        }

        if ($ousmane->profilEleve()->doesntExist()) {
            $profils->enregistrer($ousmane, $bac->id, $se->id, null, 30);
        }

        if (Tentative::query()->where('user_id', $aissatou->id)->exists()) {
            return;
        }

        $profil = CatalogueEleve::profil($aissatou);
        $questions = CatalogueEleve::questions($profil)->orderBy('id')->get();
        $lecons = CatalogueEleve::lecons($profil)->orderBy('id')->get();
        $maintenant = CarbonImmutable::now();

        // Trois soirs de suite, jusqu'à hier : une série en cours.
        foreach ($questions->take(6)->values() as $rang => $question) {
            $saisiLe = $maintenant->subDays(3 - intdiv($rang, 2))->setTime(20, 10 + $rang);
            // Une réponse fausse sur trois, pour une jauge honnête.
            $option = $rang % 3 === 2
                ? collect($question->donnees['options'])->firstWhere('id', '!=', $question->reponse_attendue['option'])['id']
                : $question->reponse_attendue['option'];

            $tentatives->enregistrer($aissatou, (string) Str::uuid7(), $question, $question->version, ['option' => $option], null, 40, $saisiLe, $saisiLe);
        }

        if ($lecons->count() >= 2) {
            $hier = $maintenant->subDay()->setTime(20, 30);
            $progression->lecon($aissatou, $lecons[0], EtatLecon::Comprise, 100, $hier);
            $progression->lecon($aissatou, $lecons[1], false, 40, $hier->addMinutes(12));
        }
    }
}
