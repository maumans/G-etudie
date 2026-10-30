import { Head, Link, usePage } from '@inertiajs/react';
import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { edit as monCompte } from '@/routes/compte/profil';
import { edit as verifierNumero } from '@/routes/compte/verification';

/**
 * Accueil élève, version de socle (lot 0). La jauge, le compte à rebours et
 * la séance du jour arrivent aux lots 2 et 6. Tutoiement (DESIGN.md § 9).
 */
export default function Accueil() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Accueil" />
            <div className="grid gap-6">
                <h1 className="text-titre-ecran font-bold lg:text-titre-ecran-large">
                    Bonjour {auth.user?.prenom}
                </h1>
                {auth.user && !auth.user.numero_verifie && (
                    <div className="flex flex-col gap-3 rounded-carte border border-indice-400/60 bg-indice-400/[0.12] p-4 sm:flex-row sm:items-center">
                        <p className="flex-1">
                            <span className="font-semibold">
                                Vérifie ton numéro.
                            </span>{' '}
                            Sans lui, impossible de retrouver ton compte si tu
                            oublies ton mot de passe.
                        </p>
                        <Button asChild variant="outline" taille="compacte">
                            <Link href={verifierNumero()}>Vérifier</Link>
                        </Button>
                    </div>
                )}
                <EtatVide
                    illustration={Gauge}
                    titre="Ton espace se prépare"
                    message="Ta jauge de préparation et ta séance du jour arriveront ici."
                    action={
                        <Button asChild variant="outline">
                            <Link href={monCompte()} prefetch>
                                Voir mon compte
                            </Link>
                        </Button>
                    }
                />
            </div>
        </>
    );
}
