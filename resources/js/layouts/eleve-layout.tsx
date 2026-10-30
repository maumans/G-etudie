import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { LienNavigation } from '@/components/lien-navigation';
import { Marque } from '@/components/marque';
import { NAVIGATION_ELEVE } from '@/lib/navigation';
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
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card px-4 py-5 lg:flex">
                <Link
                    href={accueilEleve()}
                    className="rounded-controle px-1 outline-none focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Marque />
                </Link>
                <nav aria-label="Espace élève" className="grid gap-1">
                    {NAVIGATION_ELEVE.map((entree) => (
                        <LienNavigation
                            key={entree.libelle}
                            entree={entree}
                            variante="lateral"
                            exact={entree === accueil}
                        />
                    ))}
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-card/95 px-4 backdrop-blur-sm lg:hidden">
                    <Link
                        href={accueilEleve()}
                        className="rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Marque signature={false} />
                    </Link>
                </header>

                <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6 lg:pb-10">
                    {children}
                </main>
            </div>

            <nav
                aria-label="Espace élève"
                className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
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
