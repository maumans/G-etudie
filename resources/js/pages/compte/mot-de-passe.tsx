import { Form } from '@inertiajs/react';
import {
    EnteteCompte,
    SectionCompte,
    useFormule,
} from '@/components/entete-compte';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/compte/mot-de-passe';

/**
 * Changer son mot de passe soi-même (CLAUDE.md § 4) : un mot de passe
 * communiqué à l'ouverture du compte ne doit pas rester le même.
 */
export default function MotDePasse() {
    const formule = useFormule();

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Mot de passe" />

            <SectionCompte
                titre="Changer mon mot de passe"
                description={formule(
                    "8 caractères au moins. Choisis-en un que tu retiens sans l'écrire.",
                    "8 caractères au moins. Choisissez-en un que vous retenez sans l'écrire.",
                )}
            >
                <Form
                    {...update.form()}
                    resetOnSuccess
                    resetOnError
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <Champ
                                libelle="Mot de passe actuel"
                                erreur={errors.current_password}
                            >
                                {(attributs) => (
                                    <MotDePasseInput
                                        {...attributs}
                                        name="current_password"
                                        required
                                        autoComplete="current-password"
                                    />
                                )}
                            </Champ>
                            <Champ
                                libelle="Nouveau mot de passe"
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
                            <Button
                                type="submit"
                                disabled={processing}
                                className="sm:w-fit"
                            >
                                {processing && <Spinner />}
                                Changer le mot de passe
                            </Button>
                        </>
                    )}
                </Form>
            </SectionCompte>
        </div>
    );
}
