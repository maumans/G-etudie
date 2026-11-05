import { Head, Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    CloudUpload,
    FileText,
    Timer,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ProgressionBarre } from '@/components/ui/progression';
import { formaterDuree } from '@/lib/contenu/sujets';
import { formaterNote } from '@/lib/examen-blanc/note';
import { formaterRestant, tempsRestantMs } from '@/lib/examen-blanc/passage';
import type { ExamenLocal } from '@/lib/examen-blanc/passage';
import { formaterJour } from '@/lib/dates';
import { base, useHorsLigne } from '@/lib/hors-ligne';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { index as annales, show as annale } from '@/routes/eleve/annales';
import { show } from '@/routes/eleve/examens-blancs';

type Matiere = { cle: CleMatiere; nom: string };

type ExamenResume = {
    uuid: string;
    note: number;
    termine_le: string;
    duree_minutes: number;
    minutes_passees: number;
    temps_ecoule: boolean;
    horloge_suspecte: boolean;
    est_exemple: boolean;
    sujet: {
        uuid: string;
        titre: string;
        libelle_session: string;
        matiere: Matiere;
    };
};

/** Un examen terminé sur ce téléphone, dont la note attend l'envoi. */
type EnAttente = {
    uuid: string;
    note: number;
    termine_le: string;
    matiere: Matiere;
    libelle_session: string;
};

/**
 * « Mes examens blancs » (PLAN M7) : ce qui est en cours ou attend l'envoi
 * sur ce téléphone (lu dans Dexie), puis les résultats du serveur, du plus
 * récent au plus ancien, chacun comparé à la moyenne d'admission si
 * l'équipe l'a saisie.
 */
export default function ExamensBlancs({
    examen,
    moyenne_admission,
    examens,
    annales_disponibles,
}: {
    examen: string;
    moyenne_admission: number | null;
    examens: ExamenResume[];
    annales_disponibles: number;
}) {
    const { auth } = usePage().props;
    const { enAttente: nombreEnAttente } = useHorsLigne();
    const [enCours, setEnCours] = useState<ExamenLocal[]>([]);
    const [enAttente, setEnAttente] = useState<EnAttente[]>([]);

    useEffect(() => {
        let actif = true;
        const auteur = auth.user?.id ?? 0;

        void Promise.all([
            base.examens_blancs.where('auteur_id').equals(auteur).toArray(),
            base.operations
                .where('auteur_id')
                .equals(auteur)
                .filter((o) => o.type === 'examen_blanc.terminer')
                .toArray(),
        ])
            .then(([locaux, operations]) => {
                if (!actif) {
                    return;
                }

                setEnCours(locaux as unknown as ExamenLocal[]);
                setEnAttente(
                    operations.map((o) => {
                        const affichage = o.charge.affichage as {
                            matiere: Matiere;
                            libelle_session: string;
                        };

                        return {
                            uuid: o.uuid,
                            note: Number(o.charge.note_appareil ?? 0),
                            termine_le: String(o.charge.termine_le),
                            matiere: affichage.matiere,
                            libelle_session: affichage.libelle_session,
                        };
                    }),
                );
            })
            .catch(() => undefined);

        return () => {
            actif = false;
        };
    }, [auth.user?.id, nombreEnAttente]);

    const recus = new Set(examens.map((e) => e.uuid));
    const attente = enAttente.filter((e) => !recus.has(e.uuid));
    const moyenne =
        examens.length === 0
            ? null
            : examens.reduce((t, e) => t + e.note, 0) / examens.length;
    const meilleure = examens.reduce<number | null>(
        (m, e) => (m === null || e.note > m ? e.note : m),
        null,
    );

    return (
        <>
            <Head title="Examens blancs" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {examen}
                    </p>
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Mes <strong>examens blancs</strong>
                    </h1>
                    <p className="max-w-xl text-ink-600">
                        Un vrai sujet, sa vraie durée, sans aide : ta note sur
                        20, partie par partie, et le corrigé à la fin.
                    </p>
                </header>

                {examens.some((e) => e.est_exemple) && <BandeauExemple />}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-4">
                        {enCours.map((e) => (
                            <Link
                                key={e.id}
                                href={annale(e.sujet, {
                                    query: { mode: 'examen' },
                                })}
                                className="flex items-center gap-3 rounded-carte border border-nimba-500/40 bg-card p-4 shadow-carte outline-none hover:border-nimba-500 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                <span
                                    aria-hidden
                                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                >
                                    <Timer className="size-5" />
                                </span>
                                <span className="grid flex-1 gap-0.5">
                                    <span className="font-semibold">
                                        Un examen est en cours
                                    </span>
                                    <span
                                        className="text-aide text-ink-600"
                                        data-capture="variable"
                                    >
                                        {tempsRestantMs(e, Date.now()) > 0
                                            ? `Il reste ${formaterRestant(tempsRestantMs(e, Date.now()))}. Reprends-le.`
                                            : 'Temps écoulé : termine-le pour voir ta note.'}
                                    </span>
                                </span>
                                <ChevronRight
                                    aria-hidden
                                    className="size-4 shrink-0 text-ink-400"
                                />
                            </Link>
                        ))}

                        {examens.length === 0 && attente.length === 0 ? (
                            <EtatVide
                                illustration={FileText}
                                titre="Pas encore d’examen blanc"
                                message={
                                    annales_disponibles > 0
                                        ? 'Choisis une annale, puis « Conditions réelles » : le temps du vrai examen, sans aide.'
                                        : 'Les annales de ton examen arrivent ; l’examen blanc se passe sur elles.'
                                }
                                action={
                                    <Button asChild>
                                        <Link href={annales()}>
                                            Choisir une annale
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <section
                                aria-label="Résultats"
                                className="rounded-carte border bg-card shadow-carte"
                            >
                                <ul className="divide-y">
                                    {attente.map((e) => (
                                        <LigneAttente key={e.uuid} examen={e} />
                                    ))}
                                    {examens.map((e) => (
                                        <LigneExamen
                                            key={e.uuid}
                                            examen={e}
                                            seuil={moyenne_admission}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <aside className="grid content-start gap-4">
                        <section
                            aria-labelledby="titre-bilan"
                            className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve"
                        >
                            <h2
                                id="titre-bilan"
                                className="text-aide font-medium text-white/70"
                            >
                                Ta moyenne aux examens blancs
                            </h2>
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-[2.25rem] leading-none font-bold tracking-tight font-data">
                                    {moyenne === null
                                        ? '—'
                                        : formaterNote(
                                              Math.round(moyenne * 100) / 100,
                                          )}
                                </span>
                                <span className="font-semibold text-white/60 font-data">
                                    /20
                                </span>
                            </p>
                            <p className="text-aide text-white/75">
                                {examens.length === 0
                                    ? 'Ton premier examen blanc te donnera ta note de départ.'
                                    : `${pluriel(examens.length, 'examen')} · meilleure note ${formaterNote(meilleure ?? 0)}/20`}
                            </p>
                            <p className="border-t border-white/15 pt-3 text-meta text-white/65">
                                {moyenne_admission === null
                                    ? 'La moyenne d’admission n’est pas encore saisie par l’équipe : pas de comparaison pour l’instant.'
                                    : `Moyenne d’admission : ${formaterNote(moyenne_admission)}/20.`}
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function LigneAttente({ examen }: { examen: EnAttente }) {
    const style = MATIERES[examen.matiere.cle];

    return (
        <li className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    style.tuile,
                )}
            >
                <style.icone className="size-[18px]" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-semibold">
                    {examen.matiere.nom} · {examen.libelle_session}
                </span>
                <span className="flex items-center gap-1 text-aide text-ink-600">
                    <CloudUpload aria-hidden className="size-3.5" />
                    En attente d’envoi
                </span>
            </span>
            <span className="text-lg font-bold font-data">
                {formaterNote(examen.note)}
                <span className="text-aide font-semibold text-ink-500">
                    /20
                </span>
            </span>
        </li>
    );
}

function LigneExamen({
    examen,
    seuil,
}: {
    examen: ExamenResume;
    seuil: number | null;
}) {
    const style = MATIERES[examen.sujet.matiere.cle];

    return (
        <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-craie-100/50 sm:px-5 dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    style.tuile,
                )}
            >
                <style.icone className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                        href={show(examen.uuid)}
                        prefetch
                        className="truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                    >
                        {examen.sujet.matiere.nom} ·{' '}
                        {examen.sujet.libelle_session}
                    </Link>
                    {examen.horloge_suspecte && (
                        <Badge variant="indice">
                            <TriangleAlert aria-hidden />
                            Heure à vérifier
                        </Badge>
                    )}
                </p>
                <p
                    className="truncate text-aide text-ink-500"
                    data-capture="variable"
                >
                    {formaterJour(examen.termine_le)} ·{' '}
                    {examen.temps_ecoule
                        ? `temps écoulé (${formaterDuree(examen.duree_minutes)})`
                        : `${formaterDuree(Math.max(1, examen.minutes_passees))} sur ${formaterDuree(examen.duree_minutes)}`}
                </p>
                <ProgressionBarre
                    valeur={(examen.note / 20) * 100}
                    libelle={`${formaterNote(examen.note)} sur 20`}
                    couleur={style.plein}
                    className="h-1 max-w-56"
                />
            </div>
            <span className="grid justify-items-end">
                <span className="text-lg font-bold font-data">
                    {formaterNote(examen.note)}
                    <span className="text-aide font-semibold text-ink-500">
                        /20
                    </span>
                </span>
                {seuil !== null && (
                    <span
                        className={cn(
                            'text-meta font-medium',
                            examen.note >= seuil
                                ? 'text-juste-700 dark:text-juste-400'
                                : 'text-ink-500',
                        )}
                    >
                        {examen.note >= seuil
                            ? 'au-dessus du seuil'
                            : 'sous le seuil'}
                    </span>
                )}
            </span>
        </li>
    );
}
