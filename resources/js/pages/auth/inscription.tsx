import { Form, Head, Link } from '@inertiajs/react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { login } from '@/routes';
import { store } from '@/routes/register';

/**
 * Inscription (D3, PLAN § 10) : prénom, pseudo, téléphone, mot de passe —
 * rien d'autre. Pas d'e-mail, pas de date de naissance. Le numéro se vérifie
 * juste après, sans bloquer.
 */
export default function Inscription() {
    return (
        <>
            <Head title="Créer un compte" />
            <EnTeteConnexion
                titre="Créer un compte"
                description="Une minute suffit. Ton numéro sert à te connecter et à retrouver ton compte."
            />

            <Form
                {...store.form()}
                resetOnError={['password']}
                className="grid gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <Champ libelle="Prénom" erreur={errors.prenom}>
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    name="prenom"
                                    required
                                    autoFocus
                                    autoComplete="given-name"
                                    maxLength={60}
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Pseudo"
                            aide="Les autres élèves verront ton pseudo, jamais ton nom ni ton numéro."
                            erreur={errors.pseudo}
                        >
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    name="pseudo"
                                    required
                                    autoComplete="nickname"
                                    autoCapitalize="none"
                                    maxLength={20}
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Numéro de téléphone"
                            erreur={errors.telephone}
                        >
                            {(attributs) => (
                                <TelephoneInput
                                    {...attributs}
                                    name="telephone"
                                    required
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Mot de passe"
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
                            Créer mon compte
                        </Button>
                    </>
                )}
            </Form>

            <p className="text-center text-ink-600">
                Déjà un compte ?{' '}
                <Link
                    href={login()}
                    prefetch
                    className="font-medium text-lien underline-offset-4 transition-colors hover:underline"
                >
                    Se connecter
                </Link>
            </p>
        </>
    );
}
