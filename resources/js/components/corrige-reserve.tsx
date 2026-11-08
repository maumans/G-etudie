import { Link } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { abonnement } from '@/routes/eleve';

/**
 * Lot 9 : le corrigé détaillé de cette annale est réservé aux abonnés
 * (App\Support\DroitsAbonne). La bonne réponse, elle, reste : l'élève sait
 * s'il a juste. Même affichage en ligne et depuis un pack « libre ».
 */
export function CorrigeReserve({ className }: { className?: string }) {
    return (
        <section
            aria-label="Corrigé réservé aux abonnés"
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-carte border bg-card p-4 shadow-carte sm:px-5',
                className,
            )}
        >
            <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
            >
                <Lock className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
                <p className="text-interface font-semibold">
                    Corrigé détaillé avec l’abonnement
                </p>
                <p className="text-aide text-ink-500">
                    Tu vois si ta réponse est juste ; les étapes du corrigé
                    viennent avec l’abonnement. Le sujet le plus récent de
                    chaque matière reste offert.
                </p>
            </div>
            <Button asChild variant="doux" taille="compacte">
                <Link href={abonnement()}>Voir l’abonnement</Link>
            </Button>
        </section>
    );
}
