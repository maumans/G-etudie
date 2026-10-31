import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    CircleCheck,
    Clock3,
    PenLine,
    Undo2,
    UserRound,
} from 'lucide-react';
import { Section } from '@/components/contenu/section';
import { BadgeStatut } from '@/components/contenu/statut-lecon';
import { RevueQuestion } from '@/components/questions/revue-question';
import { TYPES } from '@/components/questions/types-question';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionEleve } from '@/lib/contenu/questions';
import { MATIERES } from '@/lib/matieres';
import { formaterJourHeure } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import {
    archiver,
    edit,
    index,
    modifier,
    publier,
    renvoyer,
    reprendre,
    restaurer,
    show,
} from '@/routes/contenu/questions';
import type { QuestionResume } from './index';

type Version = {
    numero: number;
    titre: string;
    auteur: string;
    soumise_le: string;
    decision: 'publiee' | 'renvoyee' | 'retiree' | null;
    decide_par: string | null;
    decide_le: string | null;
    commentaire: string | null;
    publiee: boolean;
};

type Props = {
    question: QuestionResume;
    affichee: {
        source: 'version' | 'brouillon';
        numero: number | null;
        question: QuestionEleve;
    };
    versions: Version[];
    droits: {
        rediger: boolean;
        relire: boolean;
        archiver: boolean;
        auteur: boolean;
    };
};

const DECISIONS = {
    publiee: { libelle: 'Publiée', variante: 'juste' },
    renvoyee: { libelle: 'Renvoyée', variante: 'indice' },
    retiree: { libelle: 'Reprise par l’auteur', variante: 'neutre' },
} as const;

/**
 * Fiche d'une question : la version à relire (ou en ligne) avec sa bonne
 * réponse, ses indices et tout son corrigé, les gestes permis à ce compte,
 * et l'historique de ses versions. Même circuit que les leçons.
 */
export default function Fiche({ question, affichee, versions, droits }: Props) {
    const type = TYPES[question.type];
    const matiere = MATIERES[question.matiere.teinte];
    const confirmer = useConfirmer();
    const enAttente = versions.find((v) => v.decision === null);
    const libelleAffichee =
        affichee.source === 'brouillon'
            ? 'Brouillon en cours'
            : affichee.numero === enAttente?.numero
              ? `Version ${affichee.numero} · à relire`
              : versions.find((v) => v.numero === affichee.numero)?.publiee
                ? `Version ${affichee.numero} · en ligne`
                : `Version ${affichee.numero}`;

    async function archiverQuestion() {
        if (
            await confirmer({
                titre: 'Retirer cette question ?',
                message:
                    'Elle ne sera plus proposée aux élèves. Ses versions et les réponses déjà données restent ; elle peut être restaurée.',
                action: 'Archiver',
                ton: 'danger',
            })
        ) {
            router.post(
                archiver(question.uuid).url,
                {},
                { preserveScroll: true },
            );
        }
    }

    return (
        <div className="grid gap-6">
            <Head title={`Question · ${question.titre.slice(0, 40)}`} />

            <div className="grid gap-4">
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className="-ml-2 w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Les questions
                    </Link>
                </Button>
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'mt-1 flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                            matiere?.tuile,
                        )}
                    >
                        <type.icone className="size-[18px]" />
                    </span>
                    <div className="grid min-w-0 gap-1.5">
                        <p className="text-aide text-ink-500">
                            {question.matiere.nom} · {question.classe} ·{' '}
                            {question.chapitre} ›{' '}
                            <span className="font-medium text-ink-900">
                                {question.notion}
                            </span>
                        </p>
                        <h1 className="line-clamp-3 text-[1.25rem] leading-snug font-semibold lg:text-[1.375rem]">
                            {question.titre}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-aide font-medium text-ink-900">
                                {type.libelle}
                            </span>
                            <BadgeStatut statut={question.statut} />
                            <span className="text-aide text-ink-500">
                                Difficulté {question.difficulte}/5
                            </span>
                            {question.est_exemple && (
                                <Badge variant="neutre">Exemple</Badge>
                            )}
                            <span className="flex items-center gap-1 text-aide text-ink-500">
                                <UserRound aria-hidden className="size-3.5" />
                                {question.de_moi
                                    ? 'Vous en êtes l’auteur'
                                    : `par ${question.auteur}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {question.est_exemple && <BandeauExemple />}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="grid min-w-0 gap-6">
                    <PanneauAction
                        question={question}
                        droits={droits}
                        enAttente={enAttente}
                    />

                    <article
                        aria-labelledby="titre-contenu"
                        className="min-w-0 rounded-carte border bg-card shadow-carte"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
                            <h2
                                id="titre-contenu"
                                className="text-aide font-semibold text-ink-600"
                            >
                                {libelleAffichee}
                            </h2>
                            <p className="text-meta text-ink-500">
                                {pluriel(
                                    affichee.question.indices.length,
                                    'indice',
                                )}{' '}
                                ·{' '}
                                {pluriel(
                                    affichee.question.corrige.length,
                                    'étape',
                                )}
                            </p>
                        </div>
                        <div className="px-5 py-5">
                            {(affichee.question.enonce.content ?? []).length ===
                            0 ? (
                                <p className="text-ink-500">
                                    Cette question est encore vide.
                                </p>
                            ) : (
                                <RevueQuestion
                                    key={affichee.numero ?? 'brouillon'}
                                    question={affichee.question}
                                />
                            )}
                        </div>
                    </article>
                </div>

                <div className="grid content-start gap-6">
                    <Section
                        id="historique"
                        titre="Historique"
                        description={
                            versions.length === 0
                                ? 'Aucune version : le brouillon n’a jamais été envoyé en relecture.'
                                : `${pluriel(versions.length, 'version')} envoyée${versions.length > 1 ? 's' : ''} en relecture.`
                        }
                    >
                        {versions.length > 0 && (
                            <ol className="relative grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[0.6875rem] before:w-px before:bg-border">
                                {versions.map((version) => (
                                    <EtapeHistorique
                                        key={version.numero}
                                        version={version}
                                        uuid={question.uuid}
                                        affichee={
                                            affichee.numero === version.numero
                                        }
                                    />
                                ))}
                            </ol>
                        )}
                        {affichee.source === 'version' &&
                            question.statut === 'brouillon' && (
                                <Link
                                    href={
                                        droits.rediger
                                            ? edit(question.uuid)
                                            : show(question.uuid)
                                    }
                                    className="mt-4 inline-flex text-aide font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
                                >
                                    Un brouillon est en cours
                                </Link>
                            )}
                    </Section>

                    {droits.archiver && question.statut !== 'en_relecture' && (
                        <Section titre="Responsable pédagogique">
                            {question.statut === 'archive' ? (
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    onClick={() =>
                                        router.post(
                                            restaurer(question.uuid).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <ArchiveRestore aria-hidden />
                                    Restaurer en brouillon
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    ton="danger"
                                    taille="compacte"
                                    onClick={() => void archiverQuestion()}
                                >
                                    <Archive aria-hidden />
                                    Retirer la question
                                </Button>
                            )}
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Le geste attendu de ce compte, selon le statut : un seul moment fort. */
function PanneauAction({
    question,
    droits,
    enAttente,
}: {
    question: QuestionResume;
    droits: Props['droits'];
    enAttente?: Version;
}) {
    if (question.statut === 'en_relecture' && droits.relire && enAttente) {
        return <PanneauRelecture question={question} version={enAttente} />;
    }

    if (question.statut === 'en_relecture') {
        return (
            <Bandeau
                icone={Clock3}
                titre={
                    droits.auteur ? 'En attente d’un relecteur' : 'En relecture'
                }
                texte={
                    droits.auteur
                        ? 'Un autre enseignant doit la relire : l’auteur ne relit jamais sa propre question. Vous pouvez la reprendre pour la modifier.'
                        : `Version ${enAttente?.numero ?? ''} envoyée par ${enAttente?.auteur ?? ''}.`
                }
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(reprendre(question.uuid).url)
                            }
                        >
                            <Undo2 aria-hidden />
                            Reprendre la question
                        </Button>
                    )
                }
            />
        );
    }

    if (question.statut === 'brouillon' && droits.rediger) {
        return (
            <Bandeau
                icone={PenLine}
                titre="Brouillon"
                texte={
                    question.publiee
                        ? 'Une modification est en cours ; la version publiée reste proposée.'
                        : 'La question n’est pas encore publiée.'
                }
                action={
                    <Button asChild taille="compacte">
                        <Link href={edit(question.uuid)}>
                            <PenLine aria-hidden />
                            Continuer la saisie
                        </Link>
                    </Button>
                }
            />
        );
    }

    if (question.statut === 'publie') {
        return (
            <Bandeau
                icone={CircleCheck}
                titre="En ligne"
                texte="Les élèves reçoivent cette version. La modifier ouvre un nouveau brouillon, relu à son tour ; les réponses déjà données restent corrigées selon la version qu’ils ont vue."
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(modifier(question.uuid).url)
                            }
                        >
                            <PenLine aria-hidden />
                            Modifier la question
                        </Button>
                    )
                }
            />
        );
    }

    return null;
}

function Bandeau({
    icone: Icone,
    titre,
    texte,
    action,
}: {
    icone: typeof Clock3;
    titre: string;
    texte: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-carte border bg-card p-4 shadow-carte sm:flex-row sm:items-center">
            <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600"
            >
                <Icone className="size-5" />
            </span>
            <div className="grid flex-1 gap-0.5">
                <p className="font-semibold">{titre}</p>
                <p className="text-aide text-ink-600">{texte}</p>
            </div>
            {action}
        </div>
    );
}

function PanneauRelecture({
    question,
    version,
}: {
    question: QuestionResume;
    version: Version;
}) {
    const formulaire = useForm({ commentaire: '' });
    const confirmer = useConfirmer();

    async function decider(decision: 'publier' | 'renvoyer') {
        if (decision === 'publier') {
            const accepte = await confirmer({
                titre: 'Publier cette question ?',
                message:
                    'Les élèves la recevront dans leurs prochaines séances.',
                action: 'Publier',
            });

            if (accepte) {
                formulaire.post(publier(question.uuid).url, {
                    preserveScroll: true,
                });
            }

            return;
        }

        formulaire.post(renvoyer(question.uuid).url, { preserveScroll: true });
    }

    return (
        <section
            aria-labelledby="titre-relecture"
            className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve"
        >
            <div className="grid gap-1">
                <h2
                    id="titre-relecture"
                    className="text-titre-carte font-semibold"
                >
                    À vous de relire
                </h2>
                <p className="text-aide text-white/75" data-capture="variable">
                    Version {version.numero}, envoyée par {version.auteur} le{' '}
                    {formaterJourHeure(version.soumise_le)}. Vérifiez la bonne
                    réponse, que les indices ne la donnent pas, et chaque étape
                    du corrigé.
                </p>
            </div>
            <div className="clair rounded-controle">
                <Champ
                    libelle={
                        <span className="text-white">
                            Commentaire pour l’auteur
                        </span>
                    }
                    aide={
                        <span className="text-white/70">
                            Obligatoire pour renvoyer ; facultatif pour publier.
                        </span>
                    }
                    erreur={formulaire.errors.commentaire}
                >
                    {(attributs) => (
                        <Textarea
                            {...attributs}
                            value={formulaire.data.commentaire}
                            onChange={(e) =>
                                formulaire.setData(
                                    'commentaire',
                                    e.target.value,
                                )
                            }
                            rows={3}
                            maxLength={2000}
                            placeholder="Ce qui est juste, ce qu’il faut reprendre…"
                        />
                    )}
                </Champ>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="outline"
                    className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                    disabled={formulaire.processing}
                    onClick={() => void decider('renvoyer')}
                >
                    <Undo2 aria-hidden />
                    Renvoyer à l’auteur
                </Button>
                <Button
                    disabled={formulaire.processing}
                    onClick={() => void decider('publier')}
                >
                    {formulaire.processing ? (
                        <Spinner />
                    ) : (
                        <CircleCheck aria-hidden />
                    )}
                    Publier
                </Button>
            </div>
        </section>
    );
}

function EtapeHistorique({
    version,
    uuid,
    affichee,
}: {
    version: Version;
    uuid: string;
    affichee: boolean;
}) {
    const decision = version.decision ? DECISIONS[version.decision] : null;

    return (
        <li className="relative grid gap-1 pl-8">
            <span
                aria-hidden
                className={cn(
                    'absolute top-0.5 left-0 flex size-[1.375rem] items-center justify-center rounded-full border bg-card text-meta font-semibold font-data',
                    affichee && 'border-ink-900 bg-ink-900 text-craie-50',
                )}
            >
                {version.numero}
            </span>
            <p className="flex flex-wrap items-center gap-1.5">
                <Link
                    href={show(uuid, { query: { version: version.numero } })}
                    preserveScroll
                    aria-current={affichee ? 'true' : undefined}
                    className="font-semibold underline-offset-2 hover:underline"
                >
                    Version {version.numero}
                </Link>
                {decision ? (
                    <Badge variant={decision.variante}>
                        {decision.libelle}
                    </Badge>
                ) : (
                    <Badge variant="nimba">À relire</Badge>
                )}
                {version.publiee && <Badge variant="juste">En ligne</Badge>}
            </p>
            <p className="text-meta text-ink-500" data-capture="variable">
                Envoyée par {version.auteur} ·{' '}
                {formaterJourHeure(version.soumise_le)}
            </p>
            {version.decide_par && (
                <p className="text-meta text-ink-500" data-capture="variable">
                    {decision?.libelle} par {version.decide_par}
                    {version.decide_le &&
                        ` · ${formaterJourHeure(version.decide_le)}`}
                </p>
            )}
            {version.commentaire && (
                <p className="mt-1 rounded-[10px] bg-craie-100 px-3 py-2 text-aide whitespace-pre-line text-ink-600 dark:bg-white/[0.04]">
                    {version.commentaire}
                </p>
            )}
        </li>
    );
}
