import { Form, Link } from '@inertiajs/react';
import {
    EnteteCompte,
    SectionCompte,
    useFormule,
} from '@/components/entete-compte';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { annuler, envoyer, update } from '@/routes/compte/numero';
import { edit as verifier } from '@/routes/compte/verification';

/**
 * Changer de numéro soi-même : nouveau numéro + mot de passe actuel, puis le
 * code reçu sur le nouveau numéro prouve qu'il appartient à l'élève.
 */
export default function Numero({
    numeroMasque,
    numeroVerifie,
    nouveauNumeroMasque,
}: {
    numeroMasque: string;
    numeroVerifie: boolean;
    nouveauNumeroMasque: string | null;
}) {
    const formule = useFormule();

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Numéro" />

            <SectionCompte titre="Mon numéro">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-titre-carte font-medium font-data">
                        +224 {numeroMasque}
                    </span>
                    {numeroVerifie ? (
                        <Badge variant="juste">Vérifié</Badge>
                    ) : (
                        <Badge variant="indice">Pas encore vérifié</Badge>
                    )}
                </div>
                {!numeroVerifie && (
                    <div className="grid gap-3">
                        <p className="text-ink-600">
                            {formule(
                                'Sans vérification, tu ne pourras pas retrouver ton compte si tu oublies ton mot de passe.',
                                'Sans vérification, vous ne pourrez pas retrouver votre compte si vous oubliez votre mot de passe.',
                            )}
                        </p>
                        <Button asChild className="sm:w-fit">
                            <Link href={verifier()}>Vérifier mon numéro</Link>
                        </Button>
                    </div>
                )}
            </SectionCompte>

            <SectionCompte
                titre="Changer de numéro"
                description={
                    nouveauNumeroMasque
                        ? undefined
                        : formule(
                              "Un code part par SMS sur le nouveau numéro pour vérifier qu'il est bien le tien.",
                              "Un code part par SMS sur le nouveau numéro pour vérifier qu'il est bien le vôtre.",
                          )
                }
            >
                {nouveauNumeroMasque ? (
                    <ConfirmationNouveauNumero numero={nouveauNumeroMasque} />
                ) : (
                    <Form
                        {...envoyer.form()}
                        resetOnError={['current_password']}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Champ
                                    libelle="Nouveau numéro"
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
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="sm:w-fit"
                                >
                                    {processing && <Spinner />}
                                    Recevoir un code
                                </Button>
                            </>
                        )}
                    </Form>
                )}
            </SectionCompte>
        </div>
    );
}

function ConfirmationNouveauNumero({ numero }: { numero: string }) {
    return (
        <div className="grid gap-4">
            <p className="text-ink-600">
                Un code à 6 chiffres vient de partir au{' '}
                <span className="font-medium text-ink-900 font-data">
                    {numero}
                </span>
                . Il est valable 10 minutes.
            </p>
            <Form {...update.form()} resetOnError className="grid gap-5">
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
                        <Button
                            type="submit"
                            disabled={processing}
                            className="sm:w-fit"
                        >
                            {processing && <Spinner />}
                            Confirmer le nouveau numéro
                        </Button>
                    </>
                )}
            </Form>
            <Button asChild variant="ghost" className="sm:w-fit">
                <Link href={annuler()} as="button" preserveScroll>
                    Annuler
                </Link>
            </Button>
        </div>
    );
}
