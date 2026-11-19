import { router, usePage } from '@inertiajs/react';
import {
    EyeOff,
    Flag,
    GraduationCap,
    MessageCircleReply,
    MessageSquareDashed,
    MicOff,
    ShieldAlert,
    Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    cleBrouillon,
    compteur,
    ecrireBrouillon,
    effacerBrouillon,
    lireBrouillon,
} from '@/lib/communaute/brouillon';
import { depuis } from '@/lib/dates';
import { horsLigneSur, ouvrirEcranIndisponible } from '@/lib/hors-ligne';
import { uuid7 } from '@/lib/hors-ligne/uuid7';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import {
    publier as publierEleve,
    signaler as signalerEleve,
} from '@/routes/eleve/fil';
import {
    garder,
    masquer,
    parole,
    publier as publierEnseignant,
} from '@/routes/enseignant/fil';
import type { Publication, PropsFil, QuestionFil } from '@/types/communaute';

/**
 * Le fil « Questions du groupe » (lot 12, PLAN M13), pour l'élève et pour
 * l'enseignant (`moderateur`). Publié tout de suite, filtré par le serveur ;
 * l'enseignant **masque en un geste** (critère du lot), sans confirmation —
 * « Réafficher » le défait. Aucun message privé : on écrit au groupe.
 * En ligne seulement ; le brouillon reste sur l'appareil.
 */
export function FilGroupe({
    groupe,
    fil,
    matieres,
    motifs,
    limites,
    moderateur = false,
}: PropsFil & { moderateur?: boolean }) {
    const [aSignaler, setASignaler] = useState<Publication | null>(null);
    const [aFaireTaire, setAFaireTaire] = useState<Publication | null>(null);
    const peutEcrire =
        !groupe.archive &&
        (moderateur || (!fil.ferme && fil.muet_jusqu_au === null));
    const signalees = moderateur
        ? fil.questions
              .flatMap((q) => [q, ...q.reponses])
              .filter((p) => (p.signalements ?? 0) > 0)
        : [];

    return (
        <div className="grid content-start gap-5">
            {moderateur && signalees.length > 0 && (
                <section
                    aria-labelledby="titre-a-moderer"
                    className="grid gap-3 rounded-carte border border-nimba-500/45 bg-card p-5 shadow-carte"
                >
                    <h2
                        id="titre-a-moderer"
                        className="flex items-center gap-2 text-[0.9375rem]"
                    >
                        <ShieldAlert
                            aria-hidden
                            className="size-[18px] text-nimba-600 dark:text-nimba-400"
                        />
                        {pluriel(
                            signalees.length,
                            'message signalé',
                            'messages signalés',
                        )}{' '}
                        par des élèves
                    </h2>
                    <ul className="grid gap-3">
                        {signalees.map((p) => (
                            <li
                                key={p.uuid}
                                className="grid gap-3 rounded-controle bg-craie-100 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:bg-relief/60"
                            >
                                <div className="grid min-w-0 gap-1">
                                    <p className="text-meta text-ink-600">
                                        {p.auteur} ·{' '}
                                        <span data-capture="variable">
                                            {depuis(p.cree_le)}
                                        </span>{' '}
                                        ·{' '}
                                        <span className="font-semibold text-nimba-700 dark:text-nimba-300">
                                            {pluriel(
                                                p.signalements ?? 0,
                                                'signalement',
                                            )}
                                        </span>
                                        {p.masquage === 'signalements' &&
                                            ' · masqué en attendant votre décision'}
                                    </p>
                                    <p className="text-ink-900">{p.texte}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {!p.masquee && (
                                        <Button
                                            taille="compacte"
                                            onClick={() =>
                                                router.post(
                                                    masquer(p.uuid).url,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <EyeOff aria-hidden />
                                            Masquer
                                        </Button>
                                    )}
                                    {p.masquee && (
                                        <Button
                                            taille="compacte"
                                            onClick={() =>
                                                router.post(
                                                    masquer(p.uuid).url,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <EyeOff aria-hidden />
                                            Laisser masqué
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        taille="compacte"
                                        onClick={() =>
                                            router.post(
                                                garder(p.uuid).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Garder
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {peutEcrire ? (
                <Redaction
                    groupe={groupe.id}
                    matieres={matieres}
                    max={limites.texte_max}
                    moderateur={moderateur}
                />
            ) : (
                <p className="flex items-start gap-3 rounded-carte border bg-card p-4 text-ink-600 shadow-carte">
                    <MessageSquareDashed
                        aria-hidden
                        className="mt-0.5 size-5 shrink-0 text-ink-500"
                    />
                    {groupe.archive
                        ? 'Ce groupe est archivé : son fil se relit, plus personne n’y écrit.'
                        : fil.muet_jusqu_au
                          ? 'Ton enseignant t’a retiré la parole pour quelques jours. Tu peux toujours lire le fil.'
                          : 'Ton enseignant a fermé le fil pour le moment. Tu peux toujours le relire.'}
                </p>
            )}

            {fil.questions.length === 0 ? (
                <p className="rounded-carte border border-dashed border-contour p-6 text-center text-ink-600">
                    Pas encore de question dans le fil.{' '}
                    {peutEcrire &&
                        (moderateur
                            ? 'Lancez la discussion : une question pour la classe.'
                            : 'Pose la première : d’autres se la posent sûrement.')}
                </p>
            ) : (
                <ul aria-label="Questions du groupe" className="grid gap-4">
                    {fil.questions.map((question) => (
                        <FilQuestion
                            key={question.uuid}
                            groupe={groupe.id}
                            question={question}
                            moderateur={moderateur}
                            peutEcrire={peutEcrire}
                            max={limites.texte_max}
                            signaler={setASignaler}
                            faireTaire={setAFaireTaire}
                        />
                    ))}
                </ul>
            )}

            <DialogueSignaler
                publication={aSignaler}
                motifs={motifs}
                fermer={() => setASignaler(null)}
            />
            <DialogueParole
                groupe={groupe.id}
                publication={aFaireTaire}
                fermer={() => setAFaireTaire(null)}
            />
        </div>
    );
}

function FilQuestion({
    groupe,
    question,
    moderateur,
    peutEcrire,
    max,
    signaler,
    faireTaire,
}: {
    groupe: number;
    question: QuestionFil;
    moderateur: boolean;
    peutEcrire: boolean;
    max: number;
    signaler: (p: Publication) => void;
    faireTaire: (p: Publication) => void;
}) {
    const [repondre, setRepondre] = useState(false);
    const style = question.matiere ? MATIERES[question.matiere.cle] : null;

    return (
        <li
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-5 shadow-carte',
                question.masquee && 'opacity-70',
            )}
        >
            <Message
                publication={question}
                moderateur={moderateur}
                signaler={signaler}
                faireTaire={faireTaire}
                entete={
                    style &&
                    question.matiere && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-meta font-medium',
                                style.tuile,
                            )}
                        >
                            <style.icone aria-hidden className="size-3" />
                            {question.matiere.nom}
                        </span>
                    )
                }
                principale
            />

            {question.reponses.length > 0 && (
                <ul
                    aria-label={`Réponses (${question.reponses.length})`}
                    className="grid gap-3 border-l-2 border-contour pl-4 sm:ml-2"
                >
                    {question.reponses.map((reponse) => (
                        <li key={reponse.uuid}>
                            <Message
                                publication={reponse}
                                moderateur={moderateur}
                                signaler={signaler}
                                faireTaire={faireTaire}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {peutEcrire &&
                !question.masquee &&
                (repondre ? (
                    <Redaction
                        groupe={groupe}
                        parent={question.uuid}
                        max={max}
                        moderateur={moderateur}
                        fermer={() => setRepondre(false)}
                    />
                ) : (
                    <Button
                        variant="ghost"
                        taille="petite"
                        className="w-fit"
                        onClick={() => setRepondre(true)}
                    >
                        <MessageCircleReply aria-hidden />
                        Répondre
                    </Button>
                ))}
        </li>
    );
}

function Message({
    publication,
    moderateur,
    signaler,
    faireTaire,
    entete,
    principale = false,
}: {
    publication: Publication;
    moderateur: boolean;
    signaler: (p: Publication) => void;
    faireTaire: (p: Publication) => void;
    entete?: React.ReactNode;
    principale?: boolean;
}) {
    const enseignant = publication.est_enseignant;

    return (
        <article
            className={cn(
                'grid gap-2',
                enseignant &&
                    !principale &&
                    'rounded-controle bg-nimba-500/[0.08] p-3 dark:bg-nimba-400/10',
            )}
        >
            <div className="flex items-start justify-between gap-x-3">
                <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-meta text-ink-500">
                    {enseignant && (
                        <GraduationCap
                            aria-hidden
                            className="size-3.5 text-nimba-700 dark:text-nimba-300"
                        />
                    )}
                    <span
                        className={cn(
                            'font-semibold',
                            enseignant
                                ? 'text-nimba-700 dark:text-nimba-300'
                                : 'text-ink-900',
                        )}
                    >
                        {publication.auteur}
                        {publication.est_moi && ' (toi)'}
                    </span>
                    {enseignant && <Badge variant="nimba">Prof</Badge>}
                    <span data-capture="variable">
                        {depuis(publication.cree_le)}
                    </span>
                    {entete}
                    {publication.masquee && (
                        <Badge>
                            <EyeOff aria-hidden />
                            {publication.masquage === 'signalements'
                                ? 'Masqué (signalements)'
                                : 'Masqué'}
                        </Badge>
                    )}
                </p>
                <div className="-my-1 -mr-2 flex shrink-0 flex-wrap justify-end gap-0.5 empty:hidden">
                    {moderateur && !publication.est_enseignant && (
                        <>
                            {publication.masquee ? (
                                <Button
                                    variant="ghost"
                                    taille="petite"
                                    onClick={() =>
                                        router.post(
                                            garder(publication.uuid).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <Undo2 aria-hidden />
                                    Réafficher
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    taille="petite"
                                    onClick={() =>
                                        router.post(
                                            masquer(publication.uuid).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <EyeOff aria-hidden />
                                    Masquer
                                </Button>
                            )}
                            {publication.auteur_id !== null && (
                                <Button
                                    variant="ghost"
                                    taille="petite"
                                    onClick={() => faireTaire(publication)}
                                >
                                    <MicOff aria-hidden />
                                    Retirer la parole
                                </Button>
                            )}
                        </>
                    )}
                    {!moderateur &&
                        !publication.est_moi &&
                        !publication.est_enseignant &&
                        (publication.signalee_par_moi ? (
                            <span className="flex items-center gap-1.5 px-2 text-meta text-ink-500">
                                <Flag aria-hidden className="size-3.5" />
                                Signalé
                            </span>
                        ) : (
                            <Button
                                variant="ghost"
                                taille="petite"
                                className="text-ink-500"
                                onClick={() => signaler(publication)}
                            >
                                <Flag aria-hidden />
                                Signaler
                            </Button>
                        ))}
                </div>
            </div>
            <p
                className={cn(
                    'whitespace-pre-line text-ink-900',
                    principale && 'text-[0.9688rem] font-medium',
                )}
            >
                {publication.texte}
            </p>
            {publication.masquee && publication.est_moi && !moderateur && (
                <p className="text-aide text-ink-500">
                    Ton enseignant a masqué ce message : les autres élèves ne le
                    voient plus.
                </p>
            )}
        </article>
    );
}

function Redaction({
    groupe,
    parent = null,
    matieres = [],
    max,
    moderateur,
    fermer,
}: {
    groupe: number;
    parent?: string | null;
    matieres?: PropsFil['matieres'];
    max: number;
    moderateur: boolean;
    fermer?: () => void;
}) {
    const { auth } = usePage().props;
    const cle = cleBrouillon(groupe, auth.user?.id ?? 0, parent);
    const [texte, setTexte] = useState('');
    const [matiere, setMatiere] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);
    const [envoi, setEnvoi] = useState(false);
    // Un identifiant par envoi : un double appui ne publie qu'une fois.
    const identifiant = useRef(uuid7());
    const champ = useRef<HTMLTextAreaElement>(null);
    const total = compteur(texte, max);

    useEffect(() => {
        setTexte(lireBrouillon(cle));

        if (parent !== null) {
            champ.current?.focus();
        }
    }, [cle, parent]);

    function envoyer(evenement: React.FormEvent) {
        evenement.preventDefault();

        if (horsLigneSur()) {
            ouvrirEcranIndisponible('ecriture');

            return;
        }

        setEnvoi(true);
        router.post(
            (moderateur ? publierEnseignant(groupe) : publierEleve(groupe)).url,
            {
                texte,
                parent,
                matiere: matiere || null,
                uuid: identifiant.current,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    effacerBrouillon(cle);
                    setTexte('');
                    setErreur(null);
                    identifiant.current = uuid7();
                    fermer?.();
                },
                onError: (erreurs) => {
                    setErreur(
                        erreurs.texte ??
                            Object.values(erreurs)[0] ??
                            'Message non envoyé.',
                    );
                    identifiant.current = uuid7();
                },
                onFinish: () => setEnvoi(false),
            },
        );
    }

    const idErreur = `erreur-${parent ?? 'question'}`;

    return (
        <form
            onSubmit={envoyer}
            className={cn(
                'grid gap-3',
                parent === null &&
                    'rounded-carte border bg-card p-5 shadow-carte',
            )}
        >
            {parent === null && (
                <label
                    htmlFor={`texte-${groupe}`}
                    className="text-[0.9375rem] font-semibold"
                >
                    {moderateur
                        ? 'Écrire à la classe'
                        : 'Poser une question au groupe'}
                </label>
            )}
            <Textarea
                id={parent === null ? `texte-${groupe}` : undefined}
                ref={champ}
                aria-label={parent === null ? undefined : 'Ta réponse'}
                aria-invalid={erreur ? true : undefined}
                aria-describedby={erreur ? idErreur : undefined}
                value={texte}
                onChange={(e) => {
                    setTexte(e.target.value);
                    ecrireBrouillon(cle, e.target.value);
                }}
                placeholder={
                    parent === null
                        ? moderateur
                            ? 'Une consigne, une question pour lancer la discussion…'
                            : 'Ex. : je ne comprends pas comment trouver l’hypoténuse…'
                        : 'Ta réponse, avec tes mots…'
                }
                className={parent === null ? 'min-h-24' : 'min-h-20'}
                maxLength={max + 50}
            />
            {erreur && (
                <p
                    id={idErreur}
                    role="alert"
                    className="text-aide text-faux-600 dark:text-faux-400"
                >
                    {erreur}
                </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {parent === null && matieres.length > 0 && (
                        <ListeDeroulante
                            aria-label="Matière de la question"
                            value={matiere}
                            onChange={(e) => setMatiere(e.target.value)}
                            className="h-9 w-auto"
                        >
                            <option value="">Toutes matières</option>
                            {matieres.map((m) => (
                                <option key={m.slug} value={m.slug}>
                                    {m.nom}
                                </option>
                            ))}
                        </ListeDeroulante>
                    )}
                    <span
                        className={cn(
                            'text-meta font-data',
                            total.trop
                                ? 'text-faux-600 dark:text-faux-400'
                                : total.alerte
                                  ? 'text-indice-700 dark:text-indice-400'
                                  : 'text-ink-500',
                        )}
                    >
                        {total.libelle}
                    </span>
                </div>
                <div className="flex gap-2">
                    {fermer && (
                        <Button
                            type="button"
                            variant="ghost"
                            taille="compacte"
                            onClick={fermer}
                        >
                            Annuler
                        </Button>
                    )}
                    <Button
                        type="submit"
                        taille="compacte"
                        disabled={
                            envoi || texte.trim().length < 3 || total.trop
                        }
                    >
                        {envoi && <Spinner />}
                        {parent === null ? 'Publier' : 'Répondre'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function DialogueSignaler({
    publication,
    motifs,
    fermer,
}: {
    publication: Publication | null;
    motifs: PropsFil['motifs'];
    fermer: () => void;
}) {
    const [motif, setMotif] = useState('');

    return (
        <Dialog
            open={publication !== null}
            onOpenChange={(o) => {
                if (!o) {
                    fermer();
                    setMotif('');
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                {publication && (
                    <form
                        className="grid gap-5"
                        onSubmit={(e) => {
                            e.preventDefault();

                            if (horsLigneSur()) {
                                ouvrirEcranIndisponible('ecriture');

                                return;
                            }

                            router.post(
                                signalerEleve(publication.uuid).url,
                                { motif },
                                {
                                    preserveScroll: true,
                                    onFinish: () => {
                                        fermer();
                                        setMotif('');
                                    },
                                },
                            );
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>Signaler ce message</DialogTitle>
                            <DialogDescription>
                                Ton enseignant le verra et décidera. Celui qui
                                l’a écrit ne saura pas que c’est toi.
                            </DialogDescription>
                        </DialogHeader>
                        <fieldset className="grid gap-2">
                            <legend className="sr-only">Motif</legend>
                            {motifs.map((m) => (
                                <label
                                    key={m.valeur}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-controle border px-3 py-2.5 transition-colors',
                                        motif === m.valeur
                                            ? 'border-nimba-600 bg-nimba-500/[0.08] dark:border-nimba-400'
                                            : 'border-contour hover:border-ink-400',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="motif"
                                        value={m.valeur}
                                        checked={motif === m.valeur}
                                        onChange={() => setMotif(m.valeur)}
                                        className="accent-nimba-600"
                                    />
                                    {m.libelle}
                                </label>
                            ))}
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={fermer}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={motif === ''}>
                                <Flag aria-hidden />
                                Signaler
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DialogueParole({
    groupe,
    publication,
    fermer,
}: {
    groupe: number;
    publication: Publication | null;
    fermer: () => void;
}) {
    function retirer(jours: number) {
        if (!publication?.auteur_id) {
            return;
        }

        router.post(
            parole({ groupe, eleve: publication.auteur_id }).url,
            { jours },
            { preserveScroll: true, onFinish: fermer },
        );
    }

    return (
        <Dialog
            open={publication !== null}
            onOpenChange={(o) => !o && fermer()}
        >
            <DialogContent className="sm:max-w-md">
                {publication && (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                Retirer la parole à {publication.auteur}
                            </DialogTitle>
                            <DialogDescription>
                                L’élève continue de lire le fil, sans pouvoir y
                                écrire. Vous pouvez la lui rendre à tout moment
                                depuis le même menu.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 3, 7].map((jours) => (
                                <Button
                                    key={jours}
                                    variant="outline"
                                    onClick={() => retirer(jours)}
                                >
                                    {pluriel(jours, 'jour')}
                                </Button>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => retirer(0)}>
                                Rendre la parole
                            </Button>
                            <Button variant="outline" onClick={fermer}>
                                Annuler
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
