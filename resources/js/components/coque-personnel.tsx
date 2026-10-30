import { Link, usePage } from '@inertiajs/react';
import {
    CircleUser,
    GraduationCap,
    LayoutDashboard,
    Library,
    LogOut,
    Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EntreeNavigation } from '@/components/lien-navigation';
import { BandeauCopie, BandeauReseau } from '@/components/hors-ligne/bandeaux';
import { LienNavigation } from '@/components/lien-navigation';
import { Marque } from '@/components/marque';
import { Button } from '@/components/ui/button';
import {
    Feuille,
    FeuilleContenu,
    FeuilleDeclencheur,
} from '@/components/ui/feuille';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useDeconnexion } from '@/hooks/use-deconnexion';
import { cn } from '@/lib/utils';
import { edit as monCompte } from '@/routes/compte/profil';
import { accueil as accueilConsole } from '@/routes/console';
import { accueil as accueilContenu } from '@/routes/contenu';
import { accueil as accueilEleve } from '@/routes/eleve';
import type { Espace } from '@/types';

/** Raccourcis vers les autres espaces du compte (l'administrateur plateforme ouvre aussi le back-office). */
const ESPACES: Record<
    Espace,
    { libelle: string; href: string; icone: LucideIcon }
> = {
    console: {
        libelle: 'Console plateforme',
        href: accueilConsole().url,
        icone: LayoutDashboard,
    },
    contenu: {
        libelle: 'Back-office contenu',
        href: accueilContenu().url,
        icone: Library,
    },
    eleve: {
        libelle: 'Espace élève',
        href: accueilEleve().url,
        icone: GraduationCap,
    },
};

/**
 * Coque commune au back-office contenu et à la console plateforme
 * (DESIGN.md § 7) : barre latérale dense à partir de 1024 px, barre du haut et
 * menu en feuille en dessous. `sombre` : barre toujours sombre, quel que soit
 * le thème — le signal permanent qu'on est dans la console, au-dessus des
 * écoles.
 */
export function CoquePersonnel({
    espace,
    cle,
    entrees,
    sombre = false,
    children,
}: {
    espace: string;
    /** L'espace affiché ; absent pour la coque réduite de « Mon compte ». */
    cle?: Espace;
    entrees: EntreeNavigation[];
    sombre?: boolean;
    children: ReactNode;
}) {
    const accueil = entrees[0];
    const navigation = (
        <nav aria-label={espace} className="grid gap-0.5">
            {entrees.map((entree) => (
                <LienNavigation
                    key={entree.libelle}
                    entree={entree}
                    variante="dense"
                    exact={entree === accueil}
                />
            ))}
        </nav>
    );

    return (
        <div className="min-h-dvh bg-background lg:flex">
            <aside
                className={cn(
                    'sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r px-3 pt-4 pb-3 lg:flex',
                    sombre ? 'dark bg-[#16110d] text-ink-900' : 'bg-background',
                )}
            >
                <EnTete espace={espace} accueil={accueil} lateral />
                {navigation}
                <PiedCompte actuel={cle} className="mt-auto" />
            </aside>

            <div className="min-w-0 flex-1">
                <header
                    className={cn(
                        'sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-3 lg:hidden',
                        sombre
                            ? 'dark bg-[#16110d] text-ink-900'
                            : 'bg-background/85 backdrop-blur-md',
                    )}
                >
                    <EnTete espace={espace} accueil={accueil} />
                    <Feuille>
                        <FeuilleDeclencheur asChild>
                            <Button
                                variant="ghost"
                                taille="icone-compacte"
                                aria-label="Ouvrir le menu"
                            >
                                <Menu aria-hidden />
                            </Button>
                        </FeuilleDeclencheur>
                        <FeuilleContenu
                            titre={espace}
                            pied={<PiedCompte actuel={cle} />}
                        >
                            {navigation}
                        </FeuilleContenu>
                    </Feuille>
                </header>

                <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                    <div className="mb-5 grid gap-2 empty:hidden">
                        <BandeauReseau eleve={false} />
                        <BandeauCopie />
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}

/** Marque + nom de l'espace : dessous dans la barre latérale, à côté en haut. */
function EnTete({
    espace,
    accueil,
    lateral = false,
}: {
    espace: string;
    accueil: EntreeNavigation;
    lateral?: boolean;
}) {
    return (
        <Link
            href={accueil.href ?? '/'}
            className={cn(
                'flex min-w-0 rounded-controle px-1 outline-none focus-visible:outline-2 focus-visible:outline-ring',
                lateral
                    ? 'flex-col items-start gap-2.5 px-2'
                    : 'items-center gap-2.5',
            )}
        >
            <Marque signature={false} />
            <span
                className={cn(
                    'truncate text-meta font-medium text-ink-500',
                    !lateral &&
                        'sr-only border-l border-border pl-2.5 min-[400px]:not-sr-only',
                )}
            >
                {espace}
            </span>
        </Link>
    );
}

function PiedCompte({
    actuel,
    className,
}: {
    actuel?: Espace;
    className?: string;
}) {
    const { auth } = usePage().props;
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const autres = (auth.user?.espaces ?? []).filter(
        (espace) => espace !== actuel,
    );
    const dansMonCompte = isCurrentOrParentUrl('/compte');
    const deconnecter = useDeconnexion();

    return (
        <div className={cn('grid gap-0.5 border-t pt-3', className)}>
            {auth.user && (
                <p className="truncate px-2.5 pb-1.5 text-meta text-ink-500">
                    Connecté :{' '}
                    <span className="font-medium text-ink-900">
                        {auth.user.pseudo}
                    </span>
                </p>
            )}
            {autres.map((espace) => {
                const { libelle, href, icone: Icone } = ESPACES[espace];

                return (
                    <Button
                        key={espace}
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="justify-start"
                    >
                        <Link href={href} prefetch>
                            <Icone aria-hidden />
                            {libelle}
                        </Link>
                    </Button>
                );
            })}
            {actuel && (
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className={cn(
                        'justify-start',
                        dansMonCompte && 'bg-ink-900/[0.05] text-ink-900',
                    )}
                >
                    <Link
                        href={monCompte()}
                        prefetch
                        aria-current={dansMonCompte ? 'page' : undefined}
                    >
                        <CircleUser aria-hidden />
                        Mon compte
                    </Link>
                </Button>
            )}
            <Button
                variant="ghost"
                taille="compacte"
                className="justify-start"
                onClick={() => void deconnecter()}
            >
                <LogOut aria-hidden />
                Se déconnecter
            </Button>
        </div>
    );
}
