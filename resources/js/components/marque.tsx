import { cn } from '@/lib/utils';

/**
 * Monogramme provisoire « N' » (DA8 : en attendant un logo vectoriel).
 * Dessin original, couleur de l'accent ; le texte reste en blanc (8,5:1).
 */
export function Monogramme({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 40 40"
            aria-hidden
            className={cn('size-9 shrink-0', className)}
        >
            <rect width="40" height="40" rx="11" fill="#2537C9" />
            <path
                d="M11 29V11h3.6l9.2 12.4V11H27v18h-3.5L14.2 16.6V29H11Z"
                fill="#FFFFFF"
            />
            <path d="M29.5 11h3.5l-1.6 6.2h-2.6L29.5 11Z" fill="#FFC21A" />
        </svg>
    );
}

/**
 * La marque : monogramme, « N'karamögö » en Sora, et la signature
 * « G-Étudie » quand la place le permet.
 */
export function Marque({
    signature = true,
    className,
}: {
    signature?: boolean;
    className?: string;
}) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <Monogramme />
            <span className="grid leading-none">
                <span className="font-titre text-[1.0625rem] font-bold text-ink-900">
                    N'karamögö
                </span>
                {signature && (
                    <span className="mt-0.5 text-meta font-medium text-ink-600">
                        G-Étudie
                    </span>
                )}
            </span>
        </span>
    );
}
