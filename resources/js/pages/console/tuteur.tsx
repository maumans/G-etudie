import { Head } from '@inertiajs/react';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { formaterDollars } from '@/lib/tuteur/couts';
import { cn, formaterGnf, formaterNombre } from '@/lib/utils';

type Props = {
    jours: number;
    bilan: {
        aujourdhui: number;
        explications: number;
        part_cache: number;
        cout_micro_usd: number;
        cout_moyen_micro_usd: number;
        premier_mot_median_ms: number | null;
        premier_mot_p90_ms: number | null;
        recentrages: number;
        pannes: number;
        eleves: number;
    };
    par_jour: {
        jour: string;
        explications: number;
        cache: number;
        cout_micro_usd: number;
    }[];
    par_modele: {
        modele: string;
        reponses: number;
        jetons_entree: number;
        jetons_sortie: number;
        jetons_cache_lus: number;
        cout_micro_usd: number;
    }[];
    reglages: {
        modele: string;
        moteur: string;
        quota_gratuit: number;
        quota_abonne: number;
        gnf_par_dollar: number;
    };
    est_exemple: boolean;
};

const secondes = (ms: number | null) =>
    ms === null
        ? '—'
        : `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s`;

/**
 * Console › Tuteur (lot 10, PLAN M11 et § 14 « coût de l'IA ») : ce que le
 * tuteur a servi et ce qu'il a coûté sur 30 jours, la part servie par le
 * cache, le temps avant le premier mot (critère du lot : moins de 3 s).
 * Les coûts sont en dollars (facture de l'API), lus aussi en GNF au taux
 * indicatif réglé dans `.env`.
 */
export default function ConsoleTuteur({
    jours,
    bilan,
    par_jour,
    par_modele,
    reglages,
    est_exemple,
}: Props) {
    const gnf = (micro: number) =>
        formaterGnf(Math.round((micro / 1_000_000) * reglages.gnf_par_dollar));
    const maximum = Math.max(1, ...par_jour.map((j) => j.explications));

    return (
        <>
            <Head title="Tuteur" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {jours} derniers jours · {reglages.modele}
                        {reglages.moteur === 'simule' && ' (tuteur simulé)'}
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Le <strong>tuteur</strong>, son usage et son coût
                    </h1>
                </header>

                {est_exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        {
                            libelle: 'Coût sur 30 jours',
                            valeur: formaterDollars(bilan.cout_micro_usd),
                            note: `≈ ${gnf(bilan.cout_micro_usd)}`,
                        },
                        {
                            libelle: 'Explications',
                            valeur: formaterNombre(bilan.explications),
                            note: `${formaterNombre(bilan.aujourdhui)} aujourd’hui · ${formaterNombre(bilan.eleves)} élèves`,
                        },
                        {
                            libelle: 'Servies par le cache',
                            valeur: `${bilan.part_cache} %`,
                            note: `Coût moyen d’un appel : ${formaterDollars(bilan.cout_moyen_micro_usd)}`,
                        },
                        {
                            libelle: 'Premier mot (médiane)',
                            valeur: secondes(bilan.premier_mot_median_ms),
                            note: `9 sur 10 sous ${secondes(bilan.premier_mot_p90_ms)} · objectif 3 s`,
                            alerte: (bilan.premier_mot_p90_ms ?? 0) > 3000,
                        },
                    ].map((c) => (
                        <div
                            key={c.libelle}
                            className="grid content-start gap-1 rounded-carte border bg-card p-4 shadow-carte"
                        >
                            <dt className="text-aide text-ink-500">
                                {c.libelle}
                            </dt>
                            <dd
                                className={cn(
                                    'text-[1.375rem] leading-tight font-bold font-data',
                                    c.alerte &&
                                        'text-faux-600 dark:text-faux-400',
                                )}
                            >
                                {c.valeur}
                            </dd>
                            <dd className="text-meta text-ink-500">{c.note}</dd>
                        </div>
                    ))}
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                    <section
                        aria-labelledby="titre-jours"
                        className="grid min-w-0 gap-4 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2
                                id="titre-jours"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Explications par jour
                            </h2>
                            <p className="flex items-center gap-3 text-meta text-ink-500">
                                <span className="flex items-center gap-1.5">
                                    <span
                                        aria-hidden
                                        className="size-2.5 rounded-[3px] bg-nimba-500 dark:bg-nimba-400"
                                    />
                                    écrites par l’API
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span
                                        aria-hidden
                                        className="size-2.5 rounded-[3px] bg-ink-900/25 dark:bg-white/30"
                                    />
                                    servies du cache
                                </span>
                            </p>
                        </div>
                        <ol
                            aria-label="Explications des 30 derniers jours"
                            className="flex h-40 items-end gap-[3px]"
                        >
                            {par_jour.map((j) => {
                                const appels = j.explications - j.cache;

                                return (
                                    <li
                                        key={j.jour}
                                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                                        title={`${j.jour} : ${j.explications} explications, ${formaterDollars(j.cout_micro_usd)}`}
                                    >
                                        <span className="sr-only">
                                            {j.jour} : {j.explications}{' '}
                                            explications
                                        </span>
                                        <span
                                            aria-hidden
                                            className="w-full rounded-t-[3px] bg-ink-900/25 dark:bg-white/30"
                                            style={{
                                                height: `${(100 * j.cache) / maximum}%`,
                                            }}
                                        />
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'w-full bg-nimba-500 dark:bg-nimba-400',
                                                j.cache === 0 &&
                                                    'rounded-t-[3px]',
                                            )}
                                            style={{
                                                height: `${(100 * appels) / maximum}%`,
                                            }}
                                        />
                                        {j.explications === 0 && (
                                            <span
                                                aria-hidden
                                                className="h-0.5 w-full rounded-full bg-ink-400/20"
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                        <p
                            className="flex justify-between text-meta text-ink-500 font-data"
                            data-capture="variable"
                        >
                            <span>{par_jour[0]?.jour}</span>
                            <span>{par_jour.at(-1)?.jour}</span>
                        </p>
                    </section>

                    <section
                        aria-labelledby="titre-reglages"
                        className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <h2
                            id="titre-reglages"
                            className="text-[0.9375rem] font-semibold"
                        >
                            Garde-fous
                        </h2>
                        <dl className="grid gap-2.5 text-interface">
                            {[
                                [
                                    'Quota sans abonnement',
                                    `${reglages.quota_gratuit} par jour`,
                                ],
                                [
                                    'Quota avec abonnement',
                                    `${reglages.quota_abonne} par jour`,
                                ],
                                [
                                    'Recentrés ou refusés',
                                    formaterNombre(bilan.recentrages),
                                ],
                                [
                                    'Pannes de l’API',
                                    formaterNombre(bilan.pannes),
                                ],
                                [
                                    'Taux indicatif',
                                    `1 $ ≈ ${formaterGnf(reglages.gnf_par_dollar)}`,
                                ],
                            ].map(([libelle, valeur]) => (
                                <div
                                    key={libelle}
                                    className="flex items-baseline justify-between gap-3 border-b pb-2.5 last:border-b-0 last:pb-0"
                                >
                                    <dt className="text-ink-600">{libelle}</dt>
                                    <dd className="font-semibold font-data">
                                        {valeur}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>

                <section
                    aria-labelledby="titre-modeles"
                    className="rounded-carte border bg-card shadow-carte"
                >
                    <h2
                        id="titre-modeles"
                        className="border-b px-5 py-4 text-[0.9375rem] font-semibold"
                    >
                        Par modèle
                    </h2>
                    {par_modele.length === 0 ? (
                        <p className="px-5 py-4 text-aide text-ink-500">
                            Aucun appel à l’API sur la période.
                        </p>
                    ) : (
                        <div
                            className="overflow-x-auto"
                            tabIndex={0}
                            role="region"
                            aria-label="Coût par modèle (défile horizontalement)"
                        >
                            <table className="w-full text-interface">
                                <thead>
                                    <tr className="text-left text-aide text-ink-500">
                                        <th
                                            scope="col"
                                            className="px-5 py-2.5 font-medium"
                                        >
                                            Modèle
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2.5 text-right font-medium"
                                        >
                                            Réponses
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2.5 text-right font-medium"
                                        >
                                            Jetons lus
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2.5 text-right font-medium"
                                        >
                                            dont cache
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2.5 text-right font-medium"
                                        >
                                            Jetons écrits
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-2.5 text-right font-medium"
                                        >
                                            Coût
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-t font-data">
                                    {par_modele.map((m) => (
                                        <tr key={m.modele}>
                                            <th
                                                scope="row"
                                                className="px-5 py-3 text-left font-medium"
                                            >
                                                {m.modele}
                                            </th>
                                            <td className="px-3 py-3 text-right">
                                                {formaterNombre(m.reponses)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {formaterNombre(
                                                    m.jetons_entree +
                                                        m.jetons_cache_lus,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right text-ink-500">
                                                {formaterNombre(
                                                    m.jetons_cache_lus,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {formaterNombre(
                                                    m.jetons_sortie,
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold">
                                                {formaterDollars(
                                                    m.cout_micro_usd,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
