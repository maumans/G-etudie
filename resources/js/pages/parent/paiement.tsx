import { Head, Link, usePoll } from '@inertiajs/react';
import { CircleCheck, CircleX, ExternalLink, Smartphone } from 'lucide-react';
import { useEffect } from 'react';
import { Carte } from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formaterJour } from '@/lib/dates';
import { formaterGnf } from '@/lib/utils';
import { abonnement, show } from '@/routes/parent/enfants';
import type { Identite } from '@/types/suivi';

type Paiement = {
    uuid: string;
    statut: 'en_attente' | 'reussi' | 'echoue' | 'expire';
    formule: { cle: string; nom: string; duree: string };
    moyen: { cle: string; libelle: string };
    consigne: string;
    montant_gnf: number;
    numero: string;
    reference: string | null;
    motif: string | null;
    expire_le: string;
    url_paiement: string | null;
    simule: boolean;
    enfant: Identite;
    fin_abonnement: string | null;
};

/**
 * Le suivi du paiement d'un parent (lot 11) : relu toutes les trois
 * secondes tant que l'opérateur n'a pas répondu (comme celui de l'élève,
 * lot 9), puis l'issue.
 */
export default function PaiementParent({ paiement }: { paiement: Paiement }) {
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
                        Abonnement de {paiement.enfant.prenom} ·{' '}
                        {paiement.formule.nom} · {paiement.moyen.libelle}
                    </p>
                    <h1 className="text-[1.75rem] leading-tight titre-contraste">
                        Paiement{' '}
                        <strong>
                            {enAttente
                                ? 'en attente'
                                : paiement.statut === 'reussi'
                                  ? 'reçu'
                                  : 'non abouti'}
                        </strong>
                    </h1>
                </header>

                {enAttente ? (
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
                                    Confirmez sur votre téléphone
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
                                depuis {paiement.numero}
                            </span>
                        </p>
                        <p className="text-meta text-white/65">
                            Cet écran se met à jour tout seul.
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
                ) : (
                    <Carte aria-live="polite" className="grid gap-4 sm:p-6">
                        <div className="flex items-start gap-4">
                            {paiement.statut === 'reussi' ? (
                                <span
                                    aria-hidden
                                    className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400"
                                >
                                    <CircleCheck className="size-6" />
                                </span>
                            ) : (
                                <span
                                    aria-hidden
                                    className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400"
                                >
                                    <CircleX className="size-6" />
                                </span>
                            )}
                            <div className="grid gap-1">
                                <h2 className="text-titre-carte font-semibold">
                                    {paiement.statut === 'reussi'
                                        ? `L’abonnement de ${paiement.enfant.prenom} est ouvert`
                                        : paiement.statut === 'expire'
                                          ? 'La demande a expiré'
                                          : 'Le paiement n’a pas abouti'}
                                </h2>
                                <p className="text-ink-600">
                                    {paiement.statut === 'reussi'
                                        ? paiement.fin_abonnement
                                            ? `Jusqu’au ${formaterJour(paiement.fin_abonnement)}. ${paiement.enfant.prenom} le voit dès sa prochaine connexion.`
                                            : `${paiement.enfant.prenom} le voit dès sa prochaine connexion.`
                                        : (paiement.motif ??
                                          'L’opérateur a refusé le paiement.')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {paiement.statut === 'reussi' ? (
                                <Button asChild>
                                    <Link href={show(paiement.enfant.id)}>
                                        Retour à {paiement.enfant.prenom}
                                    </Link>
                                </Button>
                            ) : (
                                <Button asChild>
                                    <Link href={abonnement(paiement.enfant.id)}>
                                        Réessayer
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </Carte>
                )}

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
            </div>
        </>
    );
}
