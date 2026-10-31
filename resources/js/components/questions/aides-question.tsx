import { ChevronDown, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type { Critere, EtapeCorrige } from '@/lib/contenu/questions';
import { cn, pluriel } from '@/lib/utils';

/**
 * Les indices, un à la fois (PLAN M5 : « indice(s) progressifs »). Ils ne
 * retirent rien au verdict ; le serveur garde seulement leur nombre.
 */
export function IndicesQuestion({
    indices,
    vus,
    voirSuivant,
    fige = false,
}: {
    indices: DocumentBlocs[];
    vus: number;
    voirSuivant: () => void;
    /** Après « Vérifier » : on ne demande plus d'indice. */
    fige?: boolean;
}) {
    if (indices.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-2.5">
            {indices.slice(0, vus).map((indice, rang) => (
                <aside
                    key={rang}
                    className="grid gap-2 rounded-carte border border-indice-400/45 bg-indice-400/[0.10] px-4 py-3 dark:border-indice-400/30 dark:bg-indice-400/[0.08]"
                >
                    <p className="flex items-center gap-2 text-aide font-semibold text-indice-700 dark:text-indice-400">
                        <Lightbulb aria-hidden className="size-4" />
                        Indice {indices.length > 1 ? `${rang + 1}` : ''}
                    </p>
                    <ContenuBlocs
                        doc={indice}
                        className="text-interface text-ink-900"
                    />
                </aside>
            ))}
            {!fige && vus < indices.length && (
                <Button
                    variant="ghost"
                    taille="compacte"
                    onClick={voirSuivant}
                    className="w-fit text-indice-700 hover:bg-indice-400/[0.12] dark:text-indice-400"
                >
                    <Lightbulb aria-hidden />
                    {vus === 0 ? 'Un indice' : 'Un autre indice'}
                    <span className="text-meta text-ink-500 font-data">
                        {vus + 1}/{indices.length}
                    </span>
                </Button>
            )}
        </div>
    );
}

/**
 * Le corrigé pas à pas (DESIGN.md § 6.4) : étapes numérotées, dévoilées
 * une à une pour que l'élève refasse le chemin ; « Tout voir » d'un geste.
 */
export function CorrigePasAPas({
    etapes,
    toutVoir = false,
    className,
}: {
    etapes: EtapeCorrige[];
    /** Relecture : toutes les étapes d'emblée. */
    toutVoir?: boolean;
    className?: string;
}) {
    const [vues, setVues] = useState(
        toutVoir || etapes.length <= 1 ? etapes.length : 1,
    );

    if (etapes.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Corrigé pas à pas"
            className={cn('grid gap-3', className)}
        >
            <p className="flex items-baseline justify-between gap-3 text-aide font-semibold text-ink-900">
                Corrigé
                {etapes.length > 1 && (
                    <span className="text-meta font-medium text-ink-500">
                        {pluriel(etapes.length, 'étape')}
                    </span>
                )}
            </p>
            <ol className="grid gap-3">
                {etapes.slice(0, vues).map((etape, rang) => (
                    <li key={rang} className="flex gap-3">
                        {etapes.length > 1 && (
                            <span
                                aria-hidden
                                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                            >
                                {rang + 1}
                            </span>
                        )}
                        <div className="grid min-w-0 flex-1 gap-1">
                            {etape.titre && (
                                <p className="text-interface font-semibold">
                                    {etape.titre}
                                </p>
                            )}
                            <ContenuBlocs
                                doc={etape.blocs}
                                className="gap-2 text-interface text-ink-600"
                            />
                        </div>
                    </li>
                ))}
            </ol>
            {vues < etapes.length && (
                <div className="flex flex-wrap gap-2 pl-9">
                    <Button
                        variant="outline"
                        taille="petite"
                        onClick={() => setVues((v) => v + 1)}
                    >
                        <ChevronDown aria-hidden />
                        Étape suivante
                    </Button>
                    <Button
                        variant="ghost"
                        taille="petite"
                        onClick={() => setVues(etapes.length)}
                    >
                        Tout voir
                    </Button>
                </div>
            )}
        </section>
    );
}

/**
 * Auto-évaluation d'une question ouverte (PLAN M5) : l'élève coche les
 * critères du barème qu'il a remplis ; le score suit, en points.
 */
export function AutoEvaluation({
    bareme,
    criteres,
    changer,
    fige = false,
}: {
    bareme: Critere[];
    criteres: string[];
    changer: (criteres: string[]) => void;
    fige?: boolean;
}) {
    const total = bareme.reduce((s, c) => s + c.points, 0);
    const obtenus = bareme
        .filter((c) => criteres.includes(c.id))
        .reduce((s, c) => s + c.points, 0);

    return (
        <fieldset className="grid gap-2.5">
            <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3 text-aide font-semibold text-ink-900">
                Ce que j’ai fait
                <span className="text-meta font-medium text-ink-600 font-data">
                    {obtenus} / {total} points
                </span>
            </legend>
            {bareme.map((critere) => (
                <label
                    key={critere.id}
                    className={cn(
                        'flex min-h-12 cursor-pointer items-start gap-3 rounded-controle border border-contour bg-card px-3 py-3 text-interface shadow-xs has-[[data-state=checked]]:border-nimba-600 has-[[data-state=checked]]:bg-nimba-600/[0.05] dark:bg-relief/40 dark:has-[[data-state=checked]]:border-nimba-300 dark:has-[[data-state=checked]]:bg-nimba-300/10',
                        fige && 'cursor-default',
                    )}
                >
                    <Checkbox
                        className="mt-0.5"
                        checked={criteres.includes(critere.id)}
                        disabled={fige}
                        onCheckedChange={(coche) =>
                            changer(
                                coche === true
                                    ? [...criteres, critere.id]
                                    : criteres.filter((c) => c !== critere.id),
                            )
                        }
                    />
                    <span className="min-w-0 flex-1">{critere.critere}</span>
                    <span className="shrink-0 text-meta font-medium text-ink-500 font-data">
                        {pluriel(critere.points, 'pt')}
                    </span>
                </label>
            ))}
        </fieldset>
    );
}
