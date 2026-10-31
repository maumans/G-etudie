import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, ListTree } from 'lucide-react';
import { useState } from 'react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { TYPES } from '@/components/questions/types-question';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Spinner } from '@/components/ui/spinner';
import type { TypeQuestion } from '@/lib/contenu/questions';
import type { CleMatiere } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { index, store } from '@/routes/contenu/questions';
import { index as programme } from '@/routes/contenu/referentiel/programme';

type Groupe = {
    libelle: string;
    teinte: CleMatiere;
    notions: { id: number; titre: string }[];
};

/**
 * Nouvelle question : son type (il ne changera plus) et la notion qu'elle
 * travaille, puis l'écran de saisie.
 */
export default function Creer({
    groupes,
    types,
    notion_id,
    type,
    peut_saisir_programme,
}: {
    groupes: Groupe[];
    types: { valeur: TypeQuestion; libelle: string }[];
    notion_id: number | null;
    type: TypeQuestion | null;
    peut_saisir_programme: boolean;
}) {
    const [choisi, setChoisi] = useState<TypeQuestion>(type ?? 'qcm_une');

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Nouvelle question"
                titre={
                    <>
                        Une <strong>nouvelle question</strong>
                    </>
                }
                description="Choisissez son type et la notion qu’elle travaille : la notion la relie au cours, à la séance du jour et à la jauge de l’élève."
                action={
                    <Button asChild variant="outline">
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Les questions
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
                                <Link href={index()}>Retour aux questions</Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <Form {...store.form()} className="grid gap-6">
                    {({ processing, errors }) => (
                        <>
                            <Section
                                titre="Le type de question"
                                description="Il ne change plus ensuite : les réponses des élèves sont corrigées selon lui."
                            >
                                <input
                                    type="hidden"
                                    name="type"
                                    value={choisi}
                                />
                                <div
                                    role="radiogroup"
                                    aria-label="Type de question"
                                    className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
                                >
                                    {types.map((t) => {
                                        const meta = TYPES[t.valeur];
                                        const actif = t.valeur === choisi;

                                        return (
                                            <button
                                                key={t.valeur}
                                                type="button"
                                                role="radio"
                                                aria-checked={actif}
                                                onClick={() =>
                                                    setChoisi(t.valeur)
                                                }
                                                className={cn(
                                                    'flex items-start gap-3 rounded-controle border bg-card px-3.5 py-3 text-left shadow-xs transition-[border-color,background-color] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-relief/40',
                                                    actif
                                                        ? 'border-nimba-600 bg-nimba-600/[0.05] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                                                        : 'border-contour hover:border-ink-400',
                                                )}
                                            >
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                                                        actif
                                                            ? 'bg-nimba-600 text-white dark:bg-nimba-300 dark:text-[#110e0b]'
                                                            : 'bg-craie-100 text-ink-900 dark:bg-white/[0.06]',
                                                    )}
                                                >
                                                    <meta.icone className="size-[18px]" />
                                                </span>
                                                <span className="grid gap-0.5">
                                                    <span className="text-interface font-semibold text-ink-900">
                                                        {t.libelle}
                                                    </span>
                                                    <span className="text-aide text-ink-500">
                                                        {meta.usage}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.type && (
                                    <p className="text-aide text-faux-600 dark:text-faux-400">
                                        {errors.type}
                                    </p>
                                )}
                            </Section>

                            <Section titre="La notion">
                                <div className="grid gap-5 sm:grid-cols-[minmax(0,28rem)_auto] sm:items-end">
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
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="sm:w-fit"
                                    >
                                        {processing && <Spinner />}
                                        Écrire la question
                                    </Button>
                                </div>
                            </Section>
                        </>
                    )}
                </Form>
            )}
        </div>
    );
}
