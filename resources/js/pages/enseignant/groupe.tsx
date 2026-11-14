import { Head, Link, router } from '@inertiajs/react';
import { Archive, ArrowLeft } from 'lucide-react';
import { VueSuiviGroupe } from '@/components/suivi/suivi-groupe';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { accueil } from '@/routes/enseignant';
import { archiver } from '@/routes/enseignant/groupes';
import type { SuiviGroupe } from '@/types/suivi';

/** Espace enseignant › un groupe (lot 11) : le suivi, le code, les devoirs. */
export default function GroupeEnseignant({ suivi }: { suivi: SuiviGroupe }) {
    const confirmer = useConfirmer();

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
                        Mes groupes
                    </Link>
                </Button>
                <VueSuiviGroupe suivi={suivi} gerer />
                {!suivi.groupe.archive && (
                    <div className="flex justify-end border-t pt-4">
                        <Button
                            variant="ghost"
                            taille="compacte"
                            onClick={async () => {
                                if (
                                    await confirmer({
                                        titre: `Archiver « ${suivi.groupe.nom} » ?`,
                                        message:
                                            'Le groupe reste consultable ; plus personne ne peut le rejoindre ni recevoir de devoir.',
                                        action: 'Archiver',
                                    })
                                ) {
                                    router.post(archiver(suivi.groupe.id).url);
                                }
                            }}
                        >
                            <Archive aria-hidden />
                            Archiver le groupe
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
