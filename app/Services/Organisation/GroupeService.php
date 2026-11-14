<?php

namespace App\Services\Organisation;

use App\Enums\Filiere;
use App\Models\Classe;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\MembreGroupe;
use App\Models\Serie;
use App\Models\User;
use App\Support\CatalogueEleve;
use App\Support\Perimetre;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Les groupes d'un enseignant (lot 11, PLAN M13-M14) : créer, rejoindre par
 * le code, quitter, retirer un élève, archiver. Seul endroit qui change un
 * groupe ou ses membres.
 *
 * Un élève ne rejoint qu'un groupe de **son** examen, sa série et sa
 * filière : les devoirs viennent du catalogue du groupe, qui doit être le
 * sien (CatalogueEleve). Cinq groupes au plus par élève.
 *
 * Les élèves d'un groupe ne se voient pas entre eux (décision 5) : aucune
 * liste des membres n'est servie à un élève.
 */
class GroupeService
{
    public const GROUPES_PAR_ELEVE = 5;

    /** Sans 0/O, 1/I/L, 2/Z, 5/S, 8/B : un code se dicte en classe. */
    private const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

    public function creer(User $enseignant, string $nom, Examen $examen, ?Serie $serie, Filiere $filiere, ?Etablissement $etablissement): Groupe
    {
        if ($serie !== null && $serie->examen_id !== $examen->id) {
            throw new GesteRefuse('Cette série n\'est pas celle de cet examen.', 'serie');
        }

        if ($examen->series()->exists() && $serie === null) {
            throw new GesteRefuse('Choisissez la série du groupe.', 'serie');
        }

        if ($etablissement !== null && ! Perimetre::etablissementsEnseignes($enseignant)->whereKey($etablissement->id)->exists()) {
            throw new GesteRefuse('Vous n\'enseignez pas dans cet établissement.', 'etablissement');
        }

        $classe = Classe::query()->where('examen_id', $examen->id)->orderBy('ordre')->first()
            ?? throw new GesteRefuse('Cet examen n\'a pas encore de classe dans le référentiel.', 'examen');

        return Groupe::create([
            'enseignant_id' => $enseignant->id,
            'etablissement_id' => $etablissement?->id,
            'examen_id' => $examen->id,
            'serie_id' => $serie?->id,
            'filiere' => $filiere->value,
            'classe_id' => $classe->id,
            'nom' => $nom,
            'code' => $this->nouveauCode(),
        ]);
    }

    public function renommer(Groupe $groupe, string $nom): void
    {
        $groupe->update(['nom' => $nom]);
    }

    /** Un nouveau code (l'ancien a circulé trop loin) ; les membres restent. */
    public function changerCode(Groupe $groupe): void
    {
        $groupe->update(['code' => $this->nouveauCode()]);
    }

    public function archiver(Groupe $groupe): void
    {
        $groupe->update(['archive_le' => $groupe->archive_le ?? CarbonImmutable::now()]);
    }

    public function rejoindre(User $eleve, string $saisie): Groupe
    {
        $code = self::normaliserCode($saisie);
        $groupe = $code === '' ? null : Groupe::query()->ouverts()->where('code', $code)->with(['examen', 'serie'])->first();

        if ($groupe === null) {
            throw new GesteRefuse('Aucun groupe n\'a ce code. Vérifie-le avec ton enseignant.');
        }

        $profil = CatalogueEleve::profil($eleve) ?? throw new GesteRefuse('Choisis d\'abord ton examen.');

        if ($profil->examen_id !== $groupe->examen_id
            || $profil->serie_id !== $groupe->serie_id
            || $profil->filiere !== $groupe->filiere) {
            throw new GesteRefuse('Ce groupe prépare le '.$groupe->libelleExamen().' : ce n\'est pas ton examen.');
        }

        return DB::transaction(function () use ($eleve, $groupe) {
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $ligne = MembreGroupe::query()->where('groupe_id', $groupe->id)->where('eleve_id', $eleve->id)->first();

            if ($ligne !== null && $ligne->quitte_le === null) {
                throw new GesteRefuse('Tu es déjà dans ce groupe.');
            }

            if ($ligne?->retire_par !== null) {
                throw new GesteRefuse('Ton enseignant t\'a retiré de ce groupe. Demande-lui de t\'y remettre.');
            }

            if (MembreGroupe::query()->actifs()->where('eleve_id', $eleve->id)->count() >= self::GROUPES_PAR_ELEVE) {
                throw new GesteRefuse('Tu es déjà dans '.self::GROUPES_PAR_ELEVE.' groupes. Quittes-en un d\'abord.');
            }

            MembreGroupe::query()->updateOrCreate(
                ['groupe_id' => $groupe->id, 'eleve_id' => $eleve->id],
                ['rejoint_le' => CarbonImmutable::now(), 'quitte_le' => null, 'retire_par' => null],
            );

            return $groupe;
        });
    }

    public function quitter(User $eleve, Groupe $groupe): void
    {
        MembreGroupe::query()->actifs()
            ->where('groupe_id', $groupe->id)
            ->where('eleve_id', $eleve->id)
            ->update(['quitte_le' => CarbonImmutable::now()]);
    }

    /** L'enseignant retire un élève ; l'élève ne peut plus revenir seul par le code. */
    public function retirer(User $enseignant, Groupe $groupe, User $eleve): void
    {
        MembreGroupe::query()->actifs()
            ->where('groupe_id', $groupe->id)
            ->where('eleve_id', $eleve->id)
            ->update(['quitte_le' => CarbonImmutable::now(), 'retire_par' => $enseignant->id]);
    }

    /** L'enseignant remet un élève qu'il avait retiré. */
    public function remettre(Groupe $groupe, User $eleve): void
    {
        MembreGroupe::query()
            ->where('groupe_id', $groupe->id)
            ->where('eleve_id', $eleve->id)
            ->whereNotNull('retire_par')
            ->update(['quitte_le' => null, 'retire_par' => null, 'rejoint_le' => CarbonImmutable::now()]);
    }

    public static function normaliserCode(string $saisie): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $saisie) ?? '');
    }

    private function nouveauCode(): string
    {
        do {
            $code = '';

            for ($i = 0; $i < 6; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (Groupe::query()->where('code', $code)->exists());

        return $code;
    }
}
