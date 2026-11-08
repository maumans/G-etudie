import { router } from '@inertiajs/react';
import { Laptop, Smartphone, Tablet, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    EnteteCompte,
    SectionCompte,
    useFormule,
} from '@/components/entete-compte';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { pluriel } from '@/lib/utils';
import { retirer } from '@/routes/compte/appareils';

type AppareilCompte = {
    uuid: string;
    libelle: string;
    ajoute_le: string;
    dernier_contact_le: string;
    profils: number;
};

const JOUR = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

function iconeDe(libelle: string): LucideIcon {
    if (libelle.includes('iPad')) {
        return Tablet;
    }

    return /Android|iPhone/.test(libelle) ? Smartphone : Laptop;
}

/**
 * « Mon compte › Appareils » (HORS_LIGNE.md A.7, HL6) : les téléphones et
 * navigateurs où ce compte est gardé. Retirer un appareil y ferme le profil :
 * il faudra le mot de passe pour y revenir.
 */
export default function Appareils({
    appareils,
    autres = 0,
    limite_abonne = null,
}: {
    appareils: AppareilCompte[];
    /** Au-delà des dix plus récents. */
    autres?: number;
    /** Lot 9 (HL-D8) : abonné, nombre d'appareils actifs et limite. */
    limite_abonne?: { actifs: number; limite: number; depasse: boolean } | null;
}) {
    const confirmer = useConfirmer();
    const formule = useFormule();

    const retirerAppareil = async (appareil: AppareilCompte) => {
        const accepte = await confirmer({
            titre: `Retirer « ${appareil.libelle} » ?`,
            message: formule(
                'Ton profil n’y sera plus gardé : il faudra ton mot de passe pour t’y reconnecter. Les réponses pas encore envoyées depuis cet appareil partiront à ta prochaine connexion là-bas.',
                'Votre profil n’y sera plus gardé : il faudra votre mot de passe pour vous y reconnecter.',
            ),
            action: 'Retirer',
        });

        if (accepte) {
            router.delete(retirer(appareil.uuid).url, { preserveScroll: true });
        }
    };

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Appareils" />

            {limite_abonne && (
                <p
                    className={
                        limite_abonne.depasse
                            ? 'rounded-carte border border-indice-400/50 bg-indice-400/15 p-4 text-interface'
                            : 'rounded-carte border bg-card p-4 text-aide text-ink-600 shadow-carte'
                    }
                >
                    {limite_abonne.depasse
                        ? `Ton abonnement vaut pour ${limite_abonne.limite} appareils ; ton compte est ouvert sur ${limite_abonne.actifs}. Retire ceux que tu n’utilises plus pour reprendre tes téléchargements d’abonné.`
                        : `Ton abonnement vaut pour ${limite_abonne.limite} appareils : ${limite_abonne.actifs} en service.`}
                </p>
            )}

            <SectionCompte
                titre={formule(
                    'Où ton compte est gardé',
                    'Où votre compte est gardé',
                )}
                description={formule(
                    'Sur un téléphone partagé, chaque profil a son code à 4 chiffres. Retire un appareil que tu n’utilises plus.',
                    'Les appareils où votre compte est enregistré. Retirez ceux que vous n’utilisez plus.',
                )}
            >
                {appareils.length === 0 ? (
                    <EtatVide
                        illustration={Smartphone}
                        titre="Aucun appareil enregistré"
                        message="Un appareil s’enregistre de lui-même à la première connexion de l’application."
                        action={
                            <Button asChild variant="outline">
                                <a href="/accueil">Retour à l’accueil</a>
                            </Button>
                        }
                    />
                ) : (
                    <ul className="divide-y rounded-controle border">
                        {appareils.map((appareil) => {
                            const Icone = iconeDe(appareil.libelle);

                            return (
                                <li
                                    key={appareil.uuid}
                                    className="flex items-center gap-3 p-4"
                                >
                                    <span
                                        aria-hidden
                                        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600"
                                    >
                                        <Icone className="size-5" />
                                    </span>
                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="truncate font-semibold">
                                            {appareil.libelle}
                                        </span>
                                        <span
                                            className="text-aide text-ink-500"
                                            data-capture="variable"
                                        >
                                            Dernière visite le{' '}
                                            {JOUR.format(
                                                new Date(
                                                    appareil.dernier_contact_le,
                                                ),
                                            )}
                                        </span>
                                        {appareil.profils > 1 && (
                                            <span className="flex items-center gap-1 text-meta text-ink-500">
                                                <Users
                                                    aria-hidden
                                                    className="size-3.5"
                                                />
                                                {pluriel(
                                                    appareil.profils,
                                                    'profil',
                                                )}{' '}
                                                sur cet appareil
                                            </span>
                                        )}
                                    </span>
                                    <Button
                                        variant="outline"
                                        ton="danger"
                                        taille="compacte"
                                        onClick={() =>
                                            void retirerAppareil(appareil)
                                        }
                                    >
                                        Retirer
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {autres > 0 && (
                    <p
                        className="text-aide text-ink-500"
                        data-capture="variable"
                    >
                        {formule(
                            `Et ${pluriel(autres, 'autre appareil')} plus ancien${autres > 1 ? 's' : ''}.`,
                            `Et ${pluriel(autres, 'autre appareil')} plus ancien${autres > 1 ? 's' : ''}.`,
                        )}
                    </p>
                )}
            </SectionCompte>
        </div>
    );
}
