import { Head, router } from '@inertiajs/react';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { formaterJourHeure } from '@/lib/dates';
import { cn, formaterGnf, formaterNombre } from '@/lib/utils';
import { index } from '@/routes/console/paiements';

type Statut = 'en_attente' | 'reussi' | 'echoue' | 'expire';

type Props = {
    filtres: { statut: Statut | null; recherche: string };
    statuts: { cle: Statut; libelle: string }[];
    bilan: {
        reussis: number;
        montant_gnf: number;
        en_attente: number;
        echoues: number;
    };
    paiements: {
        donnees: {
            uuid: string;
            eleve: string;
            formule: string;
            moyen: string;
            montant_gnf: number;
            numero: string;
            reference: string | null;
            statut: Statut;
            libelle_statut: string;
            motif: string | null;
            initie_le: string;
        }[];
        page: number;
        derniere: number;
        total: number;
    };
};

const VARIANTE = {
    en_attente: 'indice',
    reussi: 'juste',
    echoue: 'faux',
    expire: 'neutre',
} as const;

/**
 * Console › Paiements (lot 9) : pour l'assistance. Jamais le numéro du
 * payeur en clair. Les revenus détaillés arrivent au lot 13.
 */
export default function Paiements({
    filtres,
    statuts,
    bilan,
    paiements,
}: Props) {
    const [recherche, setRecherche] = useState(filtres.recherche);
    // CLAUDE.md § 4 : `filtres` d'abord, ce que la page contrôle ensuite.
    const aller = (changement: Partial<Props['filtres']>) =>
        router.get(
            index().url,
            { ...filtres, recherche, ...changement },
            { preserveState: true, replace: true },
        );

    return (
        <>
            <Head title="Paiements" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        30 derniers jours
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Les <strong>paiements</strong>
                    </h1>
                </header>

                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        {
                            libelle: 'Encaissé',
                            valeur: formaterGnf(bilan.montant_gnf),
                        },
                        {
                            libelle: 'Paiements réussis',
                            valeur: formaterNombre(bilan.reussis),
                        },
                        {
                            libelle: 'En attente',
                            valeur: formaterNombre(bilan.en_attente),
                        },
                        {
                            libelle: 'Échoués ou expirés',
                            valeur: formaterNombre(bilan.echoues),
                        },
                    ].map((c) => (
                        <div
                            key={c.libelle}
                            className="grid gap-1 rounded-carte border bg-card p-4 shadow-carte"
                        >
                            <dt className="text-aide text-ink-500">
                                {c.libelle}
                            </dt>
                            <dd className="text-[1.375rem] leading-tight font-bold font-data">
                                {c.valeur}
                            </dd>
                        </div>
                    ))}
                </dl>

                <section className="rounded-carte border bg-card shadow-carte">
                    <div className="flex flex-wrap items-center gap-3 border-b p-4">
                        <div className="min-w-0 flex-1 basis-60">
                            <SearchInput
                                aria-label="Rechercher un paiement"
                                placeholder="Référence, prénom ou pseudo"
                                valeur={recherche}
                                onValeur={setRecherche}
                                onRecherche={(terme) =>
                                    aller({ recherche: terme })
                                }
                            />
                        </div>
                        <div
                            role="group"
                            aria-label="Statut"
                            className="flex flex-wrap gap-1.5"
                        >
                            {[{ cle: null, libelle: 'Tous' }, ...statuts].map(
                                (s) => (
                                    <Button
                                        key={s.cle ?? 'tous'}
                                        taille="petite"
                                        variant={
                                            filtres.statut === s.cle
                                                ? 'encre'
                                                : 'ghost'
                                        }
                                        aria-pressed={filtres.statut === s.cle}
                                        onClick={() => aller({ statut: s.cle })}
                                    >
                                        {s.libelle}
                                    </Button>
                                ),
                            )}
                        </div>
                    </div>
                    {paiements.donnees.length === 0 ? (
                        <div className="p-5">
                            <EtatVide
                                illustration={ReceiptText}
                                titre="Aucun paiement"
                                message="Aucun paiement ne correspond à ces filtres."
                                action={
                                    <Button
                                        variant="outline"
                                        taille="compacte"
                                        onClick={() => {
                                            setRecherche('');
                                            aller({
                                                statut: null,
                                                recherche: '',
                                            });
                                        }}
                                    >
                                        Tout afficher
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {paiements.donnees.map((p) => (
                                <li
                                    key={p.uuid}
                                    className="grid gap-1 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"
                                >
                                    <div className="grid min-w-0 gap-0.5">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold">
                                                {p.eleve}
                                            </span>
                                            <Badge variant={VARIANTE[p.statut]}>
                                                {p.libelle_statut}
                                            </Badge>
                                        </p>
                                        <p className="truncate text-aide text-ink-500">
                                            {p.formule} · {p.moyen} · {p.numero}{' '}
                                            · {formaterJourHeure(p.initie_le)}
                                        </p>
                                        <p
                                            className={cn(
                                                'truncate text-meta text-ink-500 font-data',
                                                p.motif &&
                                                    'text-faux-700 dark:text-faux-400',
                                            )}
                                        >
                                            {p.motif ?? p.reference ?? '—'}
                                        </p>
                                    </div>
                                    <p className="font-semibold font-data sm:text-right">
                                        {formaterGnf(p.montant_gnf)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                    {paiements.derniere > 1 && (
                        <Pagination
                            page={paiements.page}
                            derniere={paiements.derniere}
                            lien={(page) =>
                                index({ query: { ...filtres, page } }).url
                            }
                            className="border-t p-3"
                        />
                    )}
                </section>
            </div>
        </>
    );
}
