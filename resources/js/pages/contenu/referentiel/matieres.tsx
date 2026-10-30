import { Form, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    EnteteEcran,
    OngletsReferentiel,
} from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { MATIERES } from '@/lib/matieres';
import type { CleMatiere } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { index as epreuves } from '@/routes/contenu/referentiel/epreuves';
import { destroy, store, update } from '@/routes/contenu/referentiel/matieres';

type Matiere = {
    id: number;
    nom: string;
    teinte: CleMatiere;
    epreuves: number;
    phares: number;
    chapitres: number;
};

/** Référentiel › Matières (PLAN M3) : responsable pédagogique. */
export default function Matieres({
    matieres,
    teintes,
}: {
    matieres: Matiere[];
    teintes: CleMatiere[];
}) {
    const [edition, setEdition] = useState<Matiere | 'nouvelle' | null>(null);
    const confirmer = useConfirmer();
    const phares = matieres.filter((matiere) => matiere.phares > 0).length;

    async function supprimer(matiere: Matiere) {
        const accepte = await confirmer({
            titre: `Supprimer « ${matiere.nom} » ?`,
            message:
                'Une matière qui porte des épreuves ou des chapitres ne peut pas être supprimée.',
            action: 'Supprimer la matière',
            ton: 'danger',
        });

        if (accepte) {
            router.delete(destroy(matiere.id).url, {
                preserveScroll: true,
                onError: (erreurs) => {
                    toast.error(erreurs.matiere ?? 'Suppression impossible.');
                },
            });
        }
    }

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Matières · Référentiel"
                titre={
                    <>
                        Le <strong>référentiel</strong> pédagogique
                    </>
                }
                description="La source unique des cours, des exercices, des annales et de la jauge : matières, épreuves, programme."
                action={
                    <Button onClick={() => setEdition('nouvelle')}>
                        <Plus aria-hidden />
                        Ajouter une matière
                    </Button>
                }
            >
                <OngletsReferentiel />
            </EnteteEcran>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Section
                    id="matieres"
                    titre="Matières"
                    description={`${matieres.length} matières, dont ${phares} phares au lancement.`}
                    contenuClassName="px-0 pb-1"
                >
                    <ul className="divide-y border-t">
                        {matieres.map((matiere) => (
                            <li
                                key={matiere.id}
                                className="flex items-center gap-3 px-5 py-3"
                            >
                                <TuileMatiere
                                    teinte={matiere.teinte}
                                    taille="grande"
                                />
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                                        <span className="truncate">
                                            {matiere.nom}
                                        </span>
                                        {matiere.phares > 0 && (
                                            <Badge variant="nimba">
                                                <Star
                                                    aria-hidden
                                                    className="fill-current"
                                                />
                                                Phare
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-aide text-ink-500">
                                        {pluriel(matiere.epreuves, 'épreuve')}
                                        {' · '}
                                        {pluriel(matiere.chapitres, 'chapitre')}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Modifier ${matiere.nom}`}
                                        onClick={() => setEdition(matiere)}
                                    >
                                        <Pencil aria-hidden />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Supprimer ${matiere.nom}`}
                                        className="text-ink-500 hover:bg-faux-600/[0.08] hover:text-faux-600 dark:hover:text-faux-400"
                                        onClick={() => void supprimer(matiere)}
                                    >
                                        <Trash2 aria-hidden />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Section>

                <div className="grid content-start gap-6">
                    <Section titre="Comment ça marche">
                        <ol className="grid gap-3.5 text-aide text-ink-600">
                            <Etape rang={1}>
                                Une matière prend une des{' '}
                                <strong className="font-semibold text-ink-900">
                                    dix teintes
                                </strong>{' '}
                                du design : sa couleur et son icône partout chez
                                l'élève, toujours avec son nom.
                            </Etape>
                            <Etape rang={2}>
                                Elle entre à un examen par l'onglet{' '}
                                <Link
                                    href={epreuves()}
                                    prefetch
                                    className="font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
                                >
                                    Épreuves
                                </Link>
                                , avec son coefficient, sa durée et la case «
                                phare ».
                            </Etape>
                            <Etape rang={3}>
                                Une matière qui porte une épreuve ou un chapitre
                                ne se supprime pas : rien ne disparaît sous les
                                pieds d'un élève.
                            </Etape>
                        </ol>
                    </Section>
                </div>
            </div>

            <DialogueMatiere
                edition={edition}
                teintes={teintes}
                fermer={() => setEdition(null)}
            />
        </div>
    );
}

function Etape({
    rang,
    children,
}: {
    rang: number;
    children: React.ReactNode;
}) {
    return (
        <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                {rang}
            </span>
            <span>{children}</span>
        </li>
    );
}

function DialogueMatiere({
    edition,
    teintes,
    fermer,
}: {
    edition: Matiere | 'nouvelle' | null;
    teintes: CleMatiere[];
    fermer: () => void;
}) {
    const matiere = edition === 'nouvelle' ? null : edition;
    const action = matiere ? update.form(matiere.id) : store.form();

    return (
        <Dialog open={edition !== null} onOpenChange={(o) => !o && fermer()}>
            <DialogContent>
                {edition !== null && (
                    <Form
                        {...action}
                        key={matiere?.id ?? 'nouvelle'}
                        options={{ preserveScroll: true }}
                        onSuccess={fermer}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <DialogHeader>
                                    <DialogTitle>
                                        {matiere
                                            ? `Modifier « ${matiere.nom} »`
                                            : 'Ajouter une matière'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Le nom tel que l'élève le lira, et sa
                                        teinte.
                                    </DialogDescription>
                                </DialogHeader>
                                <Champ libelle="Nom" erreur={errors.nom}>
                                    {(attributs) => (
                                        <Input
                                            {...attributs}
                                            name="nom"
                                            defaultValue={matiere?.nom}
                                            required
                                            maxLength={80}
                                            autoFocus
                                        />
                                    )}
                                </Champ>
                                <ChoixTeinte
                                    teintes={teintes}
                                    initiale={matiere?.teinte ?? teintes[0]}
                                    erreur={errors.teinte}
                                />
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={fermer}
                                    >
                                        Annuler
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        {matiere ? 'Enregistrer' : 'Ajouter'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Teinte : un groupe de boutons radio (tuile + nom de la teinte). */
function ChoixTeinte({
    teintes,
    initiale,
    erreur,
}: {
    teintes: CleMatiere[];
    initiale: CleMatiere;
    erreur?: string;
}) {
    const [choisie, setChoisie] = useState<CleMatiere>(initiale);

    return (
        <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-interface font-medium">
                Teinte
            </legend>
            <input type="hidden" name="teinte" value={choisie} />
            <div
                role="radiogroup"
                aria-label="Teinte"
                className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
            >
                {teintes.map((teinte) => {
                    const actif = teinte === choisie;

                    return (
                        <button
                            key={teinte}
                            type="button"
                            role="radio"
                            aria-checked={actif}
                            onClick={() => setChoisie(teinte)}
                            className={cn(
                                'flex h-10 min-w-0 items-center gap-2 rounded-controle border px-2 text-left text-aide font-medium transition-[border-color,background-color] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                actif
                                    ? 'border-nimba-600 bg-nimba-600/[0.06] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                                    : 'border-contour hover:border-ink-400',
                            )}
                        >
                            <TuileMatiere teinte={teinte} taille="petite" />
                            <span className="truncate">
                                {MATIERES[teinte].nom}
                            </span>
                        </button>
                    );
                })}
            </div>
            {erreur && (
                <p className="text-aide text-faux-600 dark:text-faux-400">
                    {erreur}
                </p>
            )}
        </fieldset>
    );
}
