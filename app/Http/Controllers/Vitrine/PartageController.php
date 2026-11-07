<?php

namespace App\Http\Controllers\Vitrine;

use App\Http\Controllers\Controller;
use App\Services\ImagePartageService;
use App\Support\AnnalesPubliques;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Les images Open Graph (lot 8) : ce que WhatsApp montre sous un lien.
 * Publiques, sans session ; gardées un jour par les lecteurs de liens.
 */
class PartageController extends Controller
{
    public function generale(ImagePartageService $images): BinaryFileResponse
    {
        return $this->png($images->generale());
    }

    public function sujet(string $slug, ImagePartageService $images): BinaryFileResponse
    {
        $sujet = AnnalesPubliques::trouver($slug) ?? abort(404);

        return $this->png($images->sujet($sujet));
    }

    private function png(string $chemin): BinaryFileResponse
    {
        return response()->file($chemin, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
