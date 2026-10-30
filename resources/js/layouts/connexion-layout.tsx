import { Link } from '@inertiajs/react';
import { BookOpenCheck, Check, Flame, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Marque } from '@/components/marque';
import { home } from '@/routes';

/**
 * Écrans de connexion, d'inscription et de récupération. Mobile : la marque
 * en haut, le formulaire seul, sans cadre. À partir de 1024 px : écran
 * partagé, le formulaire à gauche, un panneau de la marque à droite qui dit
 * ce qu'on trouve derrière la porte. Tutoiement : ce sont des écrans de
 * l'espace élève (DESIGN.md § 7).
 */
export default function ConnexionLayout({ children }: { children: ReactNode }) {
    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="relative flex flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
                <Link
                    href={home()}
                    className="self-start rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Marque />
                    <span className="sr-only">Retour à l'accueil</span>
                </Link>
                <main className="mx-auto grid w-full max-w-[24rem] flex-1 content-center gap-7 py-10">
                    {children}
                </main>
                <p className="text-center text-meta text-ink-500 lg:text-left">
                    CEE · BEPC · Baccalauréat unique
                </p>
            </div>

            <PanneauMarque />
        </div>
    );
}

/**
 * Le panneau de droite : décor, donc caché aux lecteurs d'écran. Aucun
 * chiffre inventé : il montre la forme de l'application, pas des résultats.
 */
function PanneauMarque() {
    return (
        <div
            aria-hidden
            className="relative m-3 hidden overflow-hidden rounded-panneau surface-marque text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
        >
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] [background-size:22px_22px]" />

            <p className="relative max-w-md text-[2.5rem] leading-[1.05] titre-contraste text-balance">
                Tout pour réussir <strong>le CEE, le BEPC et le Bac.</strong>
            </p>

            <div className="relative mx-auto grid w-full max-w-sm gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white text-nimba-700">
                        <BookOpenCheck className="size-5" />
                    </span>
                    <span className="grid gap-0.5">
                        <span className="text-interface font-medium">
                            Ta séance du jour
                        </span>
                        <span className="text-aide text-white/70">
                            15 minutes, des questions choisies pour toi
                        </span>
                    </span>
                </div>
                <div className="clair ml-10 flex items-center gap-3 rounded-2xl bg-white p-4 text-ink-900 shadow-flottant">
                    <span className="flex size-8 items-center justify-center rounded-full bg-juste-600 text-white">
                        <Check className="size-4" strokeWidth={3} />
                    </span>
                    <span className="grid gap-0.5">
                        <span className="text-interface font-medium text-juste-700">
                            Juste
                        </span>
                        <span className="text-aide text-ink-600">
                            Le corrigé, étape par étape
                        </span>
                    </span>
                </div>
                <div className="flex gap-3">
                    <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                        <Flame className="size-5 text-soleil-300" />
                        <span className="text-aide">Ta série de jours</span>
                    </div>
                    <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                        <WifiOff className="size-5 text-white/80" />
                        <span className="text-aide">Cours hors ligne</span>
                    </div>
                </div>
            </div>

            <p className="relative text-aide text-white/60">
                Cours, annales corrigées, exercices et examens blancs.
            </p>
        </div>
    );
}

/** Titre et chapeau d'un écran de connexion. */
export function EnTeteConnexion({
    titre,
    description,
}: {
    titre: string;
    description?: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <h1 className="text-[1.75rem] leading-tight">{titre}</h1>
            {description && <p className="text-ink-600">{description}</p>}
        </div>
    );
}
