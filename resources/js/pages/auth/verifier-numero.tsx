import { Form, Head, Link } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { Spinner } from '@/components/ui/spinner';
import { confirmer, envoyer } from '@/routes/compte/verification';
import { accueil as accueilEleve } from '@/routes/eleve';

/**
 * Vérification du numéro (D3), proposée juste après l'inscription et jamais
 * imposée : « Plus tard » mène tout de suite à l'espace élève.
 */
export default function VerifierNumero({
    numeroMasque,
    codeEnvoye,
}: {
    numeroMasque: string;
    codeEnvoye: boolean;
}) {
    const numero = (
        <span className="font-medium text-ink-900 font-data">
            {numeroMasque}
        </span>
    );

    return (
        <>
            <Head title="Vérifier mon numéro" />
            <EnTeteConnexion
                titre="Vérifie ton numéro"
                description={
                    codeEnvoye ? (
                        <>
                            Un code à 6 chiffres vient de partir au {numero}. Il
                            est valable 10 minutes.
                        </>
                    ) : (
                        <>
                            Un code par SMS au {numero} prouve que ce numéro est
                            bien le tien. Sans lui, tu ne pourras pas retrouver
                            ton compte si tu oublies ton mot de passe.
                        </>
                    )
                }
            />

            {codeEnvoye ? (
                <Form {...confirmer.form()} resetOnError className="grid gap-5">
                    {({ processing, errors }) => (
                        <>
                            <Champ
                                libelle="Code reçu par SMS"
                                erreur={errors.code}
                            >
                                {(attributs) => (
                                    <CodeInput
                                        {...attributs}
                                        name="code"
                                        longueur={6}
                                        autoFocus
                                    />
                                )}
                            </Champ>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Vérifier
                            </Button>
                        </>
                    )}
                </Form>
            ) : null}

            <Form {...envoyer.form()} className="grid gap-3">
                {({ processing, errors }) => (
                    <>
                        {!codeEnvoye && errors.code && (
                            <p className="text-aide text-faux-600 dark:text-faux-400">
                                {errors.code}
                            </p>
                        )}
                        <Button
                            type="submit"
                            variant={codeEnvoye ? 'ghost' : 'default'}
                            ton="nimba"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            {codeEnvoye
                                ? 'Renvoyer un code'
                                : 'Recevoir le code'}
                        </Button>
                    </>
                )}
            </Form>

            <Button asChild variant="outline">
                <Link href={accueilEleve()}>Plus tard</Link>
            </Button>
        </>
    );
}
