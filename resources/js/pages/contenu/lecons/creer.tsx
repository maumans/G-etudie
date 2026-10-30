import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, ListTree, Sigma } from 'lucide-react';
import { ENCADRES } from '@/components/contenu/contenu-blocs';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Spinner } from '@/components/ui/spinner';
import { GENRES_ENCADRE } from '@/lib/contenu/blocs';
import type { CleMatiere } from '@/lib/matieres';
import { index, store } from '@/routes/contenu/lecons';
import { index as programme } from '@/routes/contenu/referentiel/programme';

type Groupe = {
    libelle: string;
    teinte: CleMatiere;
    notions: { id: number; titre: string }[];
};

/** Nouvelle leçon : une notion du programme et un titre, puis l'éditeur. */
export default function Creer({
    groupes,
    notion_id,
    peut_saisir_programme,
}: {
    groupes: Groupe[];
    notion_id: number | null;
    peut_saisir_programme: boolean;
}) {
    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Nouvelle leçon"
                titre={
                    <>
                        Une <strong>nouvelle leçon</strong>
                    </>
                }
                description="Choisissez la notion qu’elle enseigne : c’est elle qui relie la leçon aux exercices, aux annales et à la jauge de l’élève."
                action={
                    <Button asChild variant="outline">
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Les leçons
                        </Link>
                    </Button>
                }
            />

            {groupes.length === 0 ? (
                <EtatVide
                    illustration={ListTree}
                    titre="Le programme n’a pas encore de notion"
                    message={
                        peut_saisir_programme
                            ? 'Saisissez d’abord les chapitres et les notions du programme dans le référentiel.'
                            : 'Le responsable pédagogique doit d’abord saisir les chapitres et les notions du programme.'
                    }
                    action={
                        peut_saisir_programme ? (
                            <Button asChild taille="compacte">
                                <Link href={programme()}>
                                    Saisir le programme
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild variant="outline" taille="compacte">
                                <Link href={index()}>Retour aux leçons</Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <Section
                        titre="La leçon"
                        description="Le titre se change ensuite dans l’éditeur."
                    >
                        <Form {...store.form()} className="grid gap-5">
                            {({ processing, errors }) => (
                                <>
                                    <Champ
                                        libelle="Notion"
                                        erreur={errors.notion_id}
                                        aide="Rangées par matière, classe et chapitre."
                                    >
                                        {(attributs) => (
                                            <ListeDeroulante
                                                {...attributs}
                                                name="notion_id"
                                                required
                                                defaultValue={notion_id ?? ''}
                                            >
                                                <option value="" disabled>
                                                    Choisir une notion…
                                                </option>
                                                {groupes.map((groupe) => (
                                                    <optgroup
                                                        key={groupe.libelle}
                                                        label={groupe.libelle}
                                                    >
                                                        {groupe.notions.map(
                                                            (n) => (
                                                                <option
                                                                    key={n.id}
                                                                    value={n.id}
                                                                >
                                                                    {n.titre}
                                                                </option>
                                                            ),
                                                        )}
                                                    </optgroup>
                                                ))}
                                            </ListeDeroulante>
                                        )}
                                    </Champ>
                                    <Champ
                                        libelle="Titre"
                                        erreur={errors.titre}
                                    >
                                        {(attributs) => (
                                            <Input
                                                {...attributs}
                                                name="titre"
                                                required
                                                maxLength={160}
                                                placeholder="Par exemple : Le théorème de Pythagore"
                                            />
                                        )}
                                    </Champ>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="sm:w-fit"
                                    >
                                        {processing && <Spinner />}
                                        Ouvrir l’éditeur
                                    </Button>
                                </>
                            )}
                        </Form>
                    </Section>

                    <Section titre="Ce qu’une leçon contient">
                        <ul className="grid gap-2.5 text-aide text-ink-600">
                            <li className="flex items-start gap-2.5">
                                <span
                                    aria-hidden
                                    className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-craie-100 text-ink-900"
                                >
                                    <Sigma className="size-3.5" />
                                </span>
                                <span>
                                    Du texte, des titres, des listes et des
                                    formules écrites en LaTeX.
                                </span>
                            </li>
                            {GENRES_ENCADRE.map((genre) => {
                                const style = ENCADRES[genre];

                                return (
                                    <li
                                        key={genre}
                                        className="flex items-start gap-2.5"
                                    >
                                        <span
                                            aria-hidden
                                            className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] border ${style.cadre} ${style.tete}`}
                                        >
                                            <style.icone className="size-3.5" />
                                        </span>
                                        <span>
                                            <strong className="font-semibold text-ink-900">
                                                {style.titre}
                                            </strong>{' '}
                                            {DESCRIPTIONS[genre]}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </Section>
                </div>
            )}
        </div>
    );
}

const DESCRIPTIONS: Record<(typeof GENRES_ENCADRE)[number], string> = {
    a_retenir: ': rassemblés en fiche de révision par chapitre.',
    methode: ': les étapes, numérotées.',
    exemple: ': un cas traité de bout en bout.',
    piege: ': l’erreur que les élèves font souvent.',
};
