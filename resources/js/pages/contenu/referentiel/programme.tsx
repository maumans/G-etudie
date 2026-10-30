import { Link, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    ListTree,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
    EnteteEcran,
    OngletsReferentiel,
} from '@/components/contenu/entete-ecran';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import type { CleMatiere } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import {
    deplacer as deplacerChapitre,
    destroy as supprimerChapitre,
    store as ajouterChapitre,
    update as renommerChapitre,
} from '@/routes/contenu/referentiel/chapitres';
import {
    deplacer as deplacerNotion,
    destroy as supprimerNotion,
    store as ajouterNotion,
    update as renommerNotion,
} from '@/routes/contenu/referentiel/notions';
import { index } from '@/routes/contenu/referentiel/programme';

type Notion = {
    id: number;
    titre: string;
    est_exemple: boolean;
    lecons: number;
};

type Chapitre = {
    id: number;
    titre: string;
    est_exemple: boolean;
    notions: Notion[];
};

type Props = {
    classes: { id: number; nom: string }[];
    classe_id: number | null;
    matieres: {
        id: number;
        nom: string;
        teinte: CleMatiere;
        chapitres: number;
    }[];
    matiere_id: number | null;
    chapitres: Chapitre[];
};

/**
 * Référentiel › Programme : chapitres et notions d'une matière pour une
 * classe d'examen, saisis par l'équipe pédagogique (CLAUDE.md § 5).
 */
export default function Programme({
    classes,
    classe_id,
    matieres,
    matiere_id,
    chapitres,
}: Props) {
    const matiere = matieres.find((m) => m.id === matiere_id);
    const classe = classes.find((c) => c.id === classe_id);
    const champChapitre = useRef<HTMLInputElement>(null);
    const notions = chapitres.reduce((n, c) => n + c.notions.length, 0);
    const exemple = chapitres.some(
        (c) => c.est_exemple || c.notions.some((n) => n.est_exemple),
    );
    const adresse = (q: { classe?: number; matiere?: number }) =>
        index({
            query: { classe: classe_id, matiere: matiere_id, ...q },
        });

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Programme · Référentiel"
                titre={
                    <>
                        Le <strong>référentiel</strong> pédagogique
                    </>
                }
                description="Le programme officiel découpé en chapitres et en notions : chaque leçon, chaque question s'y rattache."
                action={
                    <Button
                        onClick={() => champChapitre.current?.focus()}
                        disabled={!matiere || !classe}
                    >
                        <Plus aria-hidden />
                        Ajouter un chapitre
                    </Button>
                }
            >
                <OngletsReferentiel />
            </EnteteEcran>

            <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <aside className="grid content-start gap-4">
                    <div className="grid gap-1.5">
                        <p
                            id="titre-classe"
                            className="text-meta font-medium text-ink-500"
                        >
                            Classe d'examen
                        </p>
                        <nav
                            aria-labelledby="titre-classe"
                            className="grid grid-cols-3 gap-0.5 rounded-controle bg-craie-100 p-1 lg:grid-cols-1"
                        >
                            {classes.map((c) => {
                                const actif = c.id === classe_id;

                                return (
                                    <Link
                                        key={c.id}
                                        href={adresse({ classe: c.id })}
                                        preserveScroll
                                        prefetch
                                        aria-current={
                                            actif ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex h-8 items-center justify-center rounded-[7px] px-2 text-aide font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring lg:justify-start',
                                            actif
                                                ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                                : 'text-ink-600 hover:text-ink-900',
                                        )}
                                    >
                                        {c.nom}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="grid gap-1.5">
                        <p
                            id="titre-matiere"
                            className="text-meta font-medium text-ink-500"
                        >
                            Matière
                        </p>
                        <nav
                            aria-labelledby="titre-matiere"
                            className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:grid lg:gap-0.5 lg:px-0"
                        >
                            {matieres.map((m) => {
                                const actif = m.id === matiere_id;

                                return (
                                    <Link
                                        key={m.id}
                                        href={adresse({ matiere: m.id })}
                                        preserveScroll
                                        prefetch
                                        aria-current={
                                            actif ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex h-10 shrink-0 items-center gap-2.5 rounded-controle border px-2 text-interface font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring lg:border-transparent',
                                            actif
                                                ? 'border-ink-900/15 bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                                : 'border-contour bg-card text-ink-600 hover:text-ink-900 lg:bg-transparent lg:hover:bg-ink-900/[0.04]',
                                        )}
                                    >
                                        <TuileMatiere
                                            teinte={m.teinte}
                                            taille="petite"
                                        />
                                        <span className="truncate">
                                            {m.nom}
                                        </span>
                                        <span className="ml-auto pl-1 text-meta text-ink-500 font-data">
                                            {m.chapitres}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <div className="grid content-start gap-4">
                    {matiere && classe && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-carte border bg-card px-5 py-4 shadow-carte">
                            <div className="flex min-w-0 items-center gap-3">
                                <TuileMatiere
                                    teinte={matiere.teinte}
                                    taille="grande"
                                />
                                <div className="grid min-w-0 gap-0.5">
                                    <h2 className="truncate text-titre-carte font-semibold">
                                        {matiere.nom} · {classe.nom}
                                    </h2>
                                    <p className="text-aide text-ink-500">
                                        {pluriel(chapitres.length, 'chapitre')}
                                        {' · '}
                                        {pluriel(notions, 'notion')}
                                    </p>
                                </div>
                            </div>
                            {exemple && (
                                <Badge variant="soleil">
                                    Contient des exemples fictifs
                                </Badge>
                            )}
                        </div>
                    )}

                    {chapitres.length === 0 && matiere && classe && (
                        <EtatVide
                            illustration={ListTree}
                            titre={`Pas encore de programme en ${matiere.nom}`}
                            message={`Saisissez les chapitres du programme de ${classe.nom}, puis leurs notions, dans l'ordre du cours.`}
                            action={
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    onClick={() =>
                                        champChapitre.current?.focus()
                                    }
                                >
                                    <Plus aria-hidden />
                                    Premier chapitre
                                </Button>
                            }
                        />
                    )}

                    <ol className="grid gap-4">
                        {chapitres.map((chapitre, rang) => (
                            <CarteChapitre
                                key={chapitre.id}
                                chapitre={chapitre}
                                rang={rang}
                                dernier={rang === chapitres.length - 1}
                            />
                        ))}
                    </ol>

                    {matiere && classe && (
                        <FormulaireTitre
                            refChamp={champChapitre}
                            libelle="Nouveau chapitre"
                            placeholder="Titre du chapitre"
                            bouton="Ajouter le chapitre"
                            envoyer={(titre, fini) =>
                                router.post(
                                    ajouterChapitre().url,
                                    {
                                        titre,
                                        matiere_id: matiere.id,
                                        classe_id: classe.id,
                                    },
                                    { preserveScroll: true, onSuccess: fini },
                                )
                            }
                            className="rounded-carte border border-dashed border-contour p-4"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function CarteChapitre({
    chapitre,
    rang,
    dernier,
}: {
    chapitre: Chapitre;
    rang: number;
    dernier: boolean;
}) {
    const confirmer = useConfirmer();
    const [renomme, setRenomme] = useState(false);

    async function supprimer() {
        if (
            await confirmer({
                titre: `Supprimer le chapitre « ${chapitre.titre} » ?`,
                message: 'Seul un chapitre sans notion peut être supprimé.',
                action: 'Supprimer',
                ton: 'danger',
            })
        ) {
            router.delete(supprimerChapitre(chapitre.id).url, {
                preserveScroll: true,
                onError: (e) =>
                    toast.error(e.chapitre ?? 'Suppression impossible.'),
            });
        }
    }

    return (
        <li className="rounded-carte border bg-card shadow-carte">
            <div className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                    {rang + 1}
                </span>
                {renomme ? (
                    <EditionTitre
                        initial={chapitre.titre}
                        libelle="Titre du chapitre"
                        envoyer={(titre, fini) =>
                            router.put(
                                renommerChapitre(chapitre.id).url,
                                { titre },
                                { preserveScroll: true, onSuccess: fini },
                            )
                        }
                        fermer={() => setRenomme(false)}
                    />
                ) : (
                    <>
                        <h3 className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-semibold">
                            <span className="min-w-0">{chapitre.titre}</span>
                            {chapitre.est_exemple && (
                                <Badge variant="soleil">Exemple</Badge>
                            )}
                        </h3>
                        <Actions
                            nom={`le chapitre ${chapitre.titre}`}
                            premier={rang === 0}
                            dernier={dernier}
                            deplacer={(sens) =>
                                router.post(
                                    deplacerChapitre(chapitre.id).url,
                                    { sens },
                                    { preserveScroll: true },
                                )
                            }
                            renommer={() => setRenomme(true)}
                            supprimer={() => void supprimer()}
                        />
                    </>
                )}
            </div>
            <ol className="divide-y border-t">
                {chapitre.notions.map((notion, position) => (
                    <LigneNotion
                        key={notion.id}
                        notion={notion}
                        numero={`${rang + 1}.${position + 1}`}
                        premier={position === 0}
                        dernier={position === chapitre.notions.length - 1}
                    />
                ))}
            </ol>
            <FormulaireTitre
                libelle={`Nouvelle notion du chapitre ${rang + 1}`}
                placeholder="Ajouter une notion"
                bouton="Ajouter"
                compact
                envoyer={(titre, fini) =>
                    router.post(
                        ajouterNotion(chapitre.id).url,
                        { titre },
                        { preserveScroll: true, onSuccess: fini },
                    )
                }
                className="border-t px-5 py-3"
            />
        </li>
    );
}

function LigneNotion({
    notion,
    numero,
    premier,
    dernier,
}: {
    notion: Notion;
    numero: string;
    premier: boolean;
    dernier: boolean;
}) {
    const confirmer = useConfirmer();
    const [renomme, setRenomme] = useState(false);

    async function supprimer() {
        if (
            await confirmer({
                titre: `Supprimer la notion « ${notion.titre} » ?`,
                message:
                    'Une notion qui porte des leçons ne peut pas être supprimée.',
                action: 'Supprimer',
                ton: 'danger',
            })
        ) {
            router.delete(supprimerNotion(notion.id).url, {
                preserveScroll: true,
                onError: (e) =>
                    toast.error(e.notion ?? 'Suppression impossible.'),
            });
        }
    }

    return (
        <li className="flex min-h-12 items-center gap-3 py-2 pr-5 pl-[3.75rem]">
            <span className="w-8 shrink-0 text-meta text-ink-500 font-data">
                {numero}
            </span>
            {renomme ? (
                <EditionTitre
                    initial={notion.titre}
                    libelle="Titre de la notion"
                    envoyer={(titre, fini) =>
                        router.put(
                            renommerNotion(notion.id).url,
                            { titre },
                            { preserveScroll: true, onSuccess: fini },
                        )
                    }
                    fermer={() => setRenomme(false)}
                />
            ) : (
                <>
                    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="min-w-0">{notion.titre}</span>
                        {notion.est_exemple && (
                            <Badge variant="soleil">Exemple</Badge>
                        )}
                        {notion.lecons > 0 && (
                            <span className="text-meta text-ink-500">
                                {pluriel(notion.lecons, 'leçon')}
                            </span>
                        )}
                    </p>
                    <Actions
                        nom={`la notion ${notion.titre}`}
                        premier={premier}
                        dernier={dernier}
                        deplacer={(sens) =>
                            router.post(
                                deplacerNotion(notion.id).url,
                                { sens },
                                { preserveScroll: true },
                            )
                        }
                        renommer={() => setRenomme(true)}
                        supprimer={() => void supprimer()}
                    />
                </>
            )}
        </li>
    );
}

function Actions({
    nom,
    premier,
    dernier,
    deplacer,
    renommer,
    supprimer,
}: {
    nom: string;
    premier: boolean;
    dernier: boolean;
    deplacer: (sens: -1 | 1) => void;
    renommer: () => void;
    supprimer: () => void;
}) {
    return (
        <div className="flex shrink-0 gap-0.5">
            <Button
                variant="ghost"
                taille="icone-compacte"
                aria-label={`Monter ${nom}`}
                disabled={premier}
                onClick={() => deplacer(-1)}
                className="hidden sm:inline-flex"
            >
                <ArrowUp aria-hidden />
            </Button>
            <Button
                variant="ghost"
                taille="icone-compacte"
                aria-label={`Descendre ${nom}`}
                disabled={dernier}
                onClick={() => deplacer(1)}
                className="hidden sm:inline-flex"
            >
                <ArrowDown aria-hidden />
            </Button>
            <Button
                variant="ghost"
                taille="icone-compacte"
                aria-label={`Renommer ${nom}`}
                onClick={renommer}
            >
                <Pencil aria-hidden />
            </Button>
            <Button
                variant="ghost"
                taille="icone-compacte"
                aria-label={`Supprimer ${nom}`}
                className="text-ink-500 hover:bg-faux-600/[0.08] hover:text-faux-600 dark:hover:text-faux-400"
                onClick={supprimer}
            >
                <Trash2 aria-hidden />
            </Button>
        </div>
    );
}

/** Saisie d'un titre sur une ligne (ajout d'un chapitre ou d'une notion). */
function FormulaireTitre({
    libelle,
    placeholder,
    bouton,
    envoyer,
    compact = false,
    refChamp,
    className,
}: {
    libelle: string;
    placeholder: string;
    bouton: string;
    envoyer: (titre: string, fini: () => void) => void;
    compact?: boolean;
    refChamp?: React.Ref<HTMLInputElement>;
    className?: string;
}) {
    const form = useForm({ titre: '' });

    function soumettre(evenement: FormEvent) {
        evenement.preventDefault();

        if (form.data.titre.trim() !== '') {
            envoyer(form.data.titre.trim(), () => form.reset());
        }
    }

    return (
        <form onSubmit={soumettre} className={cn('flex gap-2', className)}>
            <Input
                ref={refChamp}
                aria-label={libelle}
                placeholder={placeholder}
                value={form.data.titre}
                onChange={(e) => form.setData('titre', e.target.value)}
                maxLength={160}
                taille={compact ? 'compacte' : 'normale'}
                className={cn(
                    compact &&
                        'border-transparent shadow-none hover:border-input',
                )}
            />
            <Button
                type="submit"
                variant="outline"
                taille={compact ? 'compacte' : 'normale'}
                disabled={form.data.titre.trim() === ''}
            >
                <Plus aria-hidden />
                <span className={cn(compact && 'sr-only sm:not-sr-only')}>
                    {bouton}
                </span>
            </Button>
        </form>
    );
}

function EditionTitre({
    initial,
    libelle,
    envoyer,
    fermer,
}: {
    initial: string;
    libelle: string;
    envoyer: (titre: string, fini: () => void) => void;
    fermer: () => void;
}) {
    const [titre, setTitre] = useState(initial);

    return (
        <form
            className="flex min-w-0 flex-1 gap-1.5"
            onSubmit={(e) => {
                e.preventDefault();

                if (titre.trim() !== '') {
                    envoyer(titre.trim(), fermer);
                }
            }}
        >
            <Input
                aria-label={libelle}
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && fermer()}
                maxLength={160}
                taille="compacte"
                autoFocus
            />
            <Button
                type="submit"
                taille="icone-compacte"
                aria-label="Enregistrer"
            >
                <Check aria-hidden />
            </Button>
            <Button
                type="button"
                variant="ghost"
                taille="icone-compacte"
                aria-label="Annuler"
                onClick={fermer}
            >
                <X aria-hidden />
            </Button>
        </form>
    );
}
