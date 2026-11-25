import { Link, usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    BandeauCopie,
    BandeauIphone,
    BandeauReseau,
} from '@/components/hors-ligne/bandeaux';
import { BandeauExamenEnCours } from '@/components/examen-blanc/bandeau-examen';
import { PastilleReseau } from '@/components/hors-ligne/pastille-reseau';
import {
    FeuilleProfils,
    PastilleProfil,
} from '@/components/hors-ligne/profils-telephone';
import { LienNavigation } from '@/components/lien-navigation';
import { Marque } from '@/components/marque';
import { NAVIGATION_ELEVE } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { accueil as accueilEleve } from '@/routes/eleve';

/**
 * Habillage de l'espace élève (DESIGN.md § 7) : barre d'onglets en bas sur
 * mobile (Accueil · Cours · Annales · Examens blancs · Moi), barre latérale
 * à partir de 1024 px. Lumineux, chaleureux, tutoiement. La pastille du
 * profil ouvre « Qui révise ? » (profils du téléphone, lot 7).
 */
export default function EleveLayout({ children }: { children: ReactNode }) {
    const accueil = NAVIGATION_ELEVE[0];

    return (
        <div className="min-h-dvh bg-background fond-ambiance lg:flex">
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r px-4 pt-5 pb-4 lg:flex print:hidden">
                <Link
                    href={accueilEleve()}
                    className="shrink-0 self-start rounded-controle px-2 outline-none focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Marque />
                </Link>
                {/* La liste défile sur un écran bas : la pastille réseau et
                    la carte de l'élève (profils, déconnexion) restent visibles. */}
                <nav
                    aria-label="Espace élève"
                    className="-mx-1 grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto overscroll-contain px-1"
                >
                    {NAVIGATION_ELEVE.map((entree) => (
                        <LienNavigation
                            key={entree.libelle}
                            entree={entree}
                            variante="lateral"
                            exact={entree === accueil}
                        />
                    ))}
                </nav>
                <div className="grid shrink-0 gap-3">
                    <PastilleReseau className="justify-self-start" />
                    <CarteEleve />
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-md lg:hidden print:hidden">
                    <Link
                        href={accueilEleve()}
                        className="rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Marque signature={false} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <PastilleReseau />
                        <Initiale />
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
                    <BandeauxHorsLigne />
                    {children}
                </main>
            </div>

            <nav
                aria-label="Espace élève"
                className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(16_16_24/0.08)] backdrop-blur-md lg:hidden print:hidden"
            >
                {NAVIGATION_ELEVE.filter(
                    (entree) => !entree.lateralSeulement,
                ).map((entree) => (
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

/** Hors ligne, session expirée, copie datée, notice iPhone : au-dessus du contenu. */
function BandeauxHorsLigne() {
    return (
        <div className="mb-5 grid gap-2 empty:hidden">
            <BandeauReseau />
            <BandeauCopie />
            <BandeauIphone />
            <BandeauExamenEnCours />
        </div>
    );
}

/**
 * La pastille du profil ouvre « Qui révise ? » (lot 7, HL6) : changer de
 * profil, garder le sien avec un code, Téléchargements, Mon compte.
 */
function Initiale() {
    const { auth } = usePage().props;
    const [ouvert, setOuvert] = useState(false);

    if (!auth.user) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOuvert(true)}
                aria-label="Qui révise ? Profils de ce téléphone"
                className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <PastilleProfil prenom={auth.user.prenom} />
            </button>
            <FeuilleProfils ouvert={ouvert} onOuvert={setOuvert} />
        </>
    );
}

function CarteEleve({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const [ouvert, setOuvert] = useState(false);

    if (!auth.user) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOuvert(true)}
                className={cn(
                    'flex w-full items-center gap-3 rounded-controle p-2 text-left transition-colors outline-none hover:bg-ink-900/[0.04] focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                    className,
                )}
            >
                <PastilleProfil prenom={auth.user.prenom} />
                <span className="sr-only">
                    Qui révise ? Profils de ce téléphone :
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-interface font-medium text-ink-900">
                        {auth.user.prenom}
                    </span>
                    <span className="truncate text-meta text-ink-500">
                        @{auth.user.pseudo}
                    </span>
                </span>
                <ChevronsUpDown
                    aria-hidden
                    className="size-4 shrink-0 text-ink-400"
                />
            </button>
            <FeuilleProfils ouvert={ouvert} onOuvert={setOuvert} />
        </>
    );
}
