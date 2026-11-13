import { Link, router } from '@inertiajs/react';
import { ChevronRight, Flag, Sparkles } from 'lucide-react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { show as ficheQuestion } from '@/routes/contenu/questions';
import { index, show } from '@/routes/contenu/tuteur';

type Matiere = { cle: CleMatiere; nom: string };

type Conversation = {
    uuid: string;
    objet: 'question' | 'etape' | 'libre';
    titre: string;
    matiere: Matiere | null;
    reponses: number;
    signalee: boolean;
    le: string;
    est_exemple: boolean;
};

type Props = {
    filtres: { signalees: boolean; matiere: string | null };
    matieres: { slug: string; nom: string }[];
    bilan: {
        explications: number;
        conversations: number;
        recentrages: number;
        signalements: number;
    };
    plus_expliquees: {
        uuid: string;
        extrait: string;
        matiere: Matiere;
        notion: string;
        conversations: number;
        etapes: number;
    }[];
    conversations: {
        donnees: Conversation[];
        page: number;
        derniere: number;
        total: number;
    };
};

const OBJETS: Record<Conversation['objet'], string> = {
    question: 'Sur une question',
    etape: 'Sur une étape',
    libre: 'Question libre',
};

/**
 * Back-office › Tuteur (lot 10, PLAN M11) : ce que les élèves n'ont pas
 * compris. Les questions qu'ils font le plus expliquer (un corrigé à
 * reprendre ?), les réponses qu'ils ont signalées, en tête, puis tout le
 * journal. Aucune identité d'élève : seulement le contenu.
 */
export default function JournalTuteur({
    filtres,
    matieres,
    bilan,
    plus_expliquees,
    conversations,
}: Props) {
    // `filtres` d'abord, ce que la page contrôle ensuite (CLAUDE.md § 4).
    function filtrer(modifs: Partial<Props['filtres']>) {
        const suivants = { ...filtres, ...modifs };

        router.get(
            index({
                query: {
                    signalees: suivants.signalees ? 1 : '',
                    matiere: suivants.matiere ?? '',
                },
            }).url,
            {},
            { preserveScroll: true, replace: true },
        );
    }

    const exemple = conversations.donnees.some((c) => c.est_exemple);

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Tuteur"
                titre={
                    <>
                        Ce que le <strong>tuteur</strong> explique
                    </>
                }
                description="Une question que les élèves font souvent expliquer, c’est un corrigé à reprendre. Les échanges sont anonymes."
            />

            {exemple && <BandeauExemple />}

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-carte border bg-border shadow-carte lg:grid-cols-4">
                {[
                    {
                        libelle: 'Explications, 7 jours',
                        valeur: bilan.explications,
                    },
                    {
                        libelle: 'Conversations, 7 jours',
                        valeur: bilan.conversations,
                    },
                    {
                        libelle: 'Recentrages, 7 jours',
                        valeur: bilan.recentrages,
                    },
                    {
                        libelle: 'Signalements à lire',
                        valeur: bilan.signalements,
                        fort: bilan.signalements > 0,
                    },
                ].map((c) => (
                    <div
                        key={c.libelle}
                        className="grid gap-1 bg-card p-4 sm:p-5"
                    >
                        <dt className="text-aide text-ink-500">{c.libelle}</dt>
                        <dd
                            className={cn(
                                'text-[1.625rem] leading-none font-semibold tracking-tight font-data',
                                c.fort && 'text-nimba-700 dark:text-nimba-300',
                            )}
                        >
                            {formaterNombre(c.valeur)}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <section
                    aria-labelledby="titre-journal"
                    className="min-w-0 rounded-carte border bg-card shadow-carte"
                >
                    <div className="grid gap-3 border-b px-5 py-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2
                                id="titre-journal"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Le journal
                            </h2>
                            <button
                                type="button"
                                aria-pressed={filtres.signalees}
                                onClick={() =>
                                    filtrer({ signalees: !filtres.signalees })
                                }
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded-controle border px-2.5 text-aide font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    filtres.signalees
                                        ? 'border-ink-900 bg-ink-900 text-craie-50'
                                        : 'border-contour bg-card text-ink-600 hover:text-ink-900',
                                )}
                            >
                                <Flag aria-hidden className="size-3.5" />
                                Signalées seulement
                            </button>
                        </div>
                        <ListeDeroulante
                            aria-label="Matière"
                            value={filtres.matiere ?? ''}
                            onChange={(e) =>
                                filtrer({ matiere: e.target.value || null })
                            }
                        >
                            <option value="">Toutes les matières</option>
                            {matieres.map((m) => (
                                <option key={m.slug} value={m.slug}>
                                    {m.nom}
                                </option>
                            ))}
                        </ListeDeroulante>
                    </div>

                    {conversations.donnees.length === 0 ? (
                        <div className="p-5">
                            <EtatVide
                                illustration={Sparkles}
                                titre="Aucun échange ici"
                                message="Quand un élève demande « Explique-moi », la conversation arrive dans ce journal."
                                action={
                                    <Button
                                        variant="outline"
                                        taille="compacte"
                                        onClick={() =>
                                            filtrer({
                                                signalees: false,
                                                matiere: null,
                                            })
                                        }
                                    >
                                        Tout le journal
                                    </Button>
                                }
                                className="border-0 shadow-none"
                            />
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y">
                                {conversations.donnees.map((c) => (
                                    <li
                                        key={c.uuid}
                                        className="relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-craie-100/50 dark:hover:bg-white/[0.02]"
                                    >
                                        {c.matiere ? (
                                            <TuileMatiere
                                                teinte={c.matiere.cle}
                                                taille="grande"
                                            />
                                        ) : (
                                            <span
                                                aria-hidden
                                                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600 dark:bg-white/[0.06]"
                                            >
                                                <Sparkles className="size-[18px]" />
                                            </span>
                                        )}
                                        <div className="grid min-w-0 flex-1 gap-1">
                                            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                <Link
                                                    href={show(c.uuid)}
                                                    prefetch
                                                    className="line-clamp-1 font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                                                >
                                                    {c.titre}
                                                </Link>
                                                {c.signalee && (
                                                    <Badge variant="nimba">
                                                        Signalée
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-aide text-ink-500">
                                                {[
                                                    OBJETS[c.objet],
                                                    c.matiere?.nom,
                                                    pluriel(
                                                        c.reponses,
                                                        'réponse',
                                                    ),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        <span
                                            className="hidden shrink-0 text-meta text-ink-500 sm:inline"
                                            data-capture="variable"
                                        >
                                            {depuis(c.le)}
                                        </span>
                                        <ChevronRight
                                            aria-hidden
                                            className="mt-1 size-4 shrink-0 text-ink-400"
                                        />
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                                <p className="text-aide text-ink-500">
                                    {pluriel(
                                        conversations.total,
                                        'conversation',
                                    )}
                                </p>
                                <Pagination
                                    page={conversations.page}
                                    derniere={conversations.derniere}
                                    lien={(page) =>
                                        index({
                                            query: {
                                                signalees: filtres.signalees
                                                    ? 1
                                                    : '',
                                                matiere: filtres.matiere ?? '',
                                                page,
                                            },
                                        }).url
                                    }
                                />
                            </div>
                        </>
                    )}
                </section>

                <section
                    aria-labelledby="titre-plus"
                    className="grid gap-1 rounded-carte border bg-card p-2 shadow-carte"
                >
                    <div className="grid gap-0.5 px-3 pt-3 pb-1">
                        <h2
                            id="titre-plus"
                            className="text-[0.9375rem] font-semibold"
                        >
                            Les plus expliquées
                        </h2>
                        <p className="text-aide text-ink-500">
                            Sur 30 jours : à relire en premier.
                        </p>
                    </div>
                    {plus_expliquees.length === 0 ? (
                        <p className="px-3 pb-3 text-aide text-ink-500">
                            Rien encore : aucune question n’a été expliquée ce
                            mois-ci.
                        </p>
                    ) : (
                        <ol className="grid">
                            {plus_expliquees.map((q, rang) => (
                                <li key={q.uuid}>
                                    <Link
                                        href={ficheQuestion(q.uuid)}
                                        className="flex items-start gap-3 rounded-[12px] px-3 py-2.5 transition-colors outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]"
                                    >
                                        <span
                                            aria-hidden
                                            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                                        >
                                            {rang + 1}
                                        </span>
                                        <span className="grid min-w-0 flex-1 gap-0.5">
                                            <span className="line-clamp-2 text-interface font-medium">
                                                {q.extrait}
                                            </span>
                                            <span className="text-meta text-ink-500">
                                                {q.matiere.nom} · {q.notion}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-interface font-semibold font-data">
                                                {q.conversations}
                                            </span>
                                            <span className="block text-meta text-ink-500">
                                                {q.etapes > 0
                                                    ? `dont ${q.etapes} étape${q.etapes > 1 ? 's' : ''}`
                                                    : 'fois'}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
