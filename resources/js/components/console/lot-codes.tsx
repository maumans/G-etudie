import { Badge } from '@/components/ui/badge';

/** Lot 9 : les lots de codes prépayés, vus de la console. */
export type FormuleEcran = {
    cle: 'mensuel' | 'annee';
    nom: string;
    prix_gnf: number;
    mois: number;
    duree: string;
};

export type LotResume = {
    uuid: string;
    libelle: string;
    formule: FormuleEcran;
    quantite: number;
    utilises: number;
    revendeur: string | null;
    cree_le: string;
    codes_disponibles: boolean;
    remis_le: string | null;
    desactive_le: string | null;
    est_exemple: boolean;
};

export function EtatLot({ lot }: { lot: LotResume }) {
    if (lot.desactive_le) {
        return <Badge variant="faux">Désactivé</Badge>;
    }

    if (lot.codes_disponibles) {
        return <Badge variant="indice">À remettre</Badge>;
    }

    return <Badge variant="juste">Remis</Badge>;
}
