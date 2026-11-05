import {
    BookCheck,
    CalendarCheck,
    Crosshair,
    Flame,
    Footprints,
    Lightbulb,
    Swords,
    Timer,
    Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CleMatiere } from '@/lib/matieres';

/**
 * Libellés et icônes de la progression et de la motivation (lot 6). Les
 * valeurs viennent du serveur (MaitriseService, MotivationService) ; ici,
 * seulement la façon de les dire.
 */

export type EtatNotion =
    | 'nouvelle'
    | 'a_revoir'
    | 'maitrisee'
    | 'fragile'
    | 'en_cours';

export const ETATS_NOTION: Record<
    EtatNotion,
    {
        libelle: string;
        variante: 'neutre' | 'nimba' | 'soleil' | 'juste' | 'faux';
    }
> = {
    nouvelle: { libelle: 'Pas commencée', variante: 'neutre' },
    a_revoir: { libelle: 'À revoir', variante: 'soleil' },
    maitrisee: { libelle: 'Maîtrisée', variante: 'juste' },
    fragile: { libelle: 'Fragile', variante: 'faux' },
    en_cours: { libelle: 'En cours', variante: 'nimba' },
};

/** Icône d'un badge (`badges.icone`, BadgeSeeder). */
export const ICONES_BADGES: Record<string, LucideIcon> = {
    pas: Footprints,
    seance: CalendarCheck,
    flamme: Flame,
    notion: Lightbulb,
    chapitre: BookCheck,
    cible: Crosshair,
    chrono: Timer,
    trophee: Trophy,
    defi: Swords,
};

export function iconeBadge(cle: string): LucideIcon {
    return ICONES_BADGES[cle] ?? Trophy;
}

export type Badge = {
    cle: string;
    nom: string;
    description: string;
    icone: string;
    points: number;
    obtenu_le: string | null;
};

export type Points = {
    total: number;
    niveau: number;
    palier: number;
    prochain_palier: number | null;
};

export type Defi = {
    cle: CleMatiere;
    matiere: string;
    objectif: number;
    fait: number;
    reussi: boolean;
    fin: string;
};

/** Part du niveau en cours déjà faite (0 à 100). */
export function partDuNiveau(points: Points): number {
    if (points.prochain_palier === null) {
        return 100;
    }

    return Math.round(
        (100 * (points.total - points.palier)) /
            (points.prochain_palier - points.palier),
    );
}

const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
});

/** « mardi 10 novembre » d'une date `AAAA-MM-JJ`. */
export function jourEnClair(date: string): string {
    return JOUR_COURT.format(new Date(`${date}T00:00:00Z`));
}
