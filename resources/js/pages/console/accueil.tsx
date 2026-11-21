import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    FileDown,
    Flag,
    GraduationCap,
    Hourglass,
    UsersRound,
    Wallet,
} from 'lucide-react';
import {
    BarresSemaines,
    ChiffreCle,
    CourbeSemaines,
    EnteteCarte,
    formaterEcart,
} from '@/components/console/graphiques';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { formaterJour } from '@/lib/dates';
import { cn, formaterGnf, formaterNombre, pluriel } from '@/lib/utils';
import {
    activite as routeActivite,
    contenu as routeContenu,
    revenus as routeRevenus,
} from '@/routes/console';
import { index as routeImpact, rapport } from '@/routes/console/impact';
import type {
    Activite,
    ContenuPlateforme,
    Impact,
    Revenus,
} from '@/types/console';
import { variation } from '@/types/console';

type Props = {
    aujourdhui: string;
    activite: Activite;
    contenu: ContenuPlateforme;
    revenus: Revenus | null;
    impact: Impact | null;
};

/**
 * Console › Vue d'ensemble (lot 13, PLAN M18) : la plateforme cette
 * semaine — qui travaille, ce que les élèves rapportent, ce qui attend
 * l'équipe, et l'impact, le moment fort de l'écran (surface encre), avec
 * son rapport PDF (action dominante).
 */
export default function Accueil({
    aujourdhui,
    activite,
    contenu,
    revenus,
    impact,
}: Props) {
    const semaines = activite.semaines.map((s) => s.semaine);
    const exemple =
        activite.est_exemple ||
        contenu.est_exemple ||
        (revenus?.est_exemple ?? false);
    const aTraiter =
        contenu.en_relecture.lecons +
        contenu.en_relecture.questions +
        contenu.en_relecture.annales;

    return (
        <>
            <Head title="Console plateforme" />
            <div className="grid grid-cols-1 gap-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid gap-1.5">
                        <p
                            className="text-aide font-medium text-ink-500"
                            data-capture="variable"
                        >
                            {formaterJour(`${aujourdhui}T12:00:00Z`)} ·{' '}
                            {pluriel(
                                activite.inscrits,
                                'élève inscrit',
                                'élèves inscrits',
                            )}
                        </p>
                        <h1 className="text-titre-ecran titre-contraste">
                            La plateforme, <strong>cette semaine</strong>
                        </h1>
                    </div>
                    {impact && (
                        <Button asChild>
                            <a
                                href={
                                    rapport({
                                        query: {
                                            semaines: impact.filtres.semaines,
                                        },
                                    }).url
                                }
                                download
                            >
                                <FileDown aria-hidden />
                                Rapport d’impact (PDF)
                            </a>
                        </Button>
                    )}
                </header>

                {exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <ChiffreCle
                        icone={
                            <UsersRound
                                aria-hidden
                                className="size-4 text-nimba-600 dark:text-nimba-300"
                            />
                        }
                        libelle="Actifs sur 7 jours"
                        valeur={formaterNombre(activite.actifs.semaine)}
                        tendance={variation(
                            activite.actifs.semaine,
                            activite.actifs.semaine_precedente,
                        )}
                        note={`${formaterNombre(activite.actifs.jour)} aujourd’hui · ${formaterNombre(activite.actifs.mois)} sur 30 jours`}
                    />
                    <ChiffreCle
                        icone={
                            <GraduationCap
                                aria-hidden
                                className="size-4 text-nimba-600 dark:text-nimba-300"
                            />
                        }
                        libelle="Reviennent après 30 jours"
                        valeur={
                            activite.retention.j30.taux === null
                                ? '—'
                                : `${activite.retention.j30.taux} %`
                        }
                        note={
                            activite.retention.j30.taux === null
                                ? 'Pas encore assez d’inscrits anciens'
                                : `${formaterNombre(activite.retention.j30.revenus)} sur ${formaterNombre(activite.retention.j30.cohorte)} · 7 jours : ${activite.retention.j7.taux ?? '—'} %`
                        }
                    />
                    {revenus ? (
                        <ChiffreCle
                            icone={
                                <Wallet
                                    aria-hidden
                                    className="size-4 text-nimba-600 dark:text-nimba-300"
                                />
                            }
                            libelle="Revenus sur 30 jours"
                            valeur={formaterGnf(revenus.montant_30_jours)}
                            tendance={variation(
                                revenus.montant_30_jours,
                                revenus.montant_30_jours_precedents,
                            )}
                            note={`${pluriel(revenus.abonnes, 'abonné')} en cours`}
                        />
                    ) : (
                        <ChiffreCle
                            libelle="Nouveaux élèves"
                            valeur={formaterNombre(activite.nouveaux_semaine)}
                            note="sur 7 jours"
                        />
                    )}
                    <ChiffreCle
                        icone={
                            <Flag
                                aria-hidden
                                className="size-4 text-nimba-600 dark:text-nimba-300"
                            />
                        }
                        libelle="Signalements ouverts"
                        valeur={formaterNombre(contenu.signalements.ouverts)}
                        note={
                            contenu.signalements.ouverts_depuis_7_jours > 0
                                ? `dont ${formaterNombre(contenu.signalements.ouverts_depuis_7_jours)} depuis plus de 7 jours`
                                : 'aucun en attente depuis plus de 7 jours'
                        }
                    />
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                    <div className="grid min-w-0 gap-6">
                        <section
                            aria-labelledby="titre-activite"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <EnteteCarte
                                id="titre-activite"
                                titre="Élèves actifs, semaine par semaine"
                                lien={routeActivite().url}
                                libelleLien="Activité"
                            />
                            <CourbeSemaines
                                titre="Élèves actifs et élèves assidus, sur 12 semaines"
                                semaines={semaines}
                                series={[
                                    {
                                        cle: 'actifs',
                                        libelle:
                                            'actifs (au moins une réponse)',
                                        valeurs: activite.semaines.map(
                                            (s) => s.actifs,
                                        ),
                                        ton: 'marque',
                                    },
                                    {
                                        cle: 'assidus',
                                        libelle: 'assidus (3 séances et plus)',
                                        valeurs: activite.semaines.map(
                                            (s) => s.assidus,
                                        ),
                                        ton: 'neutre',
                                    },
                                ]}
                            />
                        </section>

                        {revenus && (
                            <section
                                aria-labelledby="titre-revenus"
                                className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                            >
                                <EnteteCarte
                                    id="titre-revenus"
                                    titre="Paiements reçus, par semaine"
                                    lien={routeRevenus().url}
                                    libelleLien="Revenus"
                                />
                                <BarresSemaines
                                    titre="Montant des paiements réussis, par semaine"
                                    semaines={revenus.semaines.map(
                                        (s) => s.semaine,
                                    )}
                                    valeurs={revenus.semaines.map(
                                        (s) => s.montant_gnf,
                                    )}
                                    formater={(v) =>
                                        v >= 1000
                                            ? `${formaterNombre(Math.round(v / 1000))} k`
                                            : formaterNombre(v)
                                    }
                                />
                            </section>
                        )}
                    </div>

                    <aside className="grid gap-6">
                        {impact && <CarteImpact impact={impact} />}

                        <section
                            aria-labelledby="titre-a-traiter"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <EnteteCarte
                                id="titre-a-traiter"
                                titre="Ce qui attend l’équipe"
                                lien={routeContenu().url}
                                libelleLien="Contenu"
                            />
                            <ul className="grid text-interface">
                                {[
                                    {
                                        libelle: 'Leçons à relire',
                                        nombre: contenu.en_relecture.lecons,
                                    },
                                    {
                                        libelle: 'Questions à relire',
                                        nombre: contenu.en_relecture.questions,
                                    },
                                    {
                                        libelle: 'Sujets à relire',
                                        nombre: contenu.en_relecture.annales,
                                    },
                                    {
                                        libelle: 'Imports en cours',
                                        nombre: contenu.imports_en_cours,
                                    },
                                    {
                                        libelle: 'Signalements ouverts',
                                        nombre: contenu.signalements.ouverts,
                                    },
                                ].map((l) => (
                                    <li
                                        key={l.libelle}
                                        className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
                                    >
                                        <span className="text-ink-600">
                                            {l.libelle}
                                        </span>
                                        <span
                                            className={cn(
                                                'font-semibold font-data',
                                                l.nombre === 0 &&
                                                    'text-ink-500',
                                            )}
                                        >
                                            {formaterNombre(l.nombre)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="flex items-center gap-1.5 text-meta text-ink-500">
                                <Hourglass aria-hidden className="size-3.5" />
                                {aTraiter === 0
                                    ? 'Rien en relecture.'
                                    : `${pluriel(aTraiter, 'contenu')} en relecture.`}
                                {contenu.signalements.delai_median_heures !==
                                    null &&
                                    ` Signalement traité en ${formaterNombre(contenu.signalements.delai_median_heures)} h (médiane).`}
                            </p>
                        </section>

                        <section
                            aria-labelledby="titre-examens"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-examens"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Actifs par examen, sur 7 jours
                            </h2>
                            <ul className="grid gap-2.5">
                                {activite.par_examen.map((e) => (
                                    <li
                                        key={e.cle}
                                        className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 text-interface"
                                    >
                                        <span className="font-medium">
                                            {e.libelle}
                                        </span>
                                        <span
                                            aria-hidden
                                            className="h-1.5 overflow-hidden rounded-full bg-ink-400/15"
                                        >
                                            <span
                                                className="block h-full rounded-full bg-nimba-500 dark:bg-nimba-400"
                                                style={{
                                                    width: `${e.inscrits === 0 ? 0 : (100 * e.actifs) / e.inscrits}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="text-meta text-ink-500 font-data">
                                            <span className="text-interface font-semibold text-ink-900">
                                                {formaterNombre(e.actifs)}
                                            </span>{' '}
                                            / {formaterNombre(e.inscrits)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function CarteImpact({ impact }: { impact: Impact }) {
    const assidus = impact.assidus.jauge.ecart;
    const autres = impact.autres.jauge.ecart;

    return (
        <section
            aria-labelledby="titre-impact"
            className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve"
        >
            <div className="flex items-baseline justify-between gap-2">
                <h2
                    id="titre-impact"
                    className="text-[0.9375rem] font-semibold"
                >
                    Impact sur {impact.filtres.semaines} semaines
                </h2>
                <Link
                    href={routeImpact().url}
                    prefetch
                    className="inline-flex items-center gap-1 text-aide font-medium text-nimba-300 hover:underline"
                >
                    Détail
                    <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
            </div>
            {assidus !== null && autres !== null ? (
                <>
                    <p className="text-[1.125rem] leading-snug font-normal">
                        La jauge des élèves assidus a gagné{' '}
                        <strong className="font-bold text-nimba-300">
                            {formaterEcart(assidus)} points
                        </strong>
                        , contre {formaterEcart(autres)} pour les autres.
                    </p>
                    <dl className="grid grid-cols-2 gap-3">
                        {[
                            { libelle: 'Assidus', groupe: impact.assidus },
                            { libelle: 'Autres', groupe: impact.autres },
                        ].map(({ libelle, groupe }) => (
                            <div
                                key={libelle}
                                className="grid gap-0.5 rounded-[12px] bg-white/[0.07] px-3 py-2.5"
                            >
                                <dt className="text-meta text-white/70">
                                    {libelle}
                                </dt>
                                <dd className="text-[1.125rem] font-bold font-data">
                                    {Math.round(groupe.jauge.debut ?? 0)} →{' '}
                                    {Math.round(groupe.jauge.fin ?? 0)} %
                                </dd>
                                <dd className="text-meta text-white/70">
                                    {pluriel(groupe.eleves, 'élève')}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </>
            ) : (
                <p className="text-interface text-white/80">
                    Pas encore assez de mesures : il faut {impact.methode.seuil}{' '}
                    élèves par groupe, avec deux relevés de jauge chacun. Les
                    relevés se font chaque dimanche soir.
                </p>
            )}
        </section>
    );
}
