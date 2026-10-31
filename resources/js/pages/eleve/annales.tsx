import { Head, Link, router } from '@inertiajs/react';
import {
    CircleCheck,
    ChevronRight,
    FileText,
    Layers,
    ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { ProgressionBarre } from '@/components/ui/progression';
import { SearchInput } from '@/components/ui/search-input';
import { formaterDuree } from '@/lib/contenu/sujets';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { cours } from '@/routes/eleve';
import { index, show } from '@/routes/eleve/annales';

type Vue = 'sujets' | 'exercices';

type Filtres = {
    vue: Vue;
    matiere: string | null;
    session: number | null;
    chapitre: number | null;
    recherche: string;
};

type SujetResume = {
    uuid: string;
    titre: string;
    libelle_session: string;
    session: number;
    origine: 'officiel' | 'blanc_maison';
    matiere: { cle: CleMatiere; nom: string };
    duree_minutes: number | null;
    questions: number;
    faites: number;
    est_exemple: boolean;
};

type Exercice = {
    uuid: string;
    titre: string;
    difficulte: number;
    matiere: { cle: CleMatiere; nom: string };
    chapitre: string;
    notion: string;
    sujet: string;
    libelle_session: string;
    partie: string;
    faite: boolean;
    est_exemple: boolean;
};

type Page<T> = { donnees: T[]; page: number; derniere: number; total: number };

type Props = {
    examen: string;
    filtres: Filtres;
    est_exemple: boolean;
    resume: {
        sujets: number;
        premiere: number | null;
        derniere: number | null;
        exercices: number;
        faits: number;
    };
    matieres: { slug: string; nom: string; cle: CleMatiere; sujets: number }[];
    sessions: number[];
    chapitres: {
        id: number;
        titre: string;
        matiere: string;
        cle: CleMatiere;
        exercices: number;
    }[];
    sujets: Page<SujetResume> | null;
    exercices: Page<Exercice> | null;
};

/**
 * Annales (PLAN M6) : les sujets de l'examen de l'élève, par matière et par
 * session, et la vue « Exercices par chapitre » — tous les exercices d'un
 * chapitre tombés depuis la première session saisie. Recherche et filtres
 * côté serveur (liste paginée, CLAUDE.md § 4).
 */
export default function Annales({
    examen,
    filtres,
    est_exemple,
    resume,
    matieres,
    sessions,
    chapitres,
    sujets,
    exercices,
}: Props) {
    // `filtres` d'abord, ce que la page contrôle ensuite (CLAUDE.md § 4).
    function filtrer(modifs: Partial<Filtres>) {
        router.get(
            index({ query: { ...filtres, ...modifs, page: undefined } }).url,
            {},
            { preserveScroll: true, replace: true },
        );
    }

    const page = filtres.vue === 'sujets' ? sujets : exercices;
    const filtre =
        filtres.matiere !== null ||
        filtres.session !== null ||
        filtres.chapitre !== null ||
        filtres.recherche !== '';
    const part =
        resume.exercices === 0
            ? 0
            : Math.round((resume.faits / resume.exercices) * 100);

    return (
        <>
            <Head title="Annales" />
            <div className="grid grid-cols-1 gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500">
                            {examen}
                        </p>
                        <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                            Les <strong>annales</strong> de ton examen
                        </h1>
                        <p className="max-w-xl text-ink-600">
                            Les vrais sujets, avec un corrigé pas à pas.
                            Lis-les, ou entraîne-toi question par question.
                        </p>
                    </div>
                </header>

                {est_exemple && <BandeauExemple />}

                {resume.sujets === 0 ? (
                    <EtatVide
                        illustration={FileText}
                        titre="Les annales de ton examen arrivent"
                        message="L’équipe transcrit les sujets et rédige leurs corrigés. En attendant, révise tes cours."
                        action={
                            <Button asChild variant="outline">
                                <Link href={cours()}>Voir mes cours</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="grid min-w-0 gap-4">
                            <Onglets vue={filtres.vue} filtrer={filtrer} />

                            <div className="grid gap-3">
                                <div
                                    role="group"
                                    aria-label="Matière"
                                    className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
                                >
                                    <Puce
                                        actif={filtres.matiere === null}
                                        onClick={() =>
                                            filtrer({
                                                matiere: null,
                                                chapitre: null,
                                            })
                                        }
                                    >
                                        Toutes les matières
                                    </Puce>
                                    {matieres.map((m) => {
                                        const style = MATIERES[m.cle];

                                        return (
                                            <Puce
                                                key={m.slug}
                                                actif={
                                                    filtres.matiere === m.slug
                                                }
                                                onClick={() =>
                                                    filtrer({
                                                        matiere: m.slug,
                                                        chapitre: null,
                                                    })
                                                }
                                            >
                                                <style.icone
                                                    aria-hidden
                                                    className={cn(
                                                        'size-3.5',
                                                        filtres.matiere !==
                                                            m.slug &&
                                                            style.texte,
                                                    )}
                                                />
                                                {m.nom}
                                            </Puce>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10.5rem_minmax(0,14rem)]">
                                    <SearchInput
                                        libelle={
                                            filtres.vue === 'sujets'
                                                ? 'Rechercher un sujet'
                                                : 'Rechercher un exercice'
                                        }
                                        placeholder={
                                            filtres.vue === 'sujets'
                                                ? 'Matière, titre…'
                                                : 'Un mot de l’énoncé, une notion…'
                                        }
                                        valeur={filtres.recherche}
                                        onRecherche={(recherche) =>
                                            filtrer({ recherche })
                                        }
                                    />
                                    <ListeDeroulante
                                        aria-label="Session"
                                        value={filtres.session ?? ''}
                                        onChange={(e) =>
                                            filtrer({
                                                session: e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            })
                                        }
                                    >
                                        <option value="">Toutes années</option>
                                        {sessions.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </ListeDeroulante>
                                    <ListeDeroulante
                                        aria-label="Chapitre"
                                        value={filtres.chapitre ?? ''}
                                        onChange={(e) =>
                                            filtrer({
                                                chapitre: e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            })
                                        }
                                    >
                                        <option value="">
                                            Tous les chapitres
                                        </option>
                                        {chapitres.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.titre}
                                            </option>
                                        ))}
                                    </ListeDeroulante>
                                </div>
                            </div>

                            <section
                                aria-label={
                                    filtres.vue === 'sujets'
                                        ? 'Sujets'
                                        : 'Exercices'
                                }
                                className="rounded-carte border bg-card shadow-carte"
                            >
                                {page === null || page.donnees.length === 0 ? (
                                    <div className="p-5">
                                        <EtatVide
                                            titre={
                                                filtres.vue === 'sujets'
                                                    ? 'Aucun sujet ne correspond'
                                                    : 'Aucun exercice ne correspond'
                                            }
                                            message="Essaie une autre année, un autre chapitre, ou retire un filtre."
                                            action={
                                                <Button
                                                    variant="outline"
                                                    taille="compacte"
                                                    disabled={!filtre}
                                                    onClick={() =>
                                                        filtrer({
                                                            matiere: null,
                                                            session: null,
                                                            chapitre: null,
                                                            recherche: '',
                                                        })
                                                    }
                                                >
                                                    Effacer les filtres
                                                </Button>
                                            }
                                            className="border-0 shadow-none"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <ul className="divide-y">
                                            {filtres.vue === 'sujets'
                                                ? (sujets?.donnees ?? []).map(
                                                      (s) => (
                                                          <LigneSujet
                                                              key={s.uuid}
                                                              sujet={s}
                                                          />
                                                      ),
                                                  )
                                                : (
                                                      exercices?.donnees ?? []
                                                  ).map((e) => (
                                                      <LigneExercice
                                                          key={e.uuid}
                                                          exercice={e}
                                                      />
                                                  ))}
                                        </ul>
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                                            <p className="text-aide text-ink-500">
                                                {filtres.vue === 'sujets'
                                                    ? pluriel(
                                                          page.total,
                                                          'sujet',
                                                      )
                                                    : pluriel(
                                                          page.total,
                                                          'exercice',
                                                      )}
                                            </p>
                                            <Pagination
                                                page={page.page}
                                                derniere={page.derniere}
                                                lien={(numero) =>
                                                    index({
                                                        query: {
                                                            ...filtres,
                                                            page: numero,
                                                        },
                                                    }).url
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>

                        <aside className="grid content-start gap-4">
                            <section
                                aria-labelledby="titre-bilan"
                                className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve"
                            >
                                <h2
                                    id="titre-bilan"
                                    className="text-aide font-medium text-white/70"
                                >
                                    Ton entraînement sur les annales
                                </h2>
                                <p className="flex items-baseline gap-1.5">
                                    <span className="text-[2.25rem] leading-none font-bold tracking-tight font-data">
                                        {resume.faits}
                                    </span>
                                    <span className="font-semibold text-white/60 font-data">
                                        / {resume.exercices}
                                    </span>
                                    <span className="text-aide text-white/75">
                                        exercices faits
                                    </span>
                                </p>
                                <ProgressionBarre
                                    valeur={part}
                                    libelle={`${part} % des exercices d’annales faits`}
                                    className="bg-white/15"
                                />
                                <p className="text-aide text-white/75">
                                    {pluriel(resume.sujets, 'sujet')}
                                    {resume.premiere !== null &&
                                        resume.derniere !== null &&
                                        (resume.premiere === resume.derniere
                                            ? `, session ${resume.premiere}`
                                            : `, de ${resume.premiere} à ${resume.derniere}`)}
                                    .
                                </p>
                            </section>

                            {chapitres.length > 0 && (
                                <section
                                    aria-labelledby="titre-chapitres"
                                    className="rounded-carte border bg-card shadow-carte"
                                >
                                    <div className="grid gap-0.5 px-5 pt-4">
                                        <h2
                                            id="titre-chapitres"
                                            className="text-titre-carte font-semibold"
                                        >
                                            Par chapitre
                                        </h2>
                                        <p className="text-aide text-ink-500">
                                            Tous les exercices tombés sur un
                                            chapitre, du plus récent au plus
                                            ancien.
                                        </p>
                                    </div>
                                    <ul className="grid gap-0.5 p-2 pt-3">
                                        {chapitres.slice(0, 8).map((c) => {
                                            const style = MATIERES[c.cle];
                                            const actif =
                                                filtres.vue === 'exercices' &&
                                                filtres.chapitre === c.id;

                                            return (
                                                <li key={c.id}>
                                                    <Link
                                                        href={index({
                                                            query: {
                                                                vue: 'exercices',
                                                                chapitre: c.id,
                                                            },
                                                        })}
                                                        prefetch
                                                        aria-current={
                                                            actif
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            'flex items-center gap-3 rounded-controle px-3 py-2 outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                                                            actif &&
                                                                'bg-craie-100 dark:bg-white/[0.05]',
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden
                                                            className={cn(
                                                                'h-6 w-1 shrink-0 rounded-full',
                                                                style.plein,
                                                            )}
                                                        />
                                                        <span className="grid min-w-0 flex-1">
                                                            <span className="truncate font-medium">
                                                                {c.titre}
                                                            </span>
                                                            <span className="text-meta text-ink-500">
                                                                {c.matiere}
                                                            </span>
                                                        </span>
                                                        <span className="text-aide font-semibold text-ink-600 font-data">
                                                            {c.exercices}
                                                        </span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            )}
                        </aside>
                    </div>
                )}
            </div>
        </>
    );
}

function Onglets({
    vue,
    filtrer,
}: {
    vue: Vue;
    filtrer: (modifs: Partial<Filtres>) => void;
}) {
    const onglets = [
        { cle: 'sujets' as const, libelle: 'Sujets', icone: Layers },
        {
            cle: 'exercices' as const,
            libelle: 'Exercices par chapitre',
            icone: ListChecks,
        },
    ];

    return (
        <div
            role="tablist"
            aria-label="Afficher"
            className="flex w-fit gap-0.5 rounded-controle bg-craie-100 p-1"
        >
            {onglets.map((o) => (
                <button
                    key={o.cle}
                    type="button"
                    role="tab"
                    aria-selected={vue === o.cle}
                    onClick={() => filtrer({ vue: o.cle })}
                    className={cn(
                        'flex h-9 items-center gap-1.5 rounded-[7px] px-3 text-interface font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-8',
                        vue === o.cle
                            ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-ink-600 hover:text-ink-900',
                    )}
                >
                    <o.icone aria-hidden className="size-4" />
                    {o.libelle}
                </button>
            ))}
        </div>
    );
}

function Puce({
    actif,
    onClick,
    children,
}: {
    actif: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={actif}
            onClick={onClick}
            className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-controle border px-2.5 text-aide font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                actif
                    ? 'border-ink-900 bg-ink-900 text-craie-50'
                    : 'border-contour bg-card text-ink-600 hover:text-ink-900',
            )}
        >
            {children}
        </button>
    );
}

function LigneSujet({ sujet }: { sujet: SujetResume }) {
    const style = MATIERES[sujet.matiere.cle];
    const duree = formaterDuree(sujet.duree_minutes);
    const part =
        sujet.questions === 0
            ? 0
            : Math.round((sujet.faites / sujet.questions) * 100);

    return (
        <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-craie-100/50 sm:px-5 dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    style.tuile,
                )}
            >
                <style.icone className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                        href={show(sujet.uuid)}
                        prefetch
                        className="truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                    >
                        {sujet.matiere.nom} · {sujet.libelle_session}
                    </Link>
                    {sujet.origine === 'blanc_maison' && (
                        <Badge variant="neutre">Sujet maison</Badge>
                    )}
                </p>
                <p className="truncate text-aide text-ink-500">
                    {pluriel(sujet.questions, 'question')}
                    {duree && ` · ${duree}`}
                </p>
                {sujet.faites > 0 && (
                    <ProgressionBarre
                        valeur={part}
                        libelle={`${sujet.faites} questions faites sur ${sujet.questions}`}
                        couleur={style.plein}
                        className="h-1 max-w-48"
                    />
                )}
            </div>
            <span className="hidden text-aide text-ink-500 font-data sm:inline">
                {sujet.faites}/{sujet.questions}
            </span>
            <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-ink-400"
            />
        </li>
    );
}

function LigneExercice({ exercice }: { exercice: Exercice }) {
    const style = MATIERES[exercice.matiere.cle];

    return (
        <li className="relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-craie-100/50 sm:px-5 dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    style.tuile,
                )}
            >
                <style.icone className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
                <Link
                    href={show(exercice.sujet, {
                        query: {
                            mode: 'entrainement',
                            question: exercice.uuid,
                        },
                    })}
                    prefetch
                    className="line-clamp-2 font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                >
                    {exercice.titre}
                </Link>
                <p className="truncate text-aide text-ink-500">
                    <span className={cn('font-medium', style.texte)}>
                        {exercice.libelle_session}
                    </span>{' '}
                    · {exercice.partie} · {exercice.notion}
                </p>
            </div>
            {exercice.faite ? (
                <span className="flex shrink-0 items-center gap-1 text-aide font-medium text-juste-700 dark:text-juste-400">
                    <CircleCheck aria-hidden className="size-4" />
                    Fait
                </span>
            ) : (
                <ChevronRight
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-ink-400"
                />
            )}
        </li>
    );
}
