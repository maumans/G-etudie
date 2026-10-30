import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Carte de section du back-office : titre de carte (15 px, 600), précision
 * en 13 px, action à droite, contenu dessous. Dense et calme (DESIGN.md § 7).
 */
export function Section({
    titre,
    description,
    action,
    className,
    contenuClassName,
    children,
    id,
}: {
    titre: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
    contenuClassName?: string;
    children: ReactNode;
    id?: string;
}) {
    const idTitre = id ? `${id}-titre` : undefined;

    return (
        <section
            aria-labelledby={idTitre}
            className={cn(
                'rounded-carte border bg-card shadow-carte',
                className,
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
                <div className="grid min-w-0 gap-0.5">
                    <h2 id={idTitre} className="text-[0.9375rem] font-semibold">
                        {titre}
                    </h2>
                    {description && (
                        <p className="text-aide text-ink-500">{description}</p>
                    )}
                </div>
                {action}
            </div>
            <div className={cn('px-5 pt-3 pb-4', contenuClassName)}>
                {children}
            </div>
        </section>
    );
}
