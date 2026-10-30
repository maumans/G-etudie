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

export function BadgeStatut({ statut }: { statut: StatutContenu }) {
    const { libelle, icone: Icone, variante } = STATUTS[statut];

    return (
        <Badge variant={variante}>
            <Icone aria-hidden />
            {libelle}
        </Badge>
    );
}
