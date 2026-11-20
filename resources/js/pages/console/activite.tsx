import { Head } from '@inertiajs/react';
import { CalendarCheck, Repeat, UserPlus, UsersRound } from 'lucide-react';
import {
    BarresSemaines,
    ChiffreCle,
    CourbeSemaines,
    Repartition,
} from '@/components/console/graphiques';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { formaterJour } from '@/lib/dates';
import { formaterNombre, pluriel } from '@/lib/utils';
import type { Activite, Retention } from '@/types/console';
import { variation } from '@/types/console';

type Props = {
    aujourdhui: string;
    activite: Activite;
    regles: { seances_par_semaine: number; seuil: number };
};

const icone = 'size-4 text-nimba-600 dark:text-nimba-300';

/**
 * Console › Activité (lot 13, PLAN M18 et § 15) : élèves actifs (jour,
 * semaine, mois), rétention à 7 et 30 jours, séances et examens blancs par
 * semaine, rythme des actifs de la semaine. Un élève actif a répondu au
 * moins une fois ce jour-là.
 */
export default function ActivitePage({ aujourdhui, activite, regles }: Props) {
    const semaines = activite.semaines.map((s) => s.semaine);
    const { rythme } = activite;

    return (
        <>
            <Head title="Activité" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p
                        className="text-aide font-medium text-ink-500"
                        data-capture="variable"
                    >
                        {formaterJour(`${aujourdhui}T12:00:00Z`)} · 12 dernières
                        semaines
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Qui <strong>travaille</strong>, et à quel rythme
                    </h1>
                </header>

                {activite.est_exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <ChiffreCle
                        icone={<UsersRound aria-hidden className={icone} />}
                        libelle="Actifs aujourd’hui"
                        valeur={formaterNombre(activite.actifs.jour)}
                        note={`${formaterNombre(activite.actifs.mois)} sur 30 jours`}
                    />
                    <ChiffreCle
                        icone={<CalendarCheck aria-hidden className={icone} />}
                        libelle="Actifs sur 7 jours"
                        valeur={formaterNombre(activite.actifs.semaine)}
                        tendance={variation(
                            activite.actifs.semaine,
                            activite.actifs.semaine_precedente,
                        )}
                        note={`${formaterNombre(activite.actifs.semaine_precedente)} la semaine d’avant`}
                    />
                    <ChiffreCle
                        icone={<UserPlus aria-hidden className={icone} />}
                        libelle="Nouveaux sur 7 jours"
                        valeur={formaterNombre(activite.nouveaux_semaine)}
                        note={`${pluriel(activite.inscrits, 'élève inscrit', 'élèves inscrits')}`}
                    />
                    <ChiffreCle
                        icone={<Repeat aria-hidden className={icone} />}
                        libelle="Assidus cette semaine"
                        valeur={formaterNombre(rythme.assidus)}
                        note={`${regles.seances_par_semaine} séances ou plus`}
                    />
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                    <div className="grid min-w-0 gap-6">
                        <section
                            aria-labelledby="titre-actifs"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-actifs"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Élèves actifs et assidus, par semaine
                            </h2>
                            <CourbeSemaines
                                titre="Élèves actifs et élèves assidus, par semaine"
                                semaines={semaines}
                                series={[
                                    {
                                        cle: 'actifs',
                                        libelle: 'actifs',
                                        valeurs: activite.semaines.map(
                                            (s) => s.actifs,
                                        ),
                                        ton: 'marque',
                                    },
                                    {
                                        cle: 'assidus',
                                        libelle: `assidus (${regles.seances_par_semaine} séances et plus)`,
                                        valeurs: activite.semaines.map(
                                            (s) => s.assidus,
                                        ),
                                        ton: 'neutre',
                                    },
                                ]}
                            />
                        </section>
                        <div className="grid gap-6 md:grid-cols-2">
                            <section
                                aria-labelledby="titre-seances"
                                className="grid min-w-0 gap-4 rounded-carte border bg-card p-5 shadow-carte"
                            >
                                <h2
                                    id="titre-seances"
                                    className="text-[0.9375rem] font-semibold"
                                >
                                    Séances terminées
                                </h2>
                                <BarresSemaines
                                    titre="Séances terminées, par semaine"
                                    semaines={semaines}
                                    valeurs={activite.semaines.map(
                                        (s) => s.seances,
                                    )}
                                />
                            </section>
                            <section
                                aria-labelledby="titre-examens"
                                className="grid min-w-0 gap-4 rounded-carte border bg-card p-5 shadow-carte"
                            >
                                <h2
                                    id="titre-examens"
                                    className="text-[0.9375rem] font-semibold"
                                >
                                    Examens blancs passés
                                </h2>
                                <BarresSemaines
                                    titre="Examens blancs terminés, par semaine"
                                    semaines={semaines}
                                    valeurs={activite.semaines.map(
                                        (s) => s.examens_blancs,
                                    )}
                                />
                            </section>
                        </div>
                    </div>

                    <aside className="grid gap-6">
                        <section
                            aria-labelledby="titre-retention"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-retention"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Ils reviennent
                            </h2>
                            <LigneRetention
                                libelle="Après 7 jours"
                                retention={activite.retention.j7}
                                seuil={regles.seuil}
                            />
                            <LigneRetention
                                libelle="Après 30 jours"
                                retention={activite.retention.j30}
                                seuil={regles.seuil}
                            />
                            <p className="text-meta text-ink-500">
                                Parmi les élèves inscrits depuis plus longtemps,
                                la part qui a encore répondu après ce délai.
                            </p>
                        </section>
                        <section
                            aria-labelledby="titre-rythme"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-rythme"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Rythme des actifs, sur 7 jours
                            </h2>
                            <Repartition
                                libelle="Rythme des actifs sur 7 jours"
                                parts={[
                                    {
                                        cle: 'assidus',
                                        libelle: `${regles.seances_par_semaine} séances et plus`,
                                        valeur: rythme.assidus,
                                        classe: 'bg-nimba-500 dark:bg-nimba-400',
                                    },
                                    {
                                        cle: 'une',
                                        libelle: '1 ou 2 séances',
                                        valeur: rythme.une_ou_deux,
                                        classe: 'bg-nimba-500/45 dark:bg-nimba-400/45',
                                    },
                                    {
                                        cle: 'aucune',
                                        libelle: 'Réponses sans séance',
                                        valeur: rythme.aucune,
                                        classe: 'bg-ink-400/45',
                                    },
                                ]}
                            />
                        </section>
                        <section
                            aria-labelledby="titre-examen"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-examen"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Par examen
                            </h2>
                            <table className="w-full text-interface">
                                <thead>
                                    <tr className="text-left text-meta text-ink-500">
                                        <th
                                            scope="col"
                                            className="pb-2 font-medium"
                                        >
                                            Examen
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-2 text-right font-medium"
                                        >
                                            Actifs 7 j
                                        </th>
                                        <th
                                            scope="col"
                                            className="pb-2 text-right font-medium"
                                        >
                                            Inscrits
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-t font-data">
                                    {activite.par_examen.map((e) => (
                                        <tr key={e.cle}>
                                            <th
                                                scope="row"
                                                className="py-2.5 text-left font-sans font-medium"
                                            >
                                                {e.libelle}
                                            </th>
                                            <td className="py-2.5 text-right font-semibold">
                                                {formaterNombre(e.actifs)}
                                            </td>
                                            <td className="py-2.5 text-right text-ink-600">
                                                {formaterNombre(e.inscrits)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function LigneRetention({
    libelle,
    retention,
    seuil,
}: {
    libelle: string;
    retention: Retention;
    seuil: number;
}) {
    return (
        <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-interface text-ink-600">{libelle}</span>
                <span className="text-[1.25rem] font-bold font-data">
                    {retention.taux === null ? '—' : `${retention.taux} %`}
                </span>
            </div>
            <span
                aria-hidden
                className="h-1.5 overflow-hidden rounded-full bg-ink-400/15"
            >
                <span
                    className="block h-full rounded-full bg-nimba-500 dark:bg-nimba-400"
                    style={{ width: `${retention.taux ?? 0}%` }}
                />
            </span>
            <span className="text-meta text-ink-500">
                {retention.taux === null
                    ? `${pluriel(retention.cohorte, 'élève')} dans la cohorte : il en faut ${seuil}.`
                    : `${formaterNombre(retention.revenus)} sur ${formaterNombre(retention.cohorte)} élèves`}
            </span>
        </div>
    );
}
