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
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Section } from '@/components/contenu/section';
import { BadgeStatut } from '@/components/contenu/statut-lecon';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
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
} from '@/routes/contenu/lecons';
import type { LeconResume } from '@/types';

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
    lecon: LeconResume;
    affichee: {
        source: 'version' | 'brouillon';
        numero: number | null;
        titre: string;
        blocs: DocumentBlocs;
        resume: { mots: number; formules: number; encadres: number };
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
 * Fiche d'une leçon : la version à relire (ou en ligne), les gestes permis
 * à ce compte, et l'historique de ses versions.
 */
export default function Fiche({ lecon, affichee, versions, droits }: Props) {
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

    async function archiverLecon() {
        if (
            await confirmer({
                titre: 'Archiver cette leçon ?',
                message:
                    'Les élèves ne la verront plus. Ses versions restent, et elle peut être restaurée.',
                action: 'Archiver',
                ton: 'danger',
            })
        ) {
            router.post(archiver(lecon.uuid).url, {}, { preserveScroll: true });
        }
    }

    return (
        <div className="grid gap-6">
            <Head title={lecon.titre} />

            <div className="grid gap-4">
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className="-ml-2 w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Les leçons
                    </Link>
                </Button>
                <div className="flex min-w-0 items-start gap-3">
                    <TuileMatiere
                        teinte={lecon.matiere.teinte}
                        taille="grande"
                        className="mt-1"
                    />
                    <div className="grid min-w-0 gap-1.5">
                        <p className="text-aide text-ink-500">
                            {lecon.matiere.nom} · {lecon.classe} ·{' '}
                            {lecon.chapitre} ›{' '}
                            <span className="font-medium text-ink-900">
                                {lecon.notion}
                            </span>
                        </p>
                        <h1 className="text-titre-ecran font-semibold tracking-tight lg:text-titre-ecran-large">
                            {lecon.titre}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <BadgeStatut statut={lecon.statut} />
                            {lecon.est_exemple && (
                                <Badge variant="neutre">Exemple</Badge>
                            )}
                            <span className="flex items-center gap-1 text-aide text-ink-500">
                                <UserRound aria-hidden className="size-3.5" />
                                {lecon.de_moi
                                    ? 'Vous en êtes l’auteur'
                                    : `par ${lecon.auteur}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {lecon.est_exemple && <BandeauExemple />}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="grid min-w-0 gap-6">
                    <PanneauAction
                        lecon={lecon}
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
                                {pluriel(affichee.resume.mots, 'mot')} ·{' '}
                                {pluriel(affichee.resume.formules, 'formule')}
                            </p>
                        </div>
                        <div className="grid gap-4 px-5 py-5">
                            <p className="text-[1.375rem] leading-tight font-semibold tracking-tight">
                                {affichee.titre}
                            </p>
                            {(affichee.blocs.content ?? []).length === 0 ? (
                                <p className="text-ink-500">
                                    Cette leçon est encore vide.
                                </p>
                            ) : (
                                <ContenuBlocs doc={affichee.blocs} />
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
                                        uuid={lecon.uuid}
                                        affichee={
                                            affichee.numero === version.numero
                                        }
                                    />
                                ))}
                            </ol>
                        )}
                        {affichee.source === 'version' &&
                            lecon.statut === 'brouillon' && (
                                <Link
                                    href={
                                        droits.rediger
                                            ? edit(lecon.uuid)
                                            : show(lecon.uuid)
                                    }
                                    className="mt-4 inline-flex text-aide font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
                                >
                                    Un brouillon est en cours
                                </Link>
                            )}
                    </Section>

                    {droits.archiver && lecon.statut !== 'en_relecture' && (
                        <Section titre="Responsable pédagogique">
                            {lecon.statut === 'archive' ? (
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    onClick={() =>
                                        router.post(
                                            restaurer(lecon.uuid).url,
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
                                    onClick={() => void archiverLecon()}
                                >
                                    <Archive aria-hidden />
                                    Archiver la leçon
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
    lecon,
    droits,
    enAttente,
}: {
    lecon: LeconResume;
    droits: Props['droits'];
    enAttente?: Version;
}) {
    if (lecon.statut === 'en_relecture' && droits.relire && enAttente) {
        return <PanneauRelecture lecon={lecon} version={enAttente} />;
    }

    if (lecon.statut === 'en_relecture') {
        return (
            <Bandeau
                icone={Clock3}
                titre={
                    droits.auteur ? 'En attente d’un relecteur' : 'En relecture'
                }
                texte={
                    droits.auteur
                        ? 'Un autre enseignant doit la relire : l’auteur ne relit jamais sa propre leçon. Vous pouvez la reprendre pour la modifier.'
                        : `Version ${enAttente?.numero ?? ''} envoyée par ${enAttente?.auteur ?? ''}.`
                }
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(reprendre(lecon.uuid).url)
                            }
                        >
                            <Undo2 aria-hidden />
                            Reprendre la leçon
                        </Button>
                    )
                }
            />
        );
    }

    if (lecon.statut === 'brouillon' && droits.rediger) {
        return (
            <Bandeau
                icone={PenLine}
                titre="Brouillon"
                texte={
                    lecon.publiee
                        ? 'Une modification est en cours ; la version publiée reste en ligne.'
                        : 'La leçon n’est pas encore publiée.'
                }
                action={
                    <Button asChild taille="compacte">
                        <Link href={edit(lecon.uuid)}>
                            <PenLine aria-hidden />
                            Continuer la rédaction
                        </Link>
                    </Button>
                }
            />
        );
    }

    if (lecon.statut === 'publie') {
        return (
            <Bandeau
                icone={CircleCheck}
                titre="En ligne"
                texte="Les élèves voient cette version. La modifier ouvre un nouveau brouillon, relu à son tour."
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(modifier(lecon.uuid).url)
                            }
                        >
                            <PenLine aria-hidden />
                            Modifier la leçon
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
    lecon,
    version,
}: {
    lecon: LeconResume;
    version: Version;
}) {
    const formulaire = useForm({ commentaire: '' });
    const confirmer = useConfirmer();

    async function decider(decision: 'publier' | 'renvoyer') {
        if (decision === 'publier') {
            const accepte = await confirmer({
                titre: 'Publier cette leçon ?',
                message: 'Les élèves la verront aussitôt.',
                action: 'Publier',
            });

            if (accepte) {
                formulaire.post(publier(lecon.uuid).url, {
                    preserveScroll: true,
                });
            }

            return;
        }

        formulaire.post(renvoyer(lecon.uuid).url, { preserveScroll: true });
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
                    {formaterJourHeure(version.soumise_le)}. Vérifiez
                    l’exactitude, les formules et le niveau de langue de la
                    classe.
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
