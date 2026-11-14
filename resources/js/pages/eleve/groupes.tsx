import { Form, Head, Link, router } from '@inertiajs/react';
import {
    CalendarClock,
    CircleCheck,
    LogOut,
    Play,
    UsersRound,
} from 'lucide-react';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { echeanceRelative, formaterJour } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import { show as pageSeance } from '@/routes/eleve/seances';
import { commencer } from '@/routes/eleve/devoirs';
import { quitter, rejoindre } from '@/routes/eleve/groupes';
import type { EtatDevoir } from '@/types/suivi';

type Props = {
    groupes: {
        id: number;
        nom: string;
        enseignant: string;
        etablissement: string | null;
        examen: string;
        archive: boolean;
        est_exemple: boolean;
    }[];
    devoirs: (EtatDevoir & {
        id: number;
        groupe_id: number;
        titre: string;
        consigne: string | null;
        echeance_le: string;
        questions: number;
        seance: string | null;
        est_exemple: boolean;
    })[];
    aujourdhui: string;
};

/**
 * « Mes groupes » (lot 11) : les devoirs de mes enseignants, à faire en
 * premier ; rejoindre un groupe par son code. En ligne seulement ; un
 * devoir commencé se finit comme une séance, même hors connexion.
 */
export default function MesGroupes({ groupes, devoirs, aujourdhui }: Props) {
    const confirmer = useConfirmer();
    const aFaire = devoirs.filter((d) => d.etat !== 'rendu');
    const rendus = devoirs.filter((d) => d.etat === 'rendu');
    const nomGroupe = new Map(groupes.map((g) => [g.id, g.nom]));

    return (
        <>
            <Head title="Mes groupes" />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta="Mes groupes"
                    titre={
                        aFaire.length > 0 ? (
                            <>
                                {pluriel(aFaire.length, 'devoir')}{' '}
                                <strong>à faire</strong>
                            </>
                        ) : (
                            <>
                                Tes <strong>devoirs</strong>
                            </>
                        )
                    }
                    chapeau={
                        groupes.length === 0
                            ? 'Ton enseignant t’a donné un code ? Saisis-le ici : tu verras les devoirs de ta classe.'
                            : aFaire.length === 0
                              ? 'Rien à rendre pour l’instant. Ta séance du jour t’attend sur l’accueil.'
                              : 'Un devoir se fait comme une séance : tu peux le commencer maintenant et le finir plus tard.'
                    }
                />
                {(groupes.some((g) => g.est_exemple) ||
                    devoirs.some((d) => d.est_exemple)) && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <div className="grid content-start gap-4">
                        {aFaire.map((devoir, rang) => (
                            <section
                                key={devoir.id}
                                className={cn(
                                    'grid gap-4 rounded-carte p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
                                    rang === 0
                                        ? 'relative isolate overflow-hidden surface-marque text-white shadow-releve'
                                        : 'border bg-card shadow-carte',
                                )}
                            >
                                {rang === 0 && (
                                    <span
                                        aria-hidden
                                        className="absolute -top-10 -right-10 -z-10 size-36 rounded-full border-[24px] border-white/10"
                                    />
                                )}
                                <div className="grid min-w-0 gap-1.5">
                                    <p
                                        className={cn(
                                            'flex flex-wrap items-center gap-x-3 gap-y-1 text-aide font-medium',
                                            rang === 0
                                                ? 'text-white/85'
                                                : 'text-ink-500',
                                        )}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <CalendarClock
                                                aria-hidden
                                                className="size-3.5"
                                            />
                                            {devoir.en_retard
                                                ? 'Échu'
                                                : 'À rendre'}{' '}
                                            {echeanceRelative(
                                                devoir.echeance_le,
                                                aujourdhui,
                                            )}
                                        </span>
                                        <span>
                                            {nomGroupe.get(devoir.groupe_id)}
                                        </span>
                                    </p>
                                    <h2
                                        className={cn(
                                            'font-semibold',
                                            rang === 0
                                                ? 'text-[1.375rem] leading-tight'
                                                : 'text-titre-carte',
                                        )}
                                    >
                                        {devoir.titre}
                                    </h2>
                                    {devoir.consigne && (
                                        <p
                                            className={cn(
                                                'text-aide',
                                                rang === 0
                                                    ? 'text-white/85'
                                                    : 'text-ink-600',
                                            )}
                                        >
                                            {devoir.consigne}
                                        </p>
                                    )}
                                    <p
                                        className={cn(
                                            'text-meta',
                                            rang === 0
                                                ? 'text-white/75'
                                                : 'text-ink-500',
                                        )}
                                    >
                                        {devoir.etat === 'en_cours'
                                            ? `${devoir.reponses}/${devoir.questions} réponses`
                                            : pluriel(
                                                  devoir.questions,
                                                  'question',
                                              )}
                                        {devoir.en_retard &&
                                            ' · tu peux encore le rendre'}
                                    </p>
                                </div>
                                {devoir.seance ? (
                                    <Button
                                        asChild
                                        className={
                                            rang === 0
                                                ? 'w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit'
                                                : 'w-full sm:w-fit'
                                        }
                                        variant={
                                            rang === 0 ? 'default' : 'outline'
                                        }
                                    >
                                        <Link href={pageSeance(devoir.seance)}>
                                            <Play
                                                aria-hidden
                                                className="fill-current"
                                            />
                                            Reprendre
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        className={
                                            rang === 0
                                                ? 'w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit'
                                                : 'w-full sm:w-fit'
                                        }
                                        variant={
                                            rang === 0 ? 'default' : 'outline'
                                        }
                                        onClick={() =>
                                            router.post(
                                                commencer(devoir.id).url,
                                            )
                                        }
                                    >
                                        <Play
                                            aria-hidden
                                            className="fill-current"
                                        />
                                        Commencer
                                    </Button>
                                )}
                            </section>
                        ))}

                        {rendus.length > 0 && (
                            <Carte aria-labelledby="titre-rendus">
                                <TitreCarte id="titre-rendus">
                                    Déjà rendus
                                </TitreCarte>
                                <ul className="mt-2 divide-y">
                                    {rendus.map((devoir) => (
                                        <li
                                            key={devoir.id}
                                            className="flex items-center gap-3 py-3 last:pb-0"
                                        >
                                            <span
                                                aria-hidden
                                                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400"
                                            >
                                                <CircleCheck className="size-5" />
                                            </span>
                                            <span className="grid min-w-0 flex-1 gap-0.5">
                                                <span className="truncate font-semibold">
                                                    {devoir.titre}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {nomGroupe.get(
                                                        devoir.groupe_id,
                                                    )}
                                                    {devoir.rendu_le &&
                                                        ` · rendu le ${formaterJour(devoir.rendu_le)}`}
                                                </span>
                                            </span>
                                            {devoir.score !== null && (
                                                <span className="font-bold font-data">
                                                    {devoir.score} %
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Carte>
                        )}

                        {devoirs.length === 0 && groupes.length > 0 && (
                            <Carte>
                                <p className="flex items-start gap-3 text-ink-600">
                                    <CalendarClock
                                        aria-hidden
                                        className="mt-0.5 size-5 shrink-0 text-ink-500"
                                    />
                                    Pas encore de devoir dans tes groupes. Ils
                                    apparaîtront ici dès que ton enseignant en
                                    donnera un.
                                </p>
                            </Carte>
                        )}
                    </div>

                    <div className="grid content-start gap-5">
                        <Carte aria-labelledby="titre-rejoindre">
                            <TitreCarte id="titre-rejoindre">
                                Rejoindre un groupe
                            </TitreCarte>
                            <Form
                                {...rejoindre.form()}
                                resetOnSuccess
                                className="mt-3 grid gap-3"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <Champ
                                            libelle="Code donné par ton enseignant"
                                            erreur={errors.code}
                                        >
                                            {(attributs) => (
                                                <Input
                                                    {...attributs}
                                                    name="code"
                                                    required
                                                    maxLength={16}
                                                    autoComplete="off"
                                                    autoCapitalize="characters"
                                                    placeholder="K7QF4M"
                                                    className="tracking-[0.2em] uppercase font-data"
                                                />
                                            )}
                                        </Champ>
                                        <Button
                                            type="submit"
                                            variant={
                                                groupes.length === 0
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Rejoindre
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </Carte>

                        {groupes.length > 0 && (
                            <Carte aria-labelledby="titre-groupes">
                                <TitreCarte id="titre-groupes">
                                    Mes groupes
                                </TitreCarte>
                                <ul className="mt-1 divide-y">
                                    {groupes.map((groupe) => (
                                        <li
                                            key={groupe.id}
                                            className="flex items-center gap-3 py-2.5"
                                        >
                                            <span
                                                aria-hidden
                                                className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                            >
                                                <UsersRound className="size-[1.125rem]" />
                                            </span>
                                            <span className="grid min-w-0 flex-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate font-semibold">
                                                        {groupe.nom}
                                                    </span>
                                                    {groupe.archive && (
                                                        <Badge>Archivé</Badge>
                                                    )}
                                                </span>
                                                <span className="truncate text-meta text-ink-500">
                                                    {groupe.enseignant}
                                                    {groupe.etablissement &&
                                                        ` · ${groupe.etablissement}`}
                                                </span>
                                            </span>
                                            <Button
                                                variant="ghost"
                                                taille="icone-compacte"
                                                aria-label={`Quitter le groupe ${groupe.nom}`}
                                                onClick={async () => {
                                                    if (
                                                        await confirmer({
                                                            titre: `Quitter « ${groupe.nom} » ?`,
                                                            message:
                                                                'Tu ne verras plus ses devoirs. Tu pourras le rejoindre de nouveau avec son code.',
                                                            action: 'Quitter',
                                                        })
                                                    ) {
                                                        router.delete(
                                                            quitter(groupe.id)
                                                                .url,
                                                        );
                                                    }
                                                }}
                                            >
                                                <LogOut aria-hidden />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 border-t pt-3 text-meta text-ink-500">
                                    Ton enseignant voit ta jauge et tes devoirs,
                                    jamais tes échanges avec le tuteur. Les
                                    autres élèves ne te voient pas.
                                </p>
                            </Carte>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
