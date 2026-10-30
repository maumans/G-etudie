<?php

namespace App\Http\Controllers;

use App\Support\PhotoVitrine;
use Inertia\Inertia;
use Inertia\Response;

/** Accueil public (habillage vitrine). */
class VitrineController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('vitrine/accueil', [
            'photoHeros' => PhotoVitrine::url(),
        ]);
    }
}
