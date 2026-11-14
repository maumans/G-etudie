import { Link, router } from '@inertiajs/react';
import {
    Activity,
    CalendarClock,
    ClipboardList,
    Copy,
    Gauge,
    Plus,
    RefreshCw,
    Target,
    UserMinus,
    UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Carte,
    EnteteEcran,
    Initiale,
    LigneLien,
    ListeNotionsFaibles,
    TitreCarte,
    TuileChiffre,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { ProgressionBarre } from '@/components/ui/progression';
import { depuis, formaterJourCourt } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import {
    create as nouveauDevoir,
    show as pageDevoir,
} from '@/routes/enseignant/devoirs';
import { code as changerCode } from '@/routes/enseignant/groupes';
import { retirer } from '@/routes/enseignant/groupes/eleves';
import type { SuiviGroupe } from '@/types/suivi';

/**
 * Le suivi d'un groupe (lot 11, PLAN M14) : qui travaille, les notions
 * faibles de la classe (critère du lot), qui a rendu quoi. Le même écran
 * sert à l'enseignant (`gerer` : code, devoirs, retirer un élève) et au
 * gestionnaire de l'établissement (lecture seule).
 */
export function VueSuiviGroupe({
    suivi,
    gerer,
    meta,
}: {
    suivi: SuiviGroupe;
    gerer: boolean;
    meta?: string;
}) {
    const { groupe, resume } = suivi;
    const confirmer = useConfirmer();
    const exemple =
        groupe.est_exemple || suivi.devoirs.some((d) => d.est_exemple);

    const retirerEleve = async (eleve: SuiviGroupe['eleves'][number]) => {
        if (
            await confirmer({
                titre: `Retirer ${eleve.prenom} du groupe ?`,
                message:
                    'Ses devoirs ne compteront plus ici et il ne pourra pas revenir seul avec le code.',
                action: 'Retirer',
                ton: 'danger',
            })
        ) {
            router.delete(retirer([groupe.id, eleve.id]).url, {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="grid gap-5 lg:gap-6">
            <EnteteEcran
                meta={
                    meta ??
                    [groupe.examen, groupe.etablissement]
                        .filter(Boolean)
                        .join(' · ')
                }
                titre={
                    <>
                        Groupe <strong>{groupe.nom}</strong>
                    </>
                }
                chapeau={
                    resume.eleves === 0
                        ? 'Personne n’a encore rejoint ce groupe.'
                        : `${pluriel(resume.eleves, 'élève')}, ${pluriel(resume.actifs_semaine, 'actif', 'actifs')} ces sept derniers jours.`
                }
                action={
                    gerer && !groupe.archive ? (
                        <Button asChild>
                            <Link href={nouveauDevoir(groupe.id)} prefetch>
                                <Plus aria-hidden />
                                Donner un devoir
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            {exemple && <BandeauExemple />}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <TuileChiffre
                    icone={UsersRound}
                    libelle="Élèves"
                    valeur={resume.eleves}
                />
                <TuileChiffre
                    icone={Gauge}
                    libelle="Jauge moyenne"
                    valeur={resume.jauge_moyenne}
                    unite="%"
                />
                <TuileChiffre
                    icone={Activity}
                    libelle="Actifs cette semaine"
                    valeur={resume.actifs_semaine}
                    aide={
                        resume.eleves > 0 ? `sur ${resume.eleves}` : undefined
                    }
                />
                <TuileChiffre
                    icone={ClipboardList}
                    libelle="Devoirs ouverts"
                    valeur={resume.devoirs_ouverts}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                <div className="grid content-start gap-5 lg:gap-6">
                    <Carte aria-labelledby="titre-notions">
                        <TitreCarte id="titre-notions">
                            Notions à retravailler en classe
                        </TitreCarte>
                        <p className="mt-1 text-aide text-ink-500">
                            Maîtrise moyenne des élèves qui les ont travaillées,
                            la plus faible d’abord.
                        </p>
                        {suivi.notions_faibles.length === 0 ? (
                            <div className="mt-4 flex items-start gap-3 rounded-controle bg-craie-100 p-4 text-aide text-ink-600 dark:bg-relief/60">
                                <Target
                                    aria-hidden
                                    className="mt-0.5 size-5 shrink-0 text-ink-500"
                                />
                                <p>
                                    {resume.eleves === 0
                                        ? 'Elles apparaîtront dès que vos élèves auront répondu à leurs premières questions.'
                                        : 'Aucune notion faible pour l’instant : vos élèves maîtrisent ce qu’ils ont travaillé, ou n’ont pas encore assez répondu.'}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3">
                                <ListeNotionsFaibles
                                    notions={suivi.notions_faibles}
                                    total={resume.eleves}
                                />
                            </div>
                        )}
                    </Carte>

                    <Carte aria-labelledby="titre-eleves">
                        <TitreCarte id="titre-eleves">
                            Les élèves du groupe
                        </TitreCarte>
                        {suivi.eleves.length === 0 ? (
                            <div className="mt-4">
                                <EtatVide
                                    illustration={UsersRound}
                                    titre="Aucun élève pour l’instant"
                                    message={`Donnez le code ${groupe.code} à vos élèves : ils le saisissent dans « Mes groupes ».`}
                                    action={<CopierCode code={groupe.code} />}
                                />
                            </div>
                        ) : (
                            <ul className="mt-2 divide-y">
                                {suivi.eleves.map((eleve) => (
                                    <li
                                        key={eleve.id}
                                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_9rem_auto]"
                                    >
                                        <Initiale prenom={eleve.prenom} />
                                        <div className="grid min-w-0 gap-0.5">
                                            <p className="flex min-w-0 items-center gap-2">
                                                <span className="truncate font-semibold">
                                                    {eleve.prenom}
                                                </span>
                                                {!eleve.actif_semaine && (
                                                    <Badge variant="indice">
                                                        Inactif
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-aide text-ink-500 sm:truncate">
                                                {eleve.pseudo}
                                                <br className="sm:hidden" />
                                                <span className="max-sm:hidden">
                                                    {' '}
                                                    ·{' '}
                                                </span>
                                                {eleve.derniere_activite
                                                    ? `actif ${depuis(eleve.derniere_activite)}`
                                                    : 'jamais actif'}{' '}
                                                ·{' '}
                                                {pluriel(
                                                    eleve.devoirs_rendus,
                                                    'devoir rendu',
                                                    'devoirs rendus',
                                                )}
                                            </p>
                                        </div>
                                        <div className="col-span-3 col-start-2 grid gap-1 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                                            <p className="flex items-baseline justify-between text-meta text-ink-500">
                                                Jauge
                                                <span className="text-interface font-bold text-ink-900 font-data">
                                                    {eleve.jauge} %
                                                </span>
                                            </p>
                                            <ProgressionBarre
                                                valeur={eleve.jauge}
                                                libelle={`Jauge de ${eleve.prenom} : ${eleve.jauge} %`}
                                            />
                                        </div>
                                        {gerer ? (
                                            <Button
                                                variant="ghost"
                                                taille="icone-compacte"
                                                aria-label={`Retirer ${eleve.prenom} du groupe`}
                                                className="col-start-3 row-start-1 sm:col-start-4"
                                                onClick={() =>
                                                    void retirerEleve(eleve)
                                                }
                                            >
                                                <UserMinus aria-hidden />
                                            </Button>
                                        ) : (
                                            <span className="hidden sm:block" />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Carte>
                </div>

                <div className="grid content-start gap-5 lg:gap-6">
                    <section className="relative isolate grid gap-4 overflow-hidden rounded-carte surface-encre p-5 text-white shadow-releve">
                        <span
                            aria-hidden
                            className="absolute -right-12 -bottom-12 -z-10 size-40 rounded-full border-[26px] border-white/[0.07]"
                        />
                        <div className="grid gap-1">
                            <h2 className="text-[0.9375rem] font-semibold">
                                Code du groupe
                            </h2>
                            <p className="text-aide text-white/70">
                                {groupe.archive
                                    ? 'Groupe archivé : le code ne marche plus.'
                                    : 'À annoncer en classe ; l’élève le saisit dans « Mes groupes ».'}
                            </p>
                        </div>
                        <p
                            className={cn(
                                'text-[2.25rem] leading-none font-bold tracking-[0.18em] font-data',
                                groupe.archive && 'line-through opacity-60',
                            )}
                            data-capture="variable"
                        >
                            {groupe.code}
                        </p>
                        {gerer && !groupe.archive && (
                            <div className="flex flex-wrap gap-2">
                                <CopierCode code={groupe.code} sombre />
                                <Button
                                    variant="ghost"
                                    taille="compacte"
                                    className="text-white/80 hover:bg-white/10 hover:text-white"
                                    onClick={() =>
                                        router.post(
                                            changerCode(groupe.id).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RefreshCw aria-hidden />
                                    Nouveau code
                                </Button>
                            </div>
                        )}
                    </section>

                    <Carte aria-labelledby="titre-devoirs">
                        <TitreCarte id="titre-devoirs">Devoirs</TitreCarte>
                        {suivi.devoirs.length === 0 ? (
                            <p className="mt-3 text-aide text-ink-600">
                                {gerer
                                    ? 'Aucun devoir encore. Choisissez quelques questions du programme et une échéance.'
                                    : 'Aucun devoir donné dans ce groupe.'}
                            </p>
                        ) : (
                            <ul className="mt-1">
                                {suivi.devoirs.map((devoir) => {
                                    const contenu = {
                                        tuile: (
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                                                    devoir.echu
                                                        ? 'bg-craie-100 text-ink-600 dark:bg-relief'
                                                        : 'bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300',
                                                )}
                                            >
                                                <CalendarClock className="size-5" />
                                            </span>
                                        ),
                                        titre: devoir.titre,
                                        sousTitre: `${devoir.echu ? 'Échu le' : 'Pour le'} ${formaterJourCourt(devoir.echeance_le)} · ${devoir.rendus}/${resume.eleves} rendus`,
                                    };

                                    return gerer ? (
                                        <LigneLien
                                            key={devoir.id}
                                            href={pageDevoir(devoir.id).url}
                                            {...contenu}
                                        />
                                    ) : (
                                        <li
                                            key={devoir.id}
                                            className="flex items-center gap-3 py-3"
                                        >
                                            {contenu.tuile}
                                            <span className="grid min-w-0 flex-1 gap-0.5">
                                                <span className="truncate font-semibold">
                                                    {contenu.titre}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {contenu.sousTitre}
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Carte>
                </div>
            </div>
        </div>
    );
}

export function CopierCode({
    code,
    sombre = false,
}: {
    code: string;
    sombre?: boolean;
}) {
    return (
        <Button
            variant={sombre ? 'default' : 'outline'}
            taille="compacte"
            onClick={() => {
                void navigator.clipboard
                    ?.writeText(code)
                    .then(() => toast.success(`Code ${code} copié.`))
                    .catch(() => toast.info(`Le code est ${code}.`));
            }}
        >
            <Copy aria-hidden />
            Copier le code
        </Button>
    );
}
