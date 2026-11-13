import { Link } from '@inertiajs/react';
import {
    Compass,
    Flag,
    Lightbulb,
    SendHorizontal,
    Sparkles,
    WifiOff,
    Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageFil, useTuteur } from '@/hooks/use-tuteur';
import { MOTIFS_SIGNALEMENT_TUTEUR, signalerReponse } from '@/lib/tuteur/flux';
import type { MotifSignalementTuteur } from '@/lib/tuteur/flux';
import { texteEnBlocs } from '@/lib/tuteur/texte';
import { cn, pluriel } from '@/lib/utils';
import { abonnement } from '@/routes/eleve';
import { signaler } from '@/routes/eleve/tuteur';

type EtatTuteur = ReturnType<typeof useTuteur>;

/**
 * Le fil d'une conversation avec le tuteur (lot 10) : la demande de
 * l'élève à droite, l'explication à gauche, écrite au fil du flux et rendue
 * comme une leçon (formules KaTeX). Sous la dernière explication : relancer
 * (« Encore plus simple », « Un autre exemple », une question tapée),
 * « Signaler cette réponse », et ce qui reste aujourd'hui.
 */
export function FilTuteur({
    tuteur,
    texteMax = 400,
    abonne,
    className,
}: {
    tuteur: EtatTuteur;
    texteMax?: number;
    abonne: boolean;
    className?: string;
}) {
    const { messages, enCours, relances, quota, refus } = tuteur;
    const fin = useRef<HTMLDivElement>(null);
    const derniere = messages.at(-1);
    const peutRelancer =
        !enCours &&
        derniere?.role === 'tuteur' &&
        derniere.statut === 'complete' &&
        (relances ?? 0) > 0 &&
        (quota ?? 1) > 0;

    // La fin du fil suit la réponse qui s'écrit.
    useEffect(() => {
        fin.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, [messages.length, derniere?.texte.length]);

    return (
        <div className={cn('grid gap-4', className)}>
            <ol aria-label="Conversation avec le tuteur" className="grid gap-4">
                {messages.map((message) => (
                    <li key={message.cle}>
                        {message.role === 'eleve' ? (
                            <BulleEleve texte={message.texte} />
                        ) : (
                            <ReponseTuteur message={message} />
                        )}
                    </li>
                ))}
            </ol>

            {refus && (
                <div
                    role="status"
                    className="grid gap-3 rounded-controle border border-contour bg-craie-100 p-4 text-interface dark:bg-white/[0.04]"
                >
                    <p className="text-ink-900">{refus.message}</p>
                    {(refus.raison === 'quota' ||
                        refus.raison === 'corrige_reserve') &&
                        !abonne && (
                            <Button asChild taille="compacte" className="w-fit">
                                <Link href={abonnement()}>
                                    Voir l’abonnement
                                </Link>
                            </Button>
                        )}
                </div>
            )}

            {peutRelancer && <Relances tuteur={tuteur} texteMax={texteMax} />}

            {quota !== null && (
                <p className="text-meta text-ink-500">
                    {quota > 0
                        ? `Il te reste ${pluriel(quota, 'explication')} aujourd’hui.`
                        : 'Plus d’explication aujourd’hui : le tuteur revient demain matin.'}
                    {relances !== null &&
                        relances > 0 &&
                        derniere?.role === 'tuteur' &&
                        derniere.statut === 'complete' &&
                        ` ${pluriel(relances, 'relance')} dans cette conversation.`}
                </p>
            )}
            <div ref={fin} />
        </div>
    );
}

function BulleEleve({ texte }: { texte: string }) {
    return (
        <p className="ml-auto w-fit max-w-[85%] rounded-[14px] rounded-br-[4px] bg-ink-900 px-3.5 py-2.5 text-interface whitespace-pre-line text-craie-50">
            {texte}
        </p>
    );
}

function ReponseTuteur({ message }: { message: MessageFil }) {
    const doc = useMemo(() => texteEnBlocs(message.texte), [message.texte]);
    const Icone = message.erreur
        ? WifiOff
        : message.recentre
          ? Compass
          : Sparkles;

    return (
        <article
            aria-busy={message.enCours}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"
        >
            <span
                aria-hidden
                className={cn(
                    'mt-0.5 flex size-8 items-center justify-center rounded-[10px]',
                    message.erreur
                        ? 'bg-craie-100 text-ink-600 dark:bg-white/[0.06]'
                        : 'bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300',
                )}
            >
                <Icone className="size-4" />
            </span>
            <div className="grid min-w-0 gap-2">
                <p className="text-aide font-semibold text-ink-900">
                    N’karamögö
                    {message.recentre && (
                        <span className="ml-2 font-normal text-ink-500">
                            recentre la discussion
                        </span>
                    )}
                </p>
                {message.texte === '' && message.enCours ? (
                    <p className="flex items-center gap-2 text-aide text-ink-500">
                        <span className="flex gap-1" aria-hidden>
                            <span className="size-1.5 animate-pulse rounded-full bg-nimba-500" />
                            <span className="size-1.5 animate-pulse rounded-full bg-nimba-500 [animation-delay:150ms]" />
                            <span className="size-1.5 animate-pulse rounded-full bg-nimba-500 [animation-delay:300ms]" />
                        </span>
                        Ton tuteur réfléchit…
                    </p>
                ) : message.erreur || message.recentre ? (
                    <p className="text-interface text-ink-600">
                        {message.texte}
                    </p>
                ) : (
                    <ContenuBlocs
                        doc={doc}
                        className="gap-2.5 text-interface text-ink-900"
                    />
                )}
                {!message.enCours &&
                    message.uuid &&
                    message.statut === 'complete' && (
                        <SignalerReponse
                            uuid={message.uuid}
                            deja={message.signale ?? false}
                        />
                    )}
            </div>
        </article>
    );
}

function Relances({
    tuteur,
    texteMax,
}: {
    tuteur: EtatTuteur;
    texteMax: number;
}) {
    const [texte, setTexte] = useState('');

    function envoyer(evenement: FormEvent) {
        evenement.preventDefault();

        if (texte.trim() === '') {
            return;
        }

        void tuteur.demander({ demande: 'question', texte: texte.trim() });
        setTexte('');
    }

    return (
        <div className="grid gap-2.5 border-t pt-4">
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="doux"
                    taille="petite"
                    onClick={() =>
                        void tuteur.demander({ demande: 'plus_simple' })
                    }
                >
                    <Wand2 aria-hidden />
                    Encore plus simple
                </Button>
                <Button
                    variant="doux"
                    taille="petite"
                    onClick={() => void tuteur.demander({ demande: 'exemple' })}
                >
                    <Lightbulb aria-hidden />
                    Un autre exemple
                </Button>
            </div>
            <form onSubmit={envoyer} className="flex gap-2">
                <label htmlFor="relance-tuteur" className="sr-only">
                    Une autre question au tuteur
                </label>
                <Input
                    id="relance-tuteur"
                    value={texte}
                    maxLength={texteMax}
                    onChange={(e) => setTexte(e.target.value)}
                    placeholder="Pose une autre question…"
                    autoComplete="off"
                />
                <Button
                    type="submit"
                    taille="icone"
                    variant="encre"
                    disabled={texte.trim() === ''}
                    aria-label="Envoyer la question"
                >
                    <SendHorizontal aria-hidden />
                </Button>
            </form>
        </div>
    );
}

function SignalerReponse({ uuid, deja }: { uuid: string; deja: boolean }) {
    const [ouvert, setOuvert] = useState(false);
    const [fait, setFait] = useState(deja);

    async function envoyer(motif: MotifSignalementTuteur) {
        const ok = await signalerReponse(signaler(uuid).url, motif);

        if (ok) {
            setFait(true);
            setOuvert(false);
            toast.success('Merci ! L’équipe va relire cette explication.');
        } else {
            toast.error(
                'Le signalement n’est pas parti. Réessaie avec du réseau.',
            );
        }
    }

    if (fait) {
        return (
            <p className="flex items-center gap-1.5 text-meta text-ink-500">
                <Flag aria-hidden className="size-3.5" />
                Réponse signalée à l’équipe
            </p>
        );
    }

    return ouvert ? (
        <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Pourquoi signaler cette réponse ?"
        >
            {MOTIFS_SIGNALEMENT_TUTEUR.map((motif) => (
                <Button
                    key={motif.valeur}
                    variant="outline"
                    taille="petite"
                    onClick={() => void envoyer(motif.valeur)}
                >
                    {motif.libelle}
                </Button>
            ))}
            <Button
                variant="ghost"
                taille="petite"
                onClick={() => setOuvert(false)}
            >
                Annuler
            </Button>
        </div>
    ) : (
        <Button
            variant="ghost"
            taille="petite"
            className="-ml-3 w-fit text-ink-500"
            onClick={() => setOuvert(true)}
        >
            <Flag aria-hidden />
            Signaler cette réponse
        </Button>
    );
}
