import { Link } from '@inertiajs/react';
import { FileQuestion, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { relecture as relectureLecons } from '@/routes/contenu/lecons';
import { relecture as relectureQuestions } from '@/routes/contenu/questions';

/**
 * La file de relecture a deux onglets, leçons et questions : un relecteur
 * voit d'un coup d'œil tout ce qui l'attend.
 */
export function OngletsRelecture({
    actif,
    lecons,
    questions,
}: {
    actif: 'lecons' | 'questions';
    lecons: number;
    questions: number;
}) {
    const onglets = [
        {
            cle: 'lecons' as const,
            libelle: 'Leçons',
            icone: Library,
            nombre: lecons,
            href: relectureLecons(),
        },
        {
            cle: 'questions' as const,
            libelle: 'Questions',
            icone: FileQuestion,
            nombre: questions,
            href: relectureQuestions(),
        },
    ];

    return (
        <nav
            aria-label="Ce qui attend une relecture"
            className="flex w-fit gap-0.5 rounded-controle bg-craie-100 p-1"
        >
            {onglets.map((onglet) => (
                <Link
                    key={onglet.cle}
                    href={onglet.href}
                    prefetch
                    aria-current={onglet.cle === actif ? 'page' : undefined}
                    className={cn(
                        'flex h-9 items-center gap-1.5 rounded-[7px] px-3 text-interface font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-8',
                        onglet.cle === actif
                            ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-ink-600 hover:text-ink-900',
                    )}
                >
                    <onglet.icone aria-hidden className="size-4" />
                    {onglet.libelle}
                    {onglet.nombre > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-nimba-600 px-1.5 text-meta font-semibold text-white font-data">
                            {onglet.nombre}
                        </span>
                    )}
                </Link>
            ))}
        </nav>
    );
}
