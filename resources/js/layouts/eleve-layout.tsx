import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { LienNavigation } from '@/components/lien-navigation';
import { Marque } from '@/components/marque';
import { NAVIGATION_ELEVE } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { edit as monCompte } from '@/routes/compte/profil';
import { accueil as accueilEleve } from '@/routes/eleve';

/**
 * Habillage de l'espace élève (DESIGN.md § 7) : barre d'onglets en bas sur
 * mobile (Accueil · Cours · Annales · Examens blancs · Moi), barre latérale
 * à partir de 1024 px. Lumineux, chaleureux, tutoiement.
 */
export default function EleveLayout({ children }: { children: ReactNode }) {
    const accueil = NAVIGATION_ELEVE[0];

    return (
        <div className="min-h-dvh bg-background lg:flex">
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r px-4 pt-5 pb-4 lg:flex">
                <Link
                    href={accueilEleve()}
                    className="self-start rounded-controle px-2 outline-none focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Marque />
                </Link>
                <nav aria-label="Espace élève" className="grid gap-0.5">
                    {NAVIGATION_ELEVE.map((entree) => (
                        <LienNavigation
                            key={entree.libelle}
                            entree={entree}
                            variante="lateral"
                            exact={entree === accueil}
                        />
                    ))}
                </nav>
                <CarteEleve className="mt-auto" />
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md lg:hidden">
                    <Link
                        href={accueilEleve()}
                        className="rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Marque signature={false} />
                    </Link>
                    <Initiale />
                </header>

                <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6 lg:pt-10 lg:pb-12">
                    {children}
                </main>
            </div>

            <nav
                aria-label="Espace élève"
                className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(16_16_24/0.08)] backdrop-blur-md lg:hidden"
            >
                {NAVIGATION_ELEVE.map((entree) => (
                    <LienNavigation
                        key={entree.libelle}
                        entree={entree}
                        variante="onglet"
                        exact={entree === accueil}
                    />
                ))}
            </nav>
        </div>
    );
}

/** Pastille à l'initiale du prénom : jamais de photo (données minimales). */
function Pastille({ prenom }: { prenom: string }) {
    return (
        <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-soleil-300 to-soleil-500 text-aide font-semibold text-soleil-900"
        >
            {prenom.charAt(0).toUpperCase()}
        </span>
    );
}

function Initiale() {
    const { auth } = usePage().props;

    if (!auth.user) {
        return null;
    }

    return (
        <Link
            href={monCompte()}
            prefetch
            aria-label="Mon compte"
            className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <Pastille prenom={auth.user.prenom} />
        </Link>
    );
}

function CarteEleve({ className }: { className?: string }) {
    const { auth } = usePage().props;

    if (!auth.user) {
        return null;
    }

    return (
        <Link
            href={monCompte()}
            prefetch
            className={cn(
                'flex items-center gap-3 rounded-controle p-2 transition-colors outline-none hover:bg-ink-900/[0.04] focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                className,
            )}
        >
            <Pastille prenom={auth.user.prenom} />
            <span className="grid min-w-0 leading-tight">
                <span className="truncate text-interface font-medium text-ink-900">
                    {auth.user.prenom}
                </span>
                <span className="truncate text-meta text-ink-500">
                    @{auth.user.pseudo}
                </span>
            </span>
        </Link>
    );
}
