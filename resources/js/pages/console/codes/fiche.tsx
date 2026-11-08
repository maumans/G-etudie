import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Ban, Download, PackageCheck, Printer } from 'lucide-react';
import { EtatLot } from '@/components/console/lot-codes';
import type { LotResume } from '@/components/console/lot-codes';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { ProgressionBarre } from '@/components/ui/progression';
import { formaterJour, formaterJourHeure } from '@/lib/dates';
import { formaterGnf, formaterNombre } from '@/lib/utils';
import {
    desactiver,
    fichier,
    impression,
    index,
    remis,
} from '@/routes/console/codes';

type Props = {
    lot: LotResume;
    apercu: string[] | null;
    utilisations: { fin: string; utilise_le: string | null }[];
};

/**
 * Un lot de codes prépayés (lot 9) : imprimer ou télécharger ses codes tant
 * qu'ils ne sont pas remis, puis les effacer de l'écran ; suivre leur usage ;
 * désactiver le lot s'il est perdu.
 */
export default function FicheLot({ lot, apercu, utilisations }: Props) {
    const confirmer = useConfirmer();
    const part = lot.quantite === 0 ? 0 : (lot.utilises / lot.quantite) * 100;

    const marquerRemis = async () => {
        if (
            await confirmer({
                titre: 'Les codes sont-ils remis ?',
                message:
                    'Après ça, ils ne seront plus lisibles nulle part : imprime-les ou télécharge-les d’abord.',
                action: 'Oui, effacer de l’écran',
            })
        ) {
            router.post(remis(lot.uuid).url, {}, { preserveScroll: true });
        }
    };

    const desactiverLot = async () => {
        if (
            await confirmer({
                titre: `Désactiver « ${lot.libelle} » ?`,
                message:
                    'Les codes non utilisés ne vaudront plus rien. Les abonnements déjà ouverts restent. Ce geste ne se défait pas.',
                action: 'Désactiver le lot',
            })
        ) {
            router.post(desactiver(lot.uuid).url, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title={lot.libelle} />
            <div className="grid grid-cols-1 gap-6">
                <div className="grid gap-4">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2 w-fit"
                    >
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Codes prépayés
                        </Link>
                    </Button>
                    <header className="grid gap-1.5">
                        <p className="flex flex-wrap items-center gap-2 text-aide font-medium text-ink-500">
                            {lot.formule.nom} · {lot.formule.duree} ·{' '}
                            {formaterGnf(lot.formule.prix_gnf)}{' '}
                            <EtatLot lot={lot} />
                        </p>
                        <h1 className="text-titre-ecran titre-contraste">
                            <strong>{lot.libelle}</strong>
                        </h1>
                    </header>
                </div>

                {lot.est_exemple && <BandeauExemple />}

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="grid grid-cols-1 gap-6">
                        {lot.codes_disponibles && !lot.desactive_le ? (
                            <section className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6">
                                <div className="grid gap-1">
                                    <h2 className="text-titre-carte font-semibold">
                                        {formaterNombre(lot.quantite)} codes à
                                        remettre
                                    </h2>
                                    <p className="text-aide text-white/75">
                                        Imprime les cartes ou télécharge le
                                        fichier pour le revendeur, puis dis
                                        qu’ils sont remis : ils disparaîtront de
                                        l’écran.
                                    </p>
                                </div>
                                {apercu && (
                                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {apercu.map((code) => (
                                            <li
                                                key={code}
                                                className="rounded-[10px] bg-white/[0.08] px-3 py-2 text-center text-interface tracking-[0.08em] font-data"
                                                data-capture="variable"
                                            >
                                                {code}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="flex flex-wrap gap-3">
                                    <Button asChild>
                                        <a
                                            href={impression(lot.uuid).url}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            <Printer aria-hidden />
                                            Imprimer les cartes
                                        </a>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                                    >
                                        <a href={fichier(lot.uuid).url}>
                                            <Download aria-hidden />
                                            Fichier CSV
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-white hover:bg-white/10"
                                        onClick={() => void marquerRemis()}
                                    >
                                        <PackageCheck aria-hidden />
                                        Codes remis
                                    </Button>
                                </div>
                            </section>
                        ) : (
                            <section className="grid gap-1 rounded-carte border bg-card p-5 shadow-carte">
                                <h2 className="text-titre-carte font-semibold">
                                    {lot.desactive_le
                                        ? 'Lot désactivé'
                                        : 'Codes remis'}
                                </h2>
                                <p className="text-interface text-ink-600">
                                    {lot.desactive_le
                                        ? `Depuis le ${formaterJour(lot.desactive_le)} : ses codes non utilisés sont refusés.`
                                        : `Le ${lot.remis_le ? formaterJour(lot.remis_le) : '—'}. Les codes ne sont plus lisibles ici ; seule leur empreinte reste pour les reconnaître.`}
                                </p>
                            </section>
                        )}

                        <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                            <h2 className="text-titre-carte font-semibold">
                                Dernières utilisations
                            </h2>
                            {utilisations.length === 0 ? (
                                <p className="text-aide text-ink-500">
                                    Aucun code de ce lot n’a encore servi.
                                </p>
                            ) : (
                                <ul className="grid divide-y">
                                    {utilisations.map((u, rang) => (
                                        <li
                                            key={rang}
                                            className="flex items-center justify-between gap-3 py-2 text-interface first:pt-0 last:pb-0"
                                        >
                                            <span className="font-data">
                                                •••• •••• {u.fin}
                                            </span>
                                            <span className="text-aide text-ink-500">
                                                {u.utilise_le
                                                    ? formaterJourHeure(
                                                          u.utilise_le,
                                                      )
                                                    : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <aside className="grid content-start gap-4">
                        <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                            <h2 className="text-[0.9375rem] font-semibold">
                                Usage
                            </h2>
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-[1.75rem] leading-none font-bold tracking-tight font-data">
                                    {formaterNombre(lot.utilises)}
                                </span>
                                <span className="font-medium text-ink-500">
                                    / {formaterNombre(lot.quantite)} codes
                                    utilisés
                                </span>
                            </p>
                            <ProgressionBarre
                                valeur={part}
                                libelle="Part des codes utilisés"
                            />
                            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t pt-3 text-aide">
                                <dt className="text-ink-500">Revendeur</dt>
                                <dd>{lot.revendeur ?? '—'}</dd>
                                <dt className="text-ink-500">Fabriqué le</dt>
                                <dd>{formaterJour(lot.cree_le)}</dd>
                                <dt className="text-ink-500">Valeur</dt>
                                <dd className="font-data">
                                    {formaterGnf(
                                        lot.formule.prix_gnf * lot.quantite,
                                    )}
                                </dd>
                            </dl>
                        </section>
                        {!lot.desactive_le && (
                            <Button
                                variant="outline"
                                onClick={() => void desactiverLot()}
                            >
                                <Ban aria-hidden />
                                Désactiver le lot
                            </Button>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
