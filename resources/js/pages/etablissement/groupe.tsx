import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { VueSuiviGroupe } from '@/components/suivi/suivi-groupe';
import { Button } from '@/components/ui/button';
import { accueil } from '@/routes/etablissement';
import type { SuiviGroupe } from '@/types/suivi';

/** Espace établissement › un groupe (lot 11) : le même suivi, en lecture seule. */
export default function GroupeEtablissement({
    suivi,
    etablissement,
}: {
    suivi: SuiviGroupe;
    etablissement: { nom: string };
}) {
    return (
        <>
            <Head title={`Groupe ${suivi.groupe.nom}`} />
            <div className="grid gap-5">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={accueil()} prefetch>
                        <ArrowLeft aria-hidden />
                        Rapport de préparation
                    </Link>
                </Button>
                <VueSuiviGroupe
                    suivi={suivi}
                    gerer={false}
                    meta={`${etablissement.nom} · ${suivi.groupe.examen}`}
                />
            </div>
        </>
    );
}
