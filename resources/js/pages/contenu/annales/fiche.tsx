import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CircleAlert,
    CircleCheck,
    Clock3,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    PenLine,
    Plus,
    Send,
    Sparkles,
    Trash2,
    TriangleAlert,
    Undo2,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Section } from '@/components/contenu/section';
import { BadgeStatut } from '@/components/contenu/statut-lecon';
import { EditeurLecon } from '@/components/editeur/editeur-lecon';
import { RevueQuestion } from '@/components/questions/revue-question';
import { TYPES } from '@/components/questions/types-question';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type { QuestionEleve, TypeQuestion } from '@/lib/contenu/questions';
import { formaterDuree, formaterPoids } from '@/lib/contenu/sujets';
import { formaterJourHeure } from '@/lib/dates';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import {
    archiver,
    index,
    modifier,
    publier,
    relecture,
    renvoyer,
    reprendre,
    restaurer,
    soumettre,
    update,
} from '@/routes/contenu/annales';
import {
    destroy as supprimerPartie,
    store as ajouterPartie,
    update as modifierPartie,
} from '@/routes/contenu/annales/parties';
import {
    deplacer,
    destroy as retirerQuestion,
    store as ajouterQuestion,
    verifier,
} from '@/routes/contenu/annales/questions';
import { edit as saisirQuestion } from '@/routes/contenu/questions';
import type { StatutContenu } from '@/types';
import type { AnnaleResume } from './index';

type QuestionStructure = {
    uuid: string;
    type: TypeQuestion;
    type_libelle: string;
    titre: string;
    statut: StatutContenu;
    publiee: boolean;
    a_verifier: boolean;
    a_completer: string | null;
    notion: string;
    chapitre: string;
    difficulte: number;
    etapes: number;
    apercu: QuestionEleve;
};

type Partie = {
    uuid: string;
    titre: string;
    bareme: number | null;
    consigne: DocumentBlocs;
    questions: QuestionStructure[];
};

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
    sujet: AnnaleResume & {
        duree_minutes: number | null;
        coefficient: string | null;
        droits_publication: string | null;
        revision: number;
        document: {
            nom: string | null;
            type: string | null;
            octets: number | null;
            url: string;
        } | null;
    };
    parties: Partie[];
    a_completer: string | null;
    import: {
        avertissements: string[];
        modele: string | null;
        jetons: number;
        termine_le: string | null;
    } | null;
    versions: Version[];
    renvoi: {
        commentaire: string | null;
        par: string | null;
        le: string | null;
    } | null;
    notions: { libelle: string; notions: { id: number; titre: string }[] }[];
    types: { valeur: TypeQuestion; libelle: string }[];
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
 * Fiche d'une annale (PLAN M6, M17) : la version structurée (parties,
 * consignes, questions) à côté du **document original**, ce qu'il reste à
 * vérifier après l'import assisté, le circuit de relecture (le sujet et ses
 * questions ensemble) et l'historique.
 */
export default function Fiche({
    sujet,
    parties,
    a_completer,
    import: lecture,
    versions,
    renvoi,
    notions,
    types,
    droits,
}: Props) {
    const style = MATIERES[sujet.matiere.teinte];
    const confirmer = useConfirmer();
    const modifiable = sujet.statut === 'brouillon' && droits.rediger;
    const questions = parties.flatMap((p) => p.questions);
    const aVerifier = questions.filter((q) => q.a_verifier).length;
    const enAttente = versions.find((v) => v.decision === null);

    async function archiverAnnale() {
        if (
            await confirmer({
                titre: 'Retirer cette annale ?',
                message:
                    'Les élèves ne la verront plus, ni ses questions. Ses versions et les réponses déjà données restent ; elle peut être restaurée.',
                action: 'Archiver',
                ton: 'danger',
            })
        ) {
            router.post(archiver(sujet.uuid).url, {}, { preserveScroll: true });
        }
    }

    return (
        <div className="grid gap-6">
            <Head
                title={`Annale · ${sujet.matiere.nom} ${sujet.libelle_session}`}
            />

            <div className="grid gap-4">
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className="-ml-2 w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Les annales
                    </Link>
                </Button>
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'mt-1 flex size-11 shrink-0 items-center justify-center rounded-[12px]',
                            style?.tuile,
                        )}
                    >
                        {style && <style.icone className="size-5" />}
                    </span>
                    <div className="grid min-w-0 gap-1.5">
                        <p className="text-aide text-ink-500">
                            {sujet.type_libelle} ·{' '}
                            {pluriel(questions.length, 'question')}
                            {sujet.duree_minutes !== null &&
                                ` · ${formaterDuree(sujet.duree_minutes)}`}
                            {sujet.coefficient &&
                                ` · coefficient ${sujet.coefficient}`}
                        </p>
                        <h1 className="text-titre-ecran titre-contraste lg:text-titre-ecran-large">
                            {sujet.matiere.nom} ·{' '}
                            <strong>{sujet.libelle_session}</strong>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <BadgeStatut statut={sujet.statut} />
                            {sujet.est_exemple && (
                                <Badge variant="neutre">Exemple</Badge>
                            )}
                            <span className="text-aide text-ink-600">
                                {sujet.titre}
                            </span>
                            <span className="flex items-center gap-1 text-aide text-ink-500">
                                <UserRound aria-hidden className="size-3.5" />
                                {sujet.de_moi
                                    ? 'Vous en êtes l’auteur'
                                    : `par ${sujet.auteur}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {sujet.est_exemple && <BandeauExemple />}

            <PanneauAction
                sujet={sujet}
                droits={droits}
                enAttente={enAttente}
                aCompleter={a_completer}
                aVerifier={aVerifier}
                nombre={questions.length}
            />

            {renvoi && sujet.statut === 'brouillon' && (
                <div className="flex gap-3 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] p-4 dark:bg-indice-400/[0.06]">
                    <CircleAlert
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-indice-600 dark:text-indice-400"
                    />
                    <div className="grid gap-1">
                        <p className="font-semibold">
                            Renvoyée par {renvoi.par}
                        </p>
                        <p className="whitespace-pre-line text-ink-600">
                            {renvoi.commentaire}
                        </p>
                    </div>
                </div>
            )}

            {lecture && lecture.avertissements.length > 0 && modifiable && (
                <Section
                    titre="Points signalés à la lecture"
                    description="Ce que la lecture automatique n’a pas pu trancher : à vérifier sur le document original."
                >
                    <ul className="grid gap-1.5">
                        {lecture.avertissements.map((a, rang) => (
                            <li
                                key={rang}
                                className="flex items-start gap-2 text-interface text-ink-600"
                            >
                                <TriangleAlert
                                    aria-hidden
                                    className="mt-0.5 size-4 shrink-0 text-indice-600 dark:text-indice-400"
                                />
                                {a}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
                <div className="grid min-w-0 gap-5">
                    {parties.map((partie, rang) => (
                        <CartePartie
                            key={partie.uuid}
                            partie={partie}
                            debut={
                                parties
                                    .slice(0, rang)
                                    .reduce(
                                        (t, p) => t + p.questions.length,
                                        0,
                                    ) + 1
                            }
                            modifiable={modifiable}
                            notions={notions}
                            types={types}
                        />
                    ))}
                    {modifiable && <NouvellePartie uuid={sujet.uuid} />}
                </div>

                <div className="grid content-start gap-5 lg:sticky lg:top-6">
                    {sujet.document ? (
                        <DocumentOriginal document={sujet.document} />
                    ) : (
                        <Section
                            titre="Pas de document original"
                            description="Un sujet maison n’en a pas toujours. Une annale officielle en a besoin : c’est la preuve de son authenticité."
                        >
                            <span />
                        </Section>
                    )}
                    <Renseignements
                        key={sujet.revision}
                        sujet={sujet}
                        modifiable={modifiable}
                    />
                    <Section
                        titre="Historique"
                        description={
                            versions.length === 0
                                ? 'Aucune version : l’annale n’a jamais été envoyée en relecture.'
                                : `${pluriel(versions.length, 'version')}.`
                        }
                    >
                        {versions.length > 0 && (
                            <ol className="grid gap-3">
                                {versions.map((v) => {
                                    const decision = v.decision
                                        ? DECISIONS[v.decision]
                                        : null;

                                    return (
                                        <li
                                            key={v.numero}
                                            className="grid gap-1"
                                        >
                                            <p className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-semibold">
                                                    Version {v.numero}
                                                </span>
                                                {decision ? (
                                                    <Badge
                                                        variant={
                                                            decision.variante
                                                        }
                                                    >
                                                        {decision.libelle}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="nimba">
                                                        À relire
                                                    </Badge>
                                                )}
                                                {v.publiee && (
                                                    <Badge variant="juste">
                                                        En ligne
                                                    </Badge>
                                                )}
                                            </p>
                                            <p
                                                className="text-meta text-ink-500"
                                                data-capture="variable"
                                            >
                                                {v.auteur} ·{' '}
                                                {formaterJourHeure(
                                                    v.soumise_le,
                                                )}
                                                {v.decide_par &&
                                                    ` · ${decision?.libelle} par ${v.decide_par}`}
                                            </p>
                                            {v.commentaire && (
                                                <p className="rounded-[10px] bg-craie-100 px-3 py-2 text-aide whitespace-pre-line text-ink-600 dark:bg-white/[0.04]">
                                                    {v.commentaire}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </Section>
                    {droits.archiver && sujet.statut !== 'en_relecture' && (
                        <Section titre="Responsable pédagogique">
                            {sujet.statut === 'archive' ? (
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    onClick={() =>
                                        router.post(restaurer(sujet.uuid).url)
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
                                    onClick={() => void archiverAnnale()}
                                >
                                    <Archive aria-hidden />
                                    Retirer l’annale
                                </Button>
                            )}
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Le geste attendu de ce compte selon le statut : un seul moment fort. */
function PanneauAction({
    sujet,
    droits,
    enAttente,
    aCompleter,
    aVerifier,
    nombre,
}: {
    sujet: Props['sujet'];
    droits: Props['droits'];
    enAttente?: Version;
    aCompleter: string | null;
    aVerifier: number;
    nombre: number;
}) {
    const confirmer = useConfirmer();
    const [envoi, setEnvoi] = useState(false);

    if (sujet.statut === 'en_relecture' && droits.relire && enAttente) {
        return <PanneauRelecture sujet={sujet} version={enAttente} />;
    }

    if (sujet.statut === 'en_relecture') {
        return (
            <Bandeau
                icone={Clock3}
                titre={
                    droits.auteur ? 'En attente d’un relecteur' : 'En relecture'
                }
                texte="Un autre enseignant relit l’annale et toutes ses questions. L’auteur ne relit jamais sa propre annale."
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(reprendre(sujet.uuid).url)
                            }
                        >
                            <Undo2 aria-hidden />
                            Reprendre l’annale
                        </Button>
                    )
                }
            />
        );
    }

    if (sujet.statut === 'brouillon' && droits.rediger) {
        async function envoyer() {
            if (
                await confirmer({
                    titre: 'Envoyer l’annale en relecture ?',
                    message: `Le sujet part en relecture avec ses ${pluriel(nombre, 'question')}. Un autre enseignant décidera pour l’ensemble.`,
                    action: 'Envoyer en relecture',
                })
            ) {
                setEnvoi(true);
                router.post(
                    soumettre(sujet.uuid).url,
                    {},
                    { onFinish: () => setEnvoi(false), preserveScroll: true },
                );
            }
        }

        return (
            <section className="flex flex-col gap-4 rounded-carte surface-encre p-5 text-white shadow-releve sm:flex-row sm:items-center">
                <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-white/10"
                >
                    {aVerifier > 0 ? (
                        <Sparkles className="size-5 text-nimba-300" />
                    ) : (
                        <PenLine className="size-5" />
                    )}
                </span>
                <div className="grid flex-1 gap-0.5">
                    <p className="text-titre-carte font-semibold">
                        {aVerifier > 0
                            ? `${pluriel(aVerifier, 'réponse')} proposée${aVerifier > 1 ? 's' : ''} par l’IA à vérifier`
                            : aCompleter
                              ? 'Encore un point à régler'
                              : 'Prête pour la relecture'}
                    </p>
                    <p className="text-aide text-white/75">
                        {aVerifier > 0
                            ? 'Comparez chaque énoncé au document original, corrigez la réponse attendue et le corrigé si besoin, puis confirmez.'
                            : (aCompleter ??
                              'Toutes les réponses sont vérifiées. Un relecteur publiera l’annale et ses questions ensemble.')}
                    </p>
                </div>
                <Button
                    disabled={aCompleter !== null || envoi}
                    onClick={() => void envoyer()}
                    className="shrink-0"
                >
                    {envoi ? <Spinner /> : <Send aria-hidden />}
                    Envoyer en relecture
                </Button>
            </section>
        );
    }

    if (sujet.statut === 'publie') {
        return (
            <Bandeau
                icone={CircleCheck}
                titre="En ligne"
                texte="Les élèves de cet examen lisent et s’entraînent sur cette version. La modifier ouvre un nouveau brouillon, relu à son tour."
                action={
                    droits.rediger && (
                        <Button
                            variant="outline"
                            taille="compacte"
                            onClick={() =>
                                router.post(modifier(sujet.uuid).url)
                            }
                        >
                            <PenLine aria-hidden />
                            Modifier l’annale
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
    sujet,
    version,
}: {
    sujet: Props['sujet'];
    version: Version;
}) {
    const formulaire = useForm({ commentaire: '' });
    const confirmer = useConfirmer();

    async function publierAnnale() {
        if (
            await confirmer({
                titre: 'Publier cette annale ?',
                message:
                    'Elle et toutes ses questions seront proposées aux élèves de cet examen.',
                action: 'Publier',
            })
        ) {
            formulaire.post(publier(sujet.uuid).url, { preserveScroll: true });
        }
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
                    {formaterJourHeure(version.soumise_le)}. Comparez l’énoncé
                    au document original, puis vérifiez chaque réponse attendue
                    et chaque corrigé.
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
                            placeholder="Ce qui est juste, ce qu’il faut reprendre (question par question)…"
                        />
                    )}
                </Champ>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="outline"
                    className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                    disabled={formulaire.processing}
                    onClick={() =>
                        formulaire.post(renvoyer(sujet.uuid).url, {
                            preserveScroll: true,
                        })
                    }
                >
                    <Undo2 aria-hidden />
                    Renvoyer à l’auteur
                </Button>
                <Button
                    disabled={formulaire.processing}
                    onClick={() => void publierAnnale()}
                >
                    {formulaire.processing ? (
                        <Spinner />
                    ) : (
                        <CircleCheck aria-hidden />
                    )}
                    Publier l’annale
                </Button>
            </div>
            <Link
                href={relecture()}
                className="text-aide text-white/70 underline-offset-2 hover:underline"
            >
                Retour à la file de relecture
            </Link>
        </section>
    );
}

function CartePartie({
    partie,
    debut,
    modifiable,
    notions,
    types,
}: {
    partie: Partie;
    debut: number;
    modifiable: boolean;
    notions: Props['notions'];
    types: Props['types'];
}) {
    const [edition, setEdition] = useState(false);
    const formulaire = useForm({
        titre: partie.titre,
        bareme: partie.bareme === null ? '' : String(partie.bareme),
        consigne: partie.consigne,
    });

    function enregistrer() {
        formulaire.transform((d) => ({
            ...d,
            bareme: d.bareme === '' ? null : Number(d.bareme.replace(',', '.')),
        }));
        formulaire.put(modifierPartie(partie.uuid).url, {
            preserveScroll: true,
            onSuccess: () => setEdition(false),
        });
    }

    return (
        <section
            aria-labelledby={`partie-${partie.uuid}`}
            className="rounded-carte border bg-card shadow-carte"
        >
            <div className="grid gap-3 border-b px-5 py-4">
                {edition ? (
                    <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                            <Champ
                                libelle="Titre de la partie"
                                erreur={formulaire.errors.titre}
                            >
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        value={formulaire.data.titre}
                                        maxLength={160}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'titre',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                            <Champ
                                libelle="Points"
                                erreur={formulaire.errors.bareme}
                            >
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        inputMode="decimal"
                                        value={formulaire.data.bareme}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'bareme',
                                                e.target.value,
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                        </div>
                        <EditeurLecon
                            compact
                            libelle="Consigne commune de la partie"
                            initial={partie.consigne}
                            placeholder="Le texte d’introduction de l’exercice, ses données…"
                            onChange={(doc) =>
                                formulaire.setData('consigne', doc)
                            }
                        />
                        {formulaire.errors.consigne && (
                            <p className="text-aide text-faux-600 dark:text-faux-400">
                                {formulaire.errors.consigne}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                taille="compacte"
                                onClick={() => setEdition(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                taille="compacte"
                                disabled={formulaire.processing}
                                onClick={enregistrer}
                            >
                                Enregistrer la partie
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <h2
                                id={`partie-${partie.uuid}`}
                                className="text-titre-carte font-semibold"
                            >
                                {partie.titre}
                                {partie.bareme !== null && (
                                    <span className="ml-2 text-aide font-normal text-ink-500 font-data">
                                        {pluriel(partie.bareme, 'point')}
                                    </span>
                                )}
                            </h2>
                            {modifiable && (
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost"
                                        taille="petite"
                                        onClick={() => setEdition(true)}
                                    >
                                        <PenLine aria-hidden />
                                        Modifier
                                    </Button>
                                    {partie.questions.length === 0 && (
                                        <Button
                                            variant="ghost"
                                            taille="petite"
                                            ton="danger"
                                            aria-label="Supprimer la partie"
                                            onClick={() =>
                                                router.delete(
                                                    supprimerPartie(partie.uuid)
                                                        .url,
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Trash2 aria-hidden />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        {(partie.consigne.content ?? []).length > 0 && (
                            <ContenuBlocs
                                doc={partie.consigne}
                                className="text-interface"
                            />
                        )}
                    </>
                )}
            </div>

            {partie.questions.length === 0 ? (
                <p className="px-5 py-4 text-aide text-ink-500">
                    Aucune question dans cette partie.
                </p>
            ) : (
                <ol className="divide-y">
                    {partie.questions.map((q, rang) => (
                        <LigneQuestion
                            key={q.uuid}
                            question={q}
                            numero={debut + rang}
                            modifiable={modifiable}
                            premiere={rang === 0}
                            derniere={rang === partie.questions.length - 1}
                        />
                    ))}
                </ol>
            )}

            {modifiable && notions.length > 0 && (
                <NouvelleQuestion
                    partie={partie.uuid}
                    notions={notions}
                    types={types}
                />
            )}
        </section>
    );
}

function LigneQuestion({
    question,
    numero,
    modifiable,
    premiere,
    derniere,
}: {
    question: QuestionStructure;
    numero: number;
    modifiable: boolean;
    premiere: boolean;
    derniere: boolean;
}) {
    const [apercu, setApercu] = useState(false);
    const type = TYPES[question.type];
    const confirmer = useConfirmer();

    async function retirer() {
        if (
            await confirmer({
                titre: 'Retirer cette question de l’annale ?',
                message: 'Elle disparaît (elle n’a jamais été publiée).',
                action: 'Retirer',
                ton: 'danger',
            })
        ) {
            router.delete(retirerQuestion(question.uuid).url, {
                preserveScroll: true,
            });
        }
    }

    return (
        <li className="grid gap-3 px-5 py-3.5">
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                >
                    {numero}
                </span>
                <div className="grid min-w-0 flex-1 gap-1">
                    {/* L'énoncé rendu (formules comprises), pas son extrait en texte. */}
                    <div className="line-clamp-3 font-medium [&_p]:m-0">
                        {(question.apercu.enonce.content ?? []).length > 0 ? (
                            <ContenuBlocs
                                doc={question.apercu.enonce}
                                className="text-interface"
                            />
                        ) : (
                            question.titre
                        )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-aide text-ink-500">
                        <span className="flex items-center gap-1">
                            <type.icone aria-hidden className="size-3.5" />
                            {question.type_libelle}
                        </span>
                        · {question.notion}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {question.a_verifier ? (
                            <Badge variant="indice">
                                <Sparkles aria-hidden />
                                Proposée par l’IA · à vérifier
                            </Badge>
                        ) : question.statut === 'brouillon' ? (
                            <Badge variant="juste">
                                <CircleCheck aria-hidden />
                                Vérifiée
                            </Badge>
                        ) : (
                            <BadgeStatut statut={question.statut} />
                        )}
                        {question.a_completer && !question.a_verifier && (
                            <span className="flex items-center gap-1 text-meta text-faux-600 dark:text-faux-400">
                                <CircleAlert aria-hidden className="size-3.5" />
                                {question.a_completer}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    <Button
                        variant="ghost"
                        taille="petite"
                        aria-expanded={apercu}
                        onClick={() => setApercu(!apercu)}
                    >
                        {apercu ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        <span className="max-sm:sr-only">Aperçu</span>
                    </Button>
                    {modifiable && (
                        <Button asChild variant="outline" taille="petite">
                            <Link href={saisirQuestion(question.uuid)}>
                                <PenLine aria-hidden />
                                <span className="max-sm:sr-only">Corriger</span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {apercu && (
                <div className="ml-10 rounded-carte border bg-relief/40 p-4">
                    <RevueQuestion question={question.apercu} />
                </div>
            )}

            {modifiable && (
                <div className="ml-10 flex flex-wrap items-center gap-1.5">
                    {question.a_verifier && (
                        <Button
                            taille="petite"
                            variant="doux"
                            onClick={() =>
                                router.post(
                                    verifier(question.uuid).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <CircleCheck aria-hidden />
                            J’ai vérifié
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        taille="petite"
                        aria-label={`Monter la question ${numero}`}
                        disabled={premiere}
                        onClick={() =>
                            router.post(
                                deplacer(question.uuid).url,
                                { sens: 'monter' },
                                { preserveScroll: true },
                            )
                        }
                    >
                        <ArrowUp aria-hidden />
                    </Button>
                    <Button
                        variant="ghost"
                        taille="petite"
                        aria-label={`Descendre la question ${numero}`}
                        disabled={derniere}
                        onClick={() =>
                            router.post(
                                deplacer(question.uuid).url,
                                { sens: 'descendre' },
                                { preserveScroll: true },
                            )
                        }
                    >
                        <ArrowDown aria-hidden />
                    </Button>
                    {!question.publiee && (
                        <Button
                            variant="ghost"
                            ton="danger"
                            taille="petite"
                            onClick={() => void retirer()}
                        >
                            <Trash2 aria-hidden />
                            Retirer
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}

function NouvelleQuestion({
    partie,
    notions,
    types,
}: {
    partie: string;
    notions: Props['notions'];
    types: Props['types'];
}) {
    const [ouvert, setOuvert] = useState(false);
    const formulaire = useForm<{ notion_id: number | ''; type: TypeQuestion }>({
        notion_id: notions[0]?.notions[0]?.id ?? '',
        type: 'ouverte',
    });

    if (!ouvert) {
        return (
            <div className="border-t px-5 py-3">
                <Button
                    variant="ghost"
                    taille="petite"
                    onClick={() => setOuvert(true)}
                >
                    <Plus aria-hidden />
                    Ajouter une question
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-3 border-t px-5 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
            <Champ libelle="Notion" erreur={formulaire.errors.notion_id}>
                {(attributs) => (
                    <ListeDeroulante
                        {...attributs}
                        value={formulaire.data.notion_id}
                        onChange={(e) =>
                            formulaire.setData(
                                'notion_id',
                                Number(e.target.value),
                            )
                        }
                    >
                        {notions.map((g) => (
                            <optgroup key={g.libelle} label={g.libelle}>
                                {g.notions.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.titre}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </ListeDeroulante>
                )}
            </Champ>
            <Champ libelle="Type" erreur={formulaire.errors.type}>
                {(attributs) => (
                    <ListeDeroulante
                        {...attributs}
                        value={formulaire.data.type}
                        onChange={(e) =>
                            formulaire.setData(
                                'type',
                                e.target.value as TypeQuestion,
                            )
                        }
                    >
                        {types.map((t) => (
                            <option key={t.valeur} value={t.valeur}>
                                {t.libelle}
                            </option>
                        ))}
                    </ListeDeroulante>
                )}
            </Champ>
            <Button
                taille="compacte"
                disabled={
                    formulaire.processing || formulaire.data.notion_id === ''
                }
                onClick={() => formulaire.post(ajouterQuestion(partie).url)}
            >
                Créer et saisir
            </Button>
        </div>
    );
}

function NouvellePartie({ uuid }: { uuid: string }) {
    const formulaire = useForm({ titre: '' });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                formulaire.post(ajouterPartie(uuid).url, {
                    preserveScroll: true,
                    onSuccess: () => formulaire.reset(),
                });
            }}
            className="flex flex-col gap-2 rounded-carte border border-dashed border-ink-400/60 p-4 sm:flex-row sm:items-end"
        >
            <Champ
                libelle="Nouvelle partie"
                erreur={formulaire.errors.titre}
                className="flex-1"
            >
                {(attributs) => (
                    <Input
                        {...attributs}
                        value={formulaire.data.titre}
                        maxLength={160}
                        placeholder="Exercice 3, Problème…"
                        onChange={(e) =>
                            formulaire.setData('titre', e.target.value)
                        }
                    />
                )}
            </Champ>
            <Button
                type="submit"
                variant="outline"
                taille="compacte"
                disabled={
                    formulaire.processing || formulaire.data.titre.trim() === ''
                }
            >
                <Plus aria-hidden />
                Ajouter la partie
            </Button>
        </form>
    );
}

/** Le document original, à côté de la version structurée : la preuve. */
function DocumentOriginal({
    document,
}: {
    document: NonNullable<Props['sujet']['document']>;
}) {
    const pdf = document.type === 'application/pdf';
    // Sans lecteur PDF intégré (Android, navigateur sans greffon), pas de
    // grand cadre vide : le bouton « Ouvrir » suffit.
    const apercu =
        !pdf ||
        (typeof navigator !== 'undefined' && navigator.pdfViewerEnabled);

    return (
        <section
            aria-labelledby="titre-document"
            className="overflow-hidden rounded-carte border bg-card shadow-carte"
        >
            <div className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <FileText
                        aria-hidden
                        className="size-4 shrink-0 text-ink-500"
                    />
                    <div className="grid min-w-0">
                        <h2
                            id="titre-document"
                            className="truncate text-interface font-semibold"
                        >
                            Document original
                        </h2>
                        <p className="truncate text-meta text-ink-500">
                            {document.nom} · {formaterPoids(document.octets)}
                        </p>
                    </div>
                </div>
                <Button asChild variant="outline" taille="petite">
                    <a href={document.url} target="_blank" rel="noopener">
                        <ExternalLink aria-hidden />
                        Ouvrir
                    </a>
                </Button>
            </div>
            {/* Une surface claire fixe (le document reste un papier blanc). */}
            {apercu && (
                <div className="clair border-t bg-white">
                    {pdf ? (
                        <object
                            data={`${document.url}#view=FitH`}
                            type="application/pdf"
                            aria-label="Aperçu du document original"
                            className="block h-[70vh] w-full"
                        >
                            <p className="p-5 text-aide text-ink-600">
                                L’aperçu n’est pas disponible dans ce navigateur
                                : ouvrez le document.
                            </p>
                        </object>
                    ) : (
                        <img
                            src={document.url}
                            alt="Le sujet tel qu’il a été téléversé"
                            className="block max-h-[70vh] w-full object-contain"
                        />
                    )}
                </div>
            )}
        </section>
    );
}

function Renseignements({
    sujet,
    modifiable,
}: {
    sujet: Props['sujet'];
    modifiable: boolean;
}) {
    const formulaire = useForm({
        titre: sujet.titre,
        session: sujet.session,
        duree_minutes:
            sujet.duree_minutes === null ? '' : String(sujet.duree_minutes),
        coefficient: sujet.coefficient ?? '',
        droits: sujet.droits_publication ?? '',
        revision: sujet.revision,
    });

    if (!modifiable) {
        return (
            <Section titre="Renseignements">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-interface">
                    <dt className="text-ink-500">Session</dt>
                    <dd className="font-data">{sujet.session}</dd>
                    <dt className="text-ink-500">Durée</dt>
                    <dd>
                        {formaterDuree(sujet.duree_minutes) ?? 'Non indiquée'}
                    </dd>
                    <dt className="text-ink-500">Coefficient</dt>
                    <dd>{sujet.coefficient ?? 'Non indiqué'}</dd>
                    <dt className="text-ink-500">Droits</dt>
                    <dd>{sujet.droits_publication ?? 'À renseigner (D5)'}</dd>
                </dl>
            </Section>
        );
    }

    return (
        <Section
            titre="Renseignements"
            description="Durée et coefficient : seulement s’ils sont imprimés sur le document."
        >
            <form
                className="grid gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    formulaire.transform((d) => ({
                        ...d,
                        duree_minutes:
                            d.duree_minutes === ''
                                ? null
                                : Number(d.duree_minutes),
                        coefficient:
                            d.coefficient.trim() === '' ? null : d.coefficient,
                        droits: d.droits.trim() === '' ? null : d.droits,
                    }));
                    formulaire.put(update(sujet.uuid).url, {
                        preserveScroll: true,
                    });
                }}
            >
                <Champ libelle="Titre" erreur={formulaire.errors.titre}>
                    {(attributs) => (
                        <Input
                            {...attributs}
                            value={formulaire.data.titre}
                            maxLength={160}
                            onChange={(e) =>
                                formulaire.setData('titre', e.target.value)
                            }
                        />
                    )}
                </Champ>
                <div className="grid grid-cols-3 gap-3">
                    <Champ libelle="Session" erreur={formulaire.errors.session}>
                        {(attributs) => (
                            <Input
                                {...attributs}
                                inputMode="numeric"
                                value={formulaire.data.session}
                                onChange={(e) =>
                                    formulaire.setData(
                                        'session',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        )}
                    </Champ>
                    <Champ
                        libelle="Durée (min)"
                        erreur={formulaire.errors.duree_minutes}
                    >
                        {(attributs) => (
                            <Input
                                {...attributs}
                                inputMode="numeric"
                                value={formulaire.data.duree_minutes}
                                onChange={(e) =>
                                    formulaire.setData(
                                        'duree_minutes',
                                        e.target.value,
                                    )
                                }
                            />
                        )}
                    </Champ>
                    <Champ
                        libelle="Coef."
                        erreur={formulaire.errors.coefficient}
                    >
                        {(attributs) => (
                            <Input
                                {...attributs}
                                value={formulaire.data.coefficient}
                                maxLength={10}
                                onChange={(e) =>
                                    formulaire.setData(
                                        'coefficient',
                                        e.target.value,
                                    )
                                }
                            />
                        )}
                    </Champ>
                </div>
                <Champ
                    libelle="Droits de publication"
                    aide="Référence de la convention avec le ministère (D5). Vide pendant le test fermé."
                    erreur={formulaire.errors.droits}
                >
                    {(attributs) => (
                        <Input
                            {...attributs}
                            value={formulaire.data.droits}
                            maxLength={255}
                            onChange={(e) =>
                                formulaire.setData('droits', e.target.value)
                            }
                        />
                    )}
                </Champ>
                {formulaire.errors.revision && (
                    <p className="text-aide text-faux-600 dark:text-faux-400">
                        {formulaire.errors.revision}
                    </p>
                )}
                <Button
                    type="submit"
                    variant="outline"
                    taille="compacte"
                    className="w-fit"
                    disabled={formulaire.processing || !formulaire.isDirty}
                >
                    Enregistrer
                </Button>
            </form>
        </Section>
    );
}
