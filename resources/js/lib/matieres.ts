import {
    Atom,
    BookOpen,
    Earth,
    FlaskConical,
    Languages,
    Leaf,
    Lightbulb,
    Sigma,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Teinte, icône et classes de chaque matière (DESIGN.md § 2.4). Les classes
 * sont écrites en entier ici, jamais construites (`bg-${…}`) ni venues du
 * PHP : sinon Tailwind ne les voit pas et les retire du CSS de production.
 * Une matière n'apparaît jamais dans une zone de verdict, et toujours avec
 * son nom et son icône.
 */
export type CleMatiere =
    | 'maths'
    | 'physique'
    | 'chimie'
    | 'biologie'
    | 'francais'
    | 'anglais'
    | 'histoire'
    | 'philosophie'
    | 'economie'
    | 'culture';

export type StyleMatiere = {
    nom: string;
    icone: LucideIcon;
    /** Tuile d'icône : teinte en opacité, icône en nuance 700 / 300. */
    tuile: string;
    /** Libellé ou eyebrow : nuance 600 / 300 (≥ 4,5:1). */
    texte: string;
    /** Arête gauche d'une carte. */
    arete: string;
    /** Couleur vive en `currentColor` (arc de la jauge) : nuance 500 / 400. */
    trait: string;
    /** Remplissage vif (segments de progression, pastille) : nuance 500 / 400. */
    plein: string;
};

export const MATIERES: Record<CleMatiere, StyleMatiere> = {
    maths: {
        nom: 'Mathématiques',
        icone: Sigma,
        tuile: 'bg-maths-600/[0.12] text-maths-700 dark:bg-maths-300/15 dark:text-maths-300',
        texte: 'text-maths-600 dark:text-maths-300',
        arete: 'border-l-maths-600 dark:border-l-maths-300',
        trait: 'text-maths-500 dark:text-maths-400',
        plein: 'bg-maths-500 dark:bg-maths-400',
    },
    physique: {
        nom: 'Physique',
        icone: Atom,
        tuile: 'bg-physique-600/[0.12] text-physique-700 dark:bg-physique-300/15 dark:text-physique-300',
        texte: 'text-physique-600 dark:text-physique-300',
        arete: 'border-l-physique-600 dark:border-l-physique-300',
        trait: 'text-physique-500 dark:text-physique-400',
        plein: 'bg-physique-500 dark:bg-physique-400',
    },
    chimie: {
        nom: 'Chimie',
        icone: FlaskConical,
        tuile: 'bg-chimie-600/[0.12] text-chimie-700 dark:bg-chimie-300/15 dark:text-chimie-300',
        texte: 'text-chimie-600 dark:text-chimie-300',
        arete: 'border-l-chimie-600 dark:border-l-chimie-300',
        trait: 'text-chimie-500 dark:text-chimie-400',
        plein: 'bg-chimie-500 dark:bg-chimie-400',
    },
    biologie: {
        nom: 'Biologie-Géologie',
        icone: Leaf,
        tuile: 'bg-biologie-600/[0.12] text-biologie-700 dark:bg-biologie-300/15 dark:text-biologie-300',
        texte: 'text-biologie-600 dark:text-biologie-300',
        arete: 'border-l-biologie-600 dark:border-l-biologie-300',
        trait: 'text-biologie-500 dark:text-biologie-400',
        plein: 'bg-biologie-500 dark:bg-biologie-400',
    },
    francais: {
        nom: 'Français',
        icone: BookOpen,
        tuile: 'bg-francais-600/[0.12] text-francais-700 dark:bg-francais-300/15 dark:text-francais-300',
        texte: 'text-francais-600 dark:text-francais-300',
        arete: 'border-l-francais-600 dark:border-l-francais-300',
        trait: 'text-francais-500 dark:text-francais-400',
        plein: 'bg-francais-500 dark:bg-francais-400',
    },
    anglais: {
        nom: 'Anglais',
        icone: Languages,
        tuile: 'bg-anglais-600/[0.12] text-anglais-700 dark:bg-anglais-300/15 dark:text-anglais-300',
        texte: 'text-anglais-600 dark:text-anglais-300',
        arete: 'border-l-anglais-600 dark:border-l-anglais-300',
        trait: 'text-anglais-500 dark:text-anglais-400',
        plein: 'bg-anglais-500 dark:bg-anglais-400',
    },
    histoire: {
        nom: 'Histoire-Géographie',
        icone: Earth,
        tuile: 'bg-histoire-600/[0.12] text-histoire-700 dark:bg-histoire-300/15 dark:text-histoire-300',
        texte: 'text-histoire-600 dark:text-histoire-300',
        arete: 'border-l-histoire-600 dark:border-l-histoire-300',
        trait: 'text-histoire-500 dark:text-histoire-400',
        plein: 'bg-histoire-500 dark:bg-histoire-400',
    },
    philosophie: {
        nom: 'Philosophie',
        icone: Lightbulb,
        tuile: 'bg-philosophie-600/[0.12] text-philosophie-700 dark:bg-philosophie-300/15 dark:text-philosophie-300',
        texte: 'text-philosophie-600 dark:text-philosophie-300',
        arete: 'border-l-philosophie-600 dark:border-l-philosophie-300',
        trait: 'text-philosophie-500 dark:text-philosophie-400',
        plein: 'bg-philosophie-500 dark:bg-philosophie-400',
    },
    economie: {
        nom: 'Économie',
        icone: TrendingUp,
        tuile: 'bg-economie-600/[0.12] text-economie-700 dark:bg-economie-300/15 dark:text-economie-300',
        texte: 'text-economie-600 dark:text-economie-300',
        arete: 'border-l-economie-600 dark:border-l-economie-300',
        trait: 'text-economie-500 dark:text-economie-400',
        plein: 'bg-economie-500 dark:bg-economie-400',
    },
    culture: {
        nom: 'Culture générale',
        icone: Sparkles,
        tuile: 'bg-culture-600/[0.12] text-culture-700 dark:bg-culture-300/15 dark:text-culture-300',
        texte: 'text-culture-600 dark:text-culture-300',
        arete: 'border-l-culture-600 dark:border-l-culture-300',
        trait: 'text-culture-500 dark:text-culture-400',
        plein: 'bg-culture-500 dark:bg-culture-400',
    },
};
