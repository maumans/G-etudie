import { Form, Head, Link } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Checkbox } from '@/components/ui/checkbox';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { register } from '@/routes';
import { create as motDePasseOublie } from '@/routes/compte/recuperation';
import { store } from '@/routes/login';

/** Connexion par numéro de téléphone et mot de passe (D3). */
export default function Connexion({ statut }: { statut?: string }) {
    return (
        <>
            <Head title="Se connecter" />
            <EnTeteConnexion
                titre="Se connecter"
                description="Avec ton numéro de téléphone et ton mot de passe."
            />

            {statut && (
                <p
                    role="status"
                    className="rounded-controle bg-juste-600/[0.10] px-3 py-2 font-medium text-juste-700 dark:bg-juste-400/15 dark:text-juste-400"
                >
                    {statut}
                </p>
            )}

            <Form
                {...store.form()}
                resetOnError={['password']}
                className="grid gap-5"
            >
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
                        <Champ libelle="Mot de passe" erreur={errors.password}>
                            {(attributs) => (
                                <MotDePasseInput
                                    {...attributs}
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                />
                            )}
                        </Champ>
                        <label className="flex min-h-12 items-center gap-3">
                            <Checkbox name="remember" defaultChecked />
                            <span>Rester connecté sur ce téléphone</span>
                        </label>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Se connecter
                        </Button>
                    </>
                )}
            </Form>

            <div className="grid gap-2 text-center">
                <Link
                    href={motDePasseOublie()}
                    className="font-medium text-lien underline-offset-4 hover:underline"
                >
                    Mot de passe oublié ?
                </Link>
                <p className="text-ink-600">
                    Pas encore de compte ?{' '}
                    <Link
                        href={register()}
                        prefetch
                        className="font-medium text-lien underline-offset-4 hover:underline"
                    >
                        Créer un compte
                    </Link>
                </p>
            </div>
        </>
    );
}
