import { Head, Link } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { Pagination } from '@/components/ui/pagination';
import { LigneSujet } from '@/components/vitrine/ligne-sujet';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import type { CarteSujet } from '@/lib/vitrine';
import { register } from '@/routes';
import { index } from '@/routes/vitrine/sujets';

type Filtres = { examen: string | null; matiere: string | null };

type Props = {
    filtres: Filtres;
    examens: { cle: string; libelle: string; sujets: number }[];
    matieres: { slug: string; nom: string; cle: CleMatiere }[];
    sujets: {
        donnees: CarteSujet[];
        page: number;
        derniere: number;
        total: number;
    };
    est_exemple: boolean;
};

/** L'adresse de la liste : les filtres en cours d'abord, puis ce qu'on change (CLAUDE.md § 4). */
function adresse(
    filtres: Filtres,
    changement: Partial<Filtres> & { page?: number },
) {
    const requete = { ...filtres, ...changement };

    return index({
        query: Object.fromEntries(
            Object.entries(requete).filter(
                ([, valeur]) => valeur !== null && valeur !== 1,
            ),
        ),
    });
}

/**
 * Les annales publiques (lot 8) : par examen et par matière, de la session
 * la plus récente à la plus ancienne. Ce que les élèves cherchent dans
 * Google mène ici ; chaque ligne ouvre l'énoncé.
 */
export default function Sujets({
    filtres,
    examens,
    matieres,
    sujets,
    est_exemple,
}: Props) {
    const totalExamens = examens.reduce((t, e) => t + e.sujets, 0);

    return (
        <>
            <Head title="Annales du CEE, du BEPC et du Bac" />
            <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-20 sm:px-6 lg:px-8 lg:pt-12 lg:pb-28">
                <header className="grid max-w-3xl gap-3">
                    <h1 className="text-[2rem] leading-[1.08] titre-contraste sm:text-[2.75rem]">
                        Les annales, <strong>du CEE au Bac</strong>
                    </h1>
                    <p className="text-[1.0625rem] leading-relaxed text-ink-600">
                        L’énoncé de chaque sujet, en clair, par examen et par
                        matière. Le corrigé pas à pas et l’entraînement sont
                        réservés aux inscrits, gratuitement.
                    </p>
                </header>

                {est_exemple && <BandeauExemple />}

                <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
                    <nav
                        aria-label="Filtrer les annales"
                        className="grid content-start gap-6"
                    >
                        <GroupeFiltres titre="Examen">
                            <Filtre
                                href={adresse(filtres, {
                                    examen: null,
                                    page: 1,
                                })}
                                actif={filtres.examen === null}
                                compte={totalExamens}
                            >
                                Tous les examens
                            </Filtre>
                            {examens.map((examen) => (
                                <Filtre
                                    key={examen.cle}
                                    href={adresse(filtres, {
                                        examen: examen.cle,
                                        page: 1,
                                    })}
                                    actif={filtres.examen === examen.cle}
                                    compte={examen.sujets}
                                >
                                    {examen.libelle}
                                </Filtre>
                            ))}
                        </GroupeFiltres>
                        {matieres.length > 1 && (
                            <GroupeFiltres titre="Matière">
                                <Filtre
                                    href={adresse(filtres, {
                                        matiere: null,
                                        page: 1,
                                    })}
                                    actif={filtres.matiere === null}
                                >
                                    Toutes les matières
                                </Filtre>
                                {matieres.map((matiere) => {
                                    const style = MATIERES[matiere.cle];

                                    return (
                                        <Filtre
                                            key={matiere.slug}
                                            href={adresse(filtres, {
                                                matiere: matiere.slug,
                                                page: 1,
                                            })}
                                            actif={
                                                filtres.matiere === matiere.slug
                                            }
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'flex size-5 items-center justify-center rounded-[5px]',
                                                    style.tuile,
                                                )}
                                            >
                                                <style.icone className="size-3" />
                                            </span>
                                            {matiere.nom}
                                        </Filtre>
                                    );
                                })}
                            </GroupeFiltres>
                        )}
                    </nav>

                    <section
                        aria-labelledby="titre-liste"
                        className="grid content-start gap-4"
                    >
                        <h2 id="titre-liste" className="text-aide text-ink-500">
                            {sujets.total === 0
                                ? 'Aucun sujet'
                                : pluriel(sujets.total, 'sujet')}
                        </h2>
                        {sujets.total === 0 ? (
                            <EtatVide
                                illustration={FileText}
                                titre="Pas encore de sujet publié ici"
                                message="Les annales sont publiées au fur et à mesure, dès que leur autorisation de publication est signée. Inscrivez-vous : les cours et les exercices vous attendent déjà."
                                action={
                                    <Button asChild>
                                        <Link href={register()} prefetch>
                                            Créer un compte gratuit
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <ul className="rounded-carte border bg-card px-4 shadow-carte sm:px-5">
                                {sujets.donnees.map((sujet) => (
                                    <LigneSujet
                                        key={sujet.slug}
                                        sujet={sujet}
                                    />
                                ))}
                            </ul>
                        )}
                        {sujets.derniere > 1 && (
                            <Pagination
                                page={sujets.page}
                                derniere={sujets.derniere}
                                lien={(numero) =>
                                    adresse(filtres, { page: numero }).url
                                }
                            />
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

function GroupeFiltres({
    titre,
    children,
}: {
    titre: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <p className="text-aide font-medium text-ink-500">{titre}</p>
            <ul className="flex flex-wrap gap-1.5 lg:grid lg:gap-0.5">
                {children}
            </ul>
        </div>
    );
}

function Filtre({
    href,
    actif,
    compte,
    children,
}: {
    href: ReturnType<typeof index>;
    actif: boolean;
    compte?: number;
    children: ReactNode;
}) {
    return (
        <li>
            <Link
                href={href}
                preserveScroll
                prefetch
                aria-current={actif ? 'page' : undefined}
                className={cn(
                    'flex min-h-9 items-center gap-2 rounded-[8px] border px-3 text-interface transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring lg:border-transparent',
                    actif
                        ? 'border-ink-900 bg-relief font-medium text-ink-900 ring-1 ring-black/5 lg:border-transparent'
                        : 'bg-card text-ink-600 hover:text-ink-900 lg:bg-transparent lg:hover:bg-relief',
                )}
            >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                    {children}
                </span>
                {compte !== undefined && (
                    <span className="text-meta text-ink-500 font-data">
                        {compte}
                    </span>
                )}
            </Link>
        </li>
    );
}
