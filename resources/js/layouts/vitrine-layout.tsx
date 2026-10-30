import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Marque } from '@/components/marque';
import { Button } from '@/components/ui/button';
import { home, login, register } from '@/routes';
import { accueil as accueilEleve } from '@/routes/eleve';

/** Ancres des sections de l'accueil public. */
const SECTIONS = [
    { libelle: 'Examens', ancre: '#titre-examens' },
    { libelle: 'Comment ça marche', ancre: '#titre-etapes' },
    { libelle: "L'application", ancre: '#titre-application' },
    { libelle: 'Questions', ancre: '#titre-questions' },
];

/**
 * Habillage public (DESIGN.md § 7) : le plus expressif, vouvoiement.
 * Navigation en texte au centre, compte à droite. La vitrine
 * finale (démo jouable, compte à rebours, tarifs) arrive au lot 8.
 */
export default function VitrineLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <header className="sticky top-0 z-40 border-b border-ink-900/[0.06] bg-background/85 backdrop-blur-md dark:border-white/[0.06]">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
                    <Link
                        href={home()}
                        className="rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Marque />
                        <span className="sr-only">Accueil</span>
                    </Link>
                    <nav
                        aria-label="Sections"
                        className="hidden items-center gap-7 lg:flex"
                    >
                        {SECTIONS.map((section) => (
                            <a
                                key={section.ancre}
                                href={section.ancre}
                                className="rounded-[6px] text-interface text-ink-600 transition-colors outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                            >
                                {section.libelle}
                            </a>
                        ))}
                    </nav>
                    <nav
                        aria-label="Compte"
                        className="flex items-center gap-1.5"
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
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] lg:px-8">
                    <div className="grid content-start gap-3">
                        <Marque />
                        <p className="max-w-xs text-aide text-ink-600">
                            Réviser le CEE, le BEPC et le Baccalauréat unique,
                            un soir après l'autre.
                        </p>
                    </div>
                    <nav
                        aria-label="Plateforme"
                        className="grid content-start gap-2.5"
                    >
                        <p className="text-aide font-semibold text-ink-900">
                            Plateforme
                        </p>
                        {SECTIONS.map((section) => (
                            <a
                                key={section.ancre}
                                href={section.ancre}
                                className="w-fit text-aide text-ink-600 hover:text-ink-900"
                            >
                                {section.libelle}
                            </a>
                        ))}
                    </nav>
                    <nav
                        aria-label="Mon compte"
                        className="grid content-start gap-2.5"
                    >
                        <p className="text-aide font-semibold text-ink-900">
                            Compte
                        </p>
                        <Link
                            href={register()}
                            className="w-fit text-aide text-ink-600 hover:text-ink-900"
                        >
                            Créer un compte
                        </Link>
                        <Link
                            href={login()}
                            className="w-fit text-aide text-ink-600 hover:text-ink-900"
                        >
                            Se connecter
                        </Link>
                    </nav>
                </div>
                <div className="border-t">
                    <p className="mx-auto max-w-7xl px-4 py-5 text-meta text-ink-500 sm:px-6 lg:px-8">
                        VISION FUTURE – ENTREPRISES Sarlu, Kountya (Coyah),
                        Guinée
                    </p>
                </div>
            </footer>
        </div>
    );
}
