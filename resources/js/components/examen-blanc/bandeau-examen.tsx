import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    examenEnCours,
    formaterRestant,
    tempsRestantMs,
} from '@/lib/examen-blanc/passage';
import type { ExamenLocal } from '@/lib/examen-blanc/passage';
import { base } from '@/lib/hors-ligne';
import { show as annale } from '@/routes/eleve/annales';

/**
 * Un examen blanc en cours sur ce téléphone (HORS_LIGNE.md A.8) : rouvrir
 * l'application l'annonce partout dans l'espace élève, avec le temps qui
 * reste, et y ramène en un geste. Rien hors de l'examen lui-même.
 */
export function BandeauExamenEnCours() {
    const { auth } = usePage().props;
    const { url } = usePage();
    const [examen, setExamen] = useState<ExamenLocal | null>(null);
    const [maintenant, setMaintenant] = useState(() => Date.now());

    useEffect(() => {
        let actif = true;

        void examenEnCours(base, auth.user?.id ?? 0)
            .then((e) => actif && setExamen(e))
            .catch(() => undefined);
        const tic = window.setInterval(() => setMaintenant(Date.now()), 30_000);

        return () => {
            actif = false;
            window.clearInterval(tic);
        };
    }, [auth.user?.id, url]);

    // Sur l'examen lui-même, pas de bandeau.
    if (!examen || url.includes('mode=examen')) {
        return null;
    }

    const restant = tempsRestantMs(examen, maintenant);

    return (
        <Link
            href={annale(examen.sujet, { query: { mode: 'examen' } })}
            className="flex items-center gap-3 rounded-carte border border-nimba-500/40 bg-card px-4 py-3 shadow-carte outline-none hover:border-nimba-500 focus-visible:outline-2 focus-visible:outline-ring"
        >
            <Timer
                aria-hidden
                className="size-5 shrink-0 text-nimba-700 dark:text-nimba-300"
            />
            <span className="grid flex-1 leading-tight">
                <span className="font-semibold">Examen blanc en cours</span>
                <span
                    className="text-aide text-ink-600"
                    data-capture="variable"
                >
                    {restant > 0
                        ? `Il reste ${formaterRestant(restant)} : le temps continue de courir.`
                        : 'Temps écoulé : termine-le pour voir ta note.'}
                </span>
            </span>
            <span className="text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                Reprendre
            </span>
            <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-ink-400"
            />
        </Link>
    );
}
