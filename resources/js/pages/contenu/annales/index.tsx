import { Link, router } from '@inertiajs/react';
import {
    CircleAlert,
    ClipboardCheck,
    FileText,
    FileUp,
    LoaderCircle,
    RotateCcw,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';
import { useEffect } from 'react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { OngletsRelecture } from '@/components/contenu/onglets-relecture';
import { BadgeStatut, STATUTS } from '@/components/contenu/statut-lecon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { usePeut } from '@/hooks/use-peut';
import { formaterPoids } from '@/lib/contenu/sujets';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { importer, index, relecture, show } from '@/routes/contenu/annales';
import { relancer } from '@/routes/contenu/annales/imports';
import type { StatutContenu } from '@/types';

type Vue = 'toutes' | 'miennes' | 'a_relire';

type Filtres = {
    vue: Vue;
    statut: StatutContenu | null;
    matiere: number | null;
    examen: number | null;
    recherche: string;
};

export type AnnaleResume = {
    uuid: string;
    titre: string;
    session: number;
    libelle_session: string;
    examen: string;
    serie: string | null;
    type: 'officiel' | 'blanc_maison';
    type_libelle: string;
    matiere: { nom: string; teinte: CleMatiere };
    statut: StatutContenu;
    publiee: boolean;
    est_exemple: boolean;
    officiel_sans_droits: boolean;
    a_document: boolean;
    auteur: string;
    de_moi: boolean;
    modifiee_le: string;
};

export type ImportResume = {
    uuid: string;
    document: string;
    octets: number;
    matiere: { nom: string; teinte: CleMatiere };
    libelle: string;
    statut: 'en_attente' | 'en_cours' | 'pret' | 'echec';
    statut_libelle: string;
    en_cours: boolean;
    erreur: string | null;
    avertissements: number;
    sujet: string | null;
    simule: boolean;
    cree_le: string;
    peut_relancer: boolean;
};

type Props = {
    sujets: {
        donnees: (AnnaleResume & { questions: number; a_verifier: number })[];
        page: number;
        derniere: number;
        total: number;
    };
    imports: ImportResume[];
    filtres: Filtres;
    compteurs: Record<StatutContenu, number>;
    a_relire: number | null;
    lecons_a_relire: number | null;
    questions_a_relire: number | null;
    peut_importer: boolean;
    matieres: { id: number; nom: string; teinte: CleMatiere }[];
    examens: { id: number; code: string; nom: string }[];
};

/**
 * Back-office › Annales (PLAN M6, M17) : les sujets d'examen, leurs imports
 * en cours (l'IA lit le document en file ; la page se rafraîchit seule
 * pendant la lecture), la file de relecture. Recherche côté serveur.
 */
export default function Annales({
    sujets,
    imports,
    filtres,
    compteurs,
    a_relire,
    lecons_a_relire,
    questions_a_relire,
    peut_importer,
    matieres,
    examens,
}: Props) {
    const peut = usePeut();
    const relire = filtres.vue === 'a_relire';
    const total = Object.values(compteurs).reduce((a, b) => a + b, 0);
    const lectureEnCours = imports.some((i) => i.en_cours);

    // Pendant une lecture, la liste se rafraîchit toute seule (rechargement
    // partiel des imports et des sujets, toutes les 4 s).
    useEffect(() => {
        if (!lectureEnCours) {
            return;
        }

        const minuterie = window.setInterval(
            () =>
                router.reload({
                    only: ['imports', 'sujets', 'compteurs'],
                }),
            4000,
        );

        return () => window.clearInterval(minuterie);
    }, [lectureEnCours]);

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
                titreOnglet={relire ? 'Relecture des annales' : 'Annales'}
                titre={
                    relire ? (
                        <>
                            À <strong>relire</strong>
                        </>
                    ) : (
                        <>
                            Les <strong>annales</strong>
                        </>
                    )
                }
                description={
                    relire
                        ? 'Une annale se relit avec toutes ses questions, en un geste. Rien n’est publié sans un relecteur différent de l’auteur.'
                        : 'Chaque sujet garde son document original à côté de sa version structurée. Ses questions alimentent aussi les séances.'
                }
                action={
                    peut_importer && (
                        <Button asChild>
                            <Link href={importer()} prefetch>
                                <FileUp aria-hidden />
                                Importer un sujet
                            </Link>
                        </Button>
                    )
                }
            >
                {relire ? (
                    <OngletsRelecture
                        actif="annales"
                        lecons={lecons_a_relire ?? 0}
                        questions={questions_a_relire ?? 0}
                        annales={a_relire ?? 0}
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

            {!relire && imports.length > 0 && (
                <section
                    aria-labelledby="titre-imports"
                    className="rounded-carte border bg-card shadow-carte"
                >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
                        <h2
                            id="titre-imports"
                            className="text-[0.9375rem] font-semibold"
                        >
                            Vos imports à suivre
                        </h2>
                        <p className="text-aide text-ink-500">
                            L’annale créée est un brouillon : rien n’est publié
                            sans relecture.
                        </p>
                    </div>
                    <ul className="divide-y pt-2">
                        {imports.map((i) => (
                            <LigneImport key={i.uuid} entree={i} />
                        ))}
                    </ul>
                </section>
            )}

            <section
                aria-labelledby="titre-liste"
                className="rounded-carte border bg-card shadow-carte"
            >
                <h2 id="titre-liste" className="sr-only">
                    {relire ? 'Annales à relire' : 'Liste des annales'}
                </h2>
                <div className="grid gap-3 border-b px-5 py-4">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_12rem]">
                        <SearchInput
                            libelle="Rechercher une annale"
                            placeholder="Titre ou matière…"
                            valeur={filtres.recherche}
                            onRecherche={(recherche) => filtrer({ recherche })}
                        />
                        <ListeDeroulante
                            aria-label="Examen"
                            value={filtres.examen ?? ''}
                            onChange={(e) =>
                                filtrer({
                                    examen: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                        >
                            <option value="">Tous les examens</option>
                            {examens.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.code === 'BAC' ? 'Bac' : e.code}
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

                {sujets.donnees.length === 0 ? (
                    <div className="p-5">
                        <EtatVide
                            illustration={relire ? ClipboardCheck : FileText}
                            titre={
                                relire
                                    ? 'Rien à relire pour l’instant'
                                    : 'Aucune annale ne correspond'
                            }
                            message={
                                relire
                                    ? 'Les annales envoyées en relecture par les autres apparaîtront ici.'
                                    : 'Importez un sujet scanné : l’IA le transcrit, vous vérifiez, un relecteur publie.'
                            }
                            action={
                                peut_importer && !relire ? (
                                    <Button asChild taille="compacte">
                                        <Link href={importer()}>
                                            <FileUp aria-hidden />
                                            Importer un sujet
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="outline"
                                        taille="compacte"
                                    >
                                        <Link href={index()}>
                                            Toutes les annales
                                        </Link>
                                    </Button>
                                )
                            }
                            className="border-0 shadow-none"
                        />
                    </div>
                ) : (
                    <>
                        <ul className="divide-y">
                            {sujets.donnees.map((sujet) => (
                                <LigneAnnale key={sujet.uuid} sujet={sujet} />
                            ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                            <p className="text-aide text-ink-500">
                                {pluriel(sujets.total, 'annale')}
                            </p>
                            <Pagination
                                page={sujets.page}
                                derniere={sujets.derniere}
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
    nombre,
    actif,
    onClick,
}: {
    libelle: string;
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

function LigneImport({ entree }: { entree: ImportResume }) {
    const style = MATIERES[entree.matiere.teinte];

    return (
        <li className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        style?.tuile,
                    )}
                >
                    {entree.en_cours ? (
                        <LoaderCircle className="size-[18px] animate-spin motion-reduce:animate-none" />
                    ) : (
                        <FileText className="size-[18px]" />
                    )}
                </span>
                <div className="grid min-w-0 gap-0.5">
                    <p className="truncate font-semibold">
                        {entree.matiere.nom} · {entree.libelle}
                    </p>
                    <p className="truncate text-aide text-ink-500">
                        {entree.document} · {formaterPoids(entree.octets)} ·{' '}
                        <span data-capture="variable">
                            {depuis(entree.cree_le)}
                        </span>
                    </p>
                    {entree.erreur && (
                        <p className="flex items-start gap-1.5 text-aide text-faux-600 dark:text-faux-400">
                            <CircleAlert
                                aria-hidden
                                className="mt-0.5 size-3.5 shrink-0"
                            />
                            {entree.erreur}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {entree.simule && (
                    <Badge variant="neutre">
                        <Sparkles aria-hidden />
                        Lecture simulée
                    </Badge>
                )}
                {entree.avertissements > 0 && (
                    <span className="flex items-center gap-1 text-meta text-indice-700 dark:text-indice-400">
                        <TriangleAlert aria-hidden className="size-3.5" />
                        {pluriel(entree.avertissements, 'point')} à vérifier
                    </span>
                )}
                {entree.statut === 'pret' && entree.sujet ? (
                    <Button asChild taille="compacte">
                        <Link href={show(entree.sujet)}>Vérifier l’annale</Link>
                    </Button>
                ) : entree.peut_relancer ? (
                    <Button
                        variant="outline"
                        taille="compacte"
                        onClick={() =>
                            router.post(
                                relancer(entree.uuid).url,
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        <RotateCcw aria-hidden />
                        Relancer
                    </Button>
                ) : (
                    <span className="text-aide font-medium text-ink-600">
                        {entree.statut_libelle}…
                    </span>
                )}
            </div>
        </li>
    );
}

function LigneAnnale({
    sujet,
}: {
    sujet: AnnaleResume & { questions: number; a_verifier: number };
}) {
    const style = MATIERES[sujet.matiere.teinte];

    return (
        <li className="relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-craie-100/50 sm:items-center dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    style?.tuile,
                )}
            >
                {style && <style.icone className="size-[18px]" />}
            </span>
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="grid min-w-0 gap-0.5">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                            href={show(sujet.uuid)}
                            prefetch
                            className="truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                        >
                            {sujet.matiere.nom} · {sujet.libelle_session}
                        </Link>
                        {sujet.est_exemple && (
                            <Badge variant="neutre">Exemple</Badge>
                        )}
                    </p>
                    <p className="truncate text-aide text-ink-500">
                        {sujet.type_libelle} ·{' '}
                        {pluriel(sujet.questions, 'question')} · {sujet.titre}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <BadgeStatut statut={sujet.statut} />
                    {sujet.a_verifier > 0 && (
                        <span className="flex items-center gap-1 text-meta font-medium text-indice-700 dark:text-indice-400">
                            <Sparkles aria-hidden className="size-3.5" />
                            {pluriel(sujet.a_verifier, 'réponse')} à vérifier
                        </span>
                    )}
                    {sujet.officiel_sans_droits && (
                        <span
                            className="text-meta text-ink-500"
                            title="Convention avec le ministère (D5) non renseignée"
                        >
                            Droits à renseigner
                        </span>
                    )}
                    <span
                        className="text-meta text-ink-500"
                        data-capture="variable"
                    >
                        {sujet.de_moi ? 'vous' : sujet.auteur} ·{' '}
                        {depuis(sujet.modifiee_le)}
                    </span>
                </div>
            </div>
        </li>
    );
}
