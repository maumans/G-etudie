import { Head, Link } from '@inertiajs/react';
import { ArrowRight, GraduationCap, School, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { login, register } from '@/routes';

/** Les trois examens, avec leurs noms officiels (CLAUDE.md § 5). */
const EXAMENS: { nom: string; niveau: string; icone: LucideIcon }[] = [
    { nom: 'CEE', niveau: "Fin de l'école primaire", icone: Sparkles },
    { nom: 'BEPC', niveau: 'Fin du collège', icone: School },
    {
        nom: 'Baccalauréat unique',
        niveau: 'Séries SM, SE et SS',
        icone: GraduationCap,
    },
];

/**
 * Accueil public, version de socle (lot 0). La vitrine finale — démo jouable,
 * compte à rebours national, tarifs, partenaires — arrive au lot 8.
 * Vouvoiement (DESIGN.md § 9). Aucun chiffre ni témoignage non sourcé.
 */
export default function Accueil() {
    return (
        <>
            <Head title="Réviser le CEE, le BEPC et le Baccalauréat" />
            <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 sm:py-20">
                <p className="text-aide font-semibold tracking-wide text-nimba-700 uppercase dark:text-nimba-300">
                    CEE · BEPC · Baccalauréat unique
                </p>
                <h1 className="max-w-3xl text-titre-ecran-large font-bold text-balance sm:text-vitrine">
                    Un soir, quinze minutes, et je sais où j'en suis.
                </h1>
                <p className="max-w-2xl text-lecture text-ink-600">
                    Cours, annales corrigées, exercices et examens blancs pour
                    préparer les examens nationaux guinéens — sur téléphone,
                    même avec peu de données.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="sm:w-auto">
                        <Link href={register()} prefetch>
                            Créer un compte
                            <ArrowRight aria-hidden />
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={login()} prefetch>
                            J'ai déjà un compte
                        </Link>
                    </Button>
                </div>
            </section>

            <section
                aria-labelledby="titre-examens"
                className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6"
            >
                <h2 id="titre-examens" className="text-titre-ecran font-bold">
                    Pour les classes d'examen
                </h2>
                <ul className="grid gap-4 md:grid-cols-3">
                    {EXAMENS.map((examen) => (
                        <li
                            key={examen.nom}
                            className="flex items-center gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <span
                                aria-hidden
                                className="flex size-12 shrink-0 items-center justify-center rounded-controle bg-nimba-600/[0.12] text-nimba-700 dark:bg-nimba-500/25 dark:text-nimba-300"
                            >
                                <examen.icone className="size-6" />
                            </span>
                            <span className="grid gap-0.5">
                                <span className="font-titre text-titre-carte font-semibold">
                                    {examen.nom}
                                </span>
                                <span className="text-ink-600">
                                    {examen.niveau}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
