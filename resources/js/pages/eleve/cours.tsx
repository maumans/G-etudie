import { Head, Link } from '@inertiajs/react';
import { BookOpen, ChevronRight, Star } from 'lucide-react';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ProgressionSegments } from '@/components/ui/progression';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { accueil } from '@/routes/eleve';
import { matiere as pageMatiere } from '@/routes/eleve/cours';

type Matiere = {
    cle: CleMatiere;
    nom: string;
    slug: string;
    phare: boolean;
    chapitres: number;
    lecons: number;
    lecons_comprises: number;
    maitrise: number;
};

/**
 * « Cours » : les matières de l'examen de l'élève (PLAN M4), une carte par
 * matière — couleur, nom et icône, leçons comprises, maîtrise des exercices.
 * Les matières phares d'abord (D1).
 */
export default function Cours({
    examen,
    est_exemple,
    matieres,
}: {
    examen: string;
    est_exemple: boolean;
    matieres: Matiere[];
}) {
    const lecons = matieres.reduce((total, m) => total + m.lecons, 0);
    const comprises = matieres.reduce(
        (total, m) => total + m.lecons_comprises,
        0,
    );

    return (
        <>
            <Head title="Cours" />
            <div className="grid grid-cols-1 gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500">
                            {examen}
                        </p>
                        <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                            Mes <strong>cours</strong>
                        </h1>
                        <p className="text-ink-600">
                            Chaque leçon suit le programme, avec ses « À retenir
                            » et ses pièges.
                        </p>
                    </div>
                    {lecons > 0 && (
                        <p className="flex items-baseline gap-1.5 sm:text-right">
                            <span className="text-[1.75rem] leading-none font-bold font-data">
                                {comprises}
                            </span>
                            <span className="font-semibold text-ink-500 font-data">
                                / {lecons}
                            </span>
                            <span className="text-aide text-ink-600">
                                leçons comprises
                            </span>
                        </p>
                    )}
                </header>

                {est_exemple && <BandeauExemple />}

                {matieres.length === 0 ? (
                    <EtatVide
                        illustration={BookOpen}
                        titre="Les cours de ton examen arrivent"
                        message="L'équipe pédagogique les rédige et les relit. En attendant, ta séance du jour t'attend."
                        action={
                            <Button asChild variant="outline">
                                <Link href={accueil()}>Retour à l'accueil</Link>
                            </Button>
                        }
                    />
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2">
                        {matieres.map((matiere) => (
                            <CarteMatiere key={matiere.slug} {...matiere} />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

function CarteMatiere({
    cle,
    nom,
    slug,
    phare,
    chapitres,
    lecons,
    lecons_comprises,
    maitrise,
}: Matiere) {
    const style = MATIERES[cle];
    const lues =
        lecons === 0 ? 0 : Math.round((lecons_comprises / lecons) * 100);

    return (
        <li>
            <Link
                href={pageMatiere(slug)}
                prefetch
                className="group grid h-full gap-5 rounded-carte border bg-card p-5 shadow-carte transition-[border-color,box-shadow] outline-none hover:border-ink-400/60 hover:shadow-releve focus-visible:outline-2 focus-visible:outline-ring"
            >
                <div className="flex items-start gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-[12px]',
                            style.tuile,
                        )}
                    >
                        <style.icone className="size-5" />
                    </span>
                    <div className="grid min-w-0 flex-1 gap-0.5">
                        <span className="flex items-center gap-1.5">
                            <span className="truncate text-titre-carte font-semibold">
                                {nom}
                            </span>
                            {phare && (
                                <Star
                                    aria-label="Matière phare"
                                    className="size-3.5 shrink-0 fill-soleil-400 text-soleil-500"
                                />
                            )}
                        </span>
                        <span className="text-aide text-ink-500">
                            {pluriel(chapitres, 'chapitre')} ·{' '}
                            {pluriel(lecons, 'leçon')}
                        </span>
                    </div>
                    <ChevronRight
                        aria-hidden
                        className="mt-1 size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Chiffre
                        valeur={lecons_comprises}
                        sur={lecons}
                        libelle="leçons comprises"
                    />
                    <Chiffre
                        valeur={maitrise}
                        unite="%"
                        libelle="maîtrise"
                    />
                </div>

                <ProgressionSegments
                    valeur={lues}
                    libelle={`${nom} : ${lecons_comprises} leçons comprises sur ${lecons}`}
                    couleur={style.plein}
                />
            </Link>
        </li>
    );
}

function Chiffre({
    valeur,
    sur,
    unite,
    libelle,
}: {
    valeur: number;
    sur?: number;
    unite?: string;
    libelle: string;
}) {
    return (
        <p className="grid gap-0.5 rounded-controle bg-craie-100 px-3 py-2 dark:bg-relief/60">
            <span className="flex items-baseline gap-1">
                <span className="text-lg leading-none font-bold font-data">
                    {valeur}
                </span>
                {sur !== undefined && (
                    <span className="text-aide font-semibold text-ink-600 font-data">
                        / {sur}
                    </span>
                )}
                {unite && (
                    <span className="text-aide font-semibold text-ink-600">
                        {unite}
                    </span>
                )}
            </span>
            <span className="text-meta text-ink-600">{libelle}</span>
        </p>
    );
}
