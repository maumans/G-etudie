import { Head, Link, usePage } from '@inertiajs/react';
import {
    Clock,
    Compass,
    Hourglass,
    Lock,
    ServerCrash,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { accueil, home } from '@/routes';

type Statut = 403 | 404 | 419 | 429 | 500 | 503;

/**
 * Formulation neutre (ni « tu » ni « vous ») : la page sert à tous les
 * publics. Chaque message dit quoi faire (DESIGN.md § 9).
 */
const MESSAGES: Record<
    Statut,
    { titre: string; message: string; icone: LucideIcon; recharger: boolean }
> = {
    403: {
        titre: 'Accès réservé',
        message: "Cette page n'est pas accessible avec ce compte.",
        icone: Lock,
        recharger: false,
    },
    404: {
        titre: 'Page introuvable',
        message: "Cette page n'existe pas ou a été déplacée.",
        icone: Compass,
        recharger: false,
    },
    419: {
        titre: 'Page expirée',
        message:
            'La page est restée ouverte longtemps sans activité. Il suffit de la recharger.',
        icone: Hourglass,
        recharger: true,
    },
    429: {
        titre: 'Trop de tentatives',
        message: "Merci d'attendre une minute avant de réessayer.",
        icone: Clock,
        recharger: false,
    },
    500: {
        titre: 'Une erreur est survenue',
        message:
            'Le problème vient de nos serveurs, et il a été enregistré. Réessayer dans un instant.',
        icone: ServerCrash,
        recharger: true,
    },
    503: {
        titre: 'Maintenance en cours',
        message: "N'karamögö revient dans quelques minutes.",
        icone: Wrench,
        recharger: true,
    },
};

export default function Erreur({ statut }: { statut: Statut }) {
    const contenu = MESSAGES[statut] ?? MESSAGES[500];
    // Un compte connecté retourne dans son espace (un élève qui ouvre
    // /console n'a rien à faire sur la vitrine).
    const { auth } = usePage().props;
    const retour = auth?.user ? accueil() : home();

    return (
        <>
            <Head title={contenu.titre} />
            <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
                <div className="w-full max-w-md">
                    <p className="mb-4 text-center text-meta font-medium tracking-wide text-ink-500 uppercase font-data">
                        Erreur {statut}
                    </p>
                    <EtatVide
                        illustration={contenu.icone}
                        titre={contenu.titre}
                        message={contenu.message}
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                {contenu.recharger && (
                                    <Button
                                        onClick={() => window.location.reload()}
                                    >
                                        Recharger la page
                                    </Button>
                                )}
                                <Button
                                    asChild
                                    variant={
                                        contenu.recharger
                                            ? 'outline'
                                            : 'default'
                                    }
                                >
                                    <Link href={retour}>
                                        Retour à l'accueil
                                    </Link>
                                </Button>
                            </div>
                        }
                    />
                </div>
            </main>
        </>
    );
}
