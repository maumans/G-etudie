import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Monogramme provisoire « N' » (DA8 : en attendant un logo vectoriel).
 * Dessin original : tuile mandarine éclairée en haut à gauche, « N » blanc,
 * apostrophe à l'encre.
 */
export function Monogramme({ className }: { className?: string }) {
    const degrade = useId();

    return (
        <svg
            viewBox="0 0 40 40"
            aria-hidden
            className={cn('size-8 shrink-0', className)}
        >
            <defs>
                <linearGradient id={degrade} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FF8A4C" />
                    <stop offset="1" stopColor="#D04904" />
                </linearGradient>
            </defs>
            <rect width="40" height="40" rx="11" fill={`url(#${degrade})`} />
            <rect
                x="0.5"
                y="0.5"
                width="39"
                height="39"
                rx="10.5"
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.18"
            />
            <path
                d="M11.5 28.5v-17h3.3l8.6 11.6V11.5h3.1v17h-3.2L14.6 16.9v11.6h-3.1Z"
                fill="#FFFFFF"
            />
            <path d="M29 11.5h3.4l-1.7 6h-2.4l.7-6Z" fill="#1E1814" />
        </svg>
    );
}

/**
 * La marque : monogramme, « N'karamögö », et la signature « G-Étudie » quand
 * la place le permet.
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
                <span className="text-[0.9375rem] font-semibold tracking-tight text-ink-900">
                    N'karamögö
                </span>
                {signature && (
                    <span className="mt-1 text-meta text-ink-500">
                        G-Étudie
                    </span>
                )}
            </span>
        </span>
    );
}
