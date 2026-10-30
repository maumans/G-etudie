import { toast } from 'sonner';

/**
 * Jamais de clic mort (DESIGN.md § 13) : une action dont l'écran n'existe
 * pas encore le dit par une notification, au lieu de ne rien faire.
 */
export function annoncerBientot(quoi: string): void {
    toast.info(`${quoi} arrive bientôt.`, { id: 'bientot' });
}
