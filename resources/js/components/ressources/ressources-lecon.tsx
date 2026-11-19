import {
    BookText,
    ExternalLink,
    Globe,
    MonitorPlay,
    PencilRuler,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { horsLigneSur, ouvrirEcranIndisponible } from '@/lib/hors-ligne';
import type { RessourceEleve } from '@/lib/ressources';
import { avertissementsSortie, poidsAnnonce } from '@/lib/ressources';
import { cn } from '@/lib/utils';

const ICONES: Record<RessourceEleve['type'], LucideIcon> = {
    video: MonitorPlay,
    article: BookText,
    encyclopedie: Globe,
    exercices: PencilRuler,
};

/**
 * « Pour aller plus loin » (lot 12, PLAN M19) : les ressources vérifiées de
 * la notion, chacune avec son site, son type et ce qu'elle coûte en données.
 * Toucher un lien ouvre d'abord « Tu quittes N'karamögö » ; hors ligne, le
 * dialogue « Cet écran demande une connexion » (HORS_LIGNE.md A.3.7). Le
 * lien part dans un nouvel onglet, sans référent.
 */
export function RessourcesLecon({
    ressources,
    className,
}: {
    ressources: RessourceEleve[];
    className?: string;
}) {
    const [choisie, setChoisie] = useState<RessourceEleve | null>(null);

    if (ressources.length === 0) {
        return null;
    }

    return (
        <div className={cn('grid gap-1', className)}>
            <p className="text-meta text-ink-500">
                Sur d’autres sites, vérifiés par l’équipe
            </p>
            <ul className="-mx-2 grid">
                {ressources.map((ressource) => {
                    const Icone = ICONES[ressource.type];

                    return (
                        <li key={ressource.uuid}>
                            <button
                                type="button"
                                onClick={() =>
                                    horsLigneSur()
                                        ? ouvrirEcranIndisponible(
                                              'connexion_requise',
                                          )
                                        : setChoisie(ressource)
                                }
                                className="flex w-full items-start gap-3 rounded-controle px-2 py-2 text-left transition-colors outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]"
                            >
                                <span
                                    aria-hidden
                                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-craie-100 text-ink-600 dark:bg-relief"
                                >
                                    <Icone className="size-4" />
                                </span>
                                <span className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="font-medium text-ink-900">
                                        {ressource.titre}
                                    </span>
                                    <span className="text-meta text-ink-500">
                                        {ressource.site} ·{' '}
                                        {ressource.type_libelle} ·{' '}
                                        {poidsAnnonce(ressource.poids_ko)}
                                    </span>
                                </span>
                                <ExternalLink
                                    aria-hidden
                                    className="mt-1 size-3.5 shrink-0 text-ink-400"
                                />
                                <span className="sr-only">
                                    (lien vers un autre site)
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <DialogueSortie
                ressource={choisie}
                fermer={() => setChoisie(null)}
            />
        </div>
    );
}

export function DialogueSortie({
    ressource,
    fermer,
}: {
    ressource: RessourceEleve | null;
    fermer: () => void;
}) {
    return (
        <Dialog open={ressource !== null} onOpenChange={(o) => !o && fermer()}>
            <DialogContent className="sm:max-w-md">
                {ressource && (
                    <>
                        <DialogHeader>
                            <span
                                aria-hidden
                                className="mb-1 flex size-10 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                            >
                                <ExternalLink className="size-[18px]" />
                            </span>
                            <DialogTitle>Tu quittes N’karamögö</DialogTitle>
                            <DialogDescription asChild>
                                <div className="grid gap-2">
                                    {avertissementsSortie(ressource).map(
                                        (phrase) => (
                                            <p key={phrase}>{phrase}</p>
                                        ),
                                    )}
                                </div>
                            </DialogDescription>
                        </DialogHeader>
                        <p className="rounded-controle bg-craie-100 px-3 py-2.5 text-aide text-ink-600 dark:bg-relief/60">
                            <span className="font-semibold text-ink-900">
                                {ressource.titre}
                            </span>
                            {ressource.description && (
                                <span className="mt-0.5 block">
                                    {ressource.description}
                                </span>
                            )}
                        </p>
                        <DialogFooter>
                            <Button variant="outline" onClick={fermer}>
                                Rester ici
                            </Button>
                            <Button asChild>
                                <a
                                    href={ressource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    onClick={fermer}
                                >
                                    <ExternalLink aria-hidden />
                                    Ouvrir {ressource.site}
                                </a>
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
