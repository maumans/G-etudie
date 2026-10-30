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
    /** Préfixe d'adresse sous lequel l'entrée reste active (« Moi » → /compte). */
    actifSous?: string;
};

const STYLES = {
    // Barre d'onglets en bas de l'espace élève, sur mobile : l'icône active
    // est posée dans une pilule teintée (repère visible d'un coup d'œil).
    onglet: {
        base: 'group/onglet flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-2 pb-1.5 text-center text-[0.6875rem] leading-tight font-medium',
        actif: 'text-nimba-700 dark:text-nimba-300',
        inactif: 'text-ink-500 hover:text-ink-900',
        icone: 'size-5',
        pastille:
            'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
        pastilleActive: 'bg-nimba-600/[0.12] dark:bg-nimba-300/15',
    },
    // Barre latérale de l'espace élève (40 px).
    lateral: {
        base: 'flex h-10 items-center gap-3 rounded-controle px-3 text-interface font-medium',
        actif: 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/5',
        inactif:
            'text-ink-600 hover:bg-ink-900/[0.04] hover:text-ink-900 dark:hover:bg-white/[0.04]',
        icone: 'size-[18px]',
        pastille: '',
        pastilleActive: '',
    },
    // Barres latérales denses du back-office et de la console (36 px).
    dense: {
        base: 'flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-interface font-medium',
        actif: 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/5',
        inactif:
            'text-ink-600 hover:bg-ink-900/[0.04] hover:text-ink-900 dark:hover:bg-white/[0.04]',
        icone: 'size-4',
        pastille: '',
        pastilleActive: '',
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
    const onglet = variante === 'onglet';

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
                    'text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring',
                    onglet && 'text-center',
                )}
            >
                {onglet ? (
                    <span className={style.pastille}>
                        <Icone aria-hidden className={style.icone} />
                    </span>
                ) : (
                    <Icone
                        aria-hidden
                        className={cn(style.icone, 'opacity-80')}
                    />
                )}
                <span className={cn(!onglet && 'truncate')}>
                    {entree.libelle}
                    <span className="sr-only"> (bientôt)</span>
                </span>
                {!onglet && (
                    <span
                        aria-hidden
                        className="ml-auto text-meta font-normal text-ink-500"
                    >
                        bientôt
                    </span>
                )}
            </button>
        );
    }

    const actif = exact
        ? isCurrentUrl(entree.href)
        : isCurrentOrParentUrl(entree.actifSous ?? entree.href);

    const icone = (
        <Icone
            aria-hidden
            className={cn(
                style.icone,
                !onglet && actif && 'text-nimba-600 dark:text-nimba-300',
            )}
            strokeWidth={actif ? 2.25 : 2}
        />
    );

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
            {onglet ? (
                <span
                    className={cn(
                        style.pastille,
                        actif && style.pastilleActive,
                    )}
                >
                    {icone}
                </span>
            ) : (
                icone
            )}
            <span className="truncate">{entree.libelle}</span>
        </Link>
    );
}
