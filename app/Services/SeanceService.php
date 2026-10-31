<?php

namespace App\Services;

use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * La séance du jour, **version minimale du lot 2** (PLAN § 12) : un nombre
 * de questions tiré de l'objectif du soir, prises d'abord parmi celles que
 * l'élève n'a jamais vues, puis celles qu'il a ratées, puis les autres,
 * en alternant les matières. La
 * révision espacée et le choix « là où ça rapporte le plus de points »
 * arrivent avec la maîtrise (lot 6) ; les séances pré-calculées hors ligne
 * aussi (HL4).
 */
class SeanceService
{
    /** Questions par objectif du soir (minutes => questions). */
    public const QUESTIONS_PAR_OBJECTIF = [10 => 5, 15 => 8, 30 => 15];

    public static function nombreDeQuestions(int $objectifMinutes): int
    {
        return self::QUESTIONS_PAR_OBJECTIF[$objectifMinutes] ?? 8;
    }

    /** La séance du jour pas encore terminée, s'il y en a une. */
    public function enCours(User $eleve): ?Seance
    {
        return Seance::query()
            ->where('user_id', $eleve->id)
            ->whereDate('jour', CarbonImmutable::today())
            ->whereNull('termine_le')
            ->latest('id')
            ->first();
    }

    /**
     * Reprend la séance du jour en cours, sinon en prépare une. `null` :
     * aucune question publiée pour cet élève.
     */
    public function commencer(User $eleve): ?Seance
    {
        $profil = CatalogueEleve::profil($eleve);

        if ($profil === null) {
            return null;
        }

        $enCours = $this->enCours($eleve);

        if ($enCours !== null) {
            return $enCours;
        }

        $questions = $this->choisir($eleve, $profil);

        if ($questions === []) {
            return null;
        }

        return Seance::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'jour' => CarbonImmutable::today(),
            'questions' => $questions,
            'duree_minutes' => $profil->objectif_minutes,
            'genere_le' => CarbonImmutable::now(),
        ]);
    }

    /**
     * Opération `seance.terminer`. Une séance déjà terminée est acceptée sans
     * rien rejouer (HORS_LIGNE.md A.6).
     */
    public function terminer(User $eleve, Seance $seance, CarbonImmutable $saisiLe): Seance
    {
        if ($seance->user_id !== $eleve->id) {
            throw new OperationRejetee('Cette séance n\'est pas la tienne.');
        }

        if ($seance->termine_le === null) {
            $seance->update(['termine_le' => $saisiLe]);
        }

        return $seance;
    }

    /**
     * @return list<int>
     */
    private function choisir(User $eleve, ProfilEleve $profil): array
    {
        $questions = CatalogueEleve::questions($profil)->with('notion.chapitre')->orderBy('id')->get();
        $disponibles = $questions->map(fn (Question $question) => $question->id);
        $matiereDe = $questions->mapWithKeys(fn (Question $question) => [$question->id => $question->notion->chapitre->matiere_id]);

        if ($disponibles->isEmpty()) {
            return [];
        }

        // Dernier verdict de l'élève sur chaque question déjà vue.
        $vues = Tentative::query()
            ->where('user_id', $eleve->id)
            ->whereIn('question_id', $disponibles)
            ->orderBy('saisi_le')
            ->get(['question_id', 'correcte'])
            ->mapWithKeys(fn (Tentative $tentative) => [$tentative->question_id => $tentative->correcte]);

        $matieres = $matiereDe->all();
        $ordre = [
            ...self::alterner($disponibles->reject(fn (int $id) => $vues->has($id))->all(), $matieres),
            ...self::alterner($disponibles->filter(fn (int $id) => $vues->get($id) === false)->all(), $matieres),
            ...self::alterner($disponibles->filter(fn (int $id) => $vues->get($id) === true)->all(), $matieres),
        ];

        return array_slice($ordre, 0, self::nombreDeQuestions($profil->objectif_minutes));
    }

    /**
     * Alterne les matières, une question de chacune tour à tour : une séance
     * courte en touche plusieurs. Ordre stable, sans hasard : deux élèves au
     * même point reçoivent la même séance.
     *
     * @param  array<int, int>  $ids
     * @param  array<int, int>  $matiereDe  question => matière
     * @return list<int>
     */
    private static function alterner(array $ids, array $matiereDe): array
    {
        $groupes = [];

        foreach ($ids as $id) {
            $groupes[$matiereDe[$id] ?? 0][] = $id;
        }

        $ordre = [];

        while ($groupes !== []) {
            foreach ($groupes as $matiere => $file) {
                $ordre[] = array_shift($file);

                if ($file === []) {
                    unset($groupes[$matiere]);
                } else {
                    $groupes[$matiere] = $file;
                }
            }
        }

        return $ordre;
    }

    /**
     * Les questions d'une séance, dans l'ordre, telles que l'appareil les
     * affiche et les corrige (la bonne réponse comprise : la correction de
     * l'appareil n'est qu'un affichage, A.6).
     *
     * @return list<array<string, mixed>>
     */
    public function questionsDe(Seance $seance): array
    {
        $questions = Question::query()
            ->with('notion.chapitre.matiere')
            ->whereKey($seance->questions)
            ->get()
            ->keyBy('id');

        return array_values(collect($seance->questions)
            ->map(fn (int $id) => $questions->get($id))
            ->filter()
            ->map(fn (Question $question) => [
                'uuid' => $question->uuid,
                'version' => $question->version,
                'type' => $question->type->value,
                'enonce' => $question->enonce,
                'options' => $question->donnees['options'],
                'attendue' => $question->reponse_attendue,
                'explication' => $question->explication,
                'est_exemple' => $question->est_exemple,
                'matiere' => $question->notion->chapitre->matiere->teinte->value,
                'matiere_nom' => $question->notion->chapitre->matiere->nom,
                'notion' => $question->notion->titre,
            ])
            ->all());
    }
}
