import { useCallback, useEffect, useRef, useState } from 'react';
import { horsLigneSur, ouvrirEcranIndisponible } from '@/lib/hors-ligne';
import { demanderAuTuteur } from '@/lib/tuteur/flux';
import type {
    CorpsDemande,
    DemandeTuteur,
    RaisonRefus,
    StatutReponse,
} from '@/lib/tuteur/flux';
import { demander as routeDemander } from '@/routes/eleve/tuteur';

export type MessageFil = {
    cle: string;
    uuid?: string;
    role: 'eleve' | 'tuteur';
    texte: string;
    statut?: StatutReponse | null;
    /** Recentrage ou refus : une phrase écrite par l'équipe. */
    recentre?: boolean;
    signale?: boolean;
    enCours?: boolean;
    erreur?: boolean;
};

export type ConversationInitiale = {
    uuid: string;
    relances_restantes: number;
    messages: {
        uuid: string;
        role: 'eleve' | 'tuteur';
        texte: string;
        statut: StatutReponse | null;
        recentre: boolean;
        signale: boolean;
    }[];
};

/** Ce que l'élève voit de sa demande, le temps que le serveur la confirme. */
const LIBELLES: Record<Exclude<DemandeTuteur, 'question'>, string> = {
    expliquer: 'Explique-moi cette question.',
    etape: 'Je ne comprends pas cette étape.',
    plus_simple: 'Encore plus simple, s’il te plaît.',
    exemple: 'Donne-moi un autre exemple.',
};

let compteur = 0;
const nouvelleCle = () => `m${++compteur}`;

/**
 * Une conversation avec le tuteur, vue de l'écran : les messages, celui qui
 * s'écrit, ce qui reste (quota du jour, relances). La réponse s'affiche au
 * fil du flux ; un refus avant le flux (quota, corrigé réservé…) retire la
 * demande et se lit dans `refus`.
 */
export function useTuteur({
    initiale = null,
    quotaInitial,
}: {
    initiale?: ConversationInitiale | null;
    quotaInitial: number | null;
}) {
    const [messages, setMessages] = useState<MessageFil[]>(() =>
        (initiale?.messages ?? []).map((m) => ({ ...m, cle: m.uuid })),
    );
    const [conversation, setConversation] = useState<string | null>(
        initiale?.uuid ?? null,
    );
    const [relances, setRelances] = useState<number | null>(
        initiale?.relances_restantes ?? null,
    );
    const [quota, setQuota] = useState<number | null>(quotaInitial);
    const [enCours, setEnCours] = useState(false);
    const [refus, setRefus] = useState<{
        raison: RaisonRefus;
        message: string;
    } | null>(null);
    const annulation = useRef<AbortController | null>(null);

    useEffect(() => () => annulation.current?.abort(), []);

    const modifier = useCallback(
        (cle: string, changement: (m: MessageFil) => MessageFil) =>
            setMessages((liste) =>
                liste.map((m) => (m.cle === cle ? changement(m) : m)),
            ),
        [],
    );

    const demander = useCallback(
        async (corps: Omit<CorpsDemande, 'conversation'>) => {
            if (enCours) {
                return;
            }

            if (horsLigneSur()) {
                ouvrirEcranIndisponible('connexion_requise');

                return;
            }

            const cleEleve = nouvelleCle();
            const cleTuteur = nouvelleCle();
            setRefus(null);
            setEnCours(true);
            setMessages((liste) => [
                ...liste,
                {
                    cle: cleEleve,
                    role: 'eleve',
                    texte:
                        corps.demande === 'question'
                            ? (corps.texte ?? '').trim()
                            : LIBELLES[corps.demande],
                },
                { cle: cleTuteur, role: 'tuteur', texte: '', enCours: true },
            ]);

            const controleur = new AbortController();
            annulation.current = controleur;
            let ouvert = false;

            const issue = await demanderAuTuteur(
                routeDemander().url,
                { ...corps, conversation },
                (evenement) => {
                    switch (evenement.type) {
                        case 'debut':
                            ouvert = true;
                            setConversation(evenement.conversation);
                            modifier(cleEleve, (m) => ({
                                ...m,
                                texte: evenement.demande,
                            }));
                            break;
                        case 'texte':
                            modifier(cleTuteur, (m) => ({
                                ...m,
                                texte: m.texte + evenement.t,
                            }));
                            break;
                        case 'refus':
                            modifier(cleTuteur, (m) => ({
                                ...m,
                                texte: evenement.texte,
                                statut: evenement.statut,
                                recentre: true,
                            }));
                            break;
                        case 'erreur':
                            modifier(cleTuteur, (m) => ({
                                ...m,
                                texte:
                                    m.texte === ''
                                        ? evenement.message
                                        : m.texte,
                                erreur: true,
                                enCours: false,
                            }));
                            break;
                        case 'fin':
                            modifier(cleTuteur, (m) => ({
                                ...m,
                                uuid: evenement.message,
                                statut: evenement.statut,
                                enCours: false,
                            }));
                            setQuota(evenement.quota_restant);
                            setRelances(evenement.relances_restantes);
                            break;
                    }
                },
                controleur.signal,
            );

            if (!issue.ok && !ouvert) {
                setMessages((liste) =>
                    liste.filter(
                        (m) => m.cle !== cleEleve && m.cle !== cleTuteur,
                    ),
                );
                setRefus({ raison: issue.raison, message: issue.message });

                if (issue.raison === 'quota') {
                    setQuota(0);
                }
            }

            modifier(cleTuteur, (m) => ({ ...m, enCours: false }));
            setEnCours(false);
        },
        [conversation, enCours, modifier],
    );

    const marquerSignale = useCallback(
        (uuid: string) =>
            setMessages((liste) =>
                liste.map((m) =>
                    m.uuid === uuid ? { ...m, signale: true } : m,
                ),
            ),
        [],
    );

    return {
        messages,
        conversation,
        relances,
        quota,
        enCours,
        refus,
        demander,
        marquerSignale,
    };
}
