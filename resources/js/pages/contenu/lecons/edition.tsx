import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleAlert,
    CircleCheck,
    Eye,
    LoaderCircle,
    MessageSquareWarning,
    PenLine,
    RefreshCw,
    Send,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { BadgeStatut } from '@/components/contenu/statut-lecon';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { EditeurLecon } from '@/components/editeur/editeur-lecon';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Spinner } from '@/components/ui/spinner';
import { erreurBlocs, resumeBlocs } from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import { formaterHeure, formaterJourHeure } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import { index, show, soumettre, update } from '@/routes/contenu/lecons';
import type { LeconResume } from '@/types';

type Props = {
    lecon: LeconResume & { blocs: DocumentBlocs; revision: number };
    renvoi: {
        commentaire: string | null;
        par: string | null;
        le: string | null;
    } | null;
};

type Etat =
    | { cle: 'enregistre'; le: Date | null }
    | { cle: 'modifie' }
    | { cle: 'enregistrement' }
    | { cle: 'conflit'; message: string }
    | { cle: 'erreur'; message: string };

/** Délai entre la dernière frappe et l'enregistrement automatique. */
const DELAI_ENREGISTREMENT_MS = 2500;

/**
 * Éditeur d'une leçon (PLAN M17) : à gauche la rédaction, à droite la leçon
 * « comme l'élève la verra » (même composant que l'espace élève). Le
 * brouillon s'enregistre seul ; deux onglets ne s'écrasent jamais (verrou de
 * révision côté serveur).
 */
export default function Edition({ lecon, renvoi }: Props) {
    const confirmer = useConfirmer();
    const [titre, setTitre] = useState(lecon.titre);
    const [doc, setDoc] = useState<DocumentBlocs>(lecon.blocs);
    const [etat, setEtat] = useState<Etat>({ cle: 'enregistre', le: null });
    const [onglet, setOnglet] = useState<'rediger' | 'apercu'>('rediger');
    const [envoi, setEnvoi] = useState(false);

    // Ce que l'enregistrement lit au moment où il part (jamais une valeur
    // figée dans une fermeture plus ancienne).
    const courant = useRef({ titre, doc, revision: lecon.revision });
    const enCours = useRef(false);
    const sale = useRef(false);

    useEffect(() => {
        courant.current = { titre, doc, revision: lecon.revision };
    }, [titre, doc, lecon.revision]);

    function modifier(changement: { titre?: string; doc?: DocumentBlocs }) {
        // Une mise à jour de l'éditeur qui ne change rien (un clic, une
        // sélection, une formule rééditée à l'identique) n'est pas une
        // modification : sinon la leçon serait réenregistrée, sa révision
        // avancerait et elle remonterait dans les listes.
        const titreChange =
            changement.titre !== undefined &&
            changement.titre !== courant.current.titre;
        const docChange =
            changement.doc !== undefined &&
            JSON.stringify(changement.doc) !==
                JSON.stringify(courant.current.doc);

        if (!titreChange && !docChange) {
            return;
        }

        if (titreChange) {
            setTitre(changement.titre as string);
            courant.current = {
                ...courant.current,
                titre: changement.titre as string,
            };
        }

        if (docChange) {
            setDoc(changement.doc as DocumentBlocs);
            courant.current = {
                ...courant.current,
                doc: changement.doc as DocumentBlocs,
            };
        }

        sale.current = true;
        setEtat((e) => (e.cle === 'conflit' ? e : { cle: 'modifie' }));
    }

    function enregistrer(puis?: () => void) {
        if (enCours.current) {
            return;
        }

        const { titre: t, doc: d, revision } = courant.current;
        const erreur = erreurBlocs(d);

        if (t.trim() === '' || erreur !== null) {
            setEtat({
                cle: 'erreur',
                message: erreur ?? 'La leçon a besoin d’un titre.',
            });

            return;
        }

        enCours.current = true;
        sale.current = false;
        setEtat({ cle: 'enregistrement' });

        router.put(
            update(lecon.uuid).url,
            { titre: t.trim(), blocs: d, revision },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setEtat(
                        sale.current
                            ? { cle: 'modifie' }
                            : { cle: 'enregistre', le: new Date() },
                    );
                    puis?.();
                },
                onError: (erreurs) => {
                    sale.current = true;
                    setEtat(
                        erreurs.revision
                            ? { cle: 'conflit', message: erreurs.revision }
                            : {
                                  cle: 'erreur',
                                  message:
                                      Object.values(erreurs)[0] ??
                                      'L’enregistrement a échoué.',
                              },
                    );
                },
                onFinish: () => {
                    enCours.current = false;
                },
            },
        );
    }

    // Enregistrement automatique, 2,5 s après la dernière modification.
    useEffect(() => {
        if (etat.cle !== 'modifie') {
            return;
        }

        const minuteur = setTimeout(
            () => enregistrer(),
            DELAI_ENREGISTREMENT_MS,
        );

        return () => clearTimeout(minuteur);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [etat, titre, doc]);

    // Ctrl+S ; et ne jamais quitter la page en perdant une modification.
    useEffect(() => {
        const clavier = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                enregistrer();
            }
        };
        const avantDeQuitter = (e: BeforeUnloadEvent) => {
            if (sale.current || enCours.current) {
                e.preventDefault();
            }
        };
        const avantVisite = router.on('before', (evenement) => {
            const visite = evenement.detail.visit;

            if (visite.method !== 'get' || visite.prefetch || !sale.current) {
                return;
            }

            // Enregistrer d'abord, puis repartir vers la même adresse.
            evenement.preventDefault();
            enregistrer(() => router.visit(visite.url));
        });

        window.addEventListener('keydown', clavier);
        window.addEventListener('beforeunload', avantDeQuitter);

        return () => {
            window.removeEventListener('keydown', clavier);
            window.removeEventListener('beforeunload', avantDeQuitter);
            avantVisite();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function envoyerEnRelecture() {
        const accepte = await confirmer({
            titre: 'Envoyer cette leçon en relecture ?',
            message:
                'Un autre enseignant la relira avant publication. En attendant, elle ne se modifie plus, sauf si vous la reprenez.',
            action: 'Envoyer en relecture',
        });

        if (!accepte) {
            return;
        }

        const partir = () => {
            setEnvoi(true);
            router.post(
                soumettre(lecon.uuid).url,
                {},
                {
                    onFinish: () => setEnvoi(false),
                },
            );
        };

        if (sale.current) {
            enregistrer(partir);
        } else {
            partir();
        }
    }

    const resume = resumeBlocs(doc);
    const vide = (doc.content ?? []).every(
        (bloc) => bloc.type === 'paragraph' && !bloc.content?.length,
    );

    return (
        <div className="grid gap-5">
            <Head title={`${titre || 'Sans titre'} · Édition`} />

            <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2"
                    >
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Les leçons
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <IndicateurEnregistrement etat={etat} />
                        <Button asChild variant="outline" taille="compacte">
                            <Link href={show(lecon.uuid)}>
                                <Eye aria-hidden />
                                Fiche
                            </Link>
                        </Button>
                        <Button
                            taille="compacte"
                            onClick={() => void envoyerEnRelecture()}
                            disabled={envoi || vide || etat.cle === 'conflit'}
                        >
                            {envoi ? <Spinner /> : <Send aria-hidden />}
                            Envoyer en relecture
                        </Button>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                    <TuileMatiere
                        teinte={lecon.matiere.teinte}
                        taille="grande"
                    />
                    <div className="grid min-w-0 gap-0.5">
                        <p className="truncate text-aide text-ink-500">
                            {lecon.matiere.nom} · {lecon.classe} ·{' '}
                            {lecon.chapitre} ›{' '}
                            <span className="font-medium text-ink-900">
                                {lecon.notion}
                            </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <BadgeStatut statut={lecon.statut} />
                            {lecon.publiee && (
                                <span className="text-meta text-ink-500">
                                    La version publiée reste en ligne jusqu’à la
                                    prochaine publication.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {lecon.est_exemple && <BandeauExemple />}

            {renvoi && (
                <div className="flex gap-3 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] p-4 dark:bg-indice-400/[0.06]">
                    <MessageSquareWarning
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-indice-600 dark:text-indice-400"
                    />
                    <div className="grid gap-1">
                        <p className="font-semibold">
                            Renvoyée par {renvoi.par}
                            {renvoi.le && (
                                <span
                                    className="font-normal text-ink-500"
                                    data-capture="variable"
                                >
                                    {' '}
                                    · {formaterJourHeure(renvoi.le)}
                                </span>
                            )}
                        </p>
                        <p className="whitespace-pre-line text-ink-600">
                            {renvoi.commentaire}
                        </p>
                    </div>
                </div>
            )}

            {etat.cle === 'conflit' && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-carte border border-faux-600/35 bg-faux-600/[0.06] p-4 sm:flex-row sm:items-center dark:border-faux-400/35"
                >
                    <CircleAlert
                        aria-hidden
                        className="hidden size-5 shrink-0 text-faux-600 sm:block dark:text-faux-400"
                    />
                    <p className="flex-1 text-ink-600">{etat.message}</p>
                    <Button
                        variant="outline"
                        taille="compacte"
                        onClick={() => {
                            // Rechargement complet : l'éditeur repart du
                            // brouillon enregistré par l'autre onglet.
                            sale.current = false;
                            window.location.reload();
                        }}
                    >
                        <RefreshCw aria-hidden />
                        Recharger
                    </Button>
                </div>
            )}

            {/* Mobile et tablette : rédaction et aperçu en onglets. */}
            <div
                role="tablist"
                aria-label="Affichage"
                className="grid grid-cols-2 gap-0.5 rounded-controle bg-craie-100 p-1 lg:hidden"
            >
                {(
                    [
                        ['rediger', 'Rédiger', PenLine],
                        ['apercu', 'Aperçu élève', Eye],
                    ] as const
                ).map(([cle, libelle, Icone]) => (
                    <button
                        key={cle}
                        type="button"
                        role="tab"
                        aria-selected={onglet === cle}
                        onClick={() => setOnglet(cle)}
                        className={cn(
                            'flex h-9 items-center justify-center gap-2 rounded-[7px] text-interface font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring',
                            onglet === cle
                                ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-ink-600',
                        )}
                    >
                        <Icone aria-hidden className="size-4" />
                        {libelle}
                    </button>
                ))}
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <section
                    aria-label="Rédaction"
                    className={cn(
                        'min-w-0 rounded-carte border bg-card shadow-carte',
                        onglet !== 'rediger' && 'hidden lg:block',
                    )}
                >
                    <div className="border-b px-5 pt-4 pb-3">
                        <label htmlFor="titre-lecon" className="sr-only">
                            Titre de la leçon
                        </label>
                        <input
                            id="titre-lecon"
                            value={titre}
                            onChange={(e) =>
                                modifier({ titre: e.target.value })
                            }
                            maxLength={160}
                            placeholder="Titre de la leçon"
                            className="w-full bg-transparent text-[1.25rem] leading-tight font-semibold tracking-tight text-ink-900 outline-none placeholder:text-ink-500 sm:text-[1.5rem]"
                        />
                    </div>
                    <EditeurLecon
                        initial={lecon.blocs}
                        libelle="Contenu de la leçon"
                        onChange={(nouveau) => modifier({ doc: nouveau })}
                    />
                    <p className="border-t px-5 py-2.5 text-meta text-ink-500">
                        {pluriel(resume.mots, 'mot')} ·{' '}
                        {pluriel(resume.formules, 'formule')} ·{' '}
                        {pluriel(resume.encadres, 'encadré')}
                    </p>
                </section>

                <section
                    aria-labelledby="titre-apercu"
                    className={cn(
                        'min-w-0 rounded-carte border bg-background shadow-carte lg:sticky lg:top-6',
                        onglet !== 'apercu' && 'hidden lg:block',
                    )}
                >
                    <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                        <h2
                            id="titre-apercu"
                            className="flex items-center gap-2 text-aide font-semibold text-ink-600"
                        >
                            <Eye aria-hidden className="size-4" />
                            Comme l’élève la verra
                        </h2>
                    </div>
                    <article className="grid gap-4 px-5 py-5">
                        <div className="flex items-center gap-2.5">
                            <TuileMatiere teinte={lecon.matiere.teinte} />
                            <span className="text-aide font-medium text-ink-600">
                                {lecon.matiere.nom} · {lecon.notion}
                            </span>
                        </div>
                        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight">
                            {titre || 'Sans titre'}
                        </h1>
                        {vide ? (
                            <p className="text-ink-500">
                                La leçon apparaîtra ici au fil de la rédaction.
                            </p>
                        ) : (
                            <ContenuBlocs doc={doc} />
                        )}
                    </article>
                </section>
            </div>
        </div>
    );
}

function IndicateurEnregistrement({ etat }: { etat: Etat }) {
    const contenu = {
        enregistre: {
            icone: <CircleCheck aria-hidden className="size-4" />,
            texte:
                etat.cle === 'enregistre' && etat.le
                    ? `Enregistré à ${formaterHeure(etat.le)}`
                    : 'Brouillon enregistré',
            classe: 'text-ink-500',
        },
        modifie: {
            icone: <PenLine aria-hidden className="size-4" />,
            texte: 'Modifications en cours',
            classe: 'text-ink-500',
        },
        enregistrement: {
            icone: <LoaderCircle aria-hidden className="size-4 animate-spin" />,
            texte: 'Enregistrement…',
            classe: 'text-ink-500',
        },
        conflit: {
            icone: <CircleAlert aria-hidden className="size-4" />,
            texte: 'Non enregistré',
            classe: 'text-faux-600 dark:text-faux-400',
        },
        erreur: {
            icone: <CircleAlert aria-hidden className="size-4" />,
            texte: etat.cle === 'erreur' ? etat.message : '',
            classe: 'text-faux-600 dark:text-faux-400',
        },
    }[etat.cle];

    return (
        <p
            role="status"
            aria-live="polite"
            data-capture="variable"
            className={cn(
                'flex max-w-xs items-center gap-1.5 text-aide',
                contenu.classe,
            )}
        >
            {contenu.icone}
            <span className="truncate">{contenu.texte}</span>
        </p>
    );
}
