import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Flame,
    Timer,
    TrendingDown,
    TrendingUp,
    UserX,
    WalletCards,
} from 'lucide-react';
import { JaugePreparation } from '@/components/jauge-preparation';
import {
    Carte,
    EnteteEcran,
    TitreCarte,
    TuileMatiere,
} from '@/components/suivi/elements';
import { SemaineRevision } from '@/components/suivi/semaine';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { ProgressionSegments } from '@/components/ui/progression';
import { formaterJour } from '@/lib/dates';
import { MATIERES } from '@/lib/matieres';
import { pluriel } from '@/lib/utils';
import { accueil } from '@/routes/parent';
import { abonnement, delier } from '@/routes/parent/enfants';
import type { SuiviEnfant } from '@/types/suivi';

/**
 * Espace parent › un enfant (lot 11, PLAN M15) : en lecture seule — temps
 * de révision, jauge, matières, derniers examens blancs ; l'abonnement, que
 * le parent peut payer.
 */
export default function EnfantParent({ suivi }: { suivi: SuiviEnfant }) {
    const confirmer = useConfirmer();
    const { eleve } = suivi;
    const ecart = suivi.minutes_semaine - suivi.minutes_semaine_precedente;
    const exemple =
        suivi.examens_blancs.some((x) => x.est_exemple) ||
        suivi.abonnement.est_exemple;

    return (
        <>
            <Head title={eleve.prenom} />
            <div className="grid gap-5 lg:gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={accueil()} prefetch>
                        <ArrowLeft aria-hidden />
                        Mes enfants
                    </Link>
                </Button>
                <EnteteEcran
                    meta={suivi.examen ?? 'Examen pas encore choisi'}
                    titre={
                        <>
                            La semaine de <strong>{eleve.prenom}</strong>
                        </>
                    }
                    chapeau={
                        suivi.minutes_semaine === 0
                            ? `${eleve.prenom} n’a pas révisé ces sept derniers jours. Un mot d’encouragement ce soir ?`
                            : `${suivi.minutes_semaine} minutes de révision en sept jours${suivi.objectif_minutes ? `, pour un objectif de ${suivi.objectif_minutes} minutes par soir` : ''}.`
                    }
                />
                {exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <div className="grid content-start gap-5 lg:gap-6">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-6">
                            <Carte
                                aria-labelledby="titre-temps"
                                className="grid content-between gap-4"
                            >
                                <TitreCarte id="titre-temps">
                                    Temps de révision
                                </TitreCarte>
                                <SemaineRevision
                                    semaine={suivi.semaine}
                                    objectif={suivi.objectif_minutes}
                                />
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-aide text-ink-600">
                                    <span className="flex items-center gap-1.5">
                                        <Timer
                                            aria-hidden
                                            className="size-4 text-nimba-600 dark:text-nimba-300"
                                        />
                                        <span className="font-semibold text-ink-900 font-data">
                                            {suivi.minutes_semaine} min
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        {ecart >= 0 ? (
                                            <TrendingUp
                                                aria-hidden
                                                className="size-4 text-juste-600 dark:text-juste-400"
                                            />
                                        ) : (
                                            <TrendingDown
                                                aria-hidden
                                                className="size-4 text-faux-600 dark:text-faux-400"
                                            />
                                        )}
                                        {ecart === 0
                                            ? 'comme la semaine d’avant'
                                            : `${ecart > 0 ? '+' : '−'}${Math.abs(ecart)} min sur la semaine d’avant`}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Flame
                                            aria-hidden
                                            className="size-4 text-nimba-600 dark:text-nimba-300"
                                        />
                                        {pluriel(suivi.serie, 'jour')} de suite
                                    </span>
                                </div>
                            </Carte>
                            <Carte
                                aria-labelledby="titre-jauge"
                                className="grid content-between gap-3"
                            >
                                <TitreCarte id="titre-jauge">
                                    Préparation à l’examen
                                </TitreCarte>
                                {suivi.jauge ? (
                                    <JaugePreparation
                                        pourcentage={suivi.jauge.pourcentage}
                                        examen={suivi.examen ?? 'examen'}
                                        segments={suivi.jauge.matieres}
                                    />
                                ) : (
                                    <p className="text-aide text-ink-600">
                                        {eleve.prenom} n’a pas encore choisi son
                                        examen.
                                    </p>
                                )}
                                <p className="text-center text-meta text-ink-500">
                                    Elle monte à chaque notion réussie, sans
                                    jamais flatter.
                                </p>
                            </Carte>
                        </div>

                        {suivi.matieres.length > 0 && (
                            <Carte aria-labelledby="titre-matieres">
                                <TitreCarte id="titre-matieres">
                                    Par matière
                                </TitreCarte>
                                <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                                    {suivi.matieres.map((matiere) => (
                                        <li
                                            key={matiere.cle}
                                            className="flex items-center gap-3 border-b py-3 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                                        >
                                            <TuileMatiere
                                                cle={matiere.cle}
                                                taille="petite"
                                            />
                                            <span className="grid min-w-0 flex-1 gap-1.5">
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span className="truncate font-semibold">
                                                        {matiere.nom}
                                                    </span>
                                                    <span className="font-bold font-data">
                                                        {matiere.maitrise} %
                                                    </span>
                                                </span>
                                                <ProgressionSegments
                                                    valeur={matiere.maitrise}
                                                    libelle={`${matiere.nom} : ${matiere.maitrise} %`}
                                                    couleur={
                                                        MATIERES[matiere.cle]
                                                            .plein
                                                    }
                                                    segments={12}
                                                />
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Carte>
                        )}

                        <Carte aria-labelledby="titre-examens">
                            <TitreCarte id="titre-examens">
                                Derniers examens blancs
                            </TitreCarte>
                            {suivi.examens_blancs.length === 0 ? (
                                <p className="mt-3 text-aide text-ink-600">
                                    Pas encore d’examen blanc : il s’en passe un
                                    dans « Examens blancs », en conditions
                                    réelles.
                                </p>
                            ) : (
                                <ul className="mt-2 divide-y">
                                    {suivi.examens_blancs.map((examen) => (
                                        <li
                                            key={examen.uuid}
                                            className="flex items-center gap-3 py-3 last:pb-0"
                                        >
                                            <TuileMatiere
                                                cle={examen.matiere.cle}
                                            />
                                            <span className="grid min-w-0 flex-1 gap-0.5">
                                                <span className="truncate font-semibold">
                                                    {examen.titre}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {examen.session} ·{' '}
                                                    {formaterJour(
                                                        examen.termine_le,
                                                    )}
                                                </span>
                                            </span>
                                            <span className="text-right">
                                                <span className="text-[1.25rem] font-bold font-data">
                                                    {examen.note.toLocaleString(
                                                        'fr-FR',
                                                    )}
                                                </span>
                                                <span className="text-aide font-semibold text-ink-500">
                                                    /20
                                                </span>
                                            </span>
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
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                                    <WalletCards
                                        aria-hidden
                                        className="size-4"
                                    />
                                    Abonnement
                                </h2>
                                <span className="inline-flex h-5 items-center rounded-badge bg-white/15 px-2 text-meta font-medium text-white">
                                    {suivi.abonnement.abonne
                                        ? 'Actif'
                                        : 'Gratuit'}
                                </span>
                            </div>
                            <p className="text-white/80">
                                {suivi.abonnement.abonne && suivi.abonnement.fin
                                    ? `${suivi.abonnement.formule ?? 'Abonnement'} jusqu’au ${formaterJour(suivi.abonnement.fin)}.`
                                    : 'Avec l’abonnement : tous les corrigés détaillés, les examens blancs sans limite, les matières hors connexion et le tuteur.'}
                            </p>
                            <Button
                                asChild
                                className="w-full sm:w-fit lg:w-full"
                            >
                                <Link href={abonnement(eleve.id)} prefetch>
                                    {suivi.abonnement.abonne
                                        ? 'Prolonger son abonnement'
                                        : 'Payer son abonnement'}
                                </Link>
                            </Button>
                        </section>

                        <Carte className="grid gap-3">
                            <TitreCarte>Ce que vous voyez</TitreCarte>
                            <p className="text-aide text-ink-600">
                                Son temps, sa préparation et ses notes. Pas ses
                                réponses une à une, ni ses échanges avec le
                                tuteur : {eleve.prenom} garde son espace.
                            </p>
                            <Button
                                variant="ghost"
                                taille="compacte"
                                className="w-fit"
                                onClick={async () => {
                                    if (
                                        await confirmer({
                                            titre: `Ne plus suivre ${eleve.prenom} ?`,
                                            message:
                                                'Pour le suivre de nouveau, il vous faudra un nouveau code de sa part.',
                                            action: 'Ne plus suivre',
                                            ton: 'danger',
                                        })
                                    ) {
                                        router.delete(delier(eleve.id).url);
                                    }
                                }}
                            >
                                <UserX aria-hidden />
                                Ne plus suivre
                            </Button>
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
