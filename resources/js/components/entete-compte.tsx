import { Head, Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { edit as affichage } from '@/routes/compte/affichage';
import { edit as motDePasse } from '@/routes/compte/mot-de-passe';
import { edit as numero } from '@/routes/compte/numero';
import { edit as profil } from '@/routes/compte/profil';

const ONGLETS = [
    { libelle: 'Profil', href: profil().url },
    { libelle: 'Mot de passe', href: motDePasse().url },
    { libelle: 'Numéro', href: numero().url },
    { libelle: 'Affichage', href: affichage().url },
];

/**
 * En-tête des pages « Mon compte » : titre et onglets. En grille 2 × 2 sur
 * mobile — une liste qui défile cacherait un onglet.
 */
export function EnteteCompte({ titre }: { titre: string }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <div className="grid gap-4">
            <Head title={`${titre} · Mon compte`} />
            <div className="grid gap-1">
                <h1 className="text-titre-ecran lg:text-titre-ecran-large">
                    Mon compte
                </h1>
                <p className="text-ink-600">
                    Ton profil, ta sécurité et ton affichage.
                </p>
            </div>
            <nav
                aria-label="Mon compte"
                className="grid grid-cols-2 gap-0.5 rounded-controle bg-craie-100 p-1 sm:inline-flex sm:w-fit"
            >
                {ONGLETS.map((onglet) => {
                    const actif = isCurrentUrl(onglet.href);

                    return (
                        <Link
                            key={onglet.href}
                            href={onglet.href}
                            prefetch
                            preserveScroll
                            aria-current={actif ? 'page' : undefined}
                            className={cn(
                                'flex h-9 items-center justify-center rounded-[7px] px-3.5 text-interface font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-8',
                                actif
                                    ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                    : 'text-ink-600 hover:text-ink-900',
                            )}
                        >
                            {onglet.libelle}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

/** Une section de « Mon compte » : titre, explication, contenu. */
export function SectionCompte({
    titre,
    description,
    danger = false,
    children,
}: {
    titre: string;
    description?: string;
    danger?: boolean;
    children: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                'grid gap-5 rounded-carte border bg-card p-5 shadow-carte sm:p-6',
                danger && 'border-faux-600/30 dark:border-faux-400/30',
            )}
        >
            <div className="grid gap-1">
                <h2 className="text-titre-carte">{titre}</h2>
                {description && <p className="text-ink-600">{description}</p>}
            </div>
            {children}
        </section>
    );
}
