import { router, usePage } from '@inertiajs/react';
import { useConfirmer } from '@/components/ui/confirm-provider';
import {
    oublierCopies,
    retirerProfilDuTelephone,
    useHorsLigne,
} from '@/lib/hors-ligne';
import { nombreDeReponses } from '@/lib/hors-ligne/libelles';
import { logout } from '@/routes';

/**
 * Se déconnecter (HORS_LIGNE.md A.3.9) : si des réponses attendent d'être
 * envoyées, on le dit avant de confirmer ; elles restent dans la file et
 * partiront à la prochaine connexion de ce profil. Les copies d'écrans de ce
 * compte sont effacées du téléphone.
 *
 * Lot 7 (HL6) : le profil quitte aussi « Qui révise ? » (son jeton ne vaut
 * plus) ; ses données locales sont effacées une fois sa file vide. Pour
 * laisser la place à un frère sans quitter le téléphone : « Ajouter un
 * profil ».
 */
export function useDeconnexion(): () => Promise<void> {
    const confirmer = useConfirmer();
    const { enAttente } = useHorsLigne();
    const { auth } = usePage().props;

    return async () => {
        if (enAttente > 0) {
            const accepte = await confirmer({
                titre: 'Se déconnecter ?',
                message: `Tu as ${nombreDeReponses(enAttente)} pas encore envoyée${enAttente > 1 ? 's' : ''}. Elles partiront à ta prochaine connexion sur ce téléphone.`,
                action: 'Se déconnecter',
            });

            if (!accepte) {
                return;
            }
        }

        if (auth.user) {
            oublierCopies(auth.user.id);
            await retirerProfilDuTelephone(auth.user.id);
        }

        router.flushAll();
        router.post(logout().url);
    };
}
