import { usePage } from '@inertiajs/react';
import type { Permission } from '@/types';

/**
 * « Ce compte peut-il… ? », pour taire une entrée ou un bouton qui ne le
 * concerne pas. Ce n'est qu'un affichage : chaque route porte son `can:` et
 * chaque fiche sa policy (cacher un lien ne ferme pas une porte).
 */
export function usePeut(): (permission: Permission) => boolean {
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];

    return (permission) => permissions.includes(permission);
}
