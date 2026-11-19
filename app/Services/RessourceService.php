<?php

namespace App\Services;

use App\Enums\Permission;
use App\Enums\StatutRessource;
use App\Enums\TypeRessource;
use App\Models\Notion;
use App\Models\RessourceExterne;
use App\Models\User;
use App\Services\Organisation\GesteRefuse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Factory as ClientHttp;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Ressources externes (lot 12, PLAN M19) — seule autorité :
 *
 *  - **proposer** (rédacteur) : un lien HTTPS d'un site de la liste fermée
 *    (`config/ressources.php`), rattaché à une notion ;
 *  - **vérifier** (relecteur) : **jamais celui qui l'a proposé** (même règle
 *    que les leçons, PLAN M17) ; seule une ressource vérifiée arrive chez
 *    l'élève ; une ressource modifiée repasse « à vérifier » ;
 *  - **retirer** (relecteur) : avec un motif ;
 *  - **contrôler** (`ressources:verifier`, chaque semaine) : un lien qui ne
 *    répond plus est signalé au back-office (`lien_casse_le`), pas retiré
 *    d'office — le relecteur décide.
 *
 * Toute ressource qui entre ou sort de la vue élève fait regénérer le pack
 * de sa matière (les leçons du pack portent leurs ressources, HL A.4).
 */
class RessourceService
{
    public function __construct(private PackService $packs) {}

    /**
     * @param  array{url: string, titre: string, type: TypeRessource, description?: string|null, poids_ko?: int|null, duree_minutes?: int|null}  $donnees
     */
    public function proposer(User $auteur, Notion $notion, array $donnees, bool $exemple = false): RessourceExterne
    {
        if (! $auteur->can(Permission::RedigerContenu->value)) {
            throw new GesteRefuse('Vous ne proposez pas de ressource.', 'url');
        }

        [$url, $domaine] = self::verifierUrl($donnees['url']);

        return RessourceExterne::create([
            'uuid' => (string) Str::uuid7(),
            'notion_id' => $notion->id,
            'url' => $url,
            'domaine' => $domaine,
            'titre' => trim($donnees['titre']),
            'type' => $donnees['type'],
            'description' => self::nettoyer($donnees['description'] ?? null),
            'poids_ko' => $donnees['poids_ko'] ?? null,
            'duree_minutes' => $donnees['duree_minutes'] ?? null,
            'statut' => StatutRessource::Proposee,
            'auteur_id' => $auteur->id,
            'est_exemple' => $exemple,
        ]);
    }

    /**
     * Modifier une ressource : son auteur ou le responsable pédagogique.
     * Une ressource vérifiée qu'on modifie repasse « à vérifier ».
     *
     * @param  array{url: string, titre: string, type: TypeRessource, description?: string|null, poids_ko?: int|null, duree_minutes?: int|null}  $donnees
     */
    public function modifier(User $acteur, RessourceExterne $ressource, array $donnees): RessourceExterne
    {
        if (! $this->peutModifier($acteur, $ressource)) {
            throw new GesteRefuse('Seul son auteur modifie cette ressource.', 'url');
        }

        [$url, $domaine] = self::verifierUrl($donnees['url']);
        $etaitVisible = $ressource->statut === StatutRessource::Verifiee;

        $ressource->update([
            'url' => $url,
            'domaine' => $domaine,
            'titre' => trim($donnees['titre']),
            'type' => $donnees['type'],
            'description' => self::nettoyer($donnees['description'] ?? null),
            'poids_ko' => $donnees['poids_ko'] ?? null,
            'duree_minutes' => $donnees['duree_minutes'] ?? null,
            'statut' => StatutRessource::Proposee,
            'verifiee_par_id' => null,
            'verifiee_le' => null,
            'lien_casse_le' => null,
        ]);

        if ($etaitVisible) {
            $this->regenerer($ressource);
        }

        return $ressource;
    }

    public function verifier(User $relecteur, RessourceExterne $ressource): RessourceExterne
    {
        if (! $this->peutVerifier($relecteur, $ressource)) {
            throw new GesteRefuse('Une ressource est vérifiée par un autre relecteur que celui qui l\'a proposée.', 'ressource');
        }

        $ressource->update([
            'statut' => StatutRessource::Verifiee,
            'verifiee_par_id' => $relecteur->id,
            'verifiee_le' => CarbonImmutable::now(),
            'motif_retrait' => null,
            'lien_casse_le' => null,
        ]);
        $this->regenerer($ressource);

        return $ressource;
    }

    public function retirer(User $relecteur, RessourceExterne $ressource, string $motif): RessourceExterne
    {
        if (! $relecteur->can(Permission::RelireContenu->value)) {
            throw new GesteRefuse('Vous ne retirez pas de ressource.', 'motif');
        }

        if (mb_strlen(trim($motif)) < 5) {
            throw new GesteRefuse('Dites en quelques mots pourquoi (5 caractères au moins).', 'motif');
        }

        $etaitVisible = $ressource->statut === StatutRessource::Verifiee;
        $ressource->update([
            'statut' => StatutRessource::Retiree,
            'motif_retrait' => mb_substr(trim($motif), 0, 300),
        ]);

        if ($etaitVisible) {
            $this->regenerer($ressource);
        }

        return $ressource;
    }

    public function peutModifier(User $acteur, RessourceExterne $ressource): bool
    {
        return $acteur->can(Permission::RedigerContenu->value)
            && ($ressource->auteur_id === $acteur->id || $acteur->can(Permission::AdministrerContenu->value));
    }

    /** Relire : jamais celui qui l'a proposée, même responsable pédagogique. */
    public function peutVerifier(User $acteur, RessourceExterne $ressource): bool
    {
        return $acteur->can(Permission::RelireContenu->value)
            && $ressource->auteur_id !== $acteur->id
            && $ressource->statut !== StatutRessource::Verifiee;
    }

    /**
     * Contrôle d'un lien vérifié (commande hebdomadaire) : `true` s'il répond.
     */
    public function controler(RessourceExterne $ressource, ClientHttp $http): bool
    {
        $delai = (int) config('ressources.controle.delai_secondes', 8);
        $repond = false;

        try {
            $reponse = $http->timeout($delai)->withoutRedirecting()->withHeaders(['User-Agent' => 'NkaramogoLiens/1.0'])->head($ressource->url);

            if ($reponse->status() === 405 || $reponse->status() === 403) {
                $reponse = $http->timeout($delai)->withoutRedirecting()->withHeaders(['User-Agent' => 'NkaramogoLiens/1.0'])->get($ressource->url);
            }

            // Une redirection vers un site de la liste (page mobile, langue) répond ;
            // vers un autre site, le lien a changé de main : à revoir.
            $vers = parse_url((string) $reponse->header('Location'), PHP_URL_HOST);
            $repond = $reponse->successful()
                || ($reponse->redirect() && (! is_string($vers) || self::domaineAccepte(strtolower($vers)) !== null));
        } catch (Throwable $erreur) {
            Log::info('Ressource externe injoignable', ['ressource' => $ressource->uuid, 'erreur' => $erreur->getMessage()]);
        }

        $etaitCasse = $ressource->lien_casse_le !== null;
        $ressource->update([
            'controle_le' => CarbonImmutable::now(),
            'lien_casse_le' => $repond ? null : ($ressource->lien_casse_le ?? CarbonImmutable::now()),
        ]);

        // Un lien cassé sort de la vue élève (et du pack) ; revenu, il y rentre.
        if ($etaitCasse === $repond && $ressource->statut === StatutRessource::Verifiee) {
            $this->regenerer($ressource);
        }

        return $repond;
    }

    /**
     * Le lien proposé, normalisé, et son domaine de la liste fermée.
     *
     * @return array{0: string, 1: string}
     */
    public static function verifierUrl(string $url): array
    {
        $url = trim($url);
        $parties = parse_url($url);

        if ($parties === false || ($parties['scheme'] ?? '') !== 'https' || ! isset($parties['host'])) {
            throw new GesteRefuse('Collez un lien complet qui commence par https://', 'url');
        }

        if (isset($parties['user']) || isset($parties['pass']) || isset($parties['port'])) {
            throw new GesteRefuse('Ce lien a une forme inhabituelle : collez l\'adresse affichée par le site.', 'url');
        }

        $domaine = self::domaineAccepte(strtolower($parties['host']))
            ?? throw new GesteRefuse('Ce site n\'est pas dans la liste des sites acceptés ('.implode(', ', array_unique(array_values(config('ressources.domaines')))).').', 'url');

        return [mb_substr($url, 0, 500), $domaine];
    }

    /** Le domaine de la liste qui couvre cet hôte, ou `null`. */
    public static function domaineAccepte(string $hote): ?string
    {
        foreach (array_keys(config('ressources.domaines')) as $domaine) {
            if (! is_string($domaine)) {
                continue;
            }

            if ($hote === $domaine || str_ends_with($hote, '.'.$domaine)) {
                return $domaine;
            }
        }

        return null;
    }

    public static function avecSuggestions(string $domaine): bool
    {
        return in_array($domaine, config('ressources.avec_suggestions', []), true);
    }

    private static function nettoyer(?string $texte): ?string
    {
        $texte = trim((string) $texte);

        return $texte === '' ? null : mb_substr($texte, 0, 300);
    }

    private function regenerer(RessourceExterne $ressource): void
    {
        $matiere = $ressource->notion()->with('chapitre')->first()?->chapitre->matiere_id;

        if ($matiere !== null) {
            $this->packs->aRegenerer((int) $matiere);
        }
    }
}
