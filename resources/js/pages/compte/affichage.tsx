import {
    CircleCheck,
    Download,
    Moon,
    Share,
    Smartphone,
    Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    EnteteCompte,
    SectionCompte,
    useFormule,
} from '@/components/entete-compte';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { useReglagesAffichage } from '@/hooks/use-reglages-affichage';
import {
    estInstallee,
    estIphone,
    useInviteInstallation,
} from '@/lib/hors-ligne';
import type { TailleLecture } from '@/hooks/use-reglages-affichage';
import { cn, formaterGnf } from '@/lib/utils';

const THEMES: { valeur: Appearance; libelle: string; icone: LucideIcon }[] = [
    { valeur: 'light', libelle: 'Clair', icone: Sun },
    { valeur: 'dark', libelle: 'Sombre', icone: Moon },
    { valeur: 'system', libelle: 'Comme le téléphone', icone: Smartphone },
];

const TAILLES: { valeur: TailleLecture; libelle: string }[] = [
    { valeur: 'petite', libelle: 'Petite' },
    { valeur: 'normale', libelle: 'Normale' },
    { valeur: 'grande', libelle: 'Grande' },
];

/** Réglages d'affichage : propres à ce téléphone, jamais envoyés au serveur. */
export default function Affichage() {
    const { appearance, updateAppearance } = useAppearance();
    const { taille, changerTaille, economieDonnees, changerEconomieDonnees } =
        useReglagesAffichage();
    const formule = useFormule();

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Affichage" />

            <SectionCompte
                titre="Thème"
                description="Le thème sombre repose les yeux le soir et économise la batterie."
            >
                <Segments
                    libelle="Thème"
                    options={THEMES}
                    valeur={appearance}
                    onChoisir={updateAppearance}
                />
            </SectionCompte>

            <SectionCompte
                titre="Taille du texte des leçons"
                description="S'applique aux leçons et aux corrigés."
            >
                <Segments
                    libelle="Taille du texte"
                    options={TAILLES}
                    valeur={taille}
                    onChoisir={changerTaille}
                />
                <p className="rounded-controle border bg-craie-50 p-4 text-lecture">
                    Au marché de Madina, Fatou achète 3 kg de riz à{' '}
                    {formaterGnf(12500)} le kilo.
                </p>
            </SectionCompte>

            <SectionCompte
                titre="Économie de données"
                description={formule(
                    "Les images lourdes ne se chargent que si tu les demandes, et le poids de chaque téléchargement s'affiche avant.",
                    "Les images lourdes ne se chargent que si vous les demandez, et le poids de chaque téléchargement s'affiche avant.",
                )}
            >
                <label className="flex min-h-11 items-center gap-2.5">
                    <Checkbox
                        checked={economieDonnees}
                        onCheckedChange={(coche) =>
                            changerEconomieDonnees(coche === true)
                        }
                    />
                    <span>Activer l'économie de données</span>
                </label>
            </SectionCompte>

            <SectionCompte
                titre="Installer l'application"
                description={formule(
                    "Installée, N'karamögö s'ouvre depuis l'écran d'accueil comme une application, et garde tes réponses et tes téléchargements même sans réseau.",
                    "Installée, N'karamögö s'ouvre depuis l'écran d'accueil comme une application, et fonctionne même sans réseau.",
                )}
            >
                <Installation />
            </SectionCompte>

            <p className="text-aide text-ink-500">
                Ces réglages ne valent que pour ce téléphone.
            </p>
        </div>
    );
}

/**
 * Bouton « Installer » quand le navigateur le propose ; sur iPhone, la
 * marche à suivre (Safari n'a pas de bouton) ; sinon, l'état (A.3.2).
 */
function Installation() {
    const { possible, installer } = useInviteInstallation();
    const formule = useFormule();
    const [installee, setInstallee] = useState(false);
    const [iphone, setIphone] = useState(false);

    useEffect(() => {
        setInstallee(estInstallee());
        setIphone(estIphone());
    }, []);

    if (installee) {
        return (
            <p className="flex items-center gap-2 text-interface text-ink-900">
                <CircleCheck
                    aria-hidden
                    className="size-[18px] text-juste-600 dark:text-juste-400"
                />
                Installée sur ce téléphone.
            </p>
        );
    }

    if (possible) {
        return (
            <Button className="sm:w-fit" onClick={() => void installer()}>
                <Download aria-hidden />
                Installer N'karamögö
            </Button>
        );
    }

    if (iphone) {
        return (
            <ol className="grid gap-2 text-interface text-ink-900">
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
                    {formule('Choisis', 'Choisissez')} « Sur l'écran
                    d'accueil ».
                </li>
            </ol>
        );
    }

    return (
        <p className="text-aide text-ink-600">
            {formule(
                'Ouvre le menu du navigateur et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
                'Ouvrez le menu du navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
            )}
        </p>
    );
}

function Segments<T extends string>({
    libelle,
    options,
    valeur,
    onChoisir,
}: {
    libelle: string;
    options: { valeur: T; libelle: string; icone?: LucideIcon }[];
    valeur: T;
    onChoisir: (valeur: T) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={libelle}
            className="grid gap-2 sm:grid-cols-3"
        >
            {options.map((option) => {
                const choisi = option.valeur === valeur;

                return (
                    <button
                        key={option.valeur}
                        type="button"
                        role="radio"
                        aria-checked={choisi}
                        onClick={() => onChoisir(option.valeur)}
                        className={cn(
                            'flex h-11 items-center justify-center gap-2 rounded-controle border px-3 font-medium shadow-xs transition-[background-color,border-color,box-shadow] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-10',
                            choisi
                                ? 'border-nimba-600 bg-nimba-600/[0.06] text-nimba-700 ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:text-nimba-300 dark:ring-nimba-300'
                                : 'border-contour text-ink-900 hover:border-ink-400 hover:bg-craie-50 dark:hover:bg-relief',
                        )}
                    >
                        {option.icone && (
                            <option.icone aria-hidden className="size-4" />
                        )}
                        {option.libelle}
                    </button>
                );
            })}
        </div>
    );
}
