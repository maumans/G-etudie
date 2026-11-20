import { Head, router } from '@inertiajs/react';
import { CalendarClock, FileDown, Info, ShieldCheck } from 'lucide-react';
import { CourbeSemaines, formaterEcart } from '@/components/console/graphiques';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { formaterJour } from '@/lib/dates';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { index, rapport } from '@/routes/console/impact';
import type { Evolution, GroupeImpact, Impact } from '@/types/console';

type Props = {
    impact: Impact;
    choix: {
        periodes: number[];
        examens: { cle: string; libelle: string }[];
        etablissements: { id: number; nom: string }[];
    };
};

type Filtres = {
    semaines: number;
    examen: string | null;
    etablissement: number | null;
};

const requete = (f: Filtres) => ({
    semaines: f.semaines,
    ...(f.examen ? { examen: f.examen } : {}),
    ...(f.etablissement ? { etablissement: f.etablissement } : {}),
});

/**
 * Console › Impact (PLAN M18 : « la preuve à montrer aux partenaires ») :
 * élèves assidus et autres côte à côte — jauge et examens blancs, du début
 * à la fin de la période — et le rapport PDF des mêmes chiffres (critère du
 * lot 13). Un groupe de moins de 10 élèves n'est pas chiffré.
 */
export default function ImpactPage({ impact, choix }: Props) {
    const { filtres, assidus, autres, methode } = impact;

    function filtrer(modif: Partial<Filtres>) {
        router.get(index().url, requete({ ...filtres, ...modif }), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const comparable =
        assidus.jauge.ecart !== null && autres.jauge.ecart !== null;

    return (
        <>
            <Head title="Impact" />
            <div className="grid grid-cols-1 gap-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid gap-1.5">
                        <p
                            className="text-aide font-medium text-ink-500"
                            data-capture="variable"
                        >
                            Du{' '}
                            {formaterJour(`${impact.periode.debut}T12:00:00Z`)}{' '}
                            au {formaterJour(`${impact.periode.fin}T12:00:00Z`)}
                        </p>
                        <h1 className="text-titre-ecran titre-contraste">
                            L’<strong>impact</strong> du travail régulier
                        </h1>
                    </div>
                    <Button asChild>
                        <a
                            href={rapport({ query: requete(filtres) }).url}
                            download
                        >
                            <FileDown aria-hidden />
                            Télécharger le rapport (PDF)
                        </a>
                    </Button>
                </header>

                <form
                    className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte sm:grid-cols-3"
                    onSubmit={(e) => e.preventDefault()}
                    aria-label="Filtres de l’impact"
                >
                    <Champ libelle="Période">
                        {(attributs) => (
                            <ListeDeroulante
                                {...attributs}
                                taille="compacte"
                                value={filtres.semaines}
                                onChange={(e) =>
                                    filtrer({
                                        semaines: Number(e.target.value),
                                    })
                                }
                            >
                                {choix.periodes.map((p) => (
                                    <option key={p} value={p}>
                                        {p} dernières semaines
                                    </option>
                                ))}
                            </ListeDeroulante>
                        )}
                    </Champ>
                    <Champ libelle="Examen">
                        {(attributs) => (
                            <ListeDeroulante
                                {...attributs}
                                taille="compacte"
                                value={filtres.examen ?? ''}
                                onChange={(e) =>
                                    filtrer({ examen: e.target.value || null })
                                }
                            >
                                <option value="">Tous les examens</option>
                                {choix.examens.map((e) => (
                                    <option key={e.cle} value={e.cle}>
                                        {e.libelle}
                                    </option>
                                ))}
                            </ListeDeroulante>
                        )}
                    </Champ>
                    <Champ libelle="Établissement">
                        {(attributs) => (
                            <ListeDeroulante
                                {...attributs}
                                taille="compacte"
                                value={filtres.etablissement ?? ''}
                                onChange={(e) =>
                                    filtrer({
                                        etablissement: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                            >
                                <option value="">
                                    Tous les établissements
                                </option>
                                {choix.etablissements.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.nom}
                                    </option>
                                ))}
                            </ListeDeroulante>
                        )}
                    </Champ>
                </form>

                {impact.est_exemple && <BandeauExemple />}

                <section
                    aria-labelledby="titre-verdict"
                    className="grid gap-3 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
                >
                    <h2 id="titre-verdict" className="sr-only">
                        En une phrase
                    </h2>
                    {comparable ? (
                        <>
                            <p className="max-w-3xl text-[1.25rem] leading-snug font-light sm:text-[1.5rem]">
                                En {filtres.semaines} semaines, la jauge des
                                élèves assidus a gagné{' '}
                                <strong className="font-bold text-nimba-300">
                                    {formaterEcart(
                                        assidus.jauge.ecart as number,
                                    )}{' '}
                                    points
                                </strong>
                                , contre{' '}
                                {formaterEcart(autres.jauge.ecart as number)}{' '}
                                pour les autres.
                            </p>
                            <p className="text-aide text-white/70">
                                {impact.libelles.examen} ·{' '}
                                {impact.libelles.etablissement} ·{' '}
                                {pluriel(impact.eleves, 'élève')} dans le
                                périmètre
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="max-w-3xl text-[1.25rem] leading-snug font-light">
                                Pas encore assez de mesures pour comparer les
                                élèves assidus et les autres.
                            </p>
                            <p className="text-aide text-white/70">
                                Il faut au moins {methode.seuil} élèves par
                                groupe, avec deux relevés de jauge chacun (
                                {pluriel(impact.eleves, 'élève')} dans le
                                périmètre).
                            </p>
                        </>
                    )}
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                    <CarteGroupe
                        titre="Élèves assidus"
                        groupe={assidus}
                        ton="marque"
                        seuil={methode.seuil}
                    />
                    <CarteGroupe
                        titre="Autres élèves"
                        groupe={autres}
                        ton="neutre"
                        seuil={methode.seuil}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                    <section
                        aria-labelledby="titre-courbe"
                        className="grid min-w-0 gap-4 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <h2
                            id="titre-courbe"
                            className="text-[0.9375rem] font-semibold"
                        >
                            Jauge moyenne, semaine par semaine
                        </h2>
                        <CourbeSemaines
                            titre="Jauge moyenne des élèves assidus et des autres, par semaine"
                            semaines={impact.courbe.map((c) => c.semaine)}
                            maximum={100}
                            aire={false}
                            formater={(v) =>
                                `${formaterNombre(Math.round(v))} %`
                            }
                            series={[
                                {
                                    cle: 'assidus',
                                    libelle: 'élèves assidus',
                                    valeurs: impact.courbe.map(
                                        (c) => c.assidus,
                                    ),
                                    ton: 'marque',
                                },
                                {
                                    cle: 'autres',
                                    libelle: 'autres élèves',
                                    valeurs: impact.courbe.map((c) => c.autres),
                                    ton: 'neutre',
                                },
                            ]}
                        />
                        <p className="flex items-start gap-2 text-meta text-ink-500">
                            <CalendarClock
                                aria-hidden
                                className="mt-px size-3.5 shrink-0"
                            />
                            {impact.releves.premiere_semaine
                                ? `Jauge relevée chaque dimanche soir, depuis la semaine du ${formaterJour(`${impact.releves.premiere_semaine}T12:00:00Z`)}. Une semaine de moins de ${methode.seuil} relevés par groupe n’est pas tracée.`
                                : 'Aucun relevé encore : le premier a lieu le dimanche soir qui suit la mise en ligne.'}
                        </p>
                    </section>

                    <section
                        aria-labelledby="titre-methode"
                        className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <h2
                            id="titre-methode"
                            className="flex items-center gap-2 text-[0.9375rem] font-semibold"
                        >
                            <Info
                                aria-hidden
                                className="size-4 text-nimba-600 dark:text-nimba-300"
                            />
                            Comment c’est calculé
                        </h2>
                        <dl className="grid gap-3 text-aide text-ink-600">
                            <div>
                                <dt className="font-semibold text-ink-900">
                                    Élève assidu
                                </dt>
                                <dd>
                                    Au moins {methode.seances_par_semaine}{' '}
                                    séances terminées par semaine, pendant{' '}
                                    {methode.semaines_minimum} des{' '}
                                    {filtres.semaines} semaines ou plus. Les
                                    quiz de culture ne comptent pas.
                                </dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-ink-900">
                                    Évolution
                                </dt>
                                <dd>
                                    Premier et dernier relevé de chaque élève
                                    qui en a au moins deux ; idem pour les
                                    examens blancs.
                                </dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-ink-900">
                                    Lecture
                                </dt>
                                <dd>
                                    Une association, pas une cause : un élève
                                    assidu est peut-être déjà plus motivé.
                                </dd>
                            </div>
                        </dl>
                        <p className="flex items-start gap-2 border-t pt-3 text-meta text-ink-500">
                            <ShieldCheck
                                aria-hidden
                                className="mt-px size-3.5 shrink-0 text-juste-600 dark:text-juste-400"
                            />
                            Chiffres agrégés seulement : aucun nom ni pseudo, et
                            rien sous {methode.seuil} élèves.
                        </p>
                    </section>
                </div>
            </div>
        </>
    );
}

function CarteGroupe({
    titre,
    groupe,
    ton,
    seuil,
}: {
    titre: string;
    groupe: GroupeImpact;
    ton: 'marque' | 'neutre';
    seuil: number;
}) {
    return (
        <section
            aria-label={titre}
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-5 shadow-carte',
                ton === 'marque' &&
                    'border-nimba-500/40 dark:border-nimba-400/40',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                    <span
                        aria-hidden
                        className={cn(
                            'size-2.5 rounded-[3px]',
                            ton === 'marque'
                                ? 'bg-nimba-500 dark:bg-nimba-400'
                                : 'bg-ink-500 dark:bg-ink-400',
                        )}
                    />
                    {titre}
                </h2>
                <p className="text-aide text-ink-500">
                    <span className="text-[1.25rem] font-bold text-ink-900 font-data">
                        {formaterNombre(groupe.eleves)}
                    </span>{' '}
                    élèves
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Mesure
                    libelle="Jauge de préparation"
                    evolution={groupe.jauge}
                    unite="%"
                    ecartUnite="pts"
                    seuil={seuil}
                    ton={ton}
                />
                <Mesure
                    libelle="Examens blancs"
                    evolution={groupe.examens_blancs}
                    unite="/ 20"
                    ecartUnite=""
                    seuil={seuil}
                    ton={ton}
                />
            </div>
        </section>
    );
}

function Mesure({
    libelle,
    evolution,
    unite,
    ecartUnite,
    seuil,
    ton,
}: {
    libelle: string;
    evolution: Evolution;
    unite: string;
    ecartUnite: string;
    seuil: number;
    ton: 'marque' | 'neutre';
}) {
    if (evolution.ecart === null) {
        return (
            <div className="grid content-start gap-1 rounded-[12px] bg-craie-100 p-3.5">
                <p className="text-aide font-medium text-ink-600">{libelle}</p>
                <p className="text-aide text-ink-600">
                    {pluriel(
                        evolution.mesures,
                        'élève mesuré',
                        'élèves mesurés',
                    )}{' '}
                    : sous le seuil de {seuil}, pas de chiffre.
                </p>
            </div>
        );
    }

    return (
        <div className="grid content-start gap-1.5 rounded-[12px] bg-craie-100 p-3.5">
            <p className="text-aide font-medium text-ink-600">{libelle}</p>
            <p className="flex items-baseline gap-1.5">
                <span
                    className={cn(
                        'text-[1.5rem] leading-none font-bold tracking-tight font-data',
                        ton === 'marque'
                            ? 'text-nimba-700 dark:text-nimba-300'
                            : 'text-ink-900',
                    )}
                >
                    {formaterEcart(evolution.ecart)}
                </span>
                {ecartUnite && (
                    <span className="text-aide text-ink-600">{ecartUnite}</span>
                )}
            </p>
            <p className="text-meta text-ink-600 font-data">
                de {formaterNombre(evolution.debut as number)} à{' '}
                {formaterNombre(evolution.fin as number)} {unite}
            </p>
            <p className="text-meta text-ink-600">
                {evolution.en_progres} % en progrès ·{' '}
                {pluriel(evolution.mesures, 'élève mesuré', 'élèves mesurés')}
            </p>
        </div>
    );
}
