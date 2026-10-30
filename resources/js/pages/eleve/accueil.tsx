import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    FileText,
    Gauge,
    ShieldAlert,
    Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { edit as monCompte } from '@/routes/compte/profil';
import { edit as verifierNumero } from '@/routes/compte/verification';

const A_VENIR: { titre: string; texte: string; icone: LucideIcon }[] = [
    {
        titre: 'Cours',
        texte: 'Une notion à la fois, avec exemples et formules.',
        icone: BookOpen,
    },
    {
        titre: 'Annales',
        texte: 'Les sujets des sessions passées, corrigés pas à pas.',
        icone: FileText,
    },
    {
        titre: 'Examens blancs',
        texte: 'La répétition du jour J, chronomètre compris.',
        icone: Timer,
    },
];

/** « Bonjour » le jour, « Bonsoir » à partir de 18 h. */
function salutation(maintenant: Date): string {
    return maintenant.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
}

/**
 * Accueil élève, version de socle (lot 0). La jauge, le compte à rebours et
 * la séance du jour arrivent aux lots 2 et 6. Tutoiement (DESIGN.md § 9).
 */
export default function Accueil() {
    const { auth } = usePage().props;
    const maintenant = new Date();
    const date = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(maintenant);

    return (
        <>
            <Head title="Accueil" />
            <div className="grid gap-6">
                <div className="grid gap-1">
                    <p className="text-aide text-ink-500 first-letter:uppercase">
                        {date}
                    </p>
                    <h1 className="text-titre-ecran lg:text-titre-ecran-large">
                        {salutation(maintenant)}, {auth.user?.prenom}
                    </h1>
                </div>

                {auth.user && !auth.user.numero_verifie && (
                    <div className="flex flex-col gap-3 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] p-4 sm:flex-row sm:items-center dark:bg-indice-400/[0.06]">
                        <ShieldAlert
                            aria-hidden
                            className="hidden size-5 shrink-0 text-indice-600 sm:block dark:text-indice-400"
                        />
                        <p className="flex-1 text-ink-600">
                            <span className="font-medium text-ink-900">
                                Vérifie ton numéro.
                            </span>{' '}
                            Sans lui, impossible de retrouver ton compte si tu
                            oublies ton mot de passe.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            taille="compacte"
                            className="self-start sm:self-auto"
                        >
                            <Link href={verifierNumero()}>Vérifier</Link>
                        </Button>
                    </div>
                )}

                <section className="relative isolate overflow-hidden rounded-[20px] surface-marque p-6 text-white shadow-releve sm:p-7">
                    <Gauge
                        aria-hidden
                        className="absolute -right-6 -bottom-8 -z-10 size-44 text-white/[0.07]"
                        strokeWidth={1.25}
                    />
                    <p className="text-meta font-medium tracking-wide text-white/70 uppercase">
                        Ta séance du jour
                    </p>
                    <h2 className="mt-2 max-w-md text-[1.375rem] leading-snug">
                        Ton espace se prépare.
                    </h2>
                    <p className="mt-1.5 max-w-md text-white/75">
                        Dès les premiers cours publiés, tu trouveras ici chaque
                        soir quinze minutes de questions choisies pour toi, et
                        ta jauge de préparation.
                    </p>
                    <Button
                        asChild
                        className="mt-5 bg-white text-nimba-700 hover:bg-white/90 dark:hover:bg-white/90"
                    >
                        <Link href={monCompte()} prefetch>
                            Compléter mon compte
                            <ArrowRight aria-hidden />
                        </Link>
                    </Button>
                </section>

                <section aria-labelledby="titre-a-venir" className="grid gap-3">
                    <h2
                        id="titre-a-venir"
                        className="text-aide font-medium tracking-normal text-ink-500"
                    >
                        Bientôt dans ton espace
                    </h2>
                    <ul className="grid gap-3 sm:grid-cols-3">
                        {A_VENIR.map((element) => (
                            <li
                                key={element.titre}
                                className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte"
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        aria-hidden
                                        className="flex size-9 items-center justify-center rounded-[10px] bg-craie-100 text-ink-600"
                                    >
                                        <element.icone className="size-[18px]" />
                                    </span>
                                    <Badge>bientôt</Badge>
                                </div>
                                <div className="grid gap-0.5">
                                    <p className="font-semibold tracking-tight">
                                        {element.titre}
                                    </p>
                                    <p className="text-aide text-ink-600">
                                        {element.texte}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </>
    );
}
