import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Lock, LockOpen, ShieldAlert } from 'lucide-react';
import { FilGroupe } from '@/components/communaute/fil-groupe';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { pluriel } from '@/lib/utils';
import { fermer } from '@/routes/enseignant/fil';
import { show as pageGroupe } from '@/routes/enseignant/groupes';
import type { PropsFil } from '@/types/communaute';

/**
 * Enseignant › un groupe › Questions du groupe (lot 12, PLAN M13) : les
 * messages signalés d'abord, à masquer en un geste (critère du lot) ;
 * répondre à la classe, retirer la parole à un élève, fermer le fil.
 */
export default function FilEnseignant(props: PropsFil) {
    const { groupe, fil } = props;

    return (
        <>
            <Head title={`Questions · ${groupe.nom}`} />
            <div className="grid gap-5 lg:gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={pageGroupe(groupe.id)} prefetch>
                        <ArrowLeft aria-hidden />
                        {groupe.nom}
                    </Link>
                </Button>
                <EnteteEcran
                    meta={`${groupe.nom} · ${groupe.examen}`}
                    titre={
                        <>
                            Les questions <strong>de la classe</strong>
                        </>
                    }
                    chapeau={
                        fil.a_moderer
                            ? `${pluriel(fil.a_moderer, 'message attend', 'messages attendent')} votre décision.`
                            : 'Vos élèves s’entraident ; vous voyez tout, prénom et pseudo.'
                    }
                />
                {groupe.est_exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <FilGroupe {...props} moderateur />

                    <div className="grid content-start gap-5">
                        <Carte aria-labelledby="titre-moderation">
                            <TitreCarte id="titre-moderation">
                                La modération
                            </TitreCarte>
                            <ul className="mt-3 grid gap-2.5 text-aide text-ink-600">
                                <li>
                                    Les numéros, liens, adresses et mots
                                    interdits sont refusés à l’envoi.
                                </li>
                                <li>
                                    Signalé par trois élèves, un message est
                                    masqué en attendant votre décision.
                                </li>
                                <li>
                                    « Masquer » le retire tout de suite ; «
                                    Réafficher » le rend.
                                </li>
                            </ul>
                        </Carte>
                        {!groupe.archive && (
                            <Carte aria-labelledby="titre-fermer">
                                <TitreCarte id="titre-fermer">
                                    {fil.ferme ? 'Fil fermé' : 'Fil ouvert'}
                                </TitreCarte>
                                <p className="mt-2 text-aide text-ink-600">
                                    {fil.ferme
                                        ? 'Les élèves le relisent sans y écrire. Vous seul pouvez publier.'
                                        : 'Pendant un contrôle ou les vacances, fermez-le : il se relit toujours.'}
                                </p>
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    className="mt-3"
                                    onClick={() =>
                                        router.post(
                                            fermer(groupe.id).url,
                                            { ferme: !fil.ferme },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {fil.ferme ? (
                                        <LockOpen aria-hidden />
                                    ) : (
                                        <Lock aria-hidden />
                                    )}
                                    {fil.ferme
                                        ? 'Rouvrir le fil'
                                        : 'Fermer le fil'}
                                </Button>
                            </Carte>
                        )}
                        {fil.a_moderer === 0 && (
                            <p className="flex items-center gap-2 px-1 text-aide text-ink-500">
                                <ShieldAlert aria-hidden className="size-4" />
                                Aucun message signalé en attente.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
