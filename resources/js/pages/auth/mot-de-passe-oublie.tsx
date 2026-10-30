import { Form, Head, Link } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { login } from '@/routes';
import { store } from '@/routes/compte/recuperation';

/**
 * Mot de passe oublié : un code par SMS. La réponse ne dit jamais si un
 * compte existe pour ce numéro.
 */
export default function MotDePasseOublie() {
    return (
        <>
            <Head title="Mot de passe oublié" />
            <EnTeteConnexion
                titre="Mot de passe oublié"
                description="Tape ton numéro : si un compte vérifié lui correspond, un code arrive par SMS."
            />

            <Form {...store.form()} className="grid gap-5">
                {({ processing, errors }) => (
                    <>
                        <Champ
                            libelle="Numéro de téléphone"
                            erreur={errors.telephone}
                        >
                            {(attributs) => (
                                <TelephoneInput
                                    {...attributs}
                                    name="telephone"
                                    required
                                    autoFocus
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Recevoir un code
                        </Button>
                    </>
                )}
            </Form>

            <p className="text-center text-aide text-ink-600">
                Ton numéro n'a jamais été vérifié ? Le code ne peut pas partir :
                demande de l'aide à ton enseignant ou à N'karamögö.{' '}
                <Link
                    href={login()}
                    className="font-medium text-lien underline-offset-4 hover:underline"
                >
                    Retour à la connexion
                </Link>
            </p>
        </>
    );
}
