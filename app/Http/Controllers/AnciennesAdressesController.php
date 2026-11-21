<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * On dit « sujet », plus « annale » (2026-11-21, décision de Maurice) : les
 * adresses `/eleve/annales…` et `/contenu/annales…` sont devenues
 * `/eleve/sujets…` et `/contenu/sujets…`. Un lien gardé (favori, message
 * WhatsApp, copie d'un onglet) mène à la nouvelle adresse, paramètres
 * compris (`?mode=examen`). Redirection permanente, sans compte : c'est la
 * page d'arrivée qui vérifie la connexion et la permission.
 */
class AnciennesAdressesController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $chemin = (string) preg_replace('#(^|/)annales(?=/|$)#', '$1sujets', $request->path(), 1);
        $requete = $request->getQueryString();

        return redirect('/'.$chemin.($requete !== null ? '?'.$requete : ''), 301);
    }
}
