import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

/**
 * Une entrée de navigation. Sans `href`, l'écran n'existe pas encore (lot à
 * venir) : l'entrée est affichée avec « bientôt », et la toucher le dit par
 * une notification.
 */
export type EntreeNavigation = {
    libelle: string;
    icone: LucideIcon;
    href?: string;
};

const STYLES = {
    // Barre d'onglets en bas de l'espace élève, sur mobile.
    onglet: {
        base: 'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-center text-meta leading-tight font-medium',
        actif: 'text-nimba-700 dark:text-nimba-300',
        inactif: 'text-ink-600 hover:text-ink-900',
        icone: 'size-6',
    },
    // Barre latérale de l'espace élève (48 px, cible tactile).
    lateral: {
        base: 'flex h-12 items-center gap-3 rounded-controle px-3 text-interface font-medium',
        actif: 'bg-nimba-600/[0.12] text-nimba-700 dark:bg-nimba-500/25 dark:text-nimba-300',
        inactif:
            'text-ink-600 hover:bg-nimba-600/[0.06] hover:text-ink-900 dark:hover:bg-nimba-500/15',
        icone: 'size-5',
    },
    // Barres latérales denses du back-office et de la console (40 px).
    dense: {
        base: 'flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-interface font-medium',
        actif: 'bg-nimba-600/[0.12] text-nimba-700 dark:bg-nimba-500/25 dark:text-nimba-300',
        inactif:
            'text-ink-600 hover:bg-nimba-600/[0.06] hover:text-ink-900 dark:hover:bg-nimba-500/15',
        icone: 'size-[18px]',
    },
} as const;

export function LienNavigation({
    entree,
    variante,
    exact = false,
}: {
    entree: EntreeNavigation;
    variante: keyof typeof STYLES;
    /** L'entrée n'est active que sur son adresse exacte (accueil d'un espace). */
    exact?: boolean;
}) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const style = STYLES[variante];
    const Icone = entree.icone;

    if (!entree.href) {
        // Jamais de clic mort : toucher l'entrée explique pourquoi rien ne s'ouvre.
        return (
            <button
                type="button"
                onClick={() =>
                    toast.info(`« ${entree.libelle} » arrive bientôt.`, {
                        id: 'navigation-bientot',
                    })
                }
                className={cn(
                    style.base,
                    style.inactif,
                    'text-left outline-none focus-visible:outline-2 focus-visible:outline-ring',
                    variante === 'onglet' && 'text-center',
                )}
            >
                <Icone aria-hidden className={style.icone} />
                <span>
                    {entree.libelle}
                    <span className="sr-only"> (bientôt)</span>
                </span>
                {variante !== 'onglet' && (
                    <span
                        aria-hidden
                        className="ml-auto rounded-badge bg-ink-600/[0.12] px-1.5 py-0.5 text-meta text-ink-600 dark:bg-ink-400/25"
                    >
                        bientôt
                    </span>
                )}
            </button>
        );
    }

    const actif = exact
        ? isCurrentUrl(entree.href)
        : isCurrentOrParentUrl(entree.href);

    return (
        <Link
            href={entree.href}
            prefetch
            aria-current={actif ? 'page' : undefined}
            className={cn(
                style.base,
                'transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring',
                actif ? style.actif : style.inactif,
            )}
        >
            <Icone
                aria-hidden
                className={style.icone}
                strokeWidth={actif ? 2.25 : 2}
            />
            <span className="truncate">{entree.libelle}</span>
        </Link>
    );
}
