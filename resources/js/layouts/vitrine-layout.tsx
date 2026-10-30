import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
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
            <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:border-border/60">
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
                        className="flex items-center gap-1.5"
                    >
                        {auth.user ? (
                            <Button asChild taille="compacte">
                                <Link href={accueilEleve()} prefetch>
                                    Mon espace
                                    <ArrowRight aria-hidden />
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

            <footer className="border-t">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                    <div className="grid gap-3">
                        <Marque />
                        <p className="max-w-xs text-aide text-ink-600">
                            Réviser le CEE, le BEPC et le Baccalauréat unique,
                            un soir après l'autre.
                        </p>
                    </div>
                    <p className="text-meta text-ink-500">
                        VISION FUTURE – ENTREPRISES Sarlu · Kountya (Coyah),
                        Guinée
                    </p>
                </div>
            </footer>
        </div>
    );
}
