<?php

namespace Database\Seeders;

use App\Enums\MotifSignalementPublication;
use App\Enums\TypeQuestion;
use App\Enums\TypeRessource;
use App\Models\Chapitre;
use App\Models\Devoir;
use App\Models\Groupe;
use App\Models\Matiere;
use App\Models\MembreGroupe;
use App\Models\MotInterdit;
use App\Models\Notion;
use App\Models\PublicationGroupe;
use App\Models\Question;
use App\Models\RessourceExterne;
use App\Models\Seance;
use App\Models\SignalementPublication;
use App\Models\User;
use App\Services\ContenuService;
use App\Services\Organisation\DevoirService;
use App\Services\RessourceService;
use App\Services\SeanceService;
use App\Services\TentativeService;
use App\Support\CatalogueEleve;
use App\Support\HorlogeDemo;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Lot 12 (développement seulement) : de quoi voir pleins les écrans de la
 * culture générale, des ressources externes et du fil de la 10e A. Tout est
 * marqué `est_exemple` (bandeau « EXEMPLE — contenu fictif »).
 *
 *  - **culture générale** : trois thèmes (Guinée, Afrique, Monde), onze
 *    questions de faits connus, chacune avec sa source, passées par le vrai
 *    circuit (rédactrice → relectrice) ; Aïssatou a fait un quiz ;
 *  - **ressources** : des liens Wikipédia et Vikidia sur les notions de
 *    démonstration, vérifiés par la relectrice ; une ressource attend sa
 *    vérification ;
 *  - **fil de la 10e A** : des questions d'élèves (pseudos d'exemple), la
 *    réponse de l'enseignante, une publication signalée par deux élèves
 *    (elle attend Fatoumata) ;
 *  - **défi du groupe** : rendu par trois élèves, dont deux acceptent le
 *    classement ;
 *  - une courte liste de **mots interdits**.
 *
 * Idempotent : si une question de culture d'exemple existe, rien n'est refait.
 */
class DemoCommunauteSeeder extends Seeder
{
    /** Mots refusés de départ (le responsable pédagogique complète la liste). */
    public const MOTS_INTERDITS = ['idiot', 'imbecile', 'debile', 'connard', 'salope', 'pute', 'merde', 'ta gueule', 'nul a chier'];

    public function run(ContenuService $contenu, RessourceService $ressources, DevoirService $devoirs, TentativeService $tentatives, SeanceService $seances): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les données de démonstration ne sont jamais créées en production.');
        }

        foreach (self::MOTS_INTERDITS as $mot) {
            MotInterdit::query()->firstOrCreate(['mot' => $mot]);
        }

        $culture = Matiere::query()->where('slug', 'culture')->first();

        if ($culture === null || ! $culture->transversale) {
            return;
        }

        if (Question::query()->where('est_exemple', true)->whereHas('notion.chapitre', fn ($c) => $c->where('matiere_id', $culture->id))->exists()) {
            return;
        }

        // Daté sur l'instant du semis de la démonstration (HorlogeDemo) : sur
        // une base déjà semée, « il y a deux jours » se lit comme les données
        // des lots précédents, et les captures restent stables.
        $instant = HorlogeDemo::instant();

        if ($instant !== null) {
            Carbon::setTestNow($instant);
            CarbonImmutable::setTestNow($instant);
        }

        try {
            $this->semer($contenu, $ressources, $devoirs, $tentatives, $seances, $culture);
        } finally {
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
        }
    }

    private function semer(ContenuService $contenu, RessourceService $ressources, DevoirService $devoirs, TentativeService $tentatives, SeanceService $seances, Matiere $culture): void
    {
        $redactrice = User::query()->where('pseudo', 'redacteur_demo')->firstOrFail();
        $relectrice = User::query()->where('pseudo', 'relectrice_demo')->firstOrFail();
        $maintenant = CarbonImmutable::now();

        $this->culture($contenu, $culture, $redactrice, $relectrice);
        $this->ressources($ressources, $redactrice, $relectrice);

        $groupe = Groupe::query()->where('code', DemoOrganisationSeeder::CODE_GROUPE)->first();

        if ($groupe !== null) {
            $this->fil($groupe, $maintenant);
            $this->defi($groupe, $devoirs, $tentatives, $seances, $maintenant);
        }

        // Aïssatou a déjà fait un quiz de culture : l'historique n'est pas vide.
        $aissatou = User::query()->where('telephone', '+224600000001')->first();

        if ($aissatou !== null) {
            $this->quiz($aissatou, $tentatives, $seances, $maintenant->subDays(2)->setTime(20, 10));
        }
    }

    private function culture(ContenuService $contenu, Matiere $culture, User $redactrice, User $relectrice): void
    {
        $wiki = fn (string $article) => 'Exemple de source : Wikipédia, article « '.$article.' ».';

        $themes = [
            ['Guinée', [
                ['Histoire', [
                    ['En quelle année la Guinée est-elle devenue indépendante ?', [['a', '1945'], ['b', '1958'], ['c', '1960'], ['d', '1984']], 'b', 'La Guinée proclame son indépendance le 2 octobre 1958, après le « non » au référendum du 28 septembre.', $wiki('Guinée')],
                ]],
                ['Géographie', [
                    ['Quelle est la capitale de la Guinée ?', [['a', 'Kankan'], ['b', 'Labé'], ['c', 'Conakry'], ['d', 'Nzérékoré']], 'c', 'Conakry, sur la presqu’île du Kaloum, est la capitale et la plus grande ville du pays.', $wiki('Conakry')],
                    ['Quel grand fleuve d’Afrique de l’Ouest prend sa source en Guinée ?', [['a', 'Le Nil'], ['b', 'Le Niger'], ['c', 'Le Congo'], ['d', 'Le Zambèze']], 'b', 'Le Niger naît dans les hauteurs du sud de la Guinée, puis traverse le Mali, le Niger et le Nigeria.', $wiki('Niger (fleuve)')],
                    ['vrai_faux', 'Le massif du Fouta-Djallon est surnommé « le château d’eau de l’Afrique de l’Ouest ».', true, 'Vrai : de nombreux fleuves y prennent leur source, dont le Sénégal et la Gambie.', $wiki('Fouta-Djallon')],
                ]],
                ['Institutions', [
                    ['Quelle est la monnaie de la Guinée ?', [['a', 'Le franc CFA'], ['b', 'Le franc guinéen'], ['c', 'Le cedi'], ['d', 'Le naira']], 'b', 'La Guinée a sa propre monnaie, le franc guinéen (GNF), qui ne fait pas partie de la zone du franc CFA.', $wiki('Franc guinéen')],
                ]],
            ]],
            ['Afrique', [
                ['Géographie', [
                    ['Quel est le plus long fleuve d’Afrique ?', [['a', 'Le Niger'], ['b', 'Le Congo'], ['c', 'Le Nil'], ['d', 'Le Sénégal']], 'c', 'Le Nil coule sur plus de 6 000 km, de l’Afrique de l’Est jusqu’à la Méditerranée.', $wiki('Nil')],
                    ['Quel océan borde la côte de la Guinée ?', [['a', 'L’océan Indien'], ['b', 'L’océan Atlantique'], ['c', 'L’océan Pacifique']], 'b', 'La Guinée a environ 300 km de côte sur l’océan Atlantique.', $wiki('Guinée')],
                ]],
                ['Personnalités', [
                    ['Nelson Mandela a été président de quel pays ?', [['a', 'Du Kenya'], ['b', 'Du Ghana'], ['c', 'De l’Afrique du Sud'], ['d', 'Du Sénégal']], 'c', 'Nelson Mandela a été président de l’Afrique du Sud de 1994 à 1999, après 27 ans de prison sous l’apartheid.', $wiki('Nelson Mandela')],
                ]],
            ]],
            ['Monde', [
                ['Sciences', [
                    ['Quelle planète est la plus proche du Soleil ?', [['a', 'Vénus'], ['b', 'Mars'], ['c', 'Mercure'], ['d', 'La Terre']], 'c', 'Mercure est la première planète du système solaire en partant du Soleil.', $wiki('Mercure (planète)')],
                    ['vrai_faux', 'Au niveau de la mer, l’eau pure bout à 100 °C.', true, 'Vrai. En altitude, l’air est moins dense et l’eau bout un peu en dessous de 100 °C.', $wiki('Point d’ébullition')],
                ]],
                ['Géographie', [
                    ['Quel est le plus grand océan du monde ?', [['a', 'L’océan Atlantique'], ['b', 'L’océan Indien'], ['c', 'L’océan Pacifique'], ['d', 'L’océan Arctique']], 'c', 'Le Pacifique couvre à lui seul près d’un tiers de la surface de la Terre.', $wiki('Océan Pacifique')],
                ]],
            ]],
        ];

        foreach ($themes as $ordre => [$titre, $notions]) {
            $theme = Chapitre::query()->firstOrCreate(
                ['matiere_id' => $culture->id, 'classe_id' => null, 'titre' => $titre],
                ['ordre' => $ordre + 1, 'est_exemple' => true],
            );

            foreach ($notions as $rang => [$titreNotion, $questions]) {
                $notion = Notion::query()->firstOrCreate(
                    ['chapitre_id' => $theme->id, 'titre' => $titreNotion],
                    ['ordre' => $rang + 1, 'est_exemple' => true],
                );

                foreach ($questions as $q) {
                    $this->question($contenu, $redactrice, $relectrice, $notion, $q);
                }
            }
        }
    }

    /** @param  array<int, mixed>  $q  [énoncé, options, bonne, explication, source] ou ['vrai_faux', énoncé, valeur, explication, source] */
    private function question(ContenuService $contenu, User $redactrice, User $relectrice, Notion $notion, array $q): void
    {
        $vraiFaux = $q[0] === 'vrai_faux';
        $type = $vraiFaux ? TypeQuestion::VraiFaux : TypeQuestion::QcmUne;
        $enonce = $vraiFaux ? $q[1] : $q[0];

        $question = $contenu->creerQuestion($redactrice, $notion, $type, estExemple: true);
        $question = $contenu->enregistrerQuestion($question, $redactrice, [
            'enonce' => self::doc($enonce),
            'donnees' => $vraiFaux ? [] : ['options' => array_map(fn (array $o) => ['id' => $o[0], 'texte' => $o[1]], $q[1])],
            'attendue' => $vraiFaux ? ['valeur' => $q[2]] : ['option' => $q[2]],
            'indices' => [],
            'corrige' => [['titre' => '', 'blocs' => self::doc($q[3])]],
            'difficulte' => 1,
            'sources' => $q[4],
        ], 0);

        $contenu->publier($contenu->soumettre($question, $redactrice), $relectrice);
    }

    private function ressources(RessourceService $ressources, User $redactrice, User $relectrice): void
    {
        $liens = [
            ['Le théorème de Pythagore', 'https://fr.wikipedia.org/wiki/Th%C3%A9or%C3%A8me_de_Pythagore', 'Théorème de Pythagore', TypeRessource::Encyclopedie, 'L’histoire du théorème, ses démonstrations et ses usages.', true],
            ['Le théorème de Pythagore', 'https://fr.vikidia.org/wiki/Th%C3%A9or%C3%A8me_de_Pythagore', 'Le théorème de Pythagore, expliqué simplement', TypeRessource::Encyclopedie, 'L’encyclopédie des 8-13 ans : une page courte, avec des figures.', true],
            ['Le cosinus d\'un angle aigu', 'https://fr.wikipedia.org/wiki/Cosinus', 'Cosinus', TypeRessource::Encyclopedie, null, true],
            ['Équations du premier degré', 'https://fr.wikipedia.org/wiki/%C3%89quation_du_premier_degr%C3%A9', 'Équation du premier degré', TypeRessource::Encyclopedie, 'Méthode de résolution et exemples.', true],
            ['La réciproque du théorème de Pythagore', 'https://fr.wikipedia.org/wiki/Hypot%C3%A9nuse', 'Hypoténuse', TypeRessource::Encyclopedie, null, false],
        ];

        foreach ($liens as [$titreNotion, $url, $titre, $type, $description, $verifiee]) {
            $notion = Notion::query()->where('titre', $titreNotion)->where('est_exemple', true)->first();

            if ($notion === null || RessourceExterne::query()->where('notion_id', $notion->id)->where('url', $url)->exists()) {
                continue;
            }

            $ressource = $ressources->proposer($redactrice, $notion, ['url' => $url, 'titre' => $titre, 'type' => $type, 'description' => $description], exemple: true);

            if ($verifiee) {
                $ressources->verifier($relectrice, $ressource);
            }
        }
    }

    private function fil(Groupe $groupe, CarbonImmutable $maintenant): void
    {
        if (PublicationGroupe::query()->where('groupe_id', $groupe->id)->exists()) {
            return;
        }

        $eleve = fn (string $pseudo) => User::query()->where('pseudo', $pseudo)->firstOrFail();
        $enseignante = $groupe->enseignant;
        $maths = Matiere::query()->where('slug', 'maths')->value('id');
        $francais = Matiere::query()->where('slug', 'francais')->value('id');

        $publier = function (User $auteur, string $texte, CarbonImmutable $quand, ?PublicationGroupe $parent = null, ?int $matiere = null) use ($groupe): PublicationGroupe {
            $publication = PublicationGroupe::create([
                'uuid' => (string) Str::uuid7(),
                'groupe_id' => $groupe->id,
                'auteur_id' => $auteur->id,
                'parent_id' => $parent?->id,
                'matiere_id' => $parent === null ? $matiere : null,
                'texte' => $texte,
                'est_exemple' => true,
            ]);
            $publication->forceFill(['created_at' => $quand, 'updated_at' => $quand])->save();

            return $publication;
        };

        $q1 = $publier($eleve('exemple_thierno'), 'Dans Pythagore, comment je sais quel côté est l’hypoténuse ? Je me trompe à chaque fois.', $maintenant->subDays(2)->setTime(19, 12), null, $maths);
        $publier($eleve('exemple_fanta'), 'C’est toujours le côté en face de l’angle droit. Et c’est le plus long !', $maintenant->subDays(2)->setTime(19, 30), $q1);
        $publier($enseignante, 'Bonne réponse, Fanta. Astuce : repasse l’angle droit en couleur, puis suis la flèche jusqu’au côté opposé. Nous le reverrons jeudi.', $maintenant->subDays(2)->setTime(21, 4), $q1);

        $q2 = $publier($eleve('exemple_mariam'), 'Pour le devoir de révision, est-ce qu’on a droit à la calculatrice ?', $maintenant->subDay()->setTime(18, 40), null, $maths);
        $publier($enseignante, 'Non, pas pour celui-ci : les calculs sont faits pour se faire à la main.', $maintenant->subDay()->setTime(20, 15), $q2);

        $q3 = $publier($eleve('exemple_hawa'), 'Quelqu’un peut m’expliquer la différence entre un COD et un COI ?', $maintenant->subHours(5), null, $francais);
        // La publication signalée par deux élèves : elle attend l'enseignante.
        $signalee = $publier($eleve('exemple_saa'), 'Franchement ce chapitre ne sert à rien, celui qui ne comprend pas il est bête.', $maintenant->subHours(4), $q3);

        foreach (['exemple_hawa' => MotifSignalementPublication::Moquerie, 'exemple_mariam' => MotifSignalementPublication::Moquerie] as $pseudo => $motif) {
            $signalement = SignalementPublication::create(['publication_id' => $signalee->id, 'auteur_id' => $eleve($pseudo)->id, 'motif' => $motif]);
            $signalement->forceFill(['created_at' => $maintenant->subHours(3)])->save();
        }

        $publier($eleve('exemple_fanta'), 'Le COD répond à « quoi ? » sans préposition : « Je mange une mangue ». Le COI a une préposition : « Je parle à mon frère ».', $maintenant->subHours(2), $q3);
    }

    private function defi(Groupe $groupe, DevoirService $devoirs, TentativeService $tentatives, SeanceService $seances, CarbonImmutable $maintenant): void
    {
        if (Devoir::query()->where('groupe_id', $groupe->id)->where('defi', true)->exists()) {
            return;
        }

        $questions = CatalogueEleve::questions($groupe->profilType())
            ->with('versionPubliee')
            ->where('type', TypeQuestion::QcmUne->value)
            ->orderByDesc('notion_id')
            ->orderBy('id')
            ->limit(5)
            ->get();

        if ($questions->isEmpty()) {
            return;
        }

        $defi = Devoir::create([
            'groupe_id' => $groupe->id,
            'auteur_id' => $groupe->enseignant_id,
            'titre' => 'Défi du vendredi',
            'consigne' => 'Cinq questions, le meilleur score gagne. Le classement est facultatif.',
            'defi' => true,
            'echeance_le' => $maintenant->addDays(3)->endOfDay(),
            'publie_le' => $maintenant->subDays(2),
            'est_exemple' => true,
        ]);

        foreach ($questions as $rang => $question) {
            $defi->questions()->attach($question->id, ['ordre' => $rang + 1]);
        }

        // Trois élèves l'ont relevé ; Fanta et Mariam acceptent le classement.
        foreach (['exemple_fanta' => [5, true], 'exemple_mariam' => [3, true], 'exemple_thierno' => [4, false]] as $pseudo => [$justes, $accepte]) {
            $eleve = User::query()->where('pseudo', $pseudo)->firstOrFail();
            MembreGroupe::query()->where('groupe_id', $groupe->id)->where('eleve_id', $eleve->id)->update(['classement_accepte' => $accepte]);

            $seance = $devoirs->commencer($eleve, $defi);
            $quand = $maintenant->subDay()->setTime(17, 20 + $justes);

            foreach ($questions as $rang => $question) {
                $this->repondre($tentatives, $eleve, $question, $rang < $justes, $quand->addMinutes($rang), $seance->id);
            }

            $seances->terminer($eleve, $seance->refresh(), $quand->addMinutes(8));
        }
    }

    private function quiz(User $eleve, TentativeService $tentatives, SeanceService $seances, CarbonImmutable $quand): void
    {
        $ids = CatalogueEleve::questionsCulture()->orderBy('id')->limit(5)->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        $seance = Seance::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'jour' => $quand->toDateString(),
            'culture' => true,
            'questions' => $ids,
            'duree_minutes' => 5,
            'genere_le' => $quand,
        ]);

        foreach (Question::query()->with('versionPubliee')->whereKey($ids)->orderBy('id')->get() as $rang => $question) {
            $this->repondre($tentatives, $eleve, $question, $rang !== 2, $quand->addMinutes($rang), $seance->id);
        }

        $seances->terminer($eleve, $seance->refresh(), $quand->addMinutes(6));
    }

    private function repondre(TentativeService $tentatives, User $eleve, Question $question, bool $juste, CarbonImmutable $saisiLe, int $seanceId): void
    {
        $reponse = $question->type === TypeQuestion::VraiFaux
            ? ['valeur' => $juste ? $question->reponse_attendue['valeur'] : ! $question->reponse_attendue['valeur']]
            : ['option' => $juste
                ? $question->reponse_attendue['option']
                : array_values(array_filter($question->donnees['options'], fn (array $o) => $o['id'] !== $question->reponse_attendue['option']))[0]['id']];

        $tentatives->enregistrer($eleve, (string) Str::uuid7(), $question, (int) $question->numeroPublie(), $reponse, Seance::query()->find($seanceId), 30, $saisiLe, $saisiLe);
    }

    /** @return array<string, mixed> */
    private static function doc(string $texte): array
    {
        return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]]]];
    }
}
