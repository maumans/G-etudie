import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpenCheck,
    Check,
    Clock,
    GraduationCap,
    Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Marque } from '@/components/marque';
import { Button } from '@/components/ui/button';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { ProgressionSegments } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { accueil } from '@/routes/eleve';
import { update } from '@/routes/eleve/bienvenue';

type Examen = {
    id: number;
    code: string;
    court: string;
    nom: string;
    series: { id: number; code: string; nom: string }[];
};

type Props = {
    examens: Examen[];
    etablissements: { id: number; nom: string; commune: string | null }[];
    objectifs: { minutes: number; questions: number }[];
    profil: {
        examen_id: number;
        serie_id: number | null;
        etablissement_id: number | null;
        objectif_minutes: number;
    } | null;
};

type Etape = 'examen' | 'serie' | 'etablissement' | 'objectif';

/** Classe d'examen de chaque examen (DESIGN.md, noms exacts : CLAUDE.md § 5). */
const CLASSES: Record<string, string> = {
    CEE: 'En 6e année',
    BEPC: 'En 10e année',
    BAC: 'En Terminale',
};

const OBJECTIFS: Record<number, { titre: string; detail: string }> = {
    10: { titre: 'Une mise en route', detail: 'Pour les soirs chargés.' },
    15: { titre: 'Le bon rythme', detail: 'Ce que la plupart choisissent.' },
    30: { titre: 'À fond', detail: 'Quand l’examen approche.' },
};

/**
 * Parcours d'accueil (PLAN M2) : quatre écrans au plus — examen, série (Bac
 * seulement), établissement (seulement si la liste existe), objectif du
 * soir — puis **le premier exercice tout de suite**. Plein écran, une
 * question par écran, une action dominante. Le même écran sert à changer
 * d'examen depuis « Moi ». Tutoiement.
 */
export default function Bienvenue({
    examens,
    etablissements,
    objectifs,
    profil,
}: Props) {
    const { auth } = usePage().props;
    const modification = profil !== null;
    const [examenId, setExamenId] = useState<number | null>(
        profil?.examen_id ?? null,
    );
    const [serieId, setSerieId] = useState<number | null>(
        profil?.serie_id ?? null,
    );
    const [etablissementId, setEtablissementId] = useState<number | null>(
        profil?.etablissement_id ?? null,
    );
    const [objectif, setObjectif] = useState<number>(
        profil?.objectif_minutes ?? 15,
    );
    const [rang, setRang] = useState(0);
    const [envoi, setEnvoi] = useState(false);
    const [erreurs, setErreurs] = useState<Record<string, string>>({});

    const examen = examens.find((e) => e.id === examenId) ?? null;
    const etapes: Etape[] = [
        'examen',
        ...(examen && examen.series.length > 0 ? (['serie'] as const) : []),
        ...(etablissements.length > 0 ? (['etablissement'] as const) : []),
        'objectif',
    ];
    const etape = etapes[Math.min(rang, etapes.length - 1)];
    const derniere = rang >= etapes.length - 1;
    const pret =
        (etape === 'examen' && examen !== null) ||
        (etape === 'serie' && serieId !== null) ||
        etape === 'etablissement' ||
        etape === 'objectif';

    function suivant() {
        if (!derniere) {
            setRang(rang + 1);

            return;
        }

        router.put(
            update.url(),
            {
                examen: examenId,
                serie: examen && examen.series.length > 0 ? serieId : null,
                etablissement: etablissementId,
                objectif,
            },
            {
                onStart: () => setEnvoi(true),
                onError: (e) => {
                    setErreurs(e);
                    setRang(0);
                },
                onFinish: () => setEnvoi(false),
            },
        );
    }

    const serie = examen?.series.find((s) => s.id === serieId);
    const parcours = examen
        ? serie
            ? `${examen.court} ${serie.code}`
            : examen.court
        : null;

    return (
        <>
            <Head title={modification ? 'Mon examen' : 'Bienvenue'} />
            <div className="grid min-h-dvh bg-background fond-ambiance lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <div className="flex flex-col px-4 py-5 sm:px-8 lg:px-12 lg:py-8">
                    <div className="flex items-center justify-between gap-4">
                        <Marque signature={false} />
                        {modification && (
                            <Button asChild variant="ghost" taille="compacte">
                                <Link href={accueil()}>Annuler</Link>
                            </Button>
                        )}
                    </div>

                    <main className="mx-auto grid w-full max-w-[30rem] flex-1 content-center gap-7 py-8">
                        <div className="grid gap-3">
                            <ProgressionSegments
                                valeur={((rang + 1) / etapes.length) * 100}
                                segments={etapes.length}
                                libelle={`Étape ${rang + 1} sur ${etapes.length}`}
                                className="h-1"
                            />
                            <p className="text-aide font-medium text-ink-500">
                                Étape {rang + 1} sur {etapes.length}
                            </p>
                        </div>

                        <div className="grid gap-5">
                            {etape === 'examen' && (
                                <Question
                                    titre={
                                        modification ? (
                                            <>
                                                Quel examen{' '}
                                                <strong>
                                                    prépares-tu&nbsp;?
                                                </strong>
                                            </>
                                        ) : (
                                            <>
                                                Bienvenue, {auth.user?.prenom}.{' '}
                                                <strong>
                                                    Quel examen
                                                    prépares-tu&nbsp;?
                                                </strong>
                                            </>
                                        )
                                    }
                                    aide="Tes cours, tes exercices et ta jauge suivront ce choix. Tu pourras le changer plus tard."
                                    erreur={erreurs.examen}
                                >
                                    {examens.map((e) => (
                                        <Option
                                            key={e.id}
                                            icone={GraduationCap}
                                            titre={
                                                e.code === 'BAC'
                                                    ? 'Baccalauréat unique'
                                                    : e.code
                                            }
                                            detail={`${CLASSES[e.code] ?? ''} · ${e.nom}`}
                                            choisie={examenId === e.id}
                                            onChoisir={() => {
                                                setExamenId(e.id);
                                                if (e.id !== examenId) {
                                                    setSerieId(null);
                                                }
                                            }}
                                        />
                                    ))}
                                </Question>
                            )}

                            {etape === 'serie' && examen && (
                                <Question
                                    titre={
                                        <>
                                            Ta <strong>série</strong> au Bac
                                        </>
                                    }
                                    aide="Les coefficients et les matières changent d'une série à l'autre."
                                    erreur={erreurs.serie}
                                >
                                    {examen.series.map((s) => (
                                        <Option
                                            key={s.id}
                                            pastille={s.code}
                                            titre={`Bac ${s.code}`}
                                            detail={s.nom}
                                            choisie={serieId === s.id}
                                            onChoisir={() => setSerieId(s.id)}
                                        />
                                    ))}
                                </Question>
                            )}

                            {etape === 'etablissement' && (
                                <div className="grid gap-5">
                                    <EnTete
                                        titre={
                                            <>
                                                Ton{' '}
                                                <strong>établissement</strong>
                                            </>
                                        }
                                        aide="Facultatif. Il sert seulement à te relier plus tard à ta classe."
                                    />
                                    <ListeDeroulante
                                        aria-label="Établissement"
                                        value={etablissementId ?? ''}
                                        onChange={(e) =>
                                            setEtablissementId(
                                                e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                            )
                                        }
                                    >
                                        <option value="">
                                            Je préfère ne pas le dire
                                        </option>
                                        {etablissements.map((e) => (
                                            <option key={e.id} value={e.id}>
                                                {e.nom}
                                                {e.commune
                                                    ? ` · ${e.commune}`
                                                    : ''}
                                            </option>
                                        ))}
                                    </ListeDeroulante>
                                </div>
                            )}

                            {etape === 'objectif' && (
                                <Question
                                    titre={
                                        <>
                                            Combien de temps{' '}
                                            <strong>chaque soir&nbsp;?</strong>
                                        </>
                                    }
                                    aide="Ta séance du jour sera taillée pour ce temps. Un soir après l'autre, ça paie."
                                    erreur={erreurs.objectif}
                                >
                                    {objectifs.map((o) => (
                                        <Option
                                            key={o.minutes}
                                            pastille={`${o.minutes}`}
                                            titre={`${o.minutes} minutes · ${OBJECTIFS[o.minutes]?.titre ?? ''}`}
                                            detail={`${o.questions} questions. ${OBJECTIFS[o.minutes]?.detail ?? ''}`}
                                            choisie={objectif === o.minutes}
                                            onChoisir={() =>
                                                setObjectif(o.minutes)
                                            }
                                        />
                                    ))}
                                </Question>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {rang > 0 && (
                                <Button
                                    variant="outline"
                                    taille="grande"
                                    onClick={() => setRang(rang - 1)}
                                    aria-label="Étape précédente"
                                    className="px-3"
                                >
                                    <ArrowLeft aria-hidden />
                                </Button>
                            )}
                            <Button
                                taille="grande"
                                className="flex-1"
                                disabled={!pret || envoi}
                                onClick={suivant}
                            >
                                {envoi && <Spinner />}
                                {!derniere
                                    ? 'Continuer'
                                    : modification
                                      ? 'Enregistrer'
                                      : 'Faire mon premier exercice'}
                            </Button>
                        </div>
                    </main>

                    <p className="text-center text-meta text-ink-500 lg:text-left">
                        Rien d'autre à remplir : pas de date de naissance, pas
                        de photo.
                    </p>
                </div>

                <Recapitulatif
                    parcours={parcours}
                    objectif={objectif}
                    questions={
                        objectifs.find((o) => o.minutes === objectif)
                            ?.questions ?? 8
                    }
                />
            </div>
        </>
    );
}

function EnTete({ titre, aide }: { titre: React.ReactNode; aide: string }) {
    return (
        <div className="grid gap-2">
            <h1 className="text-[1.75rem] leading-tight titre-contraste text-balance">
                {titre}
            </h1>
            <p className="text-ink-600">{aide}</p>
        </div>
    );
}

function Question({
    titre,
    aide,
    erreur,
    children,
}: {
    titre: React.ReactNode;
    aide: string;
    erreur?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-5">
            <EnTete titre={titre} aide={aide} />
            <div role="radiogroup" aria-label="Choix" className="grid gap-2.5">
                {children}
            </div>
            {erreur && (
                <p
                    role="alert"
                    className="text-aide font-medium text-faux-600 dark:text-faux-400"
                >
                    {erreur}
                </p>
            )}
        </div>
    );
}

function Option({
    icone: Icone,
    pastille,
    titre,
    detail,
    choisie,
    onChoisir,
}: {
    icone?: LucideIcon;
    pastille?: string;
    titre: string;
    detail: string;
    choisie: boolean;
    onChoisir: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={choisie}
            onClick={onChoisir}
            className={cn(
                'flex min-h-16 w-full items-center gap-3.5 rounded-carte border bg-card px-4 py-3 text-left shadow-xs transition-[border-color,background-color,box-shadow] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                choisie
                    ? 'border-nimba-600 bg-nimba-600/[0.06] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                    : 'border-contour hover:border-ink-400',
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px] text-aide font-semibold font-data transition-colors',
                    choisie
                        ? 'bg-nimba-600 text-white dark:bg-nimba-300 dark:text-[#110e0b]'
                        : 'bg-craie-100 text-ink-600 dark:bg-white/[0.06]',
                )}
            >
                {Icone ? <Icone className="size-[18px]" /> : pastille}
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-semibold text-ink-900">{titre}</span>
                <span className="text-aide text-ink-600">{detail}</span>
            </span>
            <span
                aria-hidden
                className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    choisie
                        ? 'border-nimba-600 bg-nimba-600 text-white dark:border-nimba-300 dark:bg-nimba-300 dark:text-[#110e0b]'
                        : 'border-ink-400',
                )}
            >
                {choisie && <Check className="size-3" strokeWidth={3} />}
            </span>
        </button>
    );
}

/**
 * Le panneau de droite (≥ 1024 px) : ce que l'élève va trouver, mis à jour
 * à chaque choix. Décor : il redit les choix, caché aux lecteurs d'écran.
 */
function Recapitulatif({
    parcours,
    objectif,
    questions,
}: {
    parcours: string | null;
    objectif: number;
    questions: number;
}) {
    const lignes: { icone: LucideIcon; titre: string; detail: string }[] = [
        {
            icone: GraduationCap,
            titre: parcours ? `Je prépare le ${parcours}` : 'Ton examen',
            detail: parcours
                ? 'Cours, exercices et jauge de ton examen.'
                : 'Choisis-le à gauche.',
        },
        {
            icone: Clock,
            titre: `${objectif} minutes chaque soir`,
            detail: `Une séance de ${questions} questions choisies pour toi.`,
        },
        {
            icone: Target,
            titre: 'Ta jauge de préparation',
            detail: 'Elle se remplit à chaque exercice réussi.',
        },
    ];

    return (
        <div
            aria-hidden
            className="relative m-3 hidden overflow-hidden rounded-panneau surface-marque text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
        >
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] [background-size:22px_22px]" />
            <p className="relative max-w-md text-[2.25rem] leading-[1.08] titre-contraste text-balance">
                Un soir, quinze minutes,{' '}
                <strong>et tu sais où tu en es.</strong>
            </p>
            <ul className="relative mx-auto grid w-full max-w-sm gap-3">
                {lignes.map(({ icone: Icone, titre, detail }, rang) => (
                    <li
                        key={titre}
                        className={cn(
                            'flex items-center gap-3 rounded-2xl p-4',
                            rang === 1
                                ? 'clair ml-8 bg-white text-ink-900 shadow-flottant'
                                : 'bg-white/10 ring-1 ring-white/15 backdrop-blur-sm',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                rang === 1
                                    ? 'bg-nimba-600 text-white'
                                    : 'bg-white text-nimba-700',
                            )}
                        >
                            <Icone className="size-5" />
                        </span>
                        <span className="grid gap-0.5">
                            <span className="text-interface font-medium">
                                {titre}
                            </span>
                            <span
                                className={cn(
                                    'text-aide',
                                    rang === 1
                                        ? 'text-ink-600'
                                        : 'text-white/70',
                                )}
                            >
                                {detail}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="relative flex items-center gap-2 text-aide text-white/65">
                <BookOpenCheck className="size-4" />
                Puis ton premier exercice, tout de suite.
            </p>
        </div>
    );
}
