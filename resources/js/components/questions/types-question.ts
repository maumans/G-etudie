import {
    ArrowDownUp,
    CircleDot,
    Hash,
    Link2,
    ListChecks,
    PenLine,
    SquareDashed,
    ToggleRight,
    Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TypeQuestion } from '@/lib/contenu/questions';

/**
 * Ce que le back-office dit de chaque type (le libellé court vient aussi du
 * serveur, `TypeQuestion::libelle()`) : une icône et l'usage en une phrase.
 */
export const TYPES: Record<
    TypeQuestion,
    { libelle: string; icone: LucideIcon; usage: string }
> = {
    qcm_une: {
        libelle: 'QCM, une réponse',
        icone: CircleDot,
        usage: 'De 2 à 6 propositions, une seule juste.',
    },
    qcm_plusieurs: {
        libelle: 'QCM, plusieurs réponses',
        icone: ListChecks,
        usage: 'L’élève coche toutes les bonnes ; une réponse incomplète compte en partie.',
    },
    vrai_faux: {
        libelle: 'Vrai ou faux',
        icone: ToggleRight,
        usage: 'Une affirmation à juger.',
    },
    numerique: {
        libelle: 'Réponse numérique',
        icone: Hash,
        usage: 'Un nombre, avec une tolérance et une unité affichée.',
    },
    courte: {
        libelle: 'Réponse courte',
        icone: Type,
        usage: 'Un mot ou une expression ; accents et majuscules ne comptent pas.',
    },
    trous: {
        libelle: 'Texte à trous',
        icone: SquareDashed,
        usage: 'Des mots à écrire ou à choisir dans une phrase.',
    },
    appariement: {
        libelle: 'Appariement',
        icone: Link2,
        usage: 'Relier chaque élément de gauche à un élément de droite.',
    },
    ordre: {
        libelle: 'Remise en ordre',
        icone: ArrowDownUp,
        usage: 'Ranger des étapes ou des dates dans le bon ordre.',
    },
    ouverte: {
        libelle: 'Question ouverte',
        icone: PenLine,
        usage: 'L’élève rédige, puis s’évalue au barème en lisant le corrigé.',
    },
};
