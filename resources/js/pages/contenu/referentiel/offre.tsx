import { Form, Link, router } from '@inertiajs/react';
import { CircleAlert, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    EnteteEcran,
    OngletsReferentiel,
} from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/date-input';
import { useConfirmer } from '@/components/ui/confirm-provider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { NumberInput } from '@/components/ui/number-input';
import { ProgressionBarre } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import type { CleMatiere } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/contenu/referentiel/epreuves';
import { session as enregistrerSession } from '@/routes/contenu/referentiel/examens';
import { index as matieresIndex } from '@/routes/contenu/referentiel/matieres';

type Parcours = {
    cle: string;
    libelle: string;
    epreuves: number;
    phares: number;
    examen_id: number;
    session: string | null;
    /** Seuil du verdict des examens blancs (lot 5), vide tant que non saisi. */
    moyenne_admission: string | null;
};

type Epreuve = {
    id: number;
    matiere: { id: number; nom: string; teinte: CleMatiere };
    filiere: string;
    coefficient: string | null;
    duree_minutes: number | null;
    phare: boolean;
};

type Props = {
    annees: { id: number; libelle: string; courante: boolean }[];
    annee_id: number | null;
    parcours: Parcours[];
    parcours_cle: string;
    epreuves: Epreuve[];
    matieres: { id: number; nom: string; teinte: CleMatiere }[];
    filieres: { valeur: string; libelle: string }[];
};

/**
 * Référentiel › Épreuves : les matières de chaque examen, leurs coefficients
 * et durées (saisis par l'équipe pédagogique, jamais inventés) et les
 * matières phares (D1).
 */
export default function Offre(props: Props) {
    const { annees, annee_id, parcours, parcours_cle, epreuves, filieres } =
        props;
    const [edition, setEdition] = useState<Epreuve | 'nouvelle' | null>(null);
    const choisi = parcours.find((p) => p.cle === parcours_cle);
    const annee = annees.find((a) => a.id === annee_id);
    const saisies = epreuves.filter(
        (e) => e.coefficient !== null && e.duree_minutes !== null,
    ).length;
    const libelleFiliere = (valeur: string) =>
        filieres.find((f) => f.valeur === valeur)?.libelle ?? valeur;

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Épreuves · Référentiel"
                titre={
                    <>
                        Le <strong>référentiel</strong> pédagogique
                    </>
                }
                description="Chaque matière à chaque examen : coefficient, durée, priorité de rédaction."
                action={
                    <Button
                        onClick={() => setEdition('nouvelle')}
                        disabled={annee === undefined}
                    >
                        <Plus aria-hidden />
                        Ajouter une épreuve
                    </Button>
                }
            >
                <OngletsReferentiel />
            </EnteteEcran>

            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <nav
                    aria-label="Examen"
                    className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0"
                >
                    {parcours.map((p) => {
                        const actif = p.cle === parcours_cle;

                        return (
                            <Link
                                key={p.cle}
                                href={index({
                                    query: { annee: annee_id, parcours: p.cle },
                                })}
                                preserveScroll
                                prefetch
                                aria-current={actif ? 'page' : undefined}
                                className={cn(
                                    'flex h-9 shrink-0 items-center gap-2 rounded-controle border px-3 text-interface font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    actif
                                        ? 'border-ink-900 bg-ink-900 text-craie-50'
                                        : 'border-contour bg-card text-ink-600 hover:text-ink-900',
                                )}
                            >
                                {p.libelle}
                                <span
                                    className={cn(
                                        'text-meta font-data',
                                        actif
                                            ? 'text-craie-50/70'
                                            : 'text-ink-500',
                                    )}
                                >
                                    {p.epreuves}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
                {annees.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="annee"
                            className="text-aide font-medium text-ink-600"
                        >
                            Année
                        </label>
                        <ListeDeroulante
                            id="annee"
                            taille="compacte"
                            value={annee_id ?? ''}
                            onChange={(e) =>
                                router.get(
                                    index({
                                        query: {
                                            annee: e.target.value,
                                            parcours: parcours_cle,
                                        },
                                    }).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="w-48"
                        >
                            {annees.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.libelle}
                                    {a.courante ? ' (courante)' : ''}
                                </option>
                            ))}
                        </ListeDeroulante>
                    </div>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Section
                    id="epreuves"
                    titre={`Épreuves · ${choisi?.libelle ?? ''}`}
                    description={
                        annee
                            ? `Année ${annee.libelle} · ${pluriel(epreuves.length, 'matière')}, dont ${pluriel(choisi?.phares ?? 0, 'phare')}.`
                            : 'Ajoutez d’abord une année scolaire.'
                    }
                    contenuClassName="px-0 pb-1"
                >
                    {epreuves.length === 0 ? (
                        <div className="grid justify-items-center gap-3 border-t px-5 py-10 text-center">
                            <p className="max-w-sm text-ink-600">
                                Aucune matière à cet examen pour l'instant.
                            </p>
                            <Button
                                variant="outline"
                                taille="compacte"
                                onClick={() => setEdition('nouvelle')}
                                disabled={annee === undefined}
                            >
                                <Plus aria-hidden />
                                Ajouter une épreuve
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y border-t">
                            <li
                                aria-hidden
                                className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_2.25rem] gap-3 bg-craie-100/60 px-5 py-2 text-meta font-medium text-ink-500 sm:grid"
                            >
                                <span>Matière</span>
                                <span>Coefficient</span>
                                <span>Durée</span>
                                <span />
                            </li>
                            {epreuves.map((epreuve) => (
                                <LigneEpreuve
                                    key={epreuve.id}
                                    epreuve={epreuve}
                                    filiere={libelleFiliere(epreuve.filiere)}
                                    modifier={() => setEdition(epreuve)}
                                />
                            ))}
                        </ul>
                    )}
                </Section>

                <div className="grid content-start gap-6">
                    <section className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve">
                        <div className="grid gap-1">
                            <h2 className="text-[0.9375rem] font-semibold">
                                Données officielles
                            </h2>
                            <p className="text-aide text-white/75">
                                Coefficients et durées viennent de l'équipe
                                pédagogique, jamais d'une estimation. Tant
                                qu'ils manquent, la jauge et l'examen blanc ne
                                peuvent pas les utiliser.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <p className="flex items-baseline justify-between gap-2">
                                <span className="text-aide text-white/75">
                                    Saisies pour {choisi?.libelle}
                                </span>
                                <span className="text-[1.375rem] leading-none font-semibold font-data">
                                    {formaterNombre(saisies)}
                                    <span className="text-aide font-medium text-white/60">
                                        {' '}
                                        / {formaterNombre(epreuves.length)}
                                    </span>
                                </span>
                            </p>
                            <ProgressionBarre
                                valeur={
                                    epreuves.length === 0
                                        ? 0
                                        : (saisies / epreuves.length) * 100
                                }
                                libelle="Épreuves complètes"
                                className="bg-white/15"
                            />
                        </div>
                    </section>

                    {choisi && <SessionExamen parcours={choisi} />}

                    <Section titre="Matières phares">
                        <p className="text-aide text-ink-600">
                            Une matière phare est rédigée en premier : c'est la
                            priorité du lancement (décision D1), pas une donnée
                            officielle. Les autres matières viennent ensuite.
                        </p>
                        <ul className="mt-3 grid gap-1.5">
                            {parcours
                                .filter((p) => p.phares > 0)
                                .map((p) => (
                                    <li
                                        key={p.cle}
                                        className="flex items-center justify-between text-aide"
                                    >
                                        <span className="font-medium text-ink-900">
                                            {p.libelle}
                                        </span>
                                        <span className="text-ink-500">
                                            {pluriel(p.phares, 'phare')}
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    </Section>
                </div>
            </div>

            <DialogueEpreuve
                {...props}
                edition={edition}
                fermer={() => setEdition(null)}
            />
        </div>
    );
}

function LigneEpreuve({
    epreuve,
    filiere,
    modifier,
}: {
    epreuve: Epreuve;
    filiere: string;
    modifier: () => void;
}) {
    return (
        <li className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2.25rem]">
            <div className="flex min-w-0 items-center gap-3">
                <TuileMatiere teinte={epreuve.matiere.teinte} />
                <div className="grid min-w-0 gap-0.5">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <span className="truncate">{epreuve.matiere.nom}</span>
                        {epreuve.phare && (
                            <Badge variant="nimba">
                                <Star aria-hidden className="fill-current" />
                                Phare
                            </Badge>
                        )}
                    </p>
                    <p className="text-meta text-ink-500">
                        Filière {filiere.toLowerCase()}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                taille="icone-compacte"
                aria-label={`Modifier l'épreuve de ${epreuve.matiere.nom}`}
                onClick={modifier}
                className="sm:order-last"
            >
                <Pencil aria-hidden />
            </Button>
            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 pl-11 sm:contents">
                <Valeur
                    libelle="Coefficient"
                    valeur={
                        epreuve.coefficient === null
                            ? null
                            : formaterNombre(Number(epreuve.coefficient))
                    }
                />
                <Valeur
                    libelle="Durée"
                    valeur={
                        epreuve.duree_minutes === null
                            ? null
                            : formaterDuree(epreuve.duree_minutes)
                    }
                />
            </div>
        </li>
    );
}

function Valeur({
    libelle,
    valeur,
}: {
    libelle: string;
    valeur: string | null;
}) {
    return (
        <p className="flex items-center gap-1.5">
            <span className="text-meta text-ink-500 sm:sr-only">{libelle}</span>
            {valeur === null ? (
                <Badge variant="indice">
                    <CircleAlert aria-hidden />À saisir
                </Badge>
            ) : (
                <span className="font-semibold font-data">{valeur}</span>
            )}
        </p>
    );
}

function formaterDuree(minutes: number): string {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;

    if (heures === 0) {
        return `${reste} min`;
    }

    return reste === 0
        ? `${heures} h`
        : `${heures} h ${String(reste).padStart(2, '0')}`;
}

/**
 * Date de la prochaine session : elle donne le compte à rebours de l'élève.
 * Donnée officielle, saisie ici seulement ; vide = « pas encore annoncée ».
 */
function SessionExamen({ parcours }: { parcours: Parcours }) {
    const examen = parcours.libelle.startsWith('Bac')
        ? 'Bac'
        : parcours.libelle;

    return (
        <Section titre={`Prochaine session · ${examen}`}>
            <Form
                {...enregistrerSession.form(parcours.examen_id)}
                key={`${parcours.examen_id}-${parcours.session ?? ''}-${parcours.moyenne_admission ?? ''}`}
                options={{ preserveScroll: true }}
                className="grid gap-3"
            >
                {({ processing, errors }) => (
                    <>
                        <p className="text-aide text-ink-600">
                            La date officielle de l'examen, quand elle est
                            annoncée. Elle donne aux élèves leur compte à
                            rebours ; sans elle, ils lisent « date pas encore
                            annoncée ». La moyenne d'admission est la règle
                            officielle de l'examen : à saisir telle qu'elle est
                            publiée.
                        </p>
                        <Champ
                            libelle="Date de la session"
                            erreur={errors.date_prochaine_session}
                        >
                            {(attributs) => (
                                <DateInput
                                    {...attributs}
                                    name="date_prochaine_session"
                                    defaultValue={parcours.session ?? ''}
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Moyenne d'admission"
                            aide="Sur 20. Elle donne le verdict des examens blancs ; vide, aucun verdict n'est affiché."
                            erreur={errors.moyenne_admission}
                        >
                            {(attributs) => (
                                <NumberInput
                                    {...attributs}
                                    name="moyenne_admission"
                                    decimales
                                    valeur={
                                        parcours.moyenne_admission === null
                                            ? null
                                            : Number(parcours.moyenne_admission)
                                    }
                                />
                            )}
                        </Champ>
                        <Button
                            type="submit"
                            variant="outline"
                            taille="compacte"
                            disabled={processing}
                            className="justify-self-start"
                        >
                            {processing && <Spinner />}
                            Enregistrer
                        </Button>
                    </>
                )}
            </Form>
        </Section>
    );
}

function DialogueEpreuve({
    edition,
    fermer,
    matieres,
    filieres,
    epreuves,
    annee_id,
    parcours,
    parcours_cle,
}: Props & {
    edition: Epreuve | 'nouvelle' | null;
    fermer: () => void;
}) {
    const epreuve = edition === 'nouvelle' ? null : edition;
    const confirmer = useConfirmer();
    const choisi = parcours.find((p) => p.cle === parcours_cle);
    const deja = new Set(epreuves.map((e) => e.matiere.id));
    const disponibles = matieres.filter((m) => !deja.has(m.id));
    const action = epreuve ? update.form(epreuve.id) : store.form();

    async function retirer() {
        if (!epreuve) {
            return;
        }

        const accepte = await confirmer({
            titre: `Retirer ${epreuve.matiere.nom} de cet examen ?`,
            message: 'La matière reste dans le référentiel.',
            action: 'Retirer',
            ton: 'danger',
        });

        if (accepte) {
            router.delete(destroy(epreuve.id).url, {
                preserveScroll: true,
                onSuccess: fermer,
            });
        }
    }

    return (
        <Dialog open={edition !== null} onOpenChange={(o) => !o && fermer()}>
            <DialogContent>
                {edition !== null && (
                    <Form
                        {...action}
                        key={epreuve?.id ?? 'nouvelle'}
                        options={{ preserveScroll: true }}
                        onSuccess={fermer}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <DialogHeader>
                                    <DialogTitle>
                                        {epreuve
                                            ? `${epreuve.matiere.nom} · ${choisi?.libelle}`
                                            : `Ajouter une épreuve · ${choisi?.libelle}`}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Laissez coefficient et durée vides tant
                                        qu'ils ne sont pas confirmés par
                                        l'équipe pédagogique.
                                    </DialogDescription>
                                </DialogHeader>

                                {!epreuve && (
                                    <>
                                        <input
                                            type="hidden"
                                            name="annee_scolaire_id"
                                            value={annee_id ?? ''}
                                        />
                                        <input
                                            type="hidden"
                                            name="parcours"
                                            value={parcours_cle}
                                        />
                                        <Champ
                                            libelle="Matière"
                                            erreur={errors.matiere_id}
                                            aide={
                                                disponibles.length === 0 ? (
                                                    <>
                                                        Toutes les matières y
                                                        sont déjà.{' '}
                                                        <Link
                                                            href={matieresIndex()}
                                                            className="font-medium text-nimba-700 dark:text-nimba-300"
                                                        >
                                                            Ajouter une matière
                                                        </Link>
                                                    </>
                                                ) : undefined
                                            }
                                        >
                                            {(attributs) => (
                                                <ListeDeroulante
                                                    {...attributs}
                                                    name="matiere_id"
                                                    required
                                                >
                                                    {disponibles.map((m) => (
                                                        <option
                                                            key={m.id}
                                                            value={m.id}
                                                        >
                                                            {m.nom}
                                                        </option>
                                                    ))}
                                                </ListeDeroulante>
                                            )}
                                        </Champ>
                                    </>
                                )}

                                <Champ
                                    libelle="Filière"
                                    erreur={errors.filiere}
                                >
                                    {(attributs) => (
                                        <ListeDeroulante
                                            {...attributs}
                                            name="filiere"
                                            defaultValue={
                                                epreuve?.filiere ?? 'generale'
                                            }
                                        >
                                            {filieres.map((f) => (
                                                <option
                                                    key={f.valeur}
                                                    value={f.valeur}
                                                >
                                                    {f.libelle}
                                                </option>
                                            ))}
                                        </ListeDeroulante>
                                    )}
                                </Champ>

                                <div className="grid grid-cols-2 gap-3">
                                    <Champ
                                        libelle="Coefficient"
                                        facultatif
                                        erreur={errors.coefficient}
                                    >
                                        {(attributs) => (
                                            <NumberInput
                                                {...attributs}
                                                name="coefficient"
                                                decimales
                                                valeur={
                                                    epreuve?.coefficient ===
                                                        null || epreuve === null
                                                        ? null
                                                        : Number(
                                                              epreuve.coefficient,
                                                          )
                                                }
                                            />
                                        )}
                                    </Champ>
                                    <Champ
                                        libelle="Durée (min)"
                                        facultatif
                                        erreur={errors.duree_minutes}
                                    >
                                        {(attributs) => (
                                            <NumberInput
                                                {...attributs}
                                                name="duree_minutes"
                                                valeur={
                                                    epreuve?.duree_minutes ??
                                                    null
                                                }
                                            />
                                        )}
                                    </Champ>
                                </div>

                                <label className="flex min-h-11 items-center gap-3 rounded-controle border border-contour px-3 py-2">
                                    <Checkbox
                                        name="phare"
                                        value="1"
                                        defaultChecked={epreuve?.phare ?? true}
                                    />
                                    <span className="grid gap-0.5">
                                        <span className="font-medium">
                                            Matière phare
                                        </span>
                                        <span className="text-aide text-ink-500">
                                            Rédigée en priorité au lancement.
                                        </span>
                                    </span>
                                </label>

                                <DialogFooter className="sm:justify-between">
                                    {epreuve ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            ton="danger"
                                            onClick={() => void retirer()}
                                        >
                                            <Trash2 aria-hidden />
                                            Retirer
                                        </Button>
                                    ) : (
                                        <span />
                                    )}
                                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={fermer}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                processing ||
                                                (!epreuve &&
                                                    disponibles.length === 0)
                                            }
                                        >
                                            {processing && <Spinner />}
                                            {epreuve
                                                ? 'Enregistrer'
                                                : 'Ajouter'}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
