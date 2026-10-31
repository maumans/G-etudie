import type { RequestPayload } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CircleAlert,
    Eye,
    Lightbulb,
    ListOrdered,
    MessageSquareWarning,
    PenLine,
    Plus,
    RefreshCw,
    RotateCcw,
    Send,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IndicateurEnregistrement } from '@/components/contenu/indicateur-enregistrement';
import type { EtatEnregistrement } from '@/components/contenu/indicateur-enregistrement';
import { Section } from '@/components/contenu/section';
import { BadgeStatut } from '@/components/contenu/statut-lecon';
import { EditeurLecon } from '@/components/editeur/editeur-lecon';
import { EnteteQuestion } from '@/components/questions/commun';
import { ExerciceQuestion } from '@/components/questions/exercice-question';
import {
    FormulaireReponse,
    vides,
} from '@/components/questions/formulaire-reponse';
import { TYPES } from '@/components/questions/types-question';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { documentVide, erreurBlocs } from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type {
    DonneesQuestion,
    EtapeCorrige,
    QuestionEleve,
    TypeQuestion,
} from '@/lib/contenu/questions';
import { formaterJourHeure } from '@/lib/dates';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { index, show, soumettre, update } from '@/routes/contenu/questions';
import type { QuestionResume } from './index';

type Props = {
    question: QuestionResume & {
        enonce: DocumentBlocs;
        donnees: DonneesQuestion;
        attendue: Record<string, unknown>;
        indices: DocumentBlocs[];
        corrige: EtapeCorrige[];
        difficulte: number;
        revision: number;
    };
    a_completer: string | null;
    renvoi: {
        commentaire: string | null;
        par: string | null;
        le: string | null;
    } | null;
    limites: { indices: number; etapes: number };
};

type Brouillon = {
    enonce: DocumentBlocs;
    donnees: DonneesQuestion;
    attendue: Record<string, unknown>;
    indices: DocumentBlocs[];
    corrige: EtapeCorrige[];
    difficulte: number;
};

/** Délai entre la dernière frappe et l'enregistrement automatique. */
const DELAI_ENREGISTREMENT_MS = 2500;

const DIFFICULTES = [
    'Très facile',
    'Facile',
    'Moyenne',
    'Difficile',
    'Très difficile',
];

/** Une question neuve a déjà sa forme : quatre propositions, trois éléments… */
function donneesDeDepart(
    type: TypeQuestion,
    donnees: DonneesQuestion,
): DonneesQuestion {
    if (Object.keys(donnees).length > 0) {
        return donnees;
    }

    switch (type) {
        case 'qcm_une':
        case 'qcm_plusieurs':
            return {
                options: ['a', 'b', 'c', 'd'].map((id) => ({ id, texte: '' })),
            };
        case 'appariement':
            return { gauche: vides('g', 3), droite: vides('d', 3) };
        case 'ordre':
            return { elements: vides('e', 3) };
        case 'ouverte':
            return { bareme: [{ id: 'c1', critere: '', points: 1 }] };
        default:
            return donnees;
    }
}

/**
 * L'écran de saisie d'une question (PLAN M5, M17). À gauche : l'énoncé, la
 * réponse (formulaire propre au type), les indices, le corrigé pas à pas,
 * la difficulté. À droite : la question **jouable**, comme l'élève la
 * recevra (mêmes composants que la séance ; rien n'est envoyé). Le
 * brouillon s'enregistre seul ; deux onglets ne s'écrasent pas (verrou de
 * révision).
 */
export default function Edition({
    question,
    a_completer,
    renvoi,
    limites,
}: Props) {
    const confirmer = useConfirmer();
    const [brouillon, setBrouillon] = useState<Brouillon>(() => ({
        enonce: question.enonce,
        donnees: donneesDeDepart(question.type, question.donnees),
        attendue: question.attendue,
        indices: question.indices,
        corrige:
            question.corrige.length > 0
                ? question.corrige
                : [{ titre: '', blocs: documentVide() }],
        difficulte: question.difficulte,
    }));
    const [etat, setEtat] = useState<EtatEnregistrement>({
        cle: 'enregistre',
        le: null,
    });
    const [onglet, setOnglet] = useState<'rediger' | 'apercu'>('rediger');
    const [envoi, setEnvoi] = useState(false);
    const [partie, setPartie] = useState(0);
    // Clés stables des indices et étapes : un éditeur garde son contenu
    // quand on en retire un autre.
    const cles = useRef({
        indices: question.indices.map((_, i) => i),
        etapes: [0],
        suivante: 100,
    });

    const courant = useRef({ brouillon, revision: question.revision });
    const enCours = useRef(false);
    const sale = useRef(false);

    useEffect(() => {
        courant.current = {
            brouillon: courant.current.brouillon,
            revision: question.revision,
        };
    }, [question.revision]);

    if (cles.current.etapes.length !== brouillon.corrige.length) {
        cles.current.etapes = brouillon.corrige.map(
            (_, i) => cles.current.etapes[i] ?? cles.current.suivante++,
        );
    }

    function modifier(changement: Partial<Brouillon>) {
        const suivant = { ...courant.current.brouillon, ...changement };

        if (
            JSON.stringify(suivant) ===
            JSON.stringify(courant.current.brouillon)
        ) {
            return;
        }

        courant.current = { ...courant.current, brouillon: suivant };
        setBrouillon(suivant);
        sale.current = true;
        setEtat((e) => (e.cle === 'conflit' ? e : { cle: 'modifie' }));
    }

    function enregistrer(puis?: () => void) {
        if (enCours.current) {
            return;
        }

        const { brouillon: b, revision } = courant.current;
        const erreur = erreurBlocs(b.enonce);

        if (erreur !== null) {
            setEtat({ cle: 'erreur', message: erreur });

            return;
        }

        enCours.current = true;
        sale.current = false;
        setEtat({ cle: 'enregistrement' });

        router.put(
            update(question.uuid).url,
            { ...b, revision } as unknown as RequestPayload,
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
    }, [etat, brouillon]);

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
            titre: 'Envoyer cette question en relecture ?',
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
                soumettre(question.uuid).url,
                {},
                { onFinish: () => setEnvoi(false) },
            );
        };

        if (sale.current) {
            enregistrer(partir);
        } else {
            partir();
        }
    }

    const type = TYPES[question.type];
    const matiere = MATIERES[question.matiere.teinte];
    // L'aperçu : la question telle que l'élève la recevra (sans mélange :
    // le serveur mélange à la publication).
    const apercu: QuestionEleve = {
        uuid: question.uuid,
        version: 0,
        type: question.type,
        enonce: brouillon.enonce,
        donnees: brouillon.donnees,
        attendue: brouillon.attendue,
        indices: brouillon.indices.filter((i) => (i.content ?? []).length > 0),
        corrige: brouillon.corrige.filter(
            (e) => (e.blocs.content ?? []).length > 0,
        ),
        est_exemple: question.est_exemple,
        matiere: question.matiere.teinte,
        matiere_nom: question.matiere.nom,
        notion: question.notion,
    };

    return (
        <div className="grid gap-5">
            <Head title="Question · Édition" />

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
                            Les questions
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <IndicateurEnregistrement etat={etat} />
                        <Button asChild variant="outline" taille="compacte">
                            <Link href={show(question.uuid)}>
                                <Eye aria-hidden />
                                Fiche
                            </Link>
                        </Button>
                        <Button
                            taille="compacte"
                            onClick={() => void envoyerEnRelecture()}
                            disabled={
                                envoi ||
                                etat.cle === 'conflit' ||
                                (a_completer !== null && !sale.current)
                            }
                        >
                            {envoi ? <Spinner /> : <Send aria-hidden />}
                            Envoyer en relecture
                        </Button>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                            matiere?.tuile,
                        )}
                    >
                        <type.icone className="size-[18px]" />
                    </span>
                    <div className="grid min-w-0 gap-0.5">
                        <p className="truncate text-aide text-ink-500">
                            {question.matiere.nom} · {question.classe} ·{' '}
                            {question.chapitre} ›{' '}
                            <span className="font-medium text-ink-900">
                                {question.notion}
                            </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-interface font-semibold">
                                {type.libelle}
                            </span>
                            <BadgeStatut statut={question.statut} />
                            {question.publiee && (
                                <span className="text-meta text-ink-500">
                                    La version publiée reste proposée jusqu’à la
                                    prochaine publication.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {question.est_exemple && <BandeauExemple />}

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
                            sale.current = false;
                            window.location.reload();
                        }}
                    >
                        <RefreshCw aria-hidden />
                        Recharger
                    </Button>
                </div>
            )}

            {/* Mobile et tablette : saisie et aperçu en onglets. */}
            <div
                role="tablist"
                aria-label="Affichage"
                className="grid grid-cols-2 gap-0.5 rounded-controle bg-craie-100 p-1 lg:hidden"
            >
                {(
                    [
                        ['rediger', 'Saisir', PenLine],
                        ['apercu', 'Essayer', Eye],
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
                <div
                    className={cn(
                        'grid min-w-0 gap-5',
                        onglet !== 'rediger' && 'hidden lg:grid',
                    )}
                >
                    <Section titre="L’énoncé" contenuClassName="px-0 pb-0">
                        <div className="border-t">
                            <EditeurLecon
                                compact
                                initial={question.enonce}
                                libelle="Énoncé de la question"
                                placeholder="Écrivez l’énoncé : consigne, données, formules…"
                                onChange={(enonce) => modifier({ enonce })}
                            />
                        </div>
                    </Section>

                    <Section titre="La réponse" description={type.usage}>
                        <FormulaireReponse
                            type={question.type}
                            donnees={brouillon.donnees}
                            attendue={brouillon.attendue}
                            changer={(donnees, attendue) =>
                                modifier({ donnees, attendue })
                            }
                        />
                    </Section>

                    <Section
                        titre={
                            <span className="flex items-center gap-2">
                                <Lightbulb
                                    aria-hidden
                                    className="size-4 text-indice-600 dark:text-indice-400"
                                />
                                Les indices
                            </span>
                        }
                        description={`${limites.indices} au plus, du plus léger au plus fort. L’élève les ouvre un par un ; ils ne lui retirent rien.`}
                        contenuClassName="grid gap-3"
                    >
                        {brouillon.indices.map((indice, rang) => (
                            <div
                                key={cles.current.indices[rang] ?? rang}
                                className="overflow-hidden rounded-controle border border-indice-400/45"
                            >
                                <div className="flex items-center justify-between gap-2 bg-indice-400/[0.10] px-3 py-1.5 dark:bg-indice-400/[0.08]">
                                    <span className="text-aide font-semibold text-indice-700 dark:text-indice-400">
                                        Indice {rang + 1}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        ton="danger"
                                        taille="icone-compacte"
                                        aria-label={`Retirer l’indice ${rang + 1}`}
                                        onClick={() => {
                                            cles.current.indices =
                                                cles.current.indices.filter(
                                                    (_, i) => i !== rang,
                                                );
                                            modifier({
                                                indices:
                                                    brouillon.indices.filter(
                                                        (_, i) => i !== rang,
                                                    ),
                                            });
                                        }}
                                    >
                                        <Trash2 aria-hidden />
                                    </Button>
                                </div>
                                <EditeurLecon
                                    compact
                                    initial={indice}
                                    libelle={`Indice ${rang + 1}`}
                                    placeholder="Une piste, sans donner la réponse."
                                    onChange={(doc) =>
                                        modifier({
                                            indices:
                                                courant.current.brouillon.indices.map(
                                                    (x, i) =>
                                                        i === rang ? doc : x,
                                                ),
                                        })
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            taille="compacte"
                            className="w-fit"
                            disabled={
                                brouillon.indices.length >= limites.indices
                            }
                            onClick={() => {
                                cles.current.indices = [
                                    ...cles.current.indices,
                                    cles.current.suivante++,
                                ];
                                modifier({
                                    indices: [
                                        ...brouillon.indices,
                                        documentVide(),
                                    ],
                                });
                            }}
                        >
                            <Plus aria-hidden />
                            Ajouter un indice
                        </Button>
                    </Section>

                    <Section
                        titre={
                            <span className="flex items-center gap-2">
                                <ListOrdered aria-hidden className="size-4" />
                                Le corrigé pas à pas
                            </span>
                        }
                        description="Une étape par idée. L’élève les découvre une à une après avoir répondu."
                        contenuClassName="grid gap-3"
                    >
                        {brouillon.corrige.map((etape, rang) => (
                            <div
                                key={cles.current.etapes[rang]}
                                className="overflow-hidden rounded-controle border border-contour"
                            >
                                <div className="flex items-center gap-2 border-b bg-craie-100/60 px-3 py-1.5 dark:bg-white/[0.03]">
                                    <span
                                        aria-hidden
                                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                                    >
                                        {rang + 1}
                                    </span>
                                    <Input
                                        taille="compacte"
                                        aria-label={`Titre de l’étape ${rang + 1}`}
                                        value={etape.titre}
                                        maxLength={120}
                                        placeholder="Titre de l’étape (facultatif)"
                                        onChange={(e) =>
                                            modifier({
                                                corrige:
                                                    courant.current.brouillon.corrige.map(
                                                        (x, i) =>
                                                            i === rang
                                                                ? {
                                                                      ...x,
                                                                      titre: e
                                                                          .target
                                                                          .value,
                                                                  }
                                                                : x,
                                                    ),
                                            })
                                        }
                                        className="h-8 min-w-0 flex-1 border-transparent bg-transparent shadow-none dark:bg-transparent"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Monter l’étape ${rang + 1}`}
                                        disabled={rang === 0}
                                        onClick={() => {
                                            const c = [...brouillon.corrige];
                                            const k = cles.current.etapes;
                                            [c[rang - 1], c[rang]] = [
                                                c[rang],
                                                c[rang - 1],
                                            ];
                                            [k[rang - 1], k[rang]] = [
                                                k[rang],
                                                k[rang - 1],
                                            ];
                                            modifier({ corrige: c });
                                        }}
                                    >
                                        <ArrowUp aria-hidden />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Descendre l’étape ${rang + 1}`}
                                        disabled={
                                            rang ===
                                            brouillon.corrige.length - 1
                                        }
                                        onClick={() => {
                                            const c = [...brouillon.corrige];
                                            const k = cles.current.etapes;
                                            [c[rang + 1], c[rang]] = [
                                                c[rang],
                                                c[rang + 1],
                                            ];
                                            [k[rang + 1], k[rang]] = [
                                                k[rang],
                                                k[rang + 1],
                                            ];
                                            modifier({ corrige: c });
                                        }}
                                    >
                                        <ArrowDown aria-hidden />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        ton="danger"
                                        taille="icone-compacte"
                                        aria-label={`Retirer l’étape ${rang + 1}`}
                                        disabled={brouillon.corrige.length <= 1}
                                        onClick={() => {
                                            cles.current.etapes =
                                                cles.current.etapes.filter(
                                                    (_, i) => i !== rang,
                                                );
                                            modifier({
                                                corrige:
                                                    brouillon.corrige.filter(
                                                        (_, i) => i !== rang,
                                                    ),
                                            });
                                        }}
                                    >
                                        <Trash2 aria-hidden />
                                    </Button>
                                </div>
                                <EditeurLecon
                                    compact
                                    initial={etape.blocs}
                                    libelle={`Étape ${rang + 1} du corrigé`}
                                    placeholder={
                                        question.type === 'ouverte' &&
                                        rang === 0
                                            ? 'La rédaction modèle, ou sa première partie.'
                                            : 'Ce qu’on fait, et pourquoi.'
                                    }
                                    onChange={(blocs) =>
                                        modifier({
                                            corrige:
                                                courant.current.brouillon.corrige.map(
                                                    (x, i) =>
                                                        i === rang
                                                            ? { ...x, blocs }
                                                            : x,
                                                ),
                                        })
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            taille="compacte"
                            className="w-fit"
                            disabled={
                                brouillon.corrige.length >= limites.etapes
                            }
                            onClick={() =>
                                modifier({
                                    corrige: [
                                        ...brouillon.corrige,
                                        { titre: '', blocs: documentVide() },
                                    ],
                                })
                            }
                        >
                            <Plus aria-hidden />
                            Ajouter une étape
                        </Button>
                    </Section>

                    <Section
                        titre="La difficulté"
                        description="Pour doser la séance du jour : de 1, très facile, à 5, très difficile."
                    >
                        <div
                            role="radiogroup"
                            aria-label="Difficulté"
                            className="grid max-w-md grid-cols-5 gap-1.5"
                        >
                            {DIFFICULTES.map((libelle, rang) => {
                                const niveau = rang + 1;
                                const actif = brouillon.difficulte === niveau;

                                return (
                                    <button
                                        key={niveau}
                                        type="button"
                                        role="radio"
                                        aria-checked={actif}
                                        onClick={() =>
                                            modifier({ difficulte: niveau })
                                        }
                                        className={cn(
                                            'flex h-9 items-center justify-center rounded-controle border text-interface font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                            actif
                                                ? 'border-ink-900 bg-ink-900 text-craie-50'
                                                : 'border-contour bg-card text-ink-600 hover:text-ink-900 dark:bg-relief/40',
                                        )}
                                    >
                                        <span className="font-data">
                                            {niveau}
                                        </span>
                                        <span className="sr-only">
                                            {libelle}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-aide text-ink-600">
                            {DIFFICULTES[brouillon.difficulte - 1]}
                        </p>
                    </Section>
                </div>

                <section
                    aria-labelledby="titre-apercu"
                    className={cn(
                        'grid min-w-0 gap-4 lg:sticky lg:top-6',
                        onglet !== 'apercu' && 'hidden lg:grid',
                    )}
                >
                    {a_completer && (
                        <p className="flex items-start gap-2.5 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] px-4 py-3 text-interface dark:bg-indice-400/[0.06]">
                            <CircleAlert
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-indice-600 dark:text-indice-400"
                            />
                            <span>
                                <strong className="font-semibold">
                                    Avant l’envoi en relecture :
                                </strong>{' '}
                                {a_completer}
                            </span>
                        </p>
                    )}
                    <div className="rounded-carte border bg-card shadow-carte">
                        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                            <h2
                                id="titre-apercu"
                                className="flex items-center gap-2 text-aide font-semibold text-ink-600"
                            >
                                <Eye aria-hidden className="size-4" />
                                Comme l’élève la verra
                            </h2>
                            <Button
                                variant="ghost"
                                taille="petite"
                                onClick={() => setPartie((p) => p + 1)}
                            >
                                <RotateCcw aria-hidden />
                                Rejouer
                            </Button>
                        </div>
                        <div className="grid gap-4 p-4 sm:p-5">
                            <EnteteQuestion question={apercu} />
                            {(apercu.enonce.content ?? []).length === 0 ? (
                                <p className="text-ink-500">
                                    La question apparaîtra ici au fil de la
                                    saisie.
                                </p>
                            ) : (
                                <ExerciceQuestion
                                    key={partie}
                                    question={apercu}
                                    titre="Essayez-la : rien n’est enregistré"
                                    className="border-0 p-0 shadow-none sm:p-0"
                                />
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
