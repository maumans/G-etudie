import { Form, router } from '@inertiajs/react';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import {
    EnteteEcran,
    OngletsReferentiel,
} from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
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
import { pluriel } from '@/lib/utils';
import { courante, store, update } from '@/routes/contenu/referentiel/annees';

type Annee = {
    id: number;
    libelle: string;
    debut: string;
    fin: string;
    courante: boolean;
    epreuves: number;
    coefficients: number;
};

const DATE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

function formaterDate(iso: string): string {
    return DATE.format(new Date(`${iso}T00:00:00Z`));
}

/** Référentiel › Années scolaires : les épreuves sont rangées par année. */
export default function Annees({ annees }: { annees: Annee[] }) {
    const [edition, setEdition] = useState<Annee | 'nouvelle' | null>(null);

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Années · Référentiel"
                titre={
                    <>
                        Le <strong>référentiel</strong> pédagogique
                    </>
                }
                description="Coefficients et durées peuvent changer d'une année à l'autre : chaque année a ses épreuves."
                action={
                    <Button onClick={() => setEdition('nouvelle')}>
                        <Plus aria-hidden />
                        Ajouter une année
                    </Button>
                }
            >
                <OngletsReferentiel />
            </EnteteEcran>

            <Section
                id="annees"
                titre="Années scolaires"
                description="L'année courante est celle que voient les élèves et que l'onglet Épreuves ouvre par défaut."
                contenuClassName="px-0 pb-1"
            >
                <ul className="divide-y border-t">
                    {annees.map((annee) => (
                        <li
                            key={annee.id}
                            className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                        >
                            <span
                                aria-hidden
                                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600"
                            >
                                <CalendarDays className="size-5" />
                            </span>
                            <div className="grid min-w-0 flex-1 gap-0.5">
                                <p className="flex flex-wrap items-center gap-2 font-semibold">
                                    <span className="font-data">
                                        {annee.libelle}
                                    </span>
                                    {annee.courante && (
                                        <Badge variant="juste">Courante</Badge>
                                    )}
                                </p>
                                <p className="text-aide text-ink-500">
                                    Du {formaterDate(annee.debut)} au{' '}
                                    {formaterDate(annee.fin)} ·{' '}
                                    {pluriel(annee.epreuves, 'épreuve')},{' '}
                                    {annee.coefficients} coefficient
                                    {annee.coefficients > 1 ? 's' : ''} saisi
                                    {annee.coefficients > 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                {!annee.courante && (
                                    <Button
                                        variant="outline"
                                        taille="compacte"
                                        onClick={() =>
                                            router.post(
                                                courante(annee.id).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Rendre courante
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    taille="icone-compacte"
                                    aria-label={`Modifier ${annee.libelle}`}
                                    onClick={() => setEdition(annee)}
                                >
                                    <Pencil aria-hidden />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Section>

            <Dialog
                open={edition !== null}
                onOpenChange={(o) => !o && setEdition(null)}
            >
                <DialogContent>
                    {edition !== null && (
                        <FormulaireAnnee
                            annee={edition === 'nouvelle' ? null : edition}
                            fermer={() => setEdition(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function FormulaireAnnee({
    annee,
    fermer,
}: {
    annee: Annee | null;
    fermer: () => void;
}) {
    const action = annee ? update.form(annee.id) : store.form();

    return (
        <Form
            {...action}
            options={{ preserveScroll: true }}
            onSuccess={fermer}
            className="grid gap-5"
        >
            {({ processing, errors }) => (
                <>
                    <DialogHeader>
                        <DialogTitle>
                            {annee
                                ? `Modifier ${annee.libelle}`
                                : 'Ajouter une année scolaire'}
                        </DialogTitle>
                        <DialogDescription>
                            Ses épreuves se saisissent ensuite dans l'onglet
                            Épreuves.
                        </DialogDescription>
                    </DialogHeader>
                    <Champ
                        libelle="Libellé"
                        aide="Par exemple 2027-2028."
                        erreur={errors.libelle}
                    >
                        {(attributs) => (
                            <Input
                                {...attributs}
                                name="libelle"
                                defaultValue={annee?.libelle}
                                required
                                maxLength={9}
                                inputMode="numeric"
                                className="font-data"
                            />
                        )}
                    </Champ>
                    <div className="grid grid-cols-2 gap-3">
                        <Champ libelle="Début" erreur={errors.debut}>
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    type="date"
                                    name="debut"
                                    defaultValue={annee?.debut}
                                    required
                                />
                            )}
                        </Champ>
                        <Champ libelle="Fin" erreur={errors.fin}>
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    type="date"
                                    name="fin"
                                    defaultValue={annee?.fin}
                                    required
                                />
                            )}
                        </Champ>
                    </div>
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
                            {annee ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                    </DialogFooter>
                </>
            )}
        </Form>
    );
}
