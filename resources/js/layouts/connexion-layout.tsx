import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Marque } from '@/components/marque';
import { home } from '@/routes';

/**
 * Écrans de connexion, d'inscription et de récupération : une colonne
 * centrée, la marque en haut (retour à l'accueil), le formulaire dans une
 * carte. Tutoiement : ce sont des écrans de l'espace élève (DESIGN.md § 7).
 */
export default function ConnexionLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-8 sm:justify-center">
            <div className="grid w-full max-w-md gap-6">
                <Link
                    href={home()}
                    className="justify-self-center rounded-controle outline-none focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Marque />
                    <span className="sr-only">Retour à l'accueil</span>
                </Link>
                <main className="grid gap-6 rounded-carte border bg-card p-5 shadow-carte sm:p-8">
                    {children}
                </main>
            </div>
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
            <h1 className="text-titre-ecran font-bold">{titre}</h1>
            {description && <p className="text-ink-600">{description}</p>}
        </div>
    );
}
