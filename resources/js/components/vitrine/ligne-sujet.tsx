import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import type { CarteSujet } from '@/lib/vitrine';
import { show } from '@/routes/vitrine/sujets';

/**
 * Une annale publique dans une liste (vitrine, `/sujets`) — recette « ligne
 * de liste » de DESIGN.md : tuile de la matière, titre, sous-titre, action
 * ronde. Toute la ligne est le lien.
 */
export function LigneSujet({
    sujet,
    className,
}: {
    sujet: CarteSujet;
    className?: string;
}) {
    const matiere = MATIERES[sujet.matiere.cle];

    return (
        <li className={cn('border-b last:border-b-0', className)}>
            <Link
                href={show(sujet.slug)}
                prefetch
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3.5 py-3.5 outline-none focus-visible:rounded-controle focus-visible:outline-2 focus-visible:outline-ring"
            >
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 items-center justify-center rounded-[12px]',
                        matiere.tuile,
                    )}
                >
                    <matiere.icone className="size-[1.125rem]" />
                </span>
                <span className="grid min-w-0 gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[0.9375rem] font-semibold">
                            {sujet.matiere.nom}
                        </span>
                        {sujet.est_exemple && (
                            <Badge variant="soleil">Exemple</Badge>
                        )}
                        {sujet.origine === 'blanc_maison' && (
                            <Badge variant="neutre">Sujet maison</Badge>
                        )}
                    </span>
                    <span className="truncate text-aide text-ink-500">
                        {sujet.libelle_session}
                        {sujet.questions > 0 &&
                            `, ${pluriel(sujet.questions, 'question')}`}
                    </span>
                </span>
                <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-full border border-contour text-ink-600 transition-colors group-hover:bg-ink-900 group-hover:text-craie-50"
                >
                    <ChevronRight className="size-4" />
                </span>
            </Link>
        </li>
    );
}
