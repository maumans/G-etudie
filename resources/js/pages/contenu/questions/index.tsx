import { Link, router } from '@inertiajs/react';
import {
    ClipboardCheck,
    FileQuestion,
    Lightbulb,
    ListOrdered,
    Plus,
} from 'lucide-react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { OngletsRelecture } from '@/components/contenu/onglets-relecture';
import { BadgeStatut, STATUTS } from '@/components/contenu/statut-lecon';
import { TYPES } from '@/components/questions/types-question';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { usePeut } from '@/hooks/use-peut';
import type { TypeQuestion } from '@/lib/contenu/questions';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { create, index, relecture, show } from '@/routes/contenu/questions';
import type { StatutContenu } from '@/types';

type Vue = 'toutes' | 'miennes' | 'a_relire';

type Filtres = {
    vue: Vue;
    statut: StatutContenu | null;
    type: TypeQuestion | null;
    matiere: number | null;
    recherche: string;
};

export type QuestionResume = {
    uuid: string;
    titre: string;
    type: TypeQuestion;
    type_libelle: string;
    difficulte: number;
    statut: StatutContenu;
    publiee: boolean;
    est_exemple: boolean;
    auteur: string;
    de_moi: boolean;
    modifiee_le: string;
    matiere: { nom: string; teinte: CleMatiere };
    classe: string;
    chapitre: string;
    notion: string;
    indices: number;
    etapes: number;
    mots: number;
    /** Question d'une annale (lot 4) : elle se relit avec son sujet. */
    annale: {
        uuid: string;
        titre: string;
        partie: string;
        a_verifier: boolean;
    } | null;
};

type Props = {
    questions: {
        donnees: QuestionResume[];
        page: number;
        derniere: number;
        total: number;
    };
    filtres: Filtres;
    compteurs: Record<StatutContenu, number>;
    a_relire: number | null;
    lecons_a_relire: number | null;
    annales_a_relire: number | null;
    matieres: { id: number; nom: string; teinte: CleMatiere }[];
    types: { valeur: TypeQuestion; libelle: string }[];
};

/**
 * Back-office › Questions : la banque de questions de tous les types, ses
 * filtres (type, matière, statut, recherche côté serveur) et la file de
 * relecture des questions des autres.
 */
export default function Questions({
    questions,
    filtres,
    compteurs,
    a_relire,
    lecons_a_relire,
    annales_a_relire,
    matieres,
    types,
}: Props) {
    const peut = usePeut();
    const relire = filtres.vue === 'a_relire';
    const total = Object.values(compteurs).reduce((a, b) => a + b, 0);

    // `filtres` d'abord, ce que la page contrôle ensuite (CLAUDE.md § 4).
    function filtrer(modifs: Partial<Filtres>) {
        const suivants = { ...filtres, ...modifs };
        const adresse = relire
            ? relecture({ query: { ...suivants, vue: undefined } })
            : index({ query: suivants });

        router.get(adresse.url, {}, { preserveScroll: true, replace: true });
    }

    const vues: { cle: Vue; libelle: string; nombre?: number | null }[] = [
        { cle: 'toutes', libelle: 'Toutes' },
        ...(peut('contenu.rediger')
            ? [{ cle: 'miennes' as Vue, libelle: 'Les miennes' }]
            : []),
        ...(a_relire !== null
            ? [
                  {
                      cle: 'a_relire' as Vue,
                      libelle: 'À relire',
                      nombre: a_relire,
                  },
              ]
            : []),
    ];

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet={relire ? 'Relecture des questions' : 'Questions'}
                titre={
                    relire ? (
                        <>
                            À <strong>relire</strong>
                        </>
                    ) : (
                        <>
                            La banque de <strong>questions</strong>
                        </>
                    )
                }
                description={
                    relire
                        ? 'Les questions des autres qui attendent une décision. Rien n’est publié sans un relecteur différent de l’auteur.'
                        : 'Neuf types de questions, chacune rattachée à une notion, avec ses indices et son corrigé pas à pas. Une version publiée est celle que les élèves reçoivent.'
                }
                action={
                    peut('contenu.rediger') && (
                        <Button asChild>
                            <Link href={create()} prefetch>
                                <Plus aria-hidden />
                                Nouvelle question
                            </Link>
                        </Button>
                    )
                }
            >
                {relire ? (
                    <OngletsRelecture
                        actif="questions"
                        lecons={lecons_a_relire ?? 0}
                        questions={a_relire ?? 0}
                        annales={annales_a_relire ?? 0}
                    />
                ) : (
                    <nav
                        aria-label="Vue"
                        className="flex w-fit gap-0.5 rounded-controle bg-craie-100 p-1"
                    >
                        {vues.map((vue) => {
                            const actif = vue.cle === filtres.vue;
                            const href =
                                vue.cle === 'a_relire'
                                    ? relecture()
                                    : index({
                                          query:
                                              vue.cle === 'toutes'
                                                  ? {}
                                                  : { vue: vue.cle },
                                      });

                            return (
                                <Link
                                    key={vue.cle}
                                    href={href}
                                    prefetch
                                    aria-current={actif ? 'page' : undefined}
                                    className={cn(
                                        'flex h-9 items-center gap-1.5 rounded-[7px] px-3 text-interface font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-8',
                                        actif
                                            ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                            : 'text-ink-600 hover:text-ink-900',
                                    )}
                                >
                                    {vue.libelle}
                                    {vue.nombre ? (
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-nimba-600 px-1.5 text-meta font-semibold text-white font-data">
                                            {vue.nombre}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </EnteteEcran>

            <section
                aria-labelledby="titre-liste"
                className="rounded-carte border bg-card shadow-carte"
            >
                <h2 id="titre-liste" className="sr-only">
                    {relire ? 'Questions à relire' : 'Liste des questions'}
                </h2>
                <div className="grid gap-3 border-b px-5 py-4">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
                        <SearchInput
                            libelle="Rechercher une question"
                            placeholder="Énoncé, notion ou chapitre…"
                            valeur={filtres.recherche}
                            onRecherche={(recherche) => filtrer({ recherche })}
                        />
                        <ListeDeroulante
                            aria-label="Type"
                            value={filtres.type ?? ''}
                            onChange={(e) =>
                                filtrer({
                                    type: (e.target.value ||
                                        null) as TypeQuestion | null,
                                })
                            }
                        >
                            <option value="">Tous les types</option>
                            {types.map((t) => (
                                <option key={t.valeur} value={t.valeur}>
                                    {t.libelle}
                                </option>
                            ))}
                        </ListeDeroulante>
                        <ListeDeroulante
                            aria-label="Matière"
                            value={filtres.matiere ?? ''}
                            onChange={(e) =>
                                filtrer({
                                    matiere: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                        >
                            <option value="">Toutes les matières</option>
                            {matieres.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nom}
                                </option>
                            ))}
                        </ListeDeroulante>
                    </div>
                    {!relire && (
                        <div
                            role="group"
                            aria-label="Statut"
                            className="-mx-5 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-5"
                        >
                            <PuceStatut
                                libelle="Toutes"
                                nombre={total}
                                actif={filtres.statut === null}
                                onClick={() => filtrer({ statut: null })}
                            />
                            {(Object.keys(STATUTS) as StatutContenu[]).map(
                                (statut) => (
                                    <PuceStatut
                                        key={statut}
                                        libelle={STATUTS[statut].libelle}
                                        icone={STATUTS[statut].icone}
                                        nombre={compteurs[statut]}
                                        actif={filtres.statut === statut}
                                        onClick={() =>
                                            filtrer({
                                                statut:
                                                    filtres.statut === statut
                                                        ? null
                                                        : statut,
                                            })
                                        }
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>

                {questions.donnees.length === 0 ? (
                    <div className="p-5">
                        <VideListe
                            relire={relire}
                            filtre={
                                filtres.recherche !== '' ||
                                filtres.statut !== null ||
                                filtres.type !== null ||
                                filtres.matiere !== null
                            }
                            peutRediger={peut('contenu.rediger')}
                            effacer={() =>
                                filtrer({
                                    recherche: '',
                                    statut: null,
                                    type: null,
                                    matiere: null,
                                })
                            }
                        />
                    </div>
                ) : (
                    <>
                        <ul className="divide-y">
                            {questions.donnees.map((question) => (
                                <LigneQuestion
                                    key={question.uuid}
                                    question={question}
                                />
                            ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                            <p className="text-aide text-ink-500">
                                {pluriel(questions.total, 'question')}
                            </p>
                            <Pagination
                                page={questions.page}
                                derniere={questions.derniere}
                                lien={(page) =>
                                    (relire
                                        ? relecture({
                                              query: {
                                                  ...filtres,
                                                  vue: undefined,
                                                  page,
                                              },
                                          })
                                        : index({ query: { ...filtres, page } })
                                    ).url
                                }
                            />
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function PuceStatut({
    libelle,
    icone: Icone,
    nombre,
    actif,
    onClick,
}: {
    libelle: string;
    icone?: React.ComponentType<{
        className?: string;
        'aria-hidden'?: boolean;
    }>;
    nombre: number;
    actif: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={actif}
            onClick={onClick}
            className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-controle border px-2.5 text-aide font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                actif
                    ? 'border-ink-900 bg-ink-900 text-craie-50'
                    : 'border-contour bg-card text-ink-600 hover:text-ink-900',
            )}
        >
            {Icone && <Icone aria-hidden className="size-3.5" />}
            {libelle}
            <span
                className={cn(
                    'font-data',
                    actif ? 'text-craie-50/70' : 'text-ink-500',
                )}
            >
                {formaterNombre(nombre)}
            </span>
        </button>
    );
}

/** Une ligne : la tuile du type, teintée par la matière ; l'énoncé ; ce qui l'accompagne. */
function LigneQuestion({ question }: { question: QuestionResume }) {
    const type = TYPES[question.type];
    const matiere = MATIERES[question.matiere.teinte];

    return (
        <li className="relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-craie-100/50 sm:items-center dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    matiere?.tuile,
                )}
            >
                <type.icone className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="grid min-w-0 gap-0.5">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                            href={show(question.uuid)}
                            prefetch
                            className="line-clamp-2 font-semibold outline-none after:absolute after:inset-0 focus-visible:underline sm:line-clamp-1"
                        >
                            {question.titre}
                        </Link>
                        {question.est_exemple && (
                            <Badge variant="neutre">Exemple</Badge>
                        )}
                    </p>
                    <p className="truncate text-aide text-ink-500">
                        <span className={cn('font-medium', matiere?.texte)}>
                            {question.matiere.nom}
                        </span>{' '}
                        · {question.type_libelle} · {question.notion}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <BadgeStatut statut={question.statut} />
                    {question.indices > 0 && (
                        <span
                            className="flex items-center gap-1 text-meta text-ink-500"
                            title="Indices"
                        >
                            <Lightbulb aria-hidden className="size-3.5" />
                            {pluriel(question.indices, 'indice')}
                        </span>
                    )}
                    <span
                        className="flex items-center gap-1 text-meta text-ink-500"
                        title="Étapes du corrigé"
                    >
                        <ListOrdered aria-hidden className="size-3.5" />
                        {pluriel(question.etapes, 'étape')}
                    </span>
                    <span
                        className="text-meta text-ink-500"
                        data-capture="variable"
                    >
                        {question.de_moi ? 'vous' : question.auteur} ·{' '}
                        {depuis(question.modifiee_le)}
                    </span>
                </div>
            </div>
        </li>
    );
}

function VideListe({
    relire,
    filtre,
    peutRediger,
    effacer,
}: {
    relire: boolean;
    filtre: boolean;
    peutRediger: boolean;
    effacer: () => void;
}) {
    if (filtre) {
        return (
            <EtatVide
                titre="Aucune question ne correspond"
                message="Essayez un autre mot, ou retirez un filtre."
                action={
                    <Button
                        variant="outline"
                        taille="compacte"
                        onClick={effacer}
                    >
                        Effacer les filtres
                    </Button>
                }
                className="border-0 shadow-none"
            />
        );
    }

    if (relire) {
        return (
            <EtatVide
                illustration={ClipboardCheck}
                titre="Rien à relire pour l’instant"
                message="Les questions envoyées en relecture par les autres rédacteurs apparaîtront ici."
                action={
                    <Button asChild variant="outline" taille="compacte">
                        <Link href={index()}>Voir toutes les questions</Link>
                    </Button>
                }
                className="border-0 shadow-none"
            />
        );
    }

    return (
        <EtatVide
            illustration={FileQuestion}
            titre="Pas encore de question"
            message="Une question se rattache à une notion du programme, avec ses indices et son corrigé. Écrivez la première."
            action={
                peutRediger ? (
                    <Button asChild taille="compacte">
                        <Link href={create()}>
                            <Plus aria-hidden />
                            Nouvelle question
                        </Link>
                    </Button>
                ) : (
                    <Button asChild variant="outline" taille="compacte">
                        <Link href={relecture()}>Voir la relecture</Link>
                    </Button>
                )
            }
            className="border-0 shadow-none"
        />
    );
}
