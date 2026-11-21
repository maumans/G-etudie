import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock3,
    Hash,
    ListChecks,
    Scale,
    Timer,
} from 'lucide-react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EnoncePublic } from '@/components/vitrine/enonce-public';
import { LigneSujet } from '@/components/vitrine/ligne-sujet';
import { PartageWhatsapp } from '@/components/vitrine/partage-whatsapp';
import { formaterDuree } from '@/lib/contenu/sujets';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import type { CarteSujet, SujetPublic } from '@/lib/vitrine';
import { login, register } from '@/routes';
import { index } from '@/routes/vitrine/sujets';

type Props = {
    sujet: SujetPublic;
    autres: CarteSujet[];
    partage: { url: string; texte: string };
};

/**
 * Un sujet public (lot 8, PLAN M1 « SEO ») : l'énoncé complet, partie
 * par partie, tel qu'il est tombé ; le corrigé pas à pas, l'entraînement et
 * l'examen blanc sont réservés aux inscrits. Une colonne latérale invite à
 * s'inscrire, partage le sujet sur WhatsApp et propose les autres sessions.
 */
export default function Sujet({ sujet, autres, partage }: Props) {
    const style = MATIERES[sujet.matiere.cle];
    const questions = sujet.parties.reduce(
        (total, partie) => total + partie.questions.length,
        0,
    );
    const duree = formaterDuree(sujet.duree_minutes);
    let numero = 0;

    return (
        <>
            <Head
                title={`Sujet de ${sujet.matiere.nom}, ${sujet.libelle_session}`}
            />
            <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:px-8 lg:pt-10 lg:pb-28">
                <div className="grid min-w-0 content-start gap-6">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2 w-fit"
                    >
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Tous les sujets
                        </Link>
                    </Button>

                    <header className="flex min-w-0 items-start gap-4">
                        <span
                            aria-hidden
                            className={cn(
                                'flex size-12 shrink-0 items-center justify-center rounded-[14px]',
                                style.tuile,
                            )}
                        >
                            <style.icone className="size-[22px]" />
                        </span>
                        <div className="grid min-w-0 gap-2">
                            <h1 className="text-[1.75rem] leading-tight titre-contraste sm:text-[2.25rem]">
                                Sujet de {sujet.matiere.nom},{' '}
                                <strong>{sujet.libelle_session}</strong>
                            </h1>
                            <p className="text-ink-600">
                                {sujet.examen_nom}
                                {sujet.serie ? `, série ${sujet.serie}` : ''}
                                {sujet.origine === 'blanc_maison'
                                    ? ' : un sujet écrit par notre équipe, sur le modèle de l’épreuve.'
                                    : ` : le sujet de la session ${sujet.session}.`}
                            </p>
                            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-aide text-ink-500">
                                <li className="flex items-center gap-1.5">
                                    <Hash aria-hidden className="size-3.5" />
                                    {pluriel(questions, 'question')}
                                </li>
                                {duree && (
                                    <li className="flex items-center gap-1.5">
                                        <Clock3
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                        Durée {duree}
                                    </li>
                                )}
                                {sujet.coefficient && (
                                    <li className="flex items-center gap-1.5">
                                        <Scale
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                        Coefficient {sujet.coefficient}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </header>

                    {sujet.est_exemple && <BandeauExemple />}

                    {sujet.parties.map((partie) => (
                        <section
                            key={partie.uuid}
                            aria-labelledby={`partie-${partie.uuid}`}
                            className="grid gap-4 rounded-carte border bg-card p-4 shadow-carte sm:p-6"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <h2
                                    id={`partie-${partie.uuid}`}
                                    className="text-lg font-semibold"
                                >
                                    {partie.titre}
                                </h2>
                                {partie.bareme !== null && (
                                    <span className="text-aide text-ink-500 font-data">
                                        {pluriel(partie.bareme, 'point')}
                                    </span>
                                )}
                            </div>
                            <ContenuBlocs doc={partie.consigne} />
                            <ol className="grid">
                                {partie.questions.map((question) => {
                                    numero += 1;

                                    return (
                                        <EnoncePublic
                                            key={question.uuid}
                                            question={question}
                                            numero={numero}
                                        />
                                    );
                                })}
                            </ol>
                        </section>
                    ))}
                </div>

                <aside className="grid content-start gap-5 lg:sticky lg:top-24 lg:self-start">
                    <section
                        aria-labelledby="titre-inscription"
                        className="grid gap-5 rounded-panneau surface-encre p-6 text-white"
                    >
                        <h2
                            id="titre-inscription"
                            className="text-[1.375rem] leading-snug titre-contraste"
                        >
                            Le corrigé, <strong>étape par étape.</strong>
                        </h2>
                        <ul className="grid gap-2.5 text-interface text-white/80">
                            <li className="flex gap-2.5">
                                <ListChecks
                                    aria-hidden
                                    className="mt-0.5 size-4 shrink-0 text-nimba-300"
                                />
                                Chaque question corrigée pas à pas, avec ses
                                indices.
                            </li>
                            <li className="flex gap-2.5">
                                <Timer
                                    aria-hidden
                                    className="mt-0.5 size-4 shrink-0 text-nimba-300"
                                />
                                Ce sujet en examen blanc, à la durée de
                                l’épreuve.
                            </li>
                        </ul>
                        <div className="grid gap-2">
                            <Button asChild taille="grande">
                                <Link href={register()} prefetch>
                                    Créer un compte gratuit
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                taille="grande"
                                className="text-white/85 hover:bg-white/10 hover:text-white"
                            >
                                <Link href={login()} prefetch>
                                    J'ai déjà un compte
                                </Link>
                            </Button>
                        </div>
                    </section>

                    <PartageWhatsapp texte={partage.texte} url={partage.url} />

                    {autres.length > 0 && (
                        <section
                            aria-labelledby="titre-autres"
                            className="grid gap-1 rounded-carte border bg-card px-5 pt-4 pb-1 shadow-carte"
                        >
                            <h2
                                id="titre-autres"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Autres sessions
                            </h2>
                            <ul>
                                {autres.map((autre) => (
                                    <LigneSujet
                                        key={autre.slug}
                                        sujet={autre}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>
        </>
    );
}
