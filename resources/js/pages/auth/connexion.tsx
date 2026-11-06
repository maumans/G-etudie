import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    ListeProfils,
    SaisieCodeProfil,
    useProfilsTelephone,
} from '@/components/hors-ligne/profils-telephone';
import type { ProfilLocal } from '@/lib/hors-ligne/profils';
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

/**
 * Connexion par numéro de téléphone et mot de passe (D3). Lot 7 (HL6) : les
 * profils déjà gardés sur ce téléphone s'ouvrent avec leur code à 4
 * chiffres ; « Ordinateur partagé » ne garde rien après la déconnexion.
 */
export default function Connexion({ statut }: { statut?: string }) {
    const profils = useProfilsTelephone().filter(
        (profil) => profil.code !== null && profil.jeton !== null,
    );
    const [choisi, setChoisi] = useState<ProfilLocal | null>(null);

    if (choisi) {
        return (
            <>
                <Head title="Se connecter" />
                <EnTeteConnexion
                    titre="Content de te revoir"
                    description="Tape ton code à 4 chiffres."
                />
                <SaisieCodeProfil
                    profil={choisi}
                    onRetour={() => setChoisi(null)}
                />
            </>
        );
    }

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
                    className="rounded-controle border border-juste-600/25 bg-juste-600/[0.08] px-3 py-2.5 text-juste-700 dark:border-juste-400/25 dark:bg-juste-400/10 dark:text-juste-400"
                >
                    {statut}
                </p>
            )}

            {profils.length > 0 && (
                <section
                    aria-labelledby="titre-profils"
                    className="grid gap-2 rounded-carte border bg-card p-3 shadow-carte"
                >
                    <h2
                        id="titre-profils"
                        className="px-2 pt-1 text-aide font-medium text-ink-500"
                    >
                        Déjà sur ce téléphone
                    </h2>
                    <ListeProfils
                        profils={profils}
                        actif={null}
                        onChoisir={setChoisi}
                    />
                </section>
            )}

            <Form
                {...store.form()}
                resetOnError={['password']}
                className="grid gap-4"
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
                        <div className="grid gap-1">
                            <label className="flex min-h-11 items-center gap-2.5 text-ink-600">
                                <Checkbox name="remember" defaultChecked />
                                <span>Rester connecté sur ce téléphone</span>
                            </label>
                            <label className="flex min-h-11 items-start gap-2.5 text-ink-600">
                                <Checkbox
                                    name="ordinateur_partage"
                                    value="1"
                                    className="mt-0.5"
                                />
                                <span className="grid">
                                    <span>
                                        Ordinateur partagé — ne rien garder
                                    </span>
                                    <span className="text-aide text-ink-500">
                                        À l’école ou au cyber : rien ne reste
                                        après ta déconnexion.
                                    </span>
                                </span>
                            </label>
                        </div>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Se connecter
                        </Button>
                    </>
                )}
            </Form>

            <div className="grid gap-2 text-center text-ink-600">
                <Link
                    href={motDePasseOublie()}
                    className="font-medium text-lien underline-offset-4 transition-colors hover:underline"
                >
                    Mot de passe oublié ?
                </Link>
                <p className="text-ink-600">
                    Pas encore de compte ?{' '}
                    <Link
                        href={register()}
                        prefetch
                        className="font-medium text-lien underline-offset-4 transition-colors hover:underline"
                    >
                        Créer un compte
                    </Link>
                </p>
            </div>
        </>
    );
}
