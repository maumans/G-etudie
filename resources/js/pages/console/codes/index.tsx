import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronRight, Ticket } from 'lucide-react';
import { EtatLot } from '@/components/console/lot-codes';
import type { FormuleEcran, LotResume } from '@/components/console/lot-codes';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { formaterJour } from '@/lib/dates';
import { cn, formaterGnf, formaterNombre } from '@/lib/utils';
import { index, show, store } from '@/routes/console/codes';

type Props = {
    lots: {
        donnees: LotResume[];
        page: number;
        derniere: number;
        total: number;
    };
    formules: FormuleEcran[];
    quantite_max: number;
    bilan: { lots: number; codes: number; utilises: number };
};

/**
 * Console › Codes prépayés (lot 9) : fabriquer un lot pour un revendeur
 * (librairie, école), suivre combien de ses codes ont servi.
 */
export default function Codes({ lots, formules, quantite_max, bilan }: Props) {
    const formulaire = useForm({
        libelle: '',
        formule: formules[0]?.cle ?? 'mensuel',
        quantite: '50',
        revendeur: '',
    });

    return (
        <>
            <Head title="Codes prépayés" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        Cartes vendues en librairie, à l’école ou par des
                        revendeurs
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Codes <strong>prépayés</strong>
                    </h1>
                </header>

                <dl className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { libelle: 'Lots', valeur: bilan.lots },
                        { libelle: 'Codes fabriqués', valeur: bilan.codes },
                        { libelle: 'Codes utilisés', valeur: bilan.utilises },
                    ].map((c) => (
                        <div
                            key={c.libelle}
                            className="grid min-w-0 gap-1 rounded-carte border bg-card p-3 shadow-carte sm:p-4"
                        >
                            <dt className="truncate text-aide text-ink-500">
                                {c.libelle}
                            </dt>
                            <dd className="text-[1.375rem] leading-tight font-bold font-data">
                                {formaterNombre(c.valeur)}
                            </dd>
                        </div>
                    ))}
                </dl>

                {lots.donnees.some((l) => l.est_exemple) && <BandeauExemple />}

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <section
                        aria-label="Lots"
                        className="rounded-carte border bg-card shadow-carte"
                    >
                        {lots.donnees.length === 0 ? (
                            <div className="p-5">
                                <EtatVide
                                    illustration={Ticket}
                                    titre="Aucun lot pour l’instant"
                                    message="Fabrique un premier lot pour un revendeur : ses codes s’impriment sur des cartes."
                                    action={
                                        <Button
                                            asChild
                                            variant="outline"
                                            taille="compacte"
                                        >
                                            <a href="#nouveau-lot">
                                                Fabriquer un lot
                                            </a>
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {lots.donnees.map((lot) => (
                                    <li key={lot.uuid}>
                                        <Link
                                            href={show(lot.uuid)}
                                            prefetch
                                            className="flex items-center gap-3 p-4 outline-none hover:bg-craie-100/60 focus-visible:outline-2 focus-visible:outline-ring sm:px-5 dark:hover:bg-white/[0.03]"
                                        >
                                            <span
                                                aria-hidden
                                                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                            >
                                                <Ticket className="size-5" />
                                            </span>
                                            <span className="grid min-w-0 flex-1 grid-cols-1 gap-0.5">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="max-w-full min-w-0 truncate font-semibold">
                                                        {lot.libelle}
                                                    </span>
                                                    <EtatLot lot={lot} />
                                                </span>
                                                <span className="text-aide text-ink-500">
                                                    {lot.formule.nom} ·{' '}
                                                    {lot.revendeur ??
                                                        'Sans revendeur'}{' '}
                                                    ·{' '}
                                                    {formaterJour(lot.cree_le)}
                                                </span>
                                            </span>
                                            <span className="text-right font-data">
                                                <span className="font-semibold">
                                                    {formaterNombre(
                                                        lot.utilises,
                                                    )}
                                                </span>
                                                <span className="text-ink-500">
                                                    {' '}
                                                    /{' '}
                                                    {formaterNombre(
                                                        lot.quantite,
                                                    )}
                                                </span>
                                            </span>
                                            <ChevronRight
                                                aria-hidden
                                                className="size-4 text-ink-500"
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {lots.derniere > 1 && (
                            <Pagination
                                page={lots.page}
                                derniere={lots.derniere}
                                lien={(page) => index({ query: { page } }).url}
                                className="border-t p-3"
                            />
                        )}
                    </section>

                    <section
                        id="nouveau-lot"
                        aria-labelledby="titre-nouveau"
                        className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <div className="grid gap-1">
                            <h2
                                id="titre-nouveau"
                                className="text-titre-carte font-semibold"
                            >
                                Fabriquer un lot
                            </h2>
                            <p className="text-aide text-ink-500">
                                Les codes sont lisibles jusqu’à ce que tu dises
                                qu’ils sont remis ; ensuite, seule leur
                                empreinte reste.
                            </p>
                        </div>
                        <form
                            className="grid gap-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                formulaire.transform((d) => ({
                                    ...d,
                                    quantite: Number(d.quantite),
                                    revendeur: d.revendeur.trim() || null,
                                }));
                                formulaire.post(store().url);
                            }}
                        >
                            <Champ
                                libelle="Nom du lot"
                                erreur={formulaire.errors.libelle}
                            >
                                {(a) => (
                                    <Input
                                        {...a}
                                        value={formulaire.data.libelle}
                                        maxLength={120}
                                        placeholder="Rentrée 2026 · Librairie de Madina"
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'libelle',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                            <fieldset className="grid gap-2">
                                <legend className="mb-1.5 text-interface font-medium">
                                    Formule
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {formules.map((f) => (
                                        <label
                                            key={f.cle}
                                            className={cn(
                                                'grid cursor-pointer gap-0.5 rounded-controle border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                                                formulaire.data.formule ===
                                                    f.cle
                                                    ? 'border-nimba-600 ring-1 ring-nimba-600 dark:border-nimba-300 dark:ring-nimba-300'
                                                    : 'border-input',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="formule"
                                                className="sr-only"
                                                checked={
                                                    formulaire.data.formule ===
                                                    f.cle
                                                }
                                                onChange={() =>
                                                    formulaire.setData(
                                                        'formule',
                                                        f.cle,
                                                    )
                                                }
                                            />
                                            <span className="text-interface font-semibold">
                                                {f.nom}
                                            </span>
                                            <span className="text-meta text-ink-500">
                                                {f.duree} ·{' '}
                                                {formaterGnf(f.prix_gnf)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <Champ
                                libelle="Nombre de codes"
                                aide={`De 1 à ${formaterNombre(quantite_max)}.`}
                                erreur={formulaire.errors.quantite}
                            >
                                {(a) => (
                                    <Input
                                        {...a}
                                        inputMode="numeric"
                                        value={formulaire.data.quantite}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'quantite',
                                                e.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        className="font-data"
                                    />
                                )}
                            </Champ>
                            <Champ
                                libelle="Revendeur"
                                facultatif
                                erreur={formulaire.errors.revendeur}
                            >
                                {(a) => (
                                    <Input
                                        {...a}
                                        value={formulaire.data.revendeur}
                                        maxLength={120}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'revendeur',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                            <Button
                                type="submit"
                                disabled={
                                    formulaire.processing ||
                                    formulaire.data.libelle.trim() === ''
                                }
                            >
                                Fabriquer les codes
                            </Button>
                        </form>
                    </section>
                </div>
            </div>
        </>
    );
}
