import { Form, Head, Link, router } from '@inertiajs/react';
import {
    CalendarClock,
    CircleCheck,
    LogOut,
    MessagesSquare,
    Play,
    Trophy,
    UsersRound,
} from 'lucide-react';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { echeanceRelative, formaterJour } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import { show as pageSeance } from '@/routes/eleve/seances';
import { commencer } from '@/routes/eleve/devoirs';
import { show as pageFil } from '@/routes/eleve/fil';
import { classement, quitter, rejoindre } from '@/routes/eleve/groupes';
import type { EtatDevoir } from '@/types/suivi';

type Classement = {
    classes: {
        rang: number;
        pseudo: string;
        score: number;
        est_moi: boolean;
    }[];
    autres_rendus: number;
    rendus: number;
    j_accepte: boolean | null;
};

type Props = {
    groupes: {
        id: number;
        nom: string;
        enseignant: string;
        etablissement: string | null;
        examen: string;
        archive: boolean;
        est_exemple: boolean;
        /** Lot 12. */
        classement_accepte: boolean;
        questions_fil: number;
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
        /** Lot 12 : un défi du groupe, et son classement (opt-in). */
        defi?: boolean;
        classement?: Classement | null;
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
                                        {devoir.defi && (
                                            <span className="flex items-center gap-1 font-semibold">
                                                <Trophy
                                                    aria-hidden
                                                    className="size-3.5"
                                                />
                                                Défi du groupe
                                            </span>
                                        )}
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

                        {devoirs
                            .filter(
                                (d) =>
                                    d.defi &&
                                    d.classement &&
                                    d.classement.rendus > 0,
                            )
                            .map((d) => (
                                <ClassementDefi
                                    key={d.id}
                                    titre={d.titre}
                                    groupe={nomGroupe.get(d.groupe_id) ?? ''}
                                    classement={d.classement as Classement}
                                />
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
                                <ul className="mt-1 grid gap-2 border-t pt-3">
                                    {groupes
                                        .filter(
                                            (g) =>
                                                !g.archive ||
                                                g.questions_fil > 0,
                                        )
                                        .map((groupe) => (
                                            <li
                                                key={groupe.id}
                                                className="grid gap-2"
                                            >
                                                <Link
                                                    href={pageFil(groupe.id)}
                                                    prefetch
                                                    className="flex items-center gap-2 rounded-controle text-aide font-medium text-nimba-700 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-nimba-300"
                                                >
                                                    <MessagesSquare
                                                        aria-hidden
                                                        className="size-4"
                                                    />
                                                    Questions du groupe{' '}
                                                    {groupe.nom}
                                                    {groupe.questions_fil > 0 &&
                                                        ` (${groupe.questions_fil})`}
                                                </Link>
                                                {!groupe.archive && (
                                                    <label className="flex items-start gap-2 text-aide text-ink-600">
                                                        <Checkbox
                                                            checked={
                                                                groupe.classement_accepte
                                                            }
                                                            onCheckedChange={(
                                                                coche,
                                                            ) =>
                                                                router.post(
                                                                    classement(
                                                                        groupe.id,
                                                                    ).url,
                                                                    {
                                                                        accepte:
                                                                            coche ===
                                                                            true,
                                                                    },
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                            className="mt-0.5"
                                                        />
                                                        Paraître (par mon
                                                        pseudo) au classement
                                                        des défis de{' '}
                                                        {groupe.nom}
                                                    </label>
                                                )}
                                            </li>
                                        ))}
                                </ul>
                                <p className="mt-2 border-t pt-3 text-meta text-ink-500">
                                    Ton enseignant voit ta jauge et tes devoirs,
                                    jamais tes échanges avec le tuteur. Les
                                    autres élèves ne voient que ton pseudo, dans
                                    le fil et au classement si tu l’acceptes.
                                </p>
                            </Carte>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Lot 12 : le classement d'un défi du groupe. Seuls les élèves qui l'ont
 * accepté y paraissent, par leur pseudo ; les autres sont comptés.
 */
function ClassementDefi({
    titre,
    groupe,
    classement,
}: {
    titre: string;
    groupe: string;
    classement: Classement;
}) {
    return (
        <Carte aria-label={`Classement : ${titre}`}>
            <TitreCarte>
                <span className="flex items-center gap-2">
                    <Trophy
                        aria-hidden
                        className="size-[18px] text-soleil-600 dark:text-soleil-400"
                    />
                    {titre}
                </span>
            </TitreCarte>
            <p className="mt-1 text-aide text-ink-500">
                {groupe} ·{' '}
                {pluriel(
                    classement.rendus,
                    'élève a relevé',
                    'élèves ont relevé',
                )}{' '}
                le défi
            </p>
            {classement.classes.length > 0 ? (
                <ol className="mt-3 divide-y">
                    {classement.classes.map((ligne) => (
                        <li
                            key={ligne.rang}
                            className={cn(
                                'flex items-center gap-3 py-2.5',
                                ligne.est_moi && 'font-semibold',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-full text-meta font-semibold font-data',
                                    ligne.rang === 1
                                        ? 'bg-soleil-400 text-soleil-900'
                                        : 'bg-craie-100 text-ink-600 dark:bg-relief',
                                )}
                            >
                                {ligne.rang}
                            </span>
                            <span className="flex-1 truncate">
                                {ligne.pseudo}
                                {ligne.est_moi && ' (toi)'}
                            </span>
                            <span className="font-bold font-data">
                                {ligne.score} %
                            </span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-3 text-aide text-ink-600">
                    Personne n’a encore accepté le classement.
                </p>
            )}
            {classement.autres_rendus > 0 && (
                <p className="mt-2 border-t pt-2.5 text-meta text-ink-500">
                    Et{' '}
                    {pluriel(
                        classement.autres_rendus,
                        'autre élève',
                        'autres élèves',
                    )}{' '}
                    sans classement.
                    {classement.j_accepte === false &&
                        ' Pour y paraître, coche la case sous « Mes groupes ».'}
                </p>
            )}
        </Carte>
    );
}
