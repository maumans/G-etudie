import {
    CheckCheck,
    CloudOff,
    CloudUpload,
    KeyRound,
    RotateCw,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Feuille,
    FeuilleContenu,
    FeuilleDeclencheur,
} from '@/components/ui/feuille';
import type { Anomalie, Operation } from '@/lib/hors-ligne/base';
import { moteur, useHorsLigne } from '@/lib/hors-ligne';
import type { EtatHorsLigne } from '@/lib/hors-ligne';
import { libelleOperation, nombreDeReponses } from '@/lib/hors-ligne/libelles';
import { cn } from '@/lib/utils';

/**
 * Pastille de la barre du haut (HORS_LIGNE.md A.3.9) : « Tout est envoyé »,
 * « 12 réponses à envoyer », « Hors ligne ». La toucher ouvre « À envoyer »
 * et « À corriger ». Toujours l'icône et le mot, jamais la couleur seule.
 */
export function etatPastille(etat: EtatHorsLigne): {
    libelle: string;
    icone: typeof CheckCheck;
    ton: 'juste' | 'nimba' | 'neutre' | 'indice';
} {
    if (etat.reseau === 'session_expiree') {
        return { libelle: 'Session expirée', icone: KeyRound, ton: 'indice' };
    }

    if (etat.reseau === 'hors_ligne') {
        return { libelle: 'Hors ligne', icone: CloudOff, ton: 'neutre' };
    }

    if (etat.enAttente > 0) {
        return {
            libelle: `${nombreDeReponses(etat.enAttente)} à envoyer`,
            icone: CloudUpload,
            ton: 'nimba',
        };
    }

    return { libelle: 'Tout est envoyé', icone: CheckCheck, ton: 'juste' };
}

const TONS = {
    juste: 'bg-juste-600/[0.10] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400',
    nimba: 'bg-nimba-600/[0.10] text-nimba-700 dark:bg-nimba-300/15 dark:text-nimba-300',
    neutre: 'bg-ink-600/[0.08] text-ink-600 dark:bg-ink-400/20',
    indice: 'bg-indice-400/25 text-indice-700 dark:bg-indice-400/15 dark:text-indice-400',
} as const;

export function PastilleReseau({ className }: { className?: string }) {
    const etat = useHorsLigne();
    const { libelle, icone: Icone, ton } = etatPastille(etat);

    return (
        <Feuille>
            <FeuilleDeclencheur asChild>
                <button
                    type="button"
                    aria-label={`${libelle}${etat.anomalies > 0 ? `, ${etat.anomalies} à corriger` : ''} — voir le détail`}
                    className={cn(
                        'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-meta font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        TONS[ton],
                        className,
                    )}
                >
                    <Icone aria-hidden className="size-3.5" />
                    {libelle}
                    {etat.anomalies > 0 && (
                        <span
                            aria-hidden
                            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-faux-600 ring-2 ring-background dark:bg-faux-400"
                        />
                    )}
                </button>
            </FeuilleDeclencheur>
            <FeuilleContenu
                titre="Tes réponses"
                description="Elles partent toutes seules dès que le réseau le permet."
            >
                <ListesFile etat={etat} />
            </FeuilleContenu>
        </Feuille>
    );
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

function ListesFile({ etat }: { etat: EtatHorsLigne }) {
    const [aEnvoyer, setAEnvoyer] = useState<Operation[]>([]);
    const [aCorriger, setACorriger] = useState<Anomalie[]>([]);

    const relire = useCallback(async () => {
        const [envoi, correction] = await Promise.all([
            moteur.aEnvoyer(),
            moteur.aCorriger(),
        ]);
        setAEnvoyer(envoi);
        setACorriger(correction);
    }, []);

    useEffect(() => {
        void relire();
    }, [relire, etat]);

    return (
        <div className="grid gap-6">
            <section className="grid gap-2">
                <h3 className="text-interface font-semibold text-ink-900">
                    À envoyer
                </h3>
                {aEnvoyer.length === 0 ? (
                    <p className="text-aide text-ink-500">
                        Rien en attente : tout est arrivé.
                    </p>
                ) : (
                    <ul className="grid divide-y">
                        {aEnvoyer.map((operation) => (
                            <li
                                key={operation.uuid}
                                className="flex items-baseline justify-between gap-3 py-2"
                            >
                                <span className="text-interface text-ink-900">
                                    {libelleOperation(operation.type)}
                                </span>
                                <span className="shrink-0 text-meta text-ink-500 font-data">
                                    {HEURE.format(new Date(operation.saisi_le))}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {etat.reseau !== 'en_ligne' && aEnvoyer.length > 0 && (
                    <p className="text-aide text-ink-600">
                        {etat.reseau === 'session_expiree'
                            ? 'Reconnecte-toi : elles partiront juste après.'
                            : 'Elles partiront au retour du réseau.'}
                    </p>
                )}
            </section>

            <section className="grid gap-2">
                <h3 className="text-interface font-semibold text-ink-900">
                    À corriger
                </h3>
                {aCorriger.length === 0 ? (
                    <p className="text-aide text-ink-500">Aucun refus.</p>
                ) : (
                    <ul className="grid gap-2">
                        {aCorriger.map((anomalie) => (
                            <li
                                key={anomalie.uuid}
                                className="grid gap-2 rounded-controle border p-3"
                            >
                                <span className="text-interface font-medium text-ink-900">
                                    {libelleOperation(anomalie.type)}
                                </span>
                                <span className="text-aide text-ink-600">
                                    {anomalie.motif}
                                </span>
                                <span className="flex flex-wrap gap-2">
                                    {anomalie.genre === 'erreur' && (
                                        <Button
                                            taille="compacte"
                                            onClick={() =>
                                                void moteur
                                                    .reessayer(anomalie.uuid)
                                                    .then(relire)
                                            }
                                        >
                                            <RotateCw aria-hidden />
                                            Réessayer
                                        </Button>
                                    )}
                                    <Button
                                        taille="compacte"
                                        variant="outline"
                                        onClick={() =>
                                            void moteur
                                                .abandonner(anomalie.uuid)
                                                .then(relire)
                                        }
                                    >
                                        <X aria-hidden />
                                        Abandonner
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
