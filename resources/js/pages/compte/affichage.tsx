import { Moon, Smartphone, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EnteteCompte, SectionCompte } from '@/components/entete-compte';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { useReglagesAffichage } from '@/hooks/use-reglages-affichage';
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

    return (
        <div className="grid gap-6">
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
                <p className="rounded-controle bg-craie-100 p-4 text-lecture">
                    Au marché de Madina, Fatou achète 3 kg de riz à{' '}
                    {formaterGnf(12500)} le kilo.
                </p>
            </SectionCompte>

            <SectionCompte
                titre="Économie de données"
                description="Les images lourdes ne se chargent que si tu les demandes, et le poids de chaque téléchargement s'affiche avant."
            >
                <label className="flex min-h-12 items-center gap-3">
                    <Checkbox
                        checked={economieDonnees}
                        onCheckedChange={(coche) =>
                            changerEconomieDonnees(coche === true)
                        }
                    />
                    <span>Activer l'économie de données</span>
                </label>
            </SectionCompte>

            <p className="text-aide text-ink-600">
                Ces réglages ne valent que pour ce téléphone.
            </p>
        </div>
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
                            'flex h-12 items-center justify-center gap-2 rounded-controle border-2 px-3 font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            choisi
                                ? 'border-nimba-600 bg-nimba-600/[0.12] text-nimba-700 dark:border-nimba-300 dark:bg-nimba-500/25 dark:text-nimba-300'
                                : 'border-input text-ink-900 hover:bg-nimba-600/[0.06] dark:hover:bg-nimba-500/15',
                        )}
                    >
                        {option.icone && (
                            <option.icone aria-hidden className="size-5" />
                        )}
                        {option.libelle}
                    </button>
                );
            })}
        </div>
    );
}
