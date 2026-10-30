import { Form, Head, Link } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { create, update } from '@/routes/compte/recuperation';

/** Code reçu par SMS + nouveau mot de passe. */
export default function CodeRecuperation({
    numeroMasque,
}: {
    numeroMasque: string;
}) {
    return (
        <>
            <Head title="Nouveau mot de passe" />
            <EnTeteConnexion
                titre="Nouveau mot de passe"
                description={
                    <>
                        Si un compte vérifié correspond au{' '}
                        <span className="font-medium text-ink-900 font-data">
                            {numeroMasque}
                        </span>
                        , un code à 6 chiffres vient de partir. Il est valable
                        10 minutes.
                    </>
                }
            />

            <Form
                {...update.form()}
                resetOnError={['code']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <Champ libelle="Code reçu par SMS" erreur={errors.code}>
                            {(attributs) => (
                                <CodeInput
                                    {...attributs}
                                    name="code"
                                    longueur={6}
                                    autoFocus
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Nouveau mot de passe"
                            aide="8 caractères au moins."
                            erreur={errors.password}
                        >
                            {(attributs) => (
                                <MotDePasseInput
                                    {...attributs}
                                    name="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Changer mon mot de passe
                        </Button>
                    </>
                )}
            </Form>

            <p className="text-center text-ink-600">
                Pas de SMS ?{' '}
                <Link
                    href={create()}
                    className="font-medium text-lien underline-offset-4 hover:underline"
                >
                    Demander un nouveau code
                </Link>
            </p>
        </>
    );
}
