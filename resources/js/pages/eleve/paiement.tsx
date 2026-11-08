import { Head, Link, usePoll } from '@inertiajs/react';
import {
    CircleCheck,
    CircleX,
    Download,
    ExternalLink,
    Smartphone,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formaterJour } from '@/lib/dates';
import { formaterGnf } from '@/lib/utils';
import { abonnement, accueil, telechargements } from '@/routes/eleve';
import { payer } from '@/routes/eleve/abonnement';

type Paiement = {
    uuid: string;
    statut: 'en_attente' | 'reussi' | 'echoue' | 'expire';
    formule: { cle: 'mensuel' | 'annee'; nom: string; duree: string };
    moyen: { cle: string; libelle: string };
    consigne: string;
    montant_gnf: number;
    numero: string;
    reference: string | null;
    motif: string | null;
    initie_le: string;
    expire_le: string;
    url_paiement: string | null;
    simule: boolean;
    fin_abonnement: string | null;
};

/**
 * Le suivi d'un paiement (lot 9) : tant que l'opérateur n'a pas répondu,
 * l'écran se relit toutes les trois secondes (seulement la prop
 * `paiement`) ; puis il dit l'issue et la suite.
 */
export default function PagePaiement({ paiement }: { paiement: Paiement }) {
    const enAttente = paiement.statut === 'en_attente';
    const { start, stop } = usePoll(
        3000,
        { only: ['paiement'] },
        { autoStart: false },
    );

    useEffect(() => {
        if (enAttente) {
            start();
        } else {
            stop();
        }

        return stop;
    }, [enAttente, start, stop]);

    return (
        <>
            <Head title="Paiement" />
            <div className="mx-auto grid w-full max-w-xl gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {paiement.formule.nom} · {paiement.formule.duree} ·{' '}
                        {paiement.moyen.libelle}
                    </p>
                    <h1 className="text-[1.75rem] leading-tight titre-contraste">
                        {enAttente ? (
                            <>
                                Paiement <strong>en attente</strong>
                            </>
                        ) : paiement.statut === 'reussi' ? (
                            <>
                                Paiement <strong>reçu</strong>
                            </>
                        ) : (
                            <>
                                Paiement <strong>non abouti</strong>
                            </>
                        )}
                    </h1>
                </header>

                {enAttente ? (
                    <EnAttente paiement={paiement} />
                ) : paiement.statut === 'reussi' ? (
                    <Reussi paiement={paiement} />
                ) : (
                    <Echoue paiement={paiement} />
                )}

                <Recapitulatif paiement={paiement} />
            </div>
        </>
    );
}

function minutesRestantes(expire: string): number {
    return Math.max(
        0,
        Math.ceil((new Date(expire).getTime() - Date.now()) / 60_000),
    );
}

function EnAttente({ paiement }: { paiement: Paiement }) {
    const [restant, setRestant] = useState(() =>
        minutesRestantes(paiement.expire_le),
    );

    useEffect(() => {
        const minuterie = window.setInterval(
            () => setRestant(minutesRestantes(paiement.expire_le)),
            15_000,
        );

        return () => window.clearInterval(minuterie);
    }, [paiement.expire_le]);

    return (
        <section
            aria-live="polite"
            className="grid gap-5 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
        >
            <div className="flex items-start gap-4">
                <span
                    aria-hidden
                    className="relative flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white/10"
                >
                    <Smartphone className="size-6" />
                    <Spinner className="absolute -right-1.5 -bottom-1.5 size-5 rounded-full bg-ink-900 p-0.5 text-nimba-300" />
                </span>
                <div className="grid gap-1">
                    <h2 className="text-titre-carte font-semibold">
                        Confirme sur le téléphone du payeur
                    </h2>
                    <p className="text-aide text-white/75">
                        {paiement.consigne}
                    </p>
                </div>
            </div>
            <p className="flex items-baseline gap-1.5 border-t border-white/15 pt-4">
                <span className="text-[2rem] leading-none font-bold tracking-tight font-data">
                    {formaterGnf(paiement.montant_gnf)}
                </span>
                <span className="text-aide text-white/60">
                    vers {paiement.numero}
                </span>
            </p>
            <p className="text-meta text-white/65">
                Cet écran se met à jour tout seul.{' '}
                {restant > 0
                    ? `Sans confirmation, la demande expire dans ${restant} min.`
                    : 'La demande arrive à expiration.'}
            </p>
            {paiement.url_paiement && (
                <div className="flex flex-wrap items-center gap-3">
                    <Button asChild>
                        <a href={paiement.url_paiement}>
                            <ExternalLink aria-hidden />
                            Ouvrir l’écran de l’opérateur
                        </a>
                    </Button>
                    {paiement.simule && (
                        <Badge variant="soleil">
                            Simulation (développement)
                        </Badge>
                    )}
                </div>
            )}
        </section>
    );
}

function Reussi({ paiement }: { paiement: Paiement }) {
    return (
        <section
            aria-live="polite"
            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte sm:p-6"
        >
            <div className="flex items-start gap-4">
                <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400"
                >
                    <CircleCheck className="size-6" />
                </span>
                <div className="grid gap-1">
                    <h2 className="text-titre-carte font-semibold">
                        Ton abonnement est ouvert
                    </h2>
                    <p className="text-interface text-ink-600">
                        {paiement.fin_abonnement
                            ? `Jusqu’au ${formaterJour(paiement.fin_abonnement)}. Tous les corrigés, les examens blancs sans limite et toutes tes matières hors connexion.`
                            : 'Tous les corrigés, les examens blancs sans limite et toutes tes matières hors connexion.'}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                <Button asChild>
                    <Link href={telechargements()}>
                        <Download aria-hidden />
                        Télécharger mes matières
                    </Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={accueil()}>Retour à l’accueil</Link>
                </Button>
            </div>
        </section>
    );
}

function Echoue({ paiement }: { paiement: Paiement }) {
    return (
        <section
            aria-live="polite"
            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte sm:p-6"
        >
            <div className="flex items-start gap-4">
                <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400"
                >
                    <CircleX className="size-6" />
                </span>
                <div className="grid gap-1">
                    <h2 className="text-titre-carte font-semibold">
                        {paiement.statut === 'expire'
                            ? 'La demande a expiré'
                            : 'Le paiement n’a pas abouti'}
                    </h2>
                    <p className="text-interface text-ink-600">
                        {paiement.motif ??
                            'L’opérateur a refusé le paiement.'}{' '}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                <Button asChild>
                    <Link href={payer(paiement.formule.cle)}>Réessayer</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={abonnement()}>Mon abonnement</Link>
                </Button>
            </div>
        </section>
    );
}

function Recapitulatif({ paiement }: { paiement: Paiement }) {
    return (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-carte border bg-card p-5 text-interface shadow-carte">
            <dt className="text-ink-500">Montant</dt>
            <dd className="font-semibold font-data">
                {formaterGnf(paiement.montant_gnf)}
            </dd>
            <dt className="text-ink-500">Moyen</dt>
            <dd>{paiement.moyen.libelle}</dd>
            <dt className="text-ink-500">Payeur</dt>
            <dd className="font-data">{paiement.numero}</dd>
            <dt className="text-ink-500">Référence</dt>
            <dd
                className="truncate text-aide font-data"
                data-capture="variable"
            >
                {paiement.reference ?? '—'}
            </dd>
        </dl>
    );
}
