import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, EyeOff, Hash, ShieldCheck, UserRound } from 'lucide-react';
import { FilGroupe } from '@/components/communaute/fil-groupe';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { pluriel } from '@/lib/utils';
import { index as groupesEleve } from '@/routes/eleve/groupes';
import type { PropsFil } from '@/types/communaute';

/**
 * Élève › Mes groupes › Questions du groupe (lot 12, PLAN M13) : demander,
 * répondre, signaler. Signé de son pseudo ; ni photo, ni numéro, ni message
 * privé. En ligne seulement (niveau C).
 */
export default function FilEleve(props: PropsFil) {
    const { groupe, fil, limites } = props;

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
                    <Link href={groupesEleve()} prefetch>
                        <ArrowLeft aria-hidden />
                        Mes groupes
                    </Link>
                </Button>
                <EnteteEcran
                    meta={`${groupe.nom} · avec ${groupe.enseignant}`}
                    titre={
                        <>
                            Les questions <strong>du groupe</strong>
                        </>
                    }
                    chapeau="Demande de l’aide à ta classe, aide les autres. Ton enseignant lit tout."
                />
                {groupe.est_exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <FilGroupe {...props} />

                    <div className="grid content-start gap-5">
                        <Carte aria-labelledby="titre-regles">
                            <TitreCarte id="titre-regles">
                                Les règles du fil
                            </TitreCarte>
                            <ul className="mt-3 grid gap-3 text-aide text-ink-600">
                                <li className="flex gap-2.5">
                                    <UserRound
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Tu signes de ton pseudo. Ton prénom et ton
                                    numéro restent privés.
                                </li>
                                <li className="flex gap-2.5">
                                    <Hash
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Pas de numéro, de lien ni d’adresse : on
                                    reste entre la classe.
                                </li>
                                <li className="flex gap-2.5">
                                    <EyeOff
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Un message méchant ? Signale-le : ton
                                    enseignant décide, et il disparaît s’il le
                                    faut.
                                </li>
                                <li className="flex gap-2.5">
                                    <ShieldCheck
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    {pluriel(limites.par_jour, 'message')} par
                                    jour au plus
                                    {fil.reste_aujourdhui !== null &&
                                        ` : il t’en reste ${fil.reste_aujourdhui}`}
                                    .
                                </li>
                            </ul>
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
