import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/two-factor/login';

/**
 * Double authentification (Fortify). Réservée aux comptes du back-office et
 * de la console qui l'ont activée (DA4) : vouvoiement, registre du personnel.
 */
export default function DoubleAuthentification() {
    const [codeSecours, setCodeSecours] = useState(false);

    return (
        <>
            <Head title="Double authentification" />
            <EnTeteConnexion
                titre={
                    codeSecours ? 'Code de secours' : 'Double authentification'
                }
                description={
                    codeSecours
                        ? "Saisissez l'un de vos codes de secours."
                        : "Saisissez le code à 6 chiffres affiché par votre application d'authentification."
                }
            />

            <Form {...store.form()} resetOnError className="grid gap-5">
                {({ errors, processing, clearErrors }) => (
                    <>
                        {codeSecours ? (
                            <Champ
                                libelle="Code de secours"
                                erreur={errors.recovery_code}
                            >
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        name="recovery_code"
                                        autoComplete="one-time-code"
                                        required
                                        autoFocus
                                    />
                                )}
                            </Champ>
                        ) : (
                            <Champ
                                libelle="Code d'authentification"
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
                        )}

                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Continuer
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            ton="nimba"
                            onClick={() => {
                                setCodeSecours(!codeSecours);
                                clearErrors();
                            }}
                        >
                            {codeSecours
                                ? "Utiliser l'application d'authentification"
                                : 'Utiliser un code de secours'}
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}
