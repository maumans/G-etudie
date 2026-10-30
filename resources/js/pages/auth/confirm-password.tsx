import { Form, Head } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

/** Confirmation du mot de passe avant un réglage sensible (Fortify) ; seul le personnel y passe : vouvoiement. */
export default function ConfirmerMotDePasse() {
    return (
        <>
            <Head title="Confirmer le mot de passe" />
            <EnTeteConnexion
                titre="Confirmer le mot de passe"
                description="Cette partie est protégée : saisissez votre mot de passe pour continuer."
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <Champ libelle="Mot de passe" erreur={errors.password}>
                            {(attributs) => (
                                <MotDePasseInput
                                    {...attributs}
                                    name="password"
                                    required
                                    autoFocus
                                    autoComplete="current-password"
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Confirmer
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}
