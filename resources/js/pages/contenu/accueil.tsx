import { Head, Link } from '@inertiajs/react';
import { ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { edit as monCompte } from '@/routes/profile';

/**
 * Tableau de bord du back-office, version de socle (lot 0). Référentiel,
 * éditeur et relecture arrivent au lot 1.
 */
export default function Accueil() {
    return (
        <>
            <Head title="Back-office contenu" />
            <div className="grid gap-6">
                <h1 className="text-titre-ecran font-bold">Tableau de bord</h1>
                <EtatVide
                    illustration={ListTree}
                    titre="Le référentiel arrive au lot 1"
                    message="Examens, séries, matières, chapitres et notions seront saisis ici, puis les leçons et leur relecture."
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
