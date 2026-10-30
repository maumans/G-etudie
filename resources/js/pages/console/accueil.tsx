import { Head, Link } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { edit as monCompte } from '@/routes/compte/profil';

/**
 * Vue d'ensemble de la console, version de socle (lot 0). Activité, contenu,
 * revenus et impact arrivent au lot 13.
 */
export default function Accueil() {
    return (
        <>
            <Head title="Console plateforme" />
            <div className="grid gap-6">
                <h1 className="text-titre-ecran">Vue d'ensemble</h1>
                <EtatVide
                    illustration={Activity}
                    titre="Aucune activité à montrer pour l'instant"
                    message="Élèves actifs, contenus en attente, revenus et impact apparaîtront ici."
                    action={
                        <Button asChild variant="outline" taille="compacte">
                            <Link href={monCompte()} prefetch>
                                Mon compte
                            </Link>
                        </Button>
                    }
                />
            </div>
        </>
    );
}
