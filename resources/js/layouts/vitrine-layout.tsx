import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Marque } from '@/components/marque';
import { Button } from '@/components/ui/button';
import { home, login, register } from '@/routes';
import { accueil as accueilEleve } from '@/routes/eleve';

/**
 * Habillage public (DESIGN.md § 7) : le plus expressif, vouvoiement.
 * Version de socle : la vitrine finale (démo jouable, compte à rebours,
 * tarifs) arrive au lot 8.
 */
export default function VitrineLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <header className="border-b bg-card">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link
                        href={home()}
                        className="rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Marque />
                        <span className="sr-only">Accueil</span>
                    </Link>
                    <nav
                        aria-label="Compte"
                        className="flex items-center gap-2"
                    >
                        {auth.user ? (
                            <Button asChild taille="compacte">
                                <Link href={accueilEleve()} prefetch>
                                    Mon espace
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    asChild
                                    variant="ghost"
                                    taille="compacte"
                                >
                                    <Link href={login()} prefetch>
                                        Se connecter
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    taille="compacte"
                                    className="hidden sm:inline-flex"
                                >
                                    <Link href={register()} prefetch>
                                        Créer un compte
                                    </Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t bg-card">
                <div className="mx-auto grid max-w-6xl gap-1 px-4 py-6 text-aide text-ink-600 sm:px-6">
                    <p className="font-medium text-ink-900">
                        N'karamögö · G-Étudie
                    </p>
                    <p>VISION FUTURE – ENTREPRISES Sarlu, Kountya (Coyah).</p>
                </div>
            </footer>
        </div>
    );
}
