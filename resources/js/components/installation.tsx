import { CircleCheck, Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    estInstallee,
    estIphone,
    useInviteInstallation,
} from '@/lib/hors-ligne';
import { cn } from '@/lib/utils';

/**
 * Installer l'application (HORS_LIGNE.md A.3.2) : le bouton « Installer »
 * quand le navigateur le propose (`beforeinstallprompt`) ; sur iPhone, la
 * marche à suivre (Safari n'a pas de bouton) ; sinon, l'état ou le menu du
 * navigateur. Partagé par « Mon compte › Affichage » et la vitrine (lot 8).
 *
 * `vous` : vouvoiement (vitrine, personnel) ; sinon tutoiement (élève).
 */
export function Installation({
    vous,
    className,
}: {
    vous: boolean;
    className?: string;
}) {
    const { possible, installer } = useInviteInstallation();
    const [installee, setInstallee] = useState(false);
    const [iphone, setIphone] = useState(false);
    const formule = (tu: string, vouvoiement: string) =>
        vous ? vouvoiement : tu;

    useEffect(() => {
        setInstallee(estInstallee());
        setIphone(estIphone());
    }, []);

    if (installee) {
        return (
            <p
                className={cn(
                    'flex items-center gap-2 text-interface text-ink-900',
                    className,
                )}
            >
                <CircleCheck
                    aria-hidden
                    className="size-[18px] text-juste-600 dark:text-juste-400"
                />
                Installée sur cet appareil.
            </p>
        );
    }

    if (possible) {
        return (
            <Button
                className={cn('sm:w-fit', className)}
                onClick={() => void installer()}
            >
                <Download aria-hidden />
                Installer N'karamögö
            </Button>
        );
    }

    if (iphone) {
        return (
            <ol
                className={cn(
                    'grid gap-2 text-interface text-ink-900',
                    className,
                )}
            >
                <li className="flex items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                        1
                    </span>
                    {formule('Dans Safari, touche', 'Dans Safari, touchez')}
                    <Share aria-label="Partager" className="size-4" />
                    Partager.
                </li>
                <li className="flex items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                        2
                    </span>
                    {formule('Choisis', 'Choisissez')} « Sur l'écran d'accueil
                    ».
                </li>
            </ol>
        );
    }

    return (
        <p className={cn('text-aide text-ink-600', className)}>
            {formule(
                'Ouvre le menu du navigateur et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
                'Ouvrez le menu du navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
            )}
        </p>
    );
}
