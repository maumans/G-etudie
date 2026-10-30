<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RouteLaravel;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Garde-fou de CLAUDE.md § 3 : toute route authentifiée porte un `can:`, ou
 * figure ici avec sa raison. Ajouter une route oblige à décider qui y a droit.
 *
 * Classe PHPUnit (et non Pest) : la constante publique sert de registre.
 */
class AccesParRoleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Routes ouvertes à tout compte connecté, quel que soit son rôle.
     *
     * @var array<string, string> nom de route => raison
     */
    public const OUVERTES_A_TOUS = [
        'accueil' => 'Aiguillage : envoie chaque compte dans son espace (Espace::accueilDe).',
        'logout' => 'Tout compte connecté peut se déconnecter.',

        // « Mon compte » : chacun gère le sien, sur lui-même seulement (CLAUDE.md § 4).
        'compte.accueil' => 'Mon compte : redirection vers le profil.',
        'compte.profil.edit' => 'Mon compte : son propre profil.',
        'compte.profil.update' => 'Mon compte : son propre profil.',
        'compte.mot-de-passe.edit' => 'Mon compte : changer son propre mot de passe.',
        'compte.mot-de-passe.update' => 'Mon compte : changer son propre mot de passe.',
        'compte.numero.edit' => 'Mon compte : changer son propre numéro.',
        'compte.numero.envoyer' => 'Mon compte : code SMS vers son nouveau numéro.',
        'compte.numero.update' => 'Mon compte : changer son propre numéro.',
        'compte.numero.annuler' => 'Mon compte : annuler son changement de numéro.',
        'compte.affichage.edit' => 'Mon compte : réglages d\'affichage, locaux au téléphone.',
        'compte.destroy' => 'Mon compte : supprimer son propre compte (DA5).',
        'compte.verification.edit' => 'Vérifier son propre numéro (D3).',
        'compte.verification.envoyer' => 'Vérifier son propre numéro (D3).',
        'compte.verification.confirmer' => 'Vérifier son propre numéro (D3).',

        // Fortify : confirmation du mot de passe avant un geste sensible.
        'password.confirm' => 'Fortify : retaper son mot de passe avant un geste sensible.',
        'password.confirm.store' => 'Fortify : retaper son mot de passe avant un geste sensible.',
        'password.confirmation' => 'Fortify : état de la confirmation du mot de passe.',

        // Fortify : double authentification. Routes du paquet, sans `can:` ;
        // l'activation est gardée au geste (ActiverDoubleAuthentification) et
        // l'écran n'est proposé qu'au personnel. Les autres gestes n'agissent
        // que sur un compte où elle a déjà été activée.
        'two-factor.enable' => 'Fortify : activation gardée par ActiverDoubleAuthentification (personnel seulement).',
        'two-factor.confirm' => 'Fortify : confirme une activation déjà gardée.',
        'two-factor.disable' => 'Fortify : désactiver sur son propre compte.',
        'two-factor.qr-code' => 'Fortify : QR code de son propre compte (vide si non activée).',
        'two-factor.secret-key' => 'Fortify : clé de son propre compte (vide si non activée).',
        'two-factor.recovery-codes' => 'Fortify : codes de secours de son propre compte.',
        'two-factor.regenerate-recovery-codes' => 'Fortify : codes de secours de son propre compte.',
    ];

    #[Test]
    public function toute_route_authentifiee_porte_un_can_ou_figure_dans_les_derogations(): void
    {
        $nonGardees = collect(Route::getRoutes()->getRoutes())
            ->filter(fn (RouteLaravel $route) => $this->estAuthentifiee($route) && ! $this->porteUnCan($route))
            ->map(fn (RouteLaravel $route) => $this->identifiant($route))
            ->reject(fn (string $identifiant) => array_key_exists($identifiant, self::OUVERTES_A_TOUS))
            ->values()
            ->all();

        $this->assertSame([], $nonGardees, 'Routes authentifiées sans `can:` ni dérogation : '.implode(', ', $nonGardees));
    }

    #[Test]
    public function chaque_derogation_designe_une_route_existante_et_non_gardee(): void
    {
        foreach (self::OUVERTES_A_TOUS as $nom => $raison) {
            $route = Route::getRoutes()->getByName($nom);

            $this->assertNotNull($route, "Dérogation sans route : « {$nom} » n'existe plus, la retirer.");
            $this->assertTrue($this->estAuthentifiee($route), "« {$nom} » n'exige pas de connexion : rien à déroger.");
            $this->assertFalse($this->porteUnCan($route), "« {$nom} » porte déjà un `can:` : retirer la dérogation.");
            $this->assertNotSame('', trim($raison));
        }
    }

    #[Test]
    public function le_garde_fou_voit_une_route_ajoutee_sans_permission(): void
    {
        Route::middleware('auth')->get('route-oubliee', fn () => 'ok')->name('route.oubliee');
        Route::getRoutes()->refreshNameLookups();

        $route = Route::getRoutes()->getByName('route.oubliee');

        $this->assertTrue($this->estAuthentifiee($route));
        $this->assertFalse($this->porteUnCan($route));
    }

    /**
     * Matrice des espaces : chaque rôle ouvre son espace, et seulement lui.
     *
     * @return iterable<string, array{Role, list<string>}>
     */
    public static function rolesEtEspaces(): iterable
    {
        yield 'élève' => [Role::Eleve, ['/eleve']];
        yield 'parent' => [Role::Parent, []];
        yield 'enseignant' => [Role::Enseignant, []];
        yield 'rédacteur' => [Role::Redacteur, ['/contenu']];
        yield 'relecteur' => [Role::Relecteur, ['/contenu']];
        yield 'responsable pédagogique' => [Role::AdminContenu, ['/contenu']];
        yield 'gestionnaire' => [Role::GestionnaireEtablissement, []];
        yield 'administrateur plateforme' => [Role::Superadmin, ['/contenu', '/console']];
    }

    /**
     * @param  list<string>  $ouverts
     */
    #[Test]
    #[DataProvider('rolesEtEspaces')]
    public function chaque_role_n_ouvre_que_ses_espaces(Role $role, array $ouverts): void
    {
        $user = User::factory()->avecRole($role)->create();

        foreach (['/eleve', '/contenu', '/console'] as $adresse) {
            $this->actingAs($user)
                ->get($adresse)
                ->assertStatus(in_array($adresse, $ouverts, true) ? 200 : 403);
        }

        $this->actingAs($user)->get('/compte/profil')->assertOk();
    }

    private function estAuthentifiee(RouteLaravel $route): bool
    {
        return collect($route->gatherMiddleware())->contains(
            fn ($middleware) => is_string($middleware) && ($middleware === 'auth' || str_starts_with($middleware, 'auth:')),
        );
    }

    private function porteUnCan(RouteLaravel $route): bool
    {
        return collect($route->gatherMiddleware())->contains(
            fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'can:'),
        );
    }

    private function identifiant(RouteLaravel $route): string
    {
        return $route->getName() ?? implode('|', $route->methods()).' '.$route->uri();
    }
}
