<?php

namespace App\Services;

use App\Enums\Filiere;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\ProfilEleve;
use App\Models\Serie;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Seule porte d'écriture du profil d'examen (parcours d'accueil, puis
 * « Moi › Mon examen »). La classe se déduit de l'examen (une classe
 * d'examen par examen) ; la série est exigée au Bac et refusée ailleurs.
 *
 * Filière : « générale » tant que le contenu franco-arabe n'existe pas (D2,
 * choix du lot 2) ; une filière déjà enregistrée est gardée.
 */
class ProfilEleveService
{
    public function enregistrer(User $eleve, int $examenId, ?int $serieId, ?int $etablissementId, int $objectifMinutes): ProfilEleve
    {
        $examen = Examen::query()->with('classe')->find($examenId);

        if ($examen === null || $examen->classe === null) {
            throw ValidationException::withMessages(['examen' => 'Choisis ton examen.']);
        }

        if ($examen->code->aDesSeries()) {
            $serie = $serieId !== null ? Serie::query()->where('examen_id', $examen->id)->find($serieId) : null;

            if ($serie === null) {
                throw ValidationException::withMessages(['serie' => 'Choisis ta série.']);
            }
        } elseif ($serieId !== null) {
            throw ValidationException::withMessages(['serie' => "Le {$examen->code->value} n'a pas de série."]);
        }

        if ($etablissementId !== null && Etablissement::query()->whereKey($etablissementId)->doesntExist()) {
            throw ValidationException::withMessages(['etablissement' => 'Cet établissement n\'est pas dans la liste.']);
        }

        if (! in_array($objectifMinutes, ProfilEleve::OBJECTIFS, true)) {
            throw ValidationException::withMessages(['objectif' => 'Choisis 10, 15 ou 30 minutes.']);
        }

        $profil = ProfilEleve::query()->firstOrNew(['user_id' => $eleve->id]);
        $profil->fill([
            'examen_id' => $examen->id,
            'serie_id' => $examen->code->aDesSeries() ? $serieId : null,
            'classe_id' => $examen->classe->id,
            'etablissement_id' => $etablissementId,
            'objectif_minutes' => $objectifMinutes,
        ]);
        $profil->filiere ??= Filiere::Generale;
        $profil->save();

        return $profil;
    }
}
