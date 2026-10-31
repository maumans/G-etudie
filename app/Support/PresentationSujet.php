<?php

namespace App\Support;

use App\Enums\StatutContenu;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\VersionContenu;

/**
 * L'annale telle que l'appareil la reçoit (`SujetEleve` de
 * `lib/contenu/sujets.ts`) : la **version publiée** de la structure, et la
 * version publiée de chacune de ses questions (PresentationQuestion). Un
 * objet de contenu, comme la leçon (HORS_LIGNE.md A.4) : l'écran ne sait pas
 * s'il vient des props ou d'un pack, et le pack du lot 7 le rangera tel quel.
 *
 * Une question retirée (archivée) ou jamais publiée n'est pas livrée ; la
 * partie reste, avec ses autres questions.
 */
class PresentationSujet
{
    /**
     * @return array<string, mixed>|null `null` : jamais publiée
     */
    public static function publiee(Sujet $sujet): ?array
    {
        $version = $sujet->versionPubliee;

        return $version === null ? null : self::depuisVersion($sujet, $version);
    }

    /**
     * @return array<string, mixed>
     */
    public static function depuisVersion(Sujet $sujet, VersionContenu $version): array
    {
        $sujet->loadMissing(['examen', 'serie', 'matiere']);
        $structure = $version->blocs;
        /** @var list<array{uuid: string, titre: string, bareme: float|null, consigne: array<string, mixed>, questions: list<string>}> $parties */
        $parties = $structure['parties'] ?? [];
        $uuids = array_merge([], ...array_map(fn (array $p) => $p['questions'], $parties));

        $questions = Question::query()
            ->with(['versionPubliee', 'notion.chapitre.matiere'])
            ->whereIn('uuid', $uuids)
            ->whereNotNull('version_publiee_id')
            ->where('statut', '!=', StatutContenu::Archive->value)
            ->get()
            ->keyBy('uuid');

        return [
            'type' => 'sujet',
            'uuid' => $sujet->uuid,
            'version' => $version->numero,
            'titre' => $version->titre,
            'origine' => $sujet->type->value,
            'session' => $sujet->session,
            'libelle_session' => $sujet->libelleSession(),
            'examen' => $sujet->examen->code->value,
            'serie' => $sujet->serie?->code->value,
            'matiere' => [
                'cle' => $sujet->matiere->teinte->value,
                'nom' => $sujet->matiere->nom,
                'slug' => $sujet->matiere->slug,
            ],
            'duree_minutes' => $structure['duree_minutes'] ?? null,
            'coefficient' => $structure['coefficient'] ?? null,
            'est_exemple' => $sujet->est_exemple,
            'document' => $sujet->document_chemin === null ? null : [
                'type' => $sujet->document_type,
                'octets' => $sujet->document_octets,
                'url' => route('eleve.annales.document', $sujet),
            ],
            'parties' => array_map(fn (array $partie) => [
                'uuid' => $partie['uuid'],
                'titre' => $partie['titre'],
                'bareme' => $partie['bareme'],
                'consigne' => $partie['consigne'],
                'questions' => array_values(array_filter(array_map(
                    fn (string $uuid) => isset($questions[$uuid]) ? PresentationQuestion::publiee($questions[$uuid]) : null,
                    $partie['questions'],
                ))),
            ], $parties),
        ];
    }
}
