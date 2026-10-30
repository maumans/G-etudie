import { Form, Link, router } from '@inertiajs/react';
import { LogOut, Trash2 } from 'lucide-react';
import { EnteteCompte, SectionCompte } from '@/components/entete-compte';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { destroy } from '@/routes/compte';
import { update } from '@/routes/compte/profil';

export default function Profil({
    profil,
}: {
    profil: { prenom: string; pseudo: string };
}) {
    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Profil" />

            <SectionCompte
                titre="Profil"
                description="Ton pseudo est ce que voient les autres élèves ; ton prénom reste entre toi et tes enseignants."
            >
                <Form {...update.form()} className="grid gap-5">
                    {({ processing, errors }) => (
                        <>
                            <Champ libelle="Prénom" erreur={errors.prenom}>
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        name="prenom"
                                        defaultValue={profil.prenom}
                                        required
                                        maxLength={60}
                                        autoComplete="given-name"
                                    />
                                )}
                            </Champ>
                            <Champ libelle="Pseudo" erreur={errors.pseudo}>
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        name="pseudo"
                                        defaultValue={profil.pseudo}
                                        required
                                        maxLength={20}
                                        autoCapitalize="none"
                                    />
                                )}
                            </Champ>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="sm:w-fit"
                            >
                                {processing && <Spinner />}
                                Enregistrer
                            </Button>
                        </>
                    )}
                </Form>
            </SectionCompte>

            <SectionCompte
                titre="Se déconnecter"
                description="Sur un téléphone partagé, pense à te déconnecter quand tu as fini."
            >
                <Button asChild variant="outline" className="sm:w-fit">
                    <Link
                        href={logout()}
                        as="button"
                        onClick={() => router.flushAll()}
                    >
                        <LogOut aria-hidden />
                        Se déconnecter
                    </Link>
                </Button>
            </SectionCompte>

            <SectionCompte
                titre="Supprimer mon compte"
                description="Ton compte et ta progression seront effacés. Cette action ne peut pas être annulée."
                danger
            >
                <SuppressionCompte />
            </SectionCompte>
        </div>
    );
}

function SuppressionCompte() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" ton="danger" className="sm:w-fit">
                    <Trash2 aria-hidden />
                    Supprimer mon compte
                </Button>
            </DialogTrigger>
            <DialogContent>
                <Form {...destroy.form()} resetOnError className="grid gap-5">
                    {({ processing, errors }) => (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Supprimer ton compte ?
                                </DialogTitle>
                                <DialogDescription>
                                    Ta progression, tes séances et tes examens
                                    blancs seront effacés. Saisis ton mot de
                                    passe pour confirmer.
                                </DialogDescription>
                            </DialogHeader>
                            <Champ
                                libelle="Mot de passe"
                                erreur={errors.password}
                            >
                                {(attributs) => (
                                    <MotDePasseInput
                                        {...attributs}
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                    />
                                )}
                            </Champ>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Supprimer définitivement
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
