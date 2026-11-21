import { Archive, CircleCheck, Clock3, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StatutContenu } from '@/types/contenu';

/**
 * Statut d'un contenu : la seule couleur du back-office (DESIGN.md § 7),
 * toujours avec son icône et son mot.
 */
export const STATUTS: Record<
    StatutContenu,
    {
        libelle: string;
        /** Titre d'un compteur : « Brouillons », « Publiées »… */
        pluriel: string;
        icone: LucideIcon;
        variante: 'neutre' | 'nimba' | 'juste' | 'indice';
    }
> = {
    brouillon: {
        libelle: 'Brouillon',
        pluriel: 'Brouillons',
        icone: PenLine,
        variante: 'neutre',
    },
    en_relecture: {
        libelle: 'En relecture',
        pluriel: 'En relecture',
        icone: Clock3,
        variante: 'nimba',
    },
    publie: {
        libelle: 'Publiée',
        pluriel: 'Publiées',
        icone: CircleCheck,
        variante: 'juste',
    },
    archive: {
        libelle: 'Archivée',
        pluriel: 'Archivées',
        icone: Archive,
        variante: 'neutre',
    },
};

/**
 * Un sujet est masculin (« Publié », « Archivé ») ; une leçon et une
 * question sont féminines (2026-11-21 : on dit « sujet », plus « annale »).
 */
export type Genre = 'feminin' | 'masculin';

const MASCULIN: Partial<
    Record<StatutContenu, { libelle: string; pluriel: string }>
> = {
    publie: { libelle: 'Publié', pluriel: 'Publiés' },
    archive: { libelle: 'Archivé', pluriel: 'Archivés' },
};

export function statutDe(statut: StatutContenu, genre: Genre = 'feminin') {
    return genre === 'masculin'
        ? { ...STATUTS[statut], ...MASCULIN[statut] }
        : STATUTS[statut];
}

export function BadgeStatut({
    statut,
    genre = 'feminin',
}: {
    statut: StatutContenu;
    genre?: Genre;
}) {
    const { libelle, icone: Icone, variante } = statutDe(statut, genre);

    return (
        <Badge variant={variante}>
            <Icone aria-hidden />
            {libelle}
        </Badge>
    );
}
