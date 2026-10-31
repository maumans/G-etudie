import { Head, Link } from '@inertiajs/react';
import { BookmarkCheck, ChevronLeft, Printer } from 'lucide-react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { encadresDe } from '@/lib/contenu/blocs';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { matiere as pageMatiere } from '@/routes/eleve/cours';
import { show as pageLecon } from '@/routes/eleve/lecons';
import type { ContenuLecon } from '@/pages/eleve/lecon';

/**
 * Fiche de révision d'un chapitre (PLAN M4) : les « À retenir » de toutes
 * ses leçons, rassemblés sur une page qui s'imprime. Extraits sur l'appareil
 * (`encadresDe`), d'un contenu venu du serveur comme d'un pack.
 */
export default function Fiche({
    chapitre,
    matiere,
    lecons,
}: {
    chapitre: { id: number; titre: string };
    matiere: { cle: CleMatiere; nom: string; slug: string };
    lecons: ContenuLecon[];
}) {
    const style = MATIERES[matiere.cle];
    const sections = lecons
        .map((lecon) => ({
            lecon,
            retenir: encadresDe(lecon.blocs, 'a_retenir'),
        }))
        .filter((section) => section.retenir.length > 0);

    return (
        <>
            <Head title={`Fiche · ${chapitre.titre}`} />
            <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6">
                <header className="grid gap-4">
                    <Link
                        href={pageMatiere(matiere.slug)}
                        prefetch
                        className="-ml-1 flex items-center gap-1 self-start rounded-controle px-1 text-aide font-medium text-ink-600 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring print:hidden"
                    >
                        <ChevronLeft aria-hidden className="size-4" />
                        {matiere.nom}
                    </Link>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="grid gap-1.5">
                            <p
                                className={cn(
                                    'flex items-center gap-2 text-aide font-medium',
                                    style.texte,
                                )}
                            >
                                <style.icone aria-hidden className="size-4" />
                                {matiere.nom} · Fiche de révision
                            </p>
                            <h1 className="text-[1.75rem] leading-tight font-semibold text-balance">
                                {chapitre.titre}
                            </h1>
                            <p className="text-ink-600">
                                L'essentiel du chapitre, à relire la veille d'un
                                contrôle.
                            </p>
                        </div>
                        {sections.length > 0 && (
                            <Button
                                variant="outline"
                                onClick={() => window.print()}
                                className="self-start print:hidden"
                            >
                                <Printer aria-hidden />
                                Imprimer
                            </Button>
                        )}
                    </div>
                    {lecons.some((l) => l.est_exemple) && <BandeauExemple />}
                </header>

                {sections.length === 0 ? (
                    <EtatVide
                        illustration={BookmarkCheck}
                        titre="Pas encore d'« À retenir » dans ce chapitre"
                        message="La fiche se remplit avec les encadrés « À retenir » des leçons."
                        action={
                            <Button asChild variant="outline">
                                <Link href={pageMatiere(matiere.slug)}>
                                    Voir les leçons
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <ol className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte sm:p-8 print:border-0 print:p-0 print:shadow-none">
                        {sections.map(({ lecon, retenir }, rang) => (
                            <li
                                key={lecon.uuid}
                                className={cn(
                                    'grid gap-3',
                                    rang > 0 && 'border-t pt-5',
                                )}
                            >
                                <h2 className="flex items-center gap-2.5 text-titre-carte">
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'flex size-7 shrink-0 items-center justify-center rounded-[8px] text-aide font-bold font-data',
                                            style.tuile,
                                        )}
                                    >
                                        {rang + 1}
                                    </span>
                                    <Link
                                        href={pageLecon(lecon.uuid)}
                                        className="rounded-controle outline-none hover:text-nimba-700 focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-nimba-300"
                                    >
                                        {lecon.titre}
                                    </Link>
                                </h2>
                                <ContenuBlocs
                                    doc={{ type: 'doc', content: retenir }}
                                />
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </>
    );
}
