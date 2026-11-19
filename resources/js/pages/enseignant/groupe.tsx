import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    ChevronRight,
    MessagesSquare,
    ShieldAlert,
} from 'lucide-react';
import { VueSuiviGroupe } from '@/components/suivi/suivi-groupe';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { cn, pluriel } from '@/lib/utils';
import { accueil } from '@/routes/enseignant';
import { show as pageFil } from '@/routes/enseignant/fil';
import { archiver } from '@/routes/enseignant/groupes';
import type { SuiviGroupe } from '@/types/suivi';

/**
 * Espace enseignant › un groupe (lot 11) : le suivi, le code, les devoirs.
 * Lot 12 : l'entrée vers « Questions de la classe », avec ce qui attend
 * l'enseignant (messages signalés).
 */
export default function GroupeEnseignant({
    suivi,
    fil = { questions: 0, a_moderer: 0 },
}: {
    suivi: SuiviGroupe;
    fil?: { questions: number; a_moderer: number };
}) {
    const confirmer = useConfirmer();
    const urgent = fil.a_moderer > 0;

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
                <Link
                    href={pageFil(suivi.groupe.id)}
                    prefetch
                    className={cn(
                        'flex items-center gap-3 rounded-carte border bg-card p-4 shadow-carte outline-none hover:border-ink-400/60 focus-visible:outline-2 focus-visible:outline-ring',
                        urgent && 'border-nimba-500/45',
                    )}
                >
                    <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                    >
                        {urgent ? (
                            <ShieldAlert className="size-5" />
                        ) : (
                            <MessagesSquare className="size-5" />
                        )}
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="font-semibold">
                            Questions de la classe
                        </span>
                        <span className="truncate text-aide text-ink-600">
                            {urgent
                                ? `${pluriel(fil.a_moderer, 'message signalé attend', 'messages signalés attendent')} votre décision`
                                : fil.questions === 0
                                  ? 'Le fil où vos élèves s’entraident, modéré par vous'
                                  : `${pluriel(fil.questions, 'question')} dans le fil`}
                        </span>
                    </span>
                    <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-ink-400"
                    />
                </Link>
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
