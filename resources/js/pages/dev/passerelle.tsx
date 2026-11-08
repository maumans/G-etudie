import { Head, router } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formaterGnf } from '@/lib/utils';

type Notification = { corps: string; signature: string };

type Props = {
    paiement: {
        uuid: string;
        reference: string;
        montant_gnf: number;
        moyen: string;
        numero: string;
        formule: string;
        en_attente: boolean;
    };
    webhook: string;
    accepter: Notification;
    refuser: Notification;
    retour: string;
};

/**
 * Faux écran d'opérateur de la passerelle simulée (lot 9, développement et
 * tests seulement). « Valider » envoie le webhook signé à la vraie route,
 * exactement comme le ferait l'opérateur, puis revient au suivi du paiement.
 */
export default function Passerelle({
    paiement,
    webhook,
    accepter,
    refuser,
    retour,
}: Props) {
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const envoyer = async (notification: Notification) => {
        setEnvoi(true);
        setErreur(null);

        try {
            const reponse = await fetch(webhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Signature': notification.signature,
                },
                body: notification.corps,
            });

            if (!reponse.ok) {
                throw new Error(`Réponse ${reponse.status}`);
            }

            router.visit(retour);
        } catch (e) {
            setErreur(e instanceof Error ? e.message : 'Envoi impossible');
            setEnvoi(false);
        }
    };

    return (
        <>
            <Head title="Opérateur simulé" />
            <main className="flex min-h-dvh items-center justify-center bg-background p-4">
                <section className="grid w-full max-w-sm gap-5 rounded-panneau border bg-card p-6 shadow-carte">
                    <p className="flex items-center gap-2 text-aide font-medium text-indice-700 dark:text-indice-400">
                        <FlaskConical aria-hidden className="size-4" />
                        Opérateur simulé · développement seulement
                    </p>
                    <div className="grid gap-1">
                        <h1 className="text-titre-carte font-semibold">
                            {paiement.moyen} : confirmer le paiement
                        </h1>
                        <p className="text-aide text-ink-600">
                            Sur un vrai téléphone, le payeur taperait ici son
                            code secret.
                        </p>
                    </div>
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-interface">
                        <dt className="text-ink-500">Montant</dt>
                        <dd className="font-semibold font-data">
                            {formaterGnf(paiement.montant_gnf)}
                        </dd>
                        <dt className="text-ink-500">Payeur</dt>
                        <dd className="font-data">{paiement.numero}</dd>
                        <dt className="text-ink-500">Pour</dt>
                        <dd>N’karamögö · {paiement.formule}</dd>
                        <dt className="text-ink-500">Référence</dt>
                        <dd className="truncate text-aide font-data">
                            {paiement.reference}
                        </dd>
                    </dl>
                    {!paiement.en_attente && (
                        <p className="text-aide text-ink-600">
                            Ce paiement est déjà conclu : un nouvel envoi ne
                            changera rien (c’est voulu).
                        </p>
                    )}
                    {erreur && (
                        <p className="text-aide text-faux-600 dark:text-faux-400">
                            {erreur}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            disabled={envoi}
                            onClick={() => void envoyer(refuser)}
                        >
                            Refuser
                        </Button>
                        <Button
                            disabled={envoi}
                            onClick={() => void envoyer(accepter)}
                        >
                            Valider
                        </Button>
                    </div>
                </section>
            </main>
        </>
    );
}
