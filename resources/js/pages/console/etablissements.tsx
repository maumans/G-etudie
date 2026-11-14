import { Form, Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/ui/spinner';
import { TYPES_ETABLISSEMENT as TYPES } from '@/lib/etablissements';
import { pluriel } from '@/lib/utils';
import { index, show, store } from '@/routes/console/etablissements';

type Props = {
    filtres: { recherche: string };
    types: string[];
    etablissements: {
        donnees: {
            id: number;
            nom: string;
            type: string;
            commune: string | null;
            prefecture: string | null;
            groupes: number;
            gestionnaires: number;
            places: { places: number; prises: number } | null;
            est_exemple: boolean;
        }[];
        page: number;
        derniere: number;
        total: number;
    };
};

/**
 * Console › Établissements (lot 11, décision 3) : les écoles partenaires,
 * leur gestionnaire et leur licence. Créer un établissement ici.
 */
export default function Etablissements({
    filtres,
    types,
    etablissements,
}: Props) {
    const [recherche, setRecherche] = useState(filtres.recherche);
    const aller = (changement: Partial<Props['filtres']>) =>
        router.get(
            index().url,
            { ...filtres, recherche, ...changement },
            { preserveState: true, replace: true },
        );

    return (
        <>
            <Head title="Établissements" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {pluriel(
                            etablissements.total,
                            'établissement partenaire',
                            'établissements partenaires',
                        )}
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Les <strong>établissements</strong>
                    </h1>
                </header>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <section className="rounded-carte border bg-card shadow-carte">
                        <div className="border-b p-4">
                            <SearchInput
                                aria-label="Rechercher un établissement"
                                placeholder="Nom, commune ou préfecture"
                                valeur={recherche}
                                onValeur={setRecherche}
                                onRecherche={(terme) =>
                                    aller({ recherche: terme })
                                }
                            />
                        </div>
                        {etablissements.donnees.length === 0 ? (
                            <div className="p-5">
                                <EtatVide
                                    illustration={Building2}
                                    titre={
                                        filtres.recherche
                                            ? 'Aucun résultat'
                                            : 'Aucun établissement'
                                    }
                                    message={
                                        filtres.recherche
                                            ? 'Aucun établissement ne correspond.'
                                            : 'Le premier partenaire se crée avec le formulaire à côté.'
                                    }
                                    action={
                                        <Button
                                            variant="outline"
                                            taille="compacte"
                                            onClick={() => {
                                                setRecherche('');
                                                aller({ recherche: '' });
                                            }}
                                        >
                                            Tout afficher
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {etablissements.donnees.map((e) => (
                                    <li key={e.id}>
                                        <Link
                                            href={show(e.id)}
                                            prefetch
                                            className="flex items-center gap-3 p-4 outline-none hover:bg-craie-100/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5 dark:hover:bg-relief/50"
                                        >
                                            <span
                                                aria-hidden
                                                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                            >
                                                <Building2 className="size-5" />
                                            </span>
                                            <span className="grid min-w-0 flex-1 gap-0.5">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-semibold">
                                                        {e.nom}
                                                    </span>
                                                    <Badge>
                                                        {TYPES[e.type] ??
                                                            e.type}
                                                    </Badge>
                                                    {e.est_exemple && (
                                                        <Badge variant="soleil">
                                                            Exemple
                                                        </Badge>
                                                    )}
                                                    {e.gestionnaires === 0 && (
                                                        <Badge variant="indice">
                                                            Sans gestionnaire
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {[e.commune, e.prefecture]
                                                        .filter(Boolean)
                                                        .join(', ') ||
                                                        'Lieu non renseigné'}{' '}
                                                    ·{' '}
                                                    {pluriel(
                                                        e.groupes,
                                                        'groupe',
                                                    )}
                                                    {e.places &&
                                                        ` · ${e.places.prises}/${e.places.places} places`}
                                                </span>
                                            </span>
                                            <ChevronRight
                                                aria-hidden
                                                className="size-4 shrink-0 text-ink-400"
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {etablissements.derniere > 1 && (
                            <Pagination
                                page={etablissements.page}
                                derniere={etablissements.derniere}
                                lien={(page) =>
                                    index({ query: { ...filtres, page } }).url
                                }
                                className="border-t p-3"
                            />
                        )}
                    </section>

                    <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
                        <h2 className="text-[0.9375rem] font-semibold">
                            Nouvel établissement
                        </h2>
                        <Form {...store.form()} className="grid gap-4">
                            {({ processing, errors }) => (
                                <>
                                    <Champ libelle="Nom" erreur={errors.nom}>
                                        {(a) => (
                                            <Input
                                                {...a}
                                                name="nom"
                                                required
                                                maxLength={160}
                                            />
                                        )}
                                    </Champ>
                                    <Champ libelle="Type" erreur={errors.type}>
                                        {(a) => (
                                            <ListeDeroulante
                                                {...a}
                                                name="type"
                                                defaultValue="prive"
                                            >
                                                {types.map((t) => (
                                                    <option key={t} value={t}>
                                                        {TYPES[t] ?? t}
                                                    </option>
                                                ))}
                                            </ListeDeroulante>
                                        )}
                                    </Champ>
                                    <Champ
                                        libelle="Commune"
                                        erreur={errors.commune}
                                    >
                                        {(a) => (
                                            <Input
                                                {...a}
                                                name="commune"
                                                maxLength={80}
                                            />
                                        )}
                                    </Champ>
                                    <Champ
                                        libelle="Préfecture"
                                        erreur={errors.prefecture}
                                    >
                                        {(a) => (
                                            <Input
                                                {...a}
                                                name="prefecture"
                                                maxLength={80}
                                            />
                                        )}
                                    </Champ>
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Créer l’établissement
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>
                </div>
            </div>
        </>
    );
}
