<?php

namespace App\Services;

use App\Enums\FormuleAbonnement;
use App\Enums\SourceAbonnement;
use App\Models\Abonnement;
use App\Models\CodeAcces;
use App\Models\LotCodes;
use App\Models\User;
use App\Services\Paiements\CodeRefuse;
use App\Support\CodeAcces as FormatCode;
use App\Support\JournalAcces;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Les codes prépayés (PLAN M16) — seule autorité : fabriquer un lot,
 * remettre ses codes, en désactiver un, utiliser un code.
 *
 * Un code n'est **jamais** gardé en clair après sa remise : seule son
 * empreinte (HMAC, `FormatCode::empreinte`) permet de le reconnaître. Un code
 * s'utilise une fois (`abonnements.code_acces_id` unique, verrou sur sa
 * ligne). Le nombre d'essais est limité par la route (`throttle`), et chaque
 * code utilisé est inscrit au journal des accès.
 */
class CodeAccesService
{
    public function __construct(private AbonnementService $abonnements) {}

    /**
     * Fabrique un lot. Les codes en clair attendent, chiffrés, d'être
     * imprimés et remis (`marquerRemis`).
     */
    public function creerLot(User $auteur, FormuleAbonnement $formule, int $quantite, string $libelle, ?string $revendeur = null, bool $exemple = false): LotCodes
    {
        $max = (int) config('paiements.codes.quantite_max');

        if ($quantite < 1 || $quantite > $max) {
            throw new InvalidArgumentException("Entre 1 et {$max} codes par lot.");
        }

        return DB::transaction(function () use ($auteur, $formule, $quantite, $libelle, $revendeur, $exemple) {
            $codes = [];

            while (count($codes) < $quantite) {
                $code = FormatCode::generer();
                $codes[FormatCode::empreinte($code)] = $code;
            }

            $lot = LotCodes::create([
                'uuid' => (string) Str::uuid7(),
                'libelle' => $libelle,
                'formule' => $formule->value,
                'quantite' => $quantite,
                'revendeur' => $revendeur,
                'cree_par' => $auteur->id,
                'codes_en_attente' => array_values($codes),
                'est_exemple' => $exemple,
            ]);

            foreach (array_chunk($codes, 500, true) as $paquet) {
                CodeAcces::query()->insert(array_map(fn (string $empreinte, string $code) => [
                    'lot_id' => $lot->id,
                    'empreinte' => $empreinte,
                    'fin' => substr($code, -4),
                ], array_keys($paquet), $paquet));
            }

            JournalAcces::consigner('lot_codes.cree', $lot, ['quantite' => $quantite, 'formule' => $formule->value], $auteur);

            return $lot;
        });
    }

    /** Les codes sont remis au revendeur : leur version en clair est effacée. */
    public function marquerRemis(LotCodes $lot, ?User $auteur = null): void
    {
        $lot->update(['codes_en_attente' => null, 'codes_remis_le' => CarbonImmutable::now()]);
        JournalAcces::consigner('lot_codes.remis', $lot, [], $auteur);
    }

    /** Un lot perdu ou volé : ses codes non utilisés ne valent plus rien. */
    public function desactiver(LotCodes $lot, User $auteur): void
    {
        $lot->update(['desactive_le' => CarbonImmutable::now()]);
        JournalAcces::consigner('lot_codes.desactive', $lot, [], $auteur);
    }

    /**
     * Utilise un code pour l'élève.
     *
     * @throws CodeRefuse avec la phrase à montrer
     */
    public function utiliser(User $eleve, string $saisie, ?User $auteur = null): Abonnement
    {
        // Lot 11 : `$auteur`, le parent qui saisit le code de son enfant (journal).
        $auteur ??= $eleve;
        $code = FormatCode::normaliser($saisie);

        if ($code === null) {
            throw new CodeRefuse('Ce code est mal tapé : vérifie chaque caractère (12 lettres et chiffres).');
        }

        return DB::transaction(function () use ($eleve, $code, $auteur) {
            $ligne = CodeAcces::query()->with('lot')
                ->where('empreinte', FormatCode::empreinte($code))
                ->lockForUpdate()
                ->first();

            if ($ligne === null) {
                throw new CodeRefuse('Ce code n\'existe pas. Vérifie-le, ou demande à celui qui te l\'a vendu.');
            }

            if ($ligne->utilise_le !== null) {
                throw new CodeRefuse($ligne->utilise_par === $eleve->id
                    ? 'Tu as déjà utilisé ce code : ton abonnement est en place.'
                    : 'Ce code a déjà été utilisé.');
            }

            if ($ligne->lot->estDesactive()) {
                throw new CodeRefuse('Ce code n\'est plus valable. Rapporte la carte à celui qui te l\'a vendue.');
            }

            $ligne->update(['utilise_par' => $eleve->id, 'utilise_le' => CarbonImmutable::now()]);
            JournalAcces::consigner('code.utilise', $ligne, ['lot' => $ligne->lot->uuid, 'fin' => $ligne->fin, 'eleve_id' => $eleve->id], $auteur);

            return $this->abonnements->activer($eleve, $ligne->lot->formule, SourceAbonnement::Code, codeId: $ligne->id, exemple: $ligne->lot->est_exemple);
        });
    }

    /** Les codes en clair d'un lot jamais remis sont effacés au-delà du délai (planificateur). */
    public function effacerCodesOublies(): int
    {
        $limite = CarbonImmutable::now()->subDays((int) config('paiements.codes.jours_avant_effacement'));

        return LotCodes::query()
            ->whereNull('codes_remis_le')
            ->whereNotNull('codes_en_attente')
            ->where('created_at', '<', $limite)
            ->update(['codes_en_attente' => null]);
    }
}
