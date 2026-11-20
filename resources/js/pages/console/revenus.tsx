import { Head } from '@inertiajs/react';
import { BadgeCheck, CircleX, Ticket, Wallet } from 'lucide-react';
import {
    BarresSemaines,
    ChiffreCle,
    EnteteCarte,
    Repartition,
} from '@/components/console/graphiques';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { formaterJour } from '@/lib/dates';
import { formaterGnf, formaterNombre, pluriel } from '@/lib/utils';
import { index as codes } from '@/routes/console/codes';
import { index as paiements } from '@/routes/console/paiements';
import type { Revenus } from '@/types/console';
import { variation } from '@/types/console';

const icone = 'size-4 text-nimba-600 dark:text-nimba-300';
const milliers = (v: number) =>
    v >= 1000 ? `${formaterNombre(Math.round(v / 1000))} k` : formaterNombre(v);

/**
 * Console › Revenus (lot 13, PLAN M18 ; « revenus détaillés » promis au
 * lot 9) : paiements reçus par semaine, par moyen et par formule ; abonnés
 * en cours et d'où vient leur abonnement ; codes prépayés utilisés. Les
 * montants sont en GNF, formatés par `formaterGnf`.
 */
export default function RevenusPage({
    aujourdhui,
    revenus,
}: {
    aujourdhui: string;
    revenus: Revenus;
}) {
    const semaines = revenus.semaines.map((s) => s.semaine);
    const total12 = revenus.par_moyen.reduce((t, m) => t + m.montant_gnf, 0);

    return (
        <>
            <Head title="Revenus" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p
                        className="text-aide font-medium text-ink-500"
                        data-capture="variable"
                    >
                        {formaterJour(`${aujourdhui}T12:00:00Z`)} ·{' '}
                        {formaterGnf(total12)} sur 12 semaines
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Les <strong>revenus</strong>, d’où ils viennent
                    </h1>
                </header>

                {revenus.est_exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <ChiffreCle
                        icone={<Wallet aria-hidden className={icone} />}
                        libelle="Reçu sur 30 jours"
                        valeur={formaterGnf(revenus.montant_30_jours)}
                        tendance={variation(
                            revenus.montant_30_jours,
                            revenus.montant_30_jours_precedents,
                        )}
                        note={`${formaterGnf(revenus.montant_30_jours_precedents)} les 30 jours d’avant`}
                    />
                    <ChiffreCle
                        icone={<BadgeCheck aria-hidden className={icone} />}
                        libelle="Paiements réussis"
                        valeur={formaterNombre(revenus.paiements_30_jours)}
                        note="sur 30 jours"
                    />
                    <ChiffreCle
                        icone={<CircleX aria-hidden className={icone} />}
                        libelle="Paiements échoués"
                        valeur={formaterNombre(revenus.echecs_30_jours)}
                        note="refusés ou expirés, 30 jours"
                    />
                    <ChiffreCle
                        icone={<Ticket aria-hidden className={icone} />}
                        libelle="Abonnés en cours"
                        valeur={formaterNombre(revenus.abonnes)}
                        note={
                            revenus.eleves === 0
                                ? '—'
                                : `${Math.round((100 * revenus.abonnes) / revenus.eleves)} % des ${formaterNombre(revenus.eleves)} élèves`
                        }
                    />
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                    <div className="grid min-w-0 gap-6">
                        <section
                            aria-labelledby="titre-semaines"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <EnteteCarte
                                id="titre-semaines"
                                titre="Paiements reçus, par semaine (GNF)"
                                lien={paiements().url}
                                libelleLien="Paiements"
                            />
                            <BarresSemaines
                                titre="Montant des paiements réussis, par semaine"
                                semaines={semaines}
                                valeurs={revenus.semaines.map(
                                    (s) => s.montant_gnf,
                                )}
                                formater={milliers}
                            />
                        </section>
                        <section
                            aria-labelledby="titre-codes"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <EnteteCarte
                                id="titre-codes"
                                titre="Codes prépayés utilisés, par semaine"
                                lien={codes().url}
                                libelleLien="Codes"
                            />
                            <BarresSemaines
                                titre="Codes prépayés utilisés, par semaine"
                                semaines={semaines}
                                valeurs={revenus.semaines.map((s) => s.codes)}
                                hauteur="h-28"
                            />
                            <p className="text-meta text-ink-500">
                                {pluriel(
                                    revenus.codes.utilises,
                                    'code utilisé',
                                    'codes utilisés',
                                )}{' '}
                                sur {formaterNombre(revenus.codes.emis)} émis
                                dans des lots actifs ·{' '}
                                {formaterNombre(
                                    revenus.codes.utilises_30_jours,
                                )}{' '}
                                sur 30 jours
                            </p>
                        </section>
                    </div>

                    <aside className="grid gap-6">
                        <section
                            aria-labelledby="titre-moyens"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-moyens"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Par moyen de paiement, 12 semaines
                            </h2>
                            <ul className="grid gap-3">
                                {revenus.par_moyen.map((m) => (
                                    <li key={m.cle} className="grid gap-1.5">
                                        <div className="flex items-baseline justify-between gap-3 text-interface">
                                            <span className="font-medium">
                                                {m.libelle}
                                            </span>
                                            <span className="font-semibold font-data">
                                                {formaterGnf(m.montant_gnf)}
                                            </span>
                                        </div>
                                        <span
                                            aria-hidden
                                            className="h-1.5 overflow-hidden rounded-full bg-ink-400/15"
                                        >
                                            <span
                                                className="block h-full rounded-full bg-nimba-500 dark:bg-nimba-400"
                                                style={{
                                                    width: `${total12 === 0 ? 0 : (100 * m.montant_gnf) / total12}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="text-meta text-ink-500">
                                            {pluriel(m.paiements, 'paiement')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                        <section
                            aria-labelledby="titre-formules"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-formules"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Par formule, 12 semaines
                            </h2>
                            <dl className="grid text-interface">
                                {revenus.par_formule.map((f) => (
                                    <div
                                        key={f.cle}
                                        className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
                                    >
                                        <dt className="text-ink-600">
                                            {f.libelle}{' '}
                                            <span className="text-meta text-ink-500">
                                                ·{' '}
                                                {pluriel(
                                                    f.paiements,
                                                    'paiement',
                                                )}
                                            </span>
                                        </dt>
                                        <dd className="font-semibold font-data">
                                            {formaterGnf(f.montant_gnf)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                        <section
                            aria-labelledby="titre-sources"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-sources"
                                className="text-[0.9375rem] font-semibold"
                            >
                                D’où viennent les abonnements en cours
                            </h2>
                            <Repartition
                                libelle="Abonnés en cours par source"
                                parts={revenus.abonnes_par_source.map(
                                    (s, i) => ({
                                        cle: s.cle,
                                        libelle: s.libelle,
                                        valeur: s.abonnes,
                                        classe:
                                            [
                                                'bg-nimba-500 dark:bg-nimba-400',
                                                'bg-ink-900/70 dark:bg-white/60',
                                                'bg-ink-400/45',
                                            ][i] ?? 'bg-ink-400/45',
                                    }),
                                )}
                            />
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}
