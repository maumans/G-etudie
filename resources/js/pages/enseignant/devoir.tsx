import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleCheck,
    CircleDashed,
    Clock3,
    UsersRound,
} from 'lucide-react';
import {
    Carte,
    EnteteEcran,
    Initiale,
    TitreCarte,
    TuileMatiere,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { EtatVide } from '@/components/ui/etat-vide';
import { formaterJour, formaterJourHeure } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { pluriel } from '@/lib/utils';
import { update } from '@/routes/enseignant/devoirs';
import { show as pageGroupe } from '@/routes/enseignant/groupes';
import type {
    EtatDevoir,
    Identite,
    ResumeDevoir,
    ResumeGroupe,
} from '@/types/suivi';

type Props = {
    suivi: {
        groupe: ResumeGroupe;
        devoir: ResumeDevoir & { consigne: string | null };
        questions: {
            uuid: string;
            extrait: string;
            notion: string;
            matiere: { cle: CleMatiere; nom: string };
        }[];
        eleves: (Identite & EtatDevoir)[];
    };
};

const ETATS = {
    rendu: { libelle: 'Rendu', variante: 'juste', icone: CircleCheck },
    en_cours: { libelle: 'Commencé', variante: 'indice', icone: Clock3 },
    a_faire: {
        libelle: 'Pas commencé',
        variante: 'neutre',
        icone: CircleDashed,
    },
} as const;

/** Le suivi d'un devoir (lot 11) : qui a rendu, avec quel score. */
export default function DevoirEnseignant({ suivi }: Props) {
    const { groupe, devoir, eleves } = suivi;
    const rendus = eleves.filter((e) => e.etat === 'rendu');
    const part =
        eleves.length === 0
            ? 0
            : Math.round((rendus.length / eleves.length) * 100);
    const notes = rendus
        .map((e) => e.score)
        .filter((s): s is number => s !== null);
    const moyenne =
        notes.length === 0
            ? null
            : Math.round(notes.reduce((a, b) => a + b, 0) / notes.length);

    return (
        <>
            <Head title={`Devoir · ${devoir.titre}`} />
            <div className="grid gap-5 lg:gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={pageGroupe(groupe.id)} prefetch>
                        <ArrowLeft aria-hidden />
                        {groupe.nom}
                    </Link>
                </Button>
                <EnteteEcran
                    meta={`${groupe.nom} · ${pluriel(devoir.questions, 'question')}`}
                    titre={<strong>{devoir.titre}</strong>}
                    chapeau={devoir.consigne ?? undefined}
                />
                {devoir.est_exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <Carte aria-labelledby="titre-rendus">
                        <TitreCarte id="titre-rendus">Les rendus</TitreCarte>
                        {eleves.length === 0 ? (
                            <div className="mt-4">
                                <EtatVide
                                    illustration={UsersRound}
                                    titre="Personne dans le groupe"
                                    message={`Vos élèves rejoignent le groupe avec le code ${groupe.code}.`}
                                    action={
                                        <Button
                                            asChild
                                            variant="outline"
                                            taille="compacte"
                                        >
                                            <Link href={pageGroupe(groupe.id)}>
                                                Voir le groupe
                                            </Link>
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="mt-2 divide-y">
                                {eleves.map((eleve) => {
                                    const etat = ETATS[eleve.etat];

                                    return (
                                        <li
                                            key={eleve.id}
                                            className="flex items-center gap-3 py-3 last:pb-0"
                                        >
                                            <Initiale prenom={eleve.prenom} />
                                            <span className="grid min-w-0 flex-1 gap-0.5">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-semibold">
                                                        {eleve.prenom}
                                                    </span>
                                                    <Badge
                                                        variant={etat.variante}
                                                    >
                                                        <etat.icone
                                                            aria-hidden
                                                        />
                                                        {etat.libelle}
                                                    </Badge>
                                                    {eleve.en_retard && (
                                                        <Badge variant="faux">
                                                            En retard
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {eleve.rendu_le
                                                        ? `Rendu le ${formaterJourHeure(eleve.rendu_le)}`
                                                        : `${eleve.reponses}/${devoir.questions} réponses`}
                                                </span>
                                            </span>
                                            <span className="text-right">
                                                {eleve.score === null ? (
                                                    <span className="text-aide text-ink-500">
                                                        —
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-[1.125rem] font-bold font-data">
                                                            {eleve.score}
                                                        </span>
                                                        <span className="text-aide font-semibold text-ink-500">
                                                            {' '}
                                                            %
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Carte>

                    <div className="grid content-start gap-5 lg:gap-6">
                        <section className="grid gap-4 rounded-carte surface-marque p-5 text-white shadow-releve">
                            <p className="text-aide font-medium text-white/85">
                                {devoir.echu ? 'Échu le' : 'À rendre le'}{' '}
                                {formaterJour(devoir.echeance_le)}
                            </p>
                            <p className="text-[2.5rem] leading-none font-bold font-data">
                                {rendus.length}
                                <span className="text-[1.25rem] font-semibold text-white/75">
                                    {' '}
                                    / {eleves.length} rendus
                                </span>
                            </p>
                            <div
                                role="progressbar"
                                aria-label="Part des élèves qui ont rendu"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={part}
                                className="h-2 overflow-hidden rounded-full bg-white/25"
                            >
                                <div
                                    className="h-full rounded-full bg-white"
                                    style={{ width: `${part}%` }}
                                />
                            </div>
                            <p className="text-aide text-white/85">
                                {moyenne === null
                                    ? 'Score moyen : pas encore de rendu.'
                                    : `Score moyen des rendus : ${moyenne} %`}
                            </p>
                        </section>

                        <Carte className="grid gap-3">
                            <TitreCarte>Changer l’échéance</TitreCarte>
                            <Form
                                {...update.form(devoir.id)}
                                className="flex gap-2"
                                options={{ preserveScroll: true }}
                            >
                                {({ processing, errors }) => (
                                    <div className="grid w-full gap-2">
                                        <div className="flex gap-2">
                                            <DateInput
                                                name="echeance"
                                                aria-label="Nouvelle échéance"
                                                defaultValue={devoir.echeance_le.slice(
                                                    0,
                                                    10,
                                                )}
                                                className="flex-1"
                                                aria-invalid={
                                                    errors.echeance
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                disabled={processing}
                                            >
                                                Changer
                                            </Button>
                                        </div>
                                        {errors.echeance && (
                                            <p className="text-aide text-faux-600 dark:text-faux-400">
                                                {errors.echeance}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Form>
                        </Carte>

                        <Carte className="grid gap-2">
                            <TitreCarte>Les questions</TitreCarte>
                            <ol className="divide-y">
                                {suivi.questions.map((question, rang) => (
                                    <li
                                        key={question.uuid}
                                        className="flex items-start gap-3 py-2.5 last:pb-0"
                                    >
                                        <TuileMatiere
                                            cle={question.matiere.cle}
                                            taille="petite"
                                        />
                                        <span className="grid min-w-0 gap-0.5">
                                            <span className="line-clamp-2 text-aide text-ink-900">
                                                <span className="font-semibold font-data">
                                                    {rang + 1}.{' '}
                                                </span>
                                                {question.extrait}
                                            </span>
                                            <span className="truncate text-meta text-ink-500">
                                                {question.notion}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
