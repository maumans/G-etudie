import { MATIERES } from '@/lib/matieres';
import type { CleMatiere } from '@/lib/matieres';
import { cn } from '@/lib/utils';

/**
 * Tuile d'une matière : son icône sur sa teinte. Décorative : le nom de la
 * matière est toujours écrit à côté (DESIGN.md § 2.4).
 */
export function TuileMatiere({
    teinte,
    taille = 'normale',
    className,
}: {
    teinte: CleMatiere;
    taille?: 'normale' | 'petite' | 'grande';
    className?: string;
}) {
    const style = MATIERES[teinte];

    return (
        <span
            aria-hidden
            className={cn(
                'flex shrink-0 items-center justify-center',
                taille === 'grande' && 'size-10 rounded-[12px]',
                taille === 'normale' && 'size-8 rounded-[10px]',
                taille === 'petite' && 'size-6 rounded-[7px]',
                style.tuile,
                className,
            )}
        >
            <style.icone
                className={cn(
                    taille === 'grande' && 'size-5',
                    taille === 'normale' && 'size-4',
                    taille === 'petite' && 'size-3.5',
                )}
            />
        </span>
    );
}
