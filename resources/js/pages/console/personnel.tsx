import { Head, router } from '@inertiajs/react';
import { ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { ChiffreCle } from '@/components/console/graphiques';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { depuis } from '@/lib/dates';
import { formaterNombre } from '@/lib/utils';
import { desactiver, index, reactiver } from '@/routes/console/personnel';

type Filtres = {
    role: string | null;
    statut: 'actifs' | 'desactives' | null;
    recherche: string;
};

type Compte = {
    id: number;
    nom: string;
    pseudo: string;
    telephone: string;
    roles: string[];
    double_authentification: boolean;
    derniere_activite: string | null;
    desactive_le: string | null;
    est_moi: boolean;
};

type Props = {
    filtres: Filtres;
    roles: { cle: string; libelle: string }[];
    bilan: {
        actifs: number;
        desactives: number;
        sans_double_authentification: number;
    };
    comptes: {
        donnees: Compte[];
        page: number;
        derniere: number;
        total: number;
    };
};

const requete = (f: Filtres) =>
    Object.fromEntries(
        Object.entries(f).filter(([, v]) => v !== null && v !== ''),
    );

/**
 * Console › Personnel (lot 13) : rédacteurs, relecteurs, responsables
 * pédagogiques, administrateurs, enseignants et gestionnaires. On y voit qui
 * a la double authentification et quand chacun est venu ; on désactive un
 * compte (ses sessions se ferment) ou on le réactive. Un compte qui a signé
 * du contenu ne se supprime pas.
 */
export default function Personnel({ filtres, roles, bilan, comptes }: Props) {
    const confirmer = useConfirmer();
    const [enCours, setEnCours] = useState<number | null>(null);

    function filtrer(modif: Partial<Filtres>) {
        router.get(index().url, requete({ ...filtres, ...modif }), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    async function basculer(compte: Compte) {
        const active = compte.desactive_le === null;

        if (
            active &&
            !(await confirmer({
                titre: `Désactiver le compte de ${compte.nom} ?`,
                message:
                    'Ses sessions se ferment tout de suite et la connexion lui est refusée. Ce qu’il a signé reste à son nom. Tu pourras le réactiver.',
                action: 'Désactiver le compte',
                ton: 'danger',
            }))
        ) {
            return;
        }

        router.post(
            (active ? desactiver(compte.id) : reactiver(compte.id)).url,
            {},
            {
                preserveScroll: true,
                onStart: () => setEnCours(compte.id),
                onFinish: () => setEnCours(null),
            },
        );
    }

    return (
        <>
            <Head title="Personnel" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        Back-office, console, enseignants, établissements
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Les comptes du <strong>personnel</strong>
                    </h1>
                </header>

                <dl className="grid grid-cols-3 gap-3 sm:gap-4">
                    <ChiffreCle
                        libelle="Actifs"
                        valeur={formaterNombre(bilan.actifs)}
                    />
                    <ChiffreCle
                        libelle="Désactivés"
                        valeur={formaterNombre(bilan.desactives)}
                    />
                    <ChiffreCle
                        libelle="Sans double authentification"
                        valeur={formaterNombre(
                            bilan.sans_double_authentification,
                        )}
                        note="parmi les actifs"
                    />
                </dl>

                <div className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <Champ libelle="Rechercher">
                        {(a) => (
                            <SearchInput
                                {...a}
                                valeur={filtres.recherche}
                                libelle="Rechercher un compte"
                                placeholder="Prénom, nom, pseudo…"
                                onRecherche={(recherche) =>
                                    filtrer({ recherche })
                                }
                            />
                        )}
                    </Champ>
                    <Champ libelle="Rôle">
                        {(a) => (
                            <ListeDeroulante
                                {...a}
                                taille="compacte"
                                value={filtres.role ?? ''}
                                onChange={(e) =>
                                    filtrer({ role: e.target.value || null })
                                }
                            >
                                <option value="">Tous les rôles</option>
                                {roles.map((r) => (
                                    <option key={r.cle} value={r.cle}>
                                        {r.libelle}
                                    </option>
                                ))}
                            </ListeDeroulante>
                        )}
                    </Champ>
                    <Champ libelle="État">
                        {(a) => (
                            <ListeDeroulante
                                {...a}
                                taille="compacte"
                                value={filtres.statut ?? ''}
                                onChange={(e) =>
                                    filtrer({
                                        statut: (e.target.value ||
                                            null) as Filtres['statut'],
                                    })
                                }
                            >
                                <option value="">Tous</option>
                                <option value="actifs">Actifs</option>
                                <option value="desactives">Désactivés</option>
                            </ListeDeroulante>
                        )}
                    </Champ>
                </div>

                <section
                    aria-labelledby="titre-comptes"
                    className="rounded-carte border bg-card shadow-carte"
                >
                    <h2
                        id="titre-comptes"
                        className="flex items-baseline justify-between gap-3 border-b px-5 py-4 text-[0.9375rem] font-semibold"
                    >
                        Comptes
                        <span className="text-aide font-normal text-ink-500">
                            {formaterNombre(comptes.total)}
                        </span>
                    </h2>
                    {comptes.donnees.length === 0 ? (
                        <div className="p-5">
                            <EtatVide
                                illustration={UserRound}
                                titre="Aucun compte"
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
                        <ul className="divide-y">
                            {comptes.donnees.map((c) => (
                                <li
                                    key={c.id}
                                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                                >
                                    <span
                                        aria-hidden
                                        className="flex size-10 items-center justify-center rounded-[12px] bg-craie-100 text-interface font-semibold text-ink-600"
                                    >
                                        {c.nom.charAt(0)}
                                    </span>
                                    <div className="grid min-w-0 gap-1">
                                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-interface font-semibold">
                                            {c.nom}
                                            {c.est_moi && (
                                                <Badge variant="nimba">
                                                    Toi
                                                </Badge>
                                            )}
                                            {c.desactive_le && (
                                                <Badge variant="faux">
                                                    Désactivé
                                                </Badge>
                                            )}
                                        </p>
                                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-500">
                                            <span>{c.roles.join(', ')}</span>
                                            <span aria-hidden>·</span>
                                            <span className="font-data">
                                                {c.telephone}
                                            </span>
                                            <span aria-hidden>·</span>
                                            {c.double_authentification ? (
                                                <span className="inline-flex items-center gap-1 text-juste-700 dark:text-juste-400">
                                                    <ShieldCheck
                                                        aria-hidden
                                                        className="size-3.5"
                                                    />{' '}
                                                    Double authentification
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-ink-600">
                                                    <ShieldAlert
                                                        aria-hidden
                                                        className="size-3.5"
                                                    />{' '}
                                                    Sans double authentification
                                                </span>
                                            )}
                                            <span aria-hidden>·</span>
                                            <span data-capture="variable">
                                                {c.derniere_activite
                                                    ? `vu ${depuis(c.derniere_activite)}`
                                                    : 'pas de session ouverte'}
                                            </span>
                                        </p>
                                    </div>
                                    {!c.est_moi && (
                                        <Button
                                            variant="outline"
                                            ton={
                                                c.desactive_le
                                                    ? 'neutre'
                                                    : 'danger'
                                            }
                                            taille="compacte"
                                            className="col-start-2 justify-self-start sm:col-start-auto"
                                            disabled={enCours === c.id}
                                            onClick={() => basculer(c)}
                                        >
                                            {c.desactive_le
                                                ? 'Réactiver'
                                                : 'Désactiver'}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <Pagination
                        className="border-t px-5 py-3"
                        page={comptes.page}
                        derniere={comptes.derniere}
                        lien={(page) =>
                            index({ query: { ...requete(filtres), page } }).url
                        }
                    />
                </section>
            </div>
        </>
    );
}
