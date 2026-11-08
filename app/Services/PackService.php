<?php

namespace App\Services;

use App\Http\Controllers\Eleve\AnnaleController;
use App\Http\Controllers\Eleve\CoursController;
use App\Http\Controllers\Eleve\LeconController;
use App\Jobs\GenererPack;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\Lecon;
use App\Models\Pack;
use App\Models\PackElement;
use App\Models\ProfilEleve;
use App\Models\Sujet;
use App\Support\CatalogueEleve;
use App\Support\DroitsAbonne;
use App\Support\PresentationCours;
use App\Support\PresentationSujet;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Les packs (HORS_LIGNE.md A.5) — seule autorité sur ce qu'un pack contient.
 *
 * Un pack = tout le contenu **publié** d'une matière pour un examen, une
 * série et une filière : la page de la matière, ses leçons (mini-questions
 * comprises), les fiches de révision de ses chapitres, ses annales (sujet,
 * questions, corrigés). Chaque élément porte **les props mêmes de son
 * écran** (A.4), fabriquées par les mêmes fonctions que les routes en ligne
 * (`PresentationCours`, `LeconController::contenu`, `PresentationSujet`) ;
 * l'écran ne sait pas d'où elles viennent. **Aucune donnée personnelle** :
 * le pack est composé pour un profil fictif (examen, série, filière), jamais
 * pour un élève.
 *
 * Chaque élément a une **empreinte** : la mise à jour ne retélécharge que
 * ceux qui ont changé (un corrigé corrigé = quelques Ko). Les éléments sont
 * répartis en **morceaux** d'environ 500 Ko : une coupure ne fait
 * recommencer qu'un morceau. La version du pack est l'empreinte de la liste
 * de ses éléments.
 *
 * **Deux variantes** (lot 9) : une annale dont le corrigé est réservé aux
 * abonnés (DroitsAbonne) a deux éléments sous la même clé — `complet` pour
 * les abonnés, `libre` sans les étapes du corrigé (PresentationSujet::
 * sansCorrige). Tout le reste est `commun`. Chaque variante a sa version et
 * son poids ; les deux éléments d'une annale sont dans le même morceau.
 * Un élève qui s'abonne ne retélécharge que ces annales-là.
 */
class PackService
{
    public function __construct(private DroitsAbonne $droitsAbonne) {}

    /** Taille visée d'un morceau, en octets de JSON brut (A.5). */
    public const TAILLE_MORCEAU = 500_000;

    /** Ordre des éléments dans les morceaux : la matière d'abord, les annales à la fin. */
    private const ORDRE_TYPES = ['matiere' => 0, 'fiche' => 1, 'lecon' => 2, 'annale' => 3];

    /**
     * Le pack d'une épreuve (examen, série, filière, matière), créé vide s'il
     * n'existe pas encore.
     */
    public function pour(Epreuve $epreuve): Pack
    {
        return Pack::query()->firstOrCreate(
            [
                'examen_id' => $epreuve->examen_id,
                'serie_id' => $epreuve->serie_id,
                'filiere' => $epreuve->filiere->value,
                'matiere_id' => $epreuve->matiere_id,
            ],
            ['cle' => self::cle($epreuve)],
        );
    }

    /** « bepc-mathematiques », « bac-se-physique-chimie », « bepc-franco-arabe-francais ». */
    public static function cle(Epreuve $epreuve): string
    {
        $epreuve->loadMissing(['examen', 'serie', 'matiere']);

        return Str::slug(implode(' ', array_filter([
            $epreuve->examen->code->value,
            $epreuve->serie?->code->value,
            $epreuve->filiere->value === 'generale' ? null : $epreuve->filiere->value,
            $epreuve->matiere->slug,
        ])));
    }

    /**
     * Les packs de toutes les épreuves de l'année courante, générés.
     *
     * @return Collection<int, Pack>
     */
    public function genererTout(): Collection
    {
        $annee = AnneeScolaire::courante();

        if ($annee === null) {
            return collect();
        }

        return Epreuve::query()
            ->where('annee_scolaire_id', $annee->id)
            ->get()
            ->map(fn (Epreuve $epreuve) => $this->generer($this->pour($epreuve)));
    }

    /** Fait regénérer (en file) les packs d'une matière : un contenu vient d'y changer. */
    public function aRegenerer(int $matiereId): void
    {
        Pack::query()->where('matiere_id', $matiereId)->pluck('id')
            ->each(fn (int $id) => GenererPack::dispatch($id)->afterCommit());
    }

    /**
     * Compose les éléments du pack et met à jour ce qui a changé : un élément
     * identique garde sa ligne, un élément retiré disparaît.
     */
    public function generer(Pack $pack): Pack
    {
        $elements = $this->composer($pack);

        // Répartition en morceaux, dans un ordre stable, d'après la variante
        // complète (la libre est plus légère) : l'élément libre d'une annale
        // prend le morceau de son jumeau complet.
        uasort($elements, fn (array $a, array $b) => [self::ORDRE_TYPES[$a['type']], $a['cle'], $a['variante']] <=> [self::ORDRE_TYPES[$b['type']], $b['cle'], $b['variante']]);
        $morceau = 0;
        $remplissage = 0;
        $morceauDe = [];

        foreach ($elements as &$element) {
            if ($element['variante'] === PackElement::LIBRE) {
                continue;
            }

            if ($remplissage > 0 && $remplissage + $element['taille'] > self::TAILLE_MORCEAU) {
                $morceau++;
                $remplissage = 0;
            }

            $element['morceau'] = $morceau;
            $morceauDe[$element['cle']] = $morceau;
            $remplissage += $element['taille'];
        }
        unset($element);

        foreach ($elements as &$element) {
            if ($element['variante'] === PackElement::LIBRE) {
                $element['morceau'] = $morceauDe[$element['cle']];
            }
        }
        unset($element);

        $versionDe = fn (string $exclue) => substr(hash('xxh128', implode('|', array_map(
            fn (array $e) => $e['cle'].':'.$e['empreinte'],
            array_filter($elements, fn (array $e) => $e['variante'] !== $exclue),
        ))), 0, 16);
        $version = $versionDe(PackElement::LIBRE);
        $versionLibre = $versionDe(PackElement::COMPLET);

        DB::transaction(function () use ($pack, $elements, $version, $versionLibre) {
            $existants = $pack->elements()->get(['id', 'cle', 'variante', 'empreinte', 'morceau'])
                ->keyBy(fn (PackElement $e) => $e->cle.'|'.$e->variante);

            foreach ($elements as $cle => $complet) {
                $deja = $existants->get($cle);
                // `est_exemple` sert au pack, pas à l'élément ; jamais
                // compter sur $fillable pour l'écarter (un seeder désactive
                // la protection, CLAUDE.md § 4).
                $element = Arr::except($complet, ['est_exemple']);

                if ($deja === null) {
                    PackElement::create(['pack_id' => $pack->id, ...$element]);
                } elseif ($deja->empreinte !== $element['empreinte']) {
                    $deja->update($element);
                } elseif ($deja->morceau !== $element['morceau']) {
                    $deja->update(['morceau' => $element['morceau']]);
                }
            }

            $retires = $existants->keys()->diff(array_keys($elements));

            if ($retires->isNotEmpty()) {
                $pack->elements()->whereIn('id', $retires->map(fn (string $cle) => $existants[$cle]->id)->all())->delete();
            }

            $numeros = array_column($elements, 'morceau');
            $unique = array_filter($elements, fn (array $e) => $e['variante'] !== PackElement::LIBRE);

            $pack->update([
                'version' => $version,
                'version_libre' => $versionLibre,
                'morceaux' => $numeros === [] ? 0 : max($numeros) + 1,
                'compte' => [
                    'lecons' => count(array_filter($unique, fn (array $e) => $e['type'] === 'lecon')),
                    'fiches' => count(array_filter($unique, fn (array $e) => $e['type'] === 'fiche')),
                    'annales' => count(array_filter($unique, fn (array $e) => $e['type'] === 'annale')),
                ],
                'est_exemple' => in_array(true, array_column($elements, 'est_exemple'), true),
                'genere_le' => CarbonImmutable::now(),
            ]);
        });

        $pack->refresh();
        $taille = $this->tailleTransferee($pack, PackElement::COMPLET);
        // Pas encore de bloc image dans le format des contenus (HL5, écart
        // n° 24) : les deux poids sont égaux tant qu'un pack n'a pas de média.
        $pack->update([
            'taille_octets' => $taille,
            'taille_sans_images' => $taille,
            'taille_libre' => $this->tailleTransferee($pack, PackElement::LIBRE),
        ]);

        return $pack;
    }

    /**
     * Le manifeste (A.5) : version, poids, et chaque élément avec son
     * empreinte et son morceau. Rien du contenu lui-même.
     *
     * @return array<string, mixed>
     */
    public function manifeste(Pack $pack, ?CarbonImmutable $expireLe, string $variante = PackElement::COMPLET): array
    {
        $pack->loadMissing(['examen', 'serie', 'matiere']);

        return [
            'pack' => $pack->cle,
            'titre' => $pack->titre(),
            'matiere' => PresentationCours::matiere($pack->matiere),
            'version' => $pack->versionPour($variante),
            'variante' => $variante,
            'genere_le' => $pack->genere_le?->toIso8601ZuluString(),
            'taille_octets' => $pack->taillePour($variante),
            'taille_sans_images' => $pack->taillePour($variante),
            'morceaux' => $pack->morceaux,
            'expire_le' => $expireLe?->toIso8601ZuluString(),
            'est_exemple' => $pack->est_exemple,
            'medias' => [],
            'elements' => self::deLaVariante($pack->elements(), $variante)->orderBy('id')->get(['cle', 'type', 'version', 'empreinte', 'morceau'])
                ->map(fn (PackElement $e) => [$e->cle, $e->empreinte, $e->morceau])->values()->all(),
        ];
    }

    /**
     * Un morceau, en JSON déjà assemblé : les props sont gardées en JSON
     * brut et partent telles quelles.
     */
    public function morceau(Pack $pack, int $numero, string $variante = PackElement::COMPLET): string
    {
        return $this->assembler($pack, $variante, self::deLaVariante($pack->elements(), $variante)->where('morceau', $numero)->orderBy('id')->get());
    }

    /**
     * Les éléments demandés (mise à jour différentielle) ; une clé inconnue
     * est ignorée (l'élément a été retiré : le manifeste le dit).
     *
     * @param  list<string>  $cles
     */
    public function elements(Pack $pack, array $cles, string $variante = PackElement::COMPLET): string
    {
        return $this->assembler($pack, $variante, self::deLaVariante($pack->elements(), $variante)->whereIn('cle', $cles)->orderBy('id')->get());
    }

    /**
     * Les éléments communs et ceux de la variante.
     *
     * @template T of \Illuminate\Database\Eloquent\Relations\HasMany<PackElement, Pack>
     *
     * @param  T  $requete
     * @return T
     */
    private static function deLaVariante($requete, string $variante)
    {
        return $requete->whereIn('variante', [PackElement::COMMUN, $variante]);
    }

    /** @param Collection<int, PackElement> $elements */
    private function assembler(Pack $pack, string $variante, Collection $elements): string
    {
        $parties = $elements->map(fn (PackElement $e) => '{"cle":'.json_encode($e->cle).',"empreinte":"'.$e->empreinte.'","props":'.$e->props.'}');

        return '{"pack":'.json_encode($pack->cle).',"version":'.json_encode($pack->versionPour($variante)).',"elements":['.$parties->implode(',').']}';
    }

    /** Poids réellement transféré (compressé, comme par le serveur web) de tous les morceaux d'une variante. */
    private function tailleTransferee(Pack $pack, string $variante): int
    {
        $total = 0;

        for ($numero = 0; $numero < $pack->morceaux; $numero++) {
            $total += strlen((string) gzencode($this->morceau($pack, $numero, $variante), 6));
        }

        return $total;
    }

    /**
     * Les éléments du pack, par clé.
     *
     * @return array<string, array{cle: string, variante: string, type: string, version: int, empreinte: string, taille: int, props: string, est_exemple: bool}>
     */
    private function composer(Pack $pack): array
    {
        $pack->loadMissing(['examen.classe', 'serie', 'matiere']);
        $profil = self::profilFictif($pack);
        $matiere = $pack->matiere;
        $elements = [];

        $ajouter = function (string $type, string $id, int $version, array $props, bool $exemple, string $variante = PackElement::COMMUN) use (&$elements) {
            $json = json_encode($props, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $cle = "{$type}:{$id}";
            $elements["{$cle}|{$variante}"] = [
                'cle' => $cle,
                'variante' => $variante,
                'type' => $type,
                'version' => $version,
                'empreinte' => hash('xxh128', $json),
                'taille' => strlen($json),
                'props' => $json,
                'est_exemple' => $exemple,
            ];
        };

        $structure = CoursController::structure($profil, $matiere);
        unset($structure['pack']);
        $ajouter('matiere', $pack->cle, 0, $structure, (bool) $structure['est_exemple']);

        $chapitres = CatalogueEleve::chapitres($profil, $matiere)->with('matiere')->orderBy('ordre')->get();

        foreach ($chapitres as $chapitre) {
            /** @var Chapitre $chapitre */
            $lecons = PresentationCours::leconsDuChapitre($profil, $chapitre);

            if ($lecons->isEmpty()) {
                continue;
            }

            // La fiche cite ses leçons au lieu de les recopier : chaque leçon
            // n'est téléchargée qu'une fois, et en corriger une ne change
            // qu'elle (l'appareil assemble la fiche, lib/contenu/source.ts).
            $ajouter('fiche', (string) $chapitre->id, 0, [
                ...PresentationCours::fiche($chapitre, collect()),
                'lecons_du_pack' => $lecons->pluck('uuid')->values()->all(),
            ], $lecons->contains('est_exemple', true));

            foreach ($lecons as $lecon) {
                /** @var Lecon $lecon */
                $lecon->loadMissing('notion.chapitre.matiere');
                $contenu = LeconController::contenu($lecon);
                $ajouter('lecon', $lecon->uuid, (int) $contenu['version'], [
                    'lecon' => $contenu,
                    'contexte' => PresentationCours::contexteLecon($lecon, $lecons),
                ], $lecon->est_exemple);
            }
        }

        $sujets = CatalogueEleve::sujets($profil, $matiere)->with(['versionPubliee', 'examen', 'serie', 'matiere'])->get();

        foreach ($sujets as $sujet) {
            /** @var Sujet $sujet */
            $contenu = PresentationSujet::publiee($sujet);

            if ($contenu === null) {
                continue;
            }

            $duree = AnnaleController::dureeEpreuve($sujet);
            $version = (int) ($contenu['version'] ?? 0);

            if ($this->droitsAbonne->estCorrigeLibre($sujet)) {
                $ajouter('annale', $sujet->uuid, $version, ['sujet' => $contenu, 'duree_epreuve' => $duree], $sujet->est_exemple);

                continue;
            }

            $ajouter('annale', $sujet->uuid, $version, ['sujet' => $contenu, 'duree_epreuve' => $duree], $sujet->est_exemple, PackElement::COMPLET);
            $ajouter('annale', $sujet->uuid, $version, ['sujet' => PresentationSujet::sansCorrige($contenu), 'duree_epreuve' => $duree], $sujet->est_exemple, PackElement::LIBRE);
        }

        return $elements;
    }

    /**
     * Le profil pour lequel on compose : l'examen, la série et la filière du
     * pack, sans élève derrière (jamais enregistré).
     */
    public static function profilFictif(Pack $pack): ProfilEleve
    {
        /** @var Examen $examen */
        $examen = $pack->examen;
        $classe = $examen->classe ?? throw new RuntimeException("Examen sans classe : {$examen->id}");

        $profil = new ProfilEleve([
            'examen_id' => $pack->examen_id,
            'serie_id' => $pack->serie_id,
            'filiere' => $pack->filiere->value,
            'classe_id' => $classe->id,
        ]);
        $profil->setRelation('examen', $examen);
        $profil->setRelation('serie', $pack->serie);

        return $profil;
    }
}
