import { Link, router } from '@inertiajs/react';
import { ClipboardCheck, Library, Plus } from 'lucide-react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { BadgeStatut, STATUTS } from '@/components/contenu/statut-lecon';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { usePeut } from '@/hooks/use-peut';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { create, index, relecture, show } from '@/routes/contenu/lecons';
import type { LeconResume, StatutContenu } from '@/types';

type Vue = 'toutes' | 'miennes' | 'a_relire';

type Filtres = {
    vue: Vue;
    statut: StatutContenu | null;
    matiere: number | null;
    recherche: string;
};

type Props = {
    lecons: {
        donnees: LeconResume[];
        page: number;
        derniere: number;
        total: number;
    };
    filtres: Filtres;
    compteurs: Record<StatutContenu, number>;
    a_relire: number | null;
    matieres: { id: number; nom: string; teinte: CleMatiere }[];
};

/**
 * Back-office › Leçons : tout le catalogue, ses leçons, et la file de
 * relecture (les leçons des autres qui attendent une décision).
 */
export default function Lecons({
    lecons,
    filtres,
    compteurs,
    a_relire,
    matieres,
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
                titreOnglet={relire ? 'Relecture' : 'Leçons'}
                titre={
                    relire ? (
                        <>
                            À <strong>relire</strong>
                        </>
                    ) : (
                        <>
                            Les <strong>leçons</strong>
                        </>
                    )
                }
                description={
                    relire
                        ? 'Les leçons des autres qui attendent une décision. Rien n’est publié sans un relecteur différent de l’auteur.'
                        : 'Chaque leçon est rattachée à une notion du programme, relue par un autre enseignant, puis publiée.'
                }
                action={
                    peut('contenu.rediger') && (
                        <Button asChild>
                            <Link href={create()} prefetch>
                                <Plus aria-hidden />
                                Nouvelle leçon
                            </Link>
                        </Button>
                    )
                }
            >
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
            </EnteteEcran>

            <section
                aria-labelledby="titre-liste"
                className="rounded-carte border bg-card shadow-carte"
            >
                <h2 id="titre-liste" className="sr-only">
                    {relire ? 'Leçons à relire' : 'Liste des leçons'}
                </h2>
                <div className="grid gap-3 border-b px-5 py-4">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <SearchInput
                            libelle="Rechercher une leçon"
                            placeholder="Titre, notion ou chapitre…"
                            valeur={filtres.recherche}
                            onRecherche={(recherche) => filtrer({ recherche })}
                        />
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
                                libelle="Tous"
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

                {lecons.donnees.length === 0 ? (
                    <div className="p-5">
                        <VideListe
                            relire={relire}
                            filtre={
                                filtres.recherche !== '' ||
                                filtres.statut !== null ||
                                filtres.matiere !== null
                            }
                            peutRediger={peut('contenu.rediger')}
                            effacer={() =>
                                filtrer({
                                    recherche: '',
                                    statut: null,
                                    matiere: null,
                                })
                            }
                        />
                    </div>
                ) : (
                    <>
                        <ul className="divide-y">
                            {lecons.donnees.map((lecon) => (
                                <LigneLecon key={lecon.uuid} lecon={lecon} />
                            ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                            <p className="text-aide text-ink-500">
                                {pluriel(lecons.total, 'leçon')}
                            </p>
                            <Pagination
                                page={lecons.page}
                                derniere={lecons.derniere}
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

function LigneLecon({ lecon }: { lecon: LeconResume }) {
    return (
        <li className="relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-craie-100/50 sm:items-center dark:hover:bg-white/[0.02]">
            <TuileMatiere teinte={lecon.matiere.teinte} taille="grande" />
            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="grid min-w-0 gap-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                            href={show(lecon.uuid)}
                            prefetch
                            className="font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                        >
                            {lecon.titre}
                        </Link>
                        {lecon.est_exemple && (
                            <Badge variant="neutre">Exemple</Badge>
                        )}
                    </p>
                    <p className="truncate text-aide text-ink-500">
                        {lecon.matiere.nom} · {lecon.classe} · {lecon.chapitre}{' '}
                        › {lecon.notion}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <BadgeStatut statut={lecon.statut} />
                    {lecon.publiee && lecon.statut !== 'publie' && (
                        <span className="text-meta text-ink-500">
                            version en ligne
                        </span>
                    )}
                    <span
                        className="text-meta text-ink-500"
                        data-capture="variable"
                    >
                        {lecon.de_moi ? 'vous' : lecon.auteur} ·{' '}
                        {depuis(lecon.modifiee_le)}
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
                titre="Aucune leçon ne correspond"
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
                message="Les leçons envoyées en relecture par les autres rédacteurs apparaîtront ici."
                action={
                    <Button asChild variant="outline" taille="compacte">
                        <Link href={index()}>Voir toutes les leçons</Link>
                    </Button>
                }
                className="border-0 shadow-none"
            />
        );
    }

    return (
        <EtatVide
            illustration={Library}
            titre="Pas encore de leçon"
            message="Une leçon se rattache à une notion du programme. Écrivez la première."
            action={
                peutRediger ? (
                    <Button asChild taille="compacte">
                        <Link href={create()}>
                            <Plus aria-hidden />
                            Nouvelle leçon
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
