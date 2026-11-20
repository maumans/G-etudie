import { Head, router } from '@inertiajs/react';
import {
    Building2,
    KeyRound,
    MessagesSquare,
    ScrollText,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChiffreCle } from '@/components/console/graphiques';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { formaterJourHeure } from '@/lib/dates';
import { cn, formaterNombre } from '@/lib/utils';
import { index } from '@/routes/console/journal';

type Filtres = {
    action: string | null;
    recherche: string;
    du: string | null;
    au: string | null;
};

type Props = {
    filtres: Filtres;
    actions: { cle: string; libelle: string }[];
    bilan: { aujourdhui: number; semaine: number; comptes: number };
    entrees: {
        donnees: {
            id: number;
            action: string;
            libelle: string;
            famille:
                | 'compte'
                | 'argent'
                | 'organisation'
                | 'communaute'
                | 'console';
            auteur: string | null;
            cible: string | null;
            ip: string | null;
            appareil: string | null;
            le: string;
        }[];
        page: number;
        derniere: number;
        total: number;
    };
};

const FAMILLES: Record<
    Props['entrees']['donnees'][number]['famille'],
    { icone: LucideIcon; tuile: string; libelle: string }
> = {
    compte: {
        icone: KeyRound,
        tuile: 'bg-nimba-600/[0.12] text-nimba-700 dark:bg-nimba-300/15 dark:text-nimba-300',
        libelle: 'Compte',
    },
    argent: {
        icone: Wallet,
        tuile: 'bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400',
        libelle: 'Abonnement et codes',
    },
    organisation: {
        icone: Building2,
        tuile: 'bg-indice-400/25 text-indice-700 dark:bg-indice-400/15 dark:text-indice-400',
        libelle: 'Établissements et parents',
    },
    communaute: {
        icone: MessagesSquare,
        tuile: 'bg-ink-600/[0.10] text-ink-600 dark:bg-ink-400/20 dark:text-ink-600',
        libelle: 'Fil des groupes',
    },
    console: {
        icone: ShieldCheck,
        tuile: 'bg-ink-900 text-craie-50',
        libelle: 'Console',
    },
};

/**
 * Console › Journal des accès (PLAN M18, CLAUDE.md § 9) : les gestes
 * sensibles de toute la plateforme, les plus récents d'abord. Une liste en
 * filets ; chaque ligne dit quoi, qui, sur quoi, d'où et quand.
 */
export default function Journal({ filtres, actions, bilan, entrees }: Props) {
    function filtrer(modif: Partial<Filtres>) {
        const suivant = { ...filtres, ...modif };
        const requete = Object.fromEntries(
            Object.entries(suivant).filter(([, v]) => v !== null && v !== ''),
        );
        router.get(index().url, requete, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const lien = (page: number) =>
        index({
            query: {
                ...Object.fromEntries(
                    Object.entries(filtres).filter(
                        ([, v]) => v !== null && v !== '',
                    ),
                ),
                page,
            },
        }).url;

    return (
        <>
            <Head title="Journal des accès" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        Comptes, argent, établissements, modération
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Le <strong>journal</strong> des accès sensibles
                    </h1>
                </header>

                <dl className="grid grid-cols-3 gap-3 sm:gap-4">
                    <ChiffreCle
                        libelle="Aujourd’hui"
                        variable
                        valeur={formaterNombre(bilan.aujourdhui)}
                    />
                    <ChiffreCle
                        libelle="Sur 7 jours"
                        variable
                        valeur={formaterNombre(bilan.semaine)}
                    />
                    <ChiffreCle
                        libelle="Comptes, 7 jours"
                        variable
                        valeur={formaterNombre(bilan.comptes)}
                    />
                </dl>

                <div className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
                    <Champ libelle="Auteur ou adresse IP">
                        {(a) => (
                            <SearchInput
                                {...a}
                                valeur={filtres.recherche}
                                libelle="Rechercher un auteur ou une adresse IP"
                                placeholder="Prénom, pseudo, IP…"
                                onRecherche={(recherche) =>
                                    filtrer({ recherche })
                                }
                            />
                        )}
                    </Champ>
                    <Champ libelle="Action">
                        {(a) => (
                            <ListeDeroulante
                                {...a}
                                taille="compacte"
                                value={filtres.action ?? ''}
                                onChange={(e) =>
                                    filtrer({ action: e.target.value || null })
                                }
                            >
                                <option value="">Toutes les actions</option>
                                {actions.map((x) => (
                                    <option key={x.cle} value={x.cle}>
                                        {x.libelle}
                                    </option>
                                ))}
                            </ListeDeroulante>
                        )}
                    </Champ>
                    <Champ libelle="Du">
                        {(a) => (
                            <Input
                                {...a}
                                type="date"
                                className="h-9"
                                value={filtres.du ?? ''}
                                onChange={(e) =>
                                    filtrer({ du: e.target.value || null })
                                }
                            />
                        )}
                    </Champ>
                    <Champ libelle="Au">
                        {(a) => (
                            <Input
                                {...a}
                                type="date"
                                className="h-9"
                                value={filtres.au ?? ''}
                                onChange={(e) =>
                                    filtrer({ au: e.target.value || null })
                                }
                            />
                        )}
                    </Champ>
                </div>

                <section
                    aria-labelledby="titre-entrees"
                    className="rounded-carte border bg-card shadow-carte"
                >
                    <h2
                        id="titre-entrees"
                        className="flex items-baseline justify-between gap-3 border-b px-5 py-4 text-[0.9375rem] font-semibold"
                    >
                        Entrées
                        <span className="text-aide font-normal text-ink-500">
                            {formaterNombre(entrees.total)} au total
                        </span>
                    </h2>
                    {entrees.donnees.length === 0 ? (
                        <div className="p-5">
                            <EtatVide
                                illustration={ScrollText}
                                titre="Aucune entrée"
                                message="Rien ne correspond à ces filtres."
                                action={
                                    <Button
                                        variant="outline"
                                        taille="compacte"
                                        onClick={() => router.get(index().url)}
                                    >
                                        Effacer les filtres
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <ol className="divide-y">
                            {entrees.donnees.map((e) => {
                                const famille = FAMILLES[e.famille];

                                return (
                                    <li
                                        key={e.id}
                                        className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'flex size-10 items-center justify-center rounded-[12px]',
                                                famille.tuile,
                                            )}
                                        >
                                            <famille.icone className="size-[18px]" />
                                        </span>
                                        <div className="grid min-w-0 gap-0.5">
                                            <p className="text-interface font-semibold">
                                                {e.libelle}
                                            </p>
                                            <p className="truncate text-meta text-ink-500">
                                                {e.auteur ?? 'Système'}
                                                {e.cible && ` · ${e.cible}`}
                                                {e.appareil &&
                                                    ` · ${e.appareil}`}
                                                {e.ip && (
                                                    <span className="font-data">
                                                        {' '}
                                                        · {e.ip}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <time
                                            dateTime={e.le}
                                            className="col-start-2 text-meta text-ink-600 font-data sm:col-start-auto"
                                            data-capture="variable"
                                        >
                                            {formaterJourHeure(e.le)}
                                        </time>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                    <Pagination
                        className="border-t px-5 py-3"
                        page={entrees.page}
                        derniere={entrees.derniere}
                        lien={lien}
                    />
                </section>
            </div>
        </>
    );
}
