import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Info,
    Share2,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { CorrigePasAPas } from '@/components/questions/aides-question';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { verdictDe } from '@/lib/contenu/questions';
import type { SujetEleve } from '@/lib/contenu/sujets';
import { formaterDuree } from '@/lib/contenu/sujets';
import { partagerCarte } from '@/lib/examen-blanc/carte';
import { formaterNote } from '@/lib/examen-blanc/note';
import { formaterJour } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { index } from '@/routes/eleve/examens-blancs';

type PartieNotee = {
    uuid: string;
    titre: string;
    bareme: number | null;
    points: number;
    sur: number;
    questions: { uuid: string; score: number | null; repondue: boolean }[];
};

type Props = {
    examen: {
        uuid: string;
        note: number;
        note_appareil: number | null;
        termine_le: string;
        commence_le: string;
        duree_minutes: number;
        minutes_passees: number;
        origine_duree: 'imprimee' | 'epreuve' | 'choisie';
        temps_ecoule: boolean;
        horloge_suspecte: boolean;
        motif_horloge: string | null;
        est_exemple: boolean;
        sujet: {
            uuid: string;
            titre: string;
            libelle_session: string;
            matiere: { cle: CleMatiere; nom: string };
        };
        parties: PartieNotee[];
    };
    sujet: SujetEleve | null;
    verdict: { seuil: number; au_dessus: boolean } | null;
    precedents: { uuid: string; note: number; termine_le: string }[];
};

const MOTS = {
    juste: 'Juste',
    partiel: 'En partie juste',
    faux: 'Pas encore',
    a_evaluer: 'Sans réponse',
} as const;

/**
 * Le résultat d'un examen blanc (PLAN M7) : la note du serveur (celle qui
 * fait foi ; un écart avec la note affichée sur le téléphone est expliqué),
 * la comparaison à la moyenne d'admission si l'équipe l'a saisie, le détail
 * par partie, l'évolution, et le corrigé de chaque question.
 */
export default function ExamenBlanc({
    examen,
    sujet,
    verdict,
    precedents,
}: Props) {
    const { auth } = usePage().props;
    const style = MATIERES[examen.sujet.matiere.cle];
    const precedent = precedents[0] ?? null;
    const ecart =
        examen.note_appareil !== null &&
        Math.abs(examen.note_appareil - examen.note) >= 0.01;
    const scores = new Map(
        examen.parties.flatMap((p) =>
            p.questions.map((q) => [q.uuid, q] as const),
        ),
    );

    return (
        <>
            <Head
                title={`Examen blanc · ${examen.sujet.matiere.nom} ${examen.sujet.libelle_session}`}
            />
            <div className="grid grid-cols-1 gap-6">
                <div className="grid gap-4">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2 w-fit"
                    >
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Mes examens blancs
                        </Link>
                    </Button>
                    <header className="flex min-w-0 items-start gap-3.5">
                        <span
                            aria-hidden
                            className={cn(
                                'flex size-12 shrink-0 items-center justify-center rounded-[14px]',
                                style.tuile,
                            )}
                        >
                            <style.icone className="size-[22px]" />
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <h1 className="text-[1.625rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                                Examen blanc ·{' '}
                                <strong>
                                    {examen.sujet.matiere.nom}{' '}
                                    {examen.sujet.libelle_session}
                                </strong>
                            </h1>
                            <p
                                className="text-aide text-ink-500"
                                data-capture="variable"
                            >
                                {formaterJour(examen.termine_le)} ·{' '}
                                {examen.temps_ecoule
                                    ? `temps écoulé (${formaterDuree(examen.duree_minutes)})`
                                    : `${formaterDuree(Math.max(1, examen.minutes_passees))} sur ${formaterDuree(examen.duree_minutes)}`}
                                {examen.origine_duree === 'choisie' &&
                                    ' · durée choisie par toi'}
                            </p>
                        </div>
                    </header>
                </div>

                {examen.est_exemple && <BandeauExemple />}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-5">
                        <section
                            aria-label="Ta note"
                            className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
                        >
                            <p className="flex items-baseline gap-2">
                                <span className="text-[3.5rem] leading-none font-bold tracking-tight font-data">
                                    {formaterNote(examen.note)}
                                </span>
                                <span className="text-xl font-semibold text-nimba-300 font-data">
                                    /20
                                </span>
                            </p>
                            {verdict ? (
                                <p className="text-interface font-medium">
                                    {verdict.au_dessus
                                        ? `Au-dessus de la moyenne d’admission (${formaterNote(verdict.seuil)}/20).`
                                        : `En dessous de la moyenne d’admission (${formaterNote(verdict.seuil)}/20) : il te manque ${formaterNote(Math.round((verdict.seuil - examen.note) * 100) / 100)} point${verdict.seuil - examen.note > 1 ? 's' : ''}.`}
                                </p>
                            ) : (
                                <p className="text-aide text-white/70">
                                    La moyenne d’admission n’est pas encore
                                    saisie par l’équipe : pas de verdict.
                                </p>
                            )}
                            {ecart && (
                                <p className="flex items-start gap-1.5 text-aide text-white/80">
                                    <Info
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0"
                                    />
                                    Ton téléphone affichait{' '}
                                    {formaterNote(examen.note_appareil ?? 0)}
                                    /20 : la note du serveur, recorrigée sur les
                                    versions que tu as vues, fait foi.
                                </p>
                            )}
                            {examen.horloge_suspecte && (
                                <p className="flex items-start gap-1.5 text-aide text-soleil-300">
                                    <TriangleAlert
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0"
                                    />
                                    {examen.motif_horloge} La note est gardée ;
                                    elle est signalée.
                                </p>
                            )}
                            <Button
                                variant="outline"
                                className="w-fit border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                                onClick={() =>
                                    void partagerCarte({
                                        prenom: auth.user?.prenom ?? '',
                                        matiere: examen.sujet.matiere.nom,
                                        session: examen.sujet.libelle_session,
                                        note: examen.note,
                                        exemple: examen.est_exemple,
                                    }).catch(() => undefined)
                                }
                            >
                                <Share2 aria-hidden />
                                Partager ma note
                            </Button>
                        </section>

                        {sujet && (
                            <section className="grid gap-4">
                                <h2 className="text-titre-carte font-semibold">
                                    Le corrigé, question par question
                                </h2>
                                {sujet.parties.map((partie) => (
                                    <article
                                        key={partie.uuid}
                                        className="grid gap-4 rounded-carte border bg-card p-4 shadow-carte sm:p-5"
                                    >
                                        <p className="font-semibold">
                                            {partie.titre}
                                        </p>
                                        {partie.questions.map((q) => (
                                            <QuestionCorrigee
                                                key={q.uuid}
                                                enonce={q.enonce}
                                                corrige={q.corrige}
                                                score={
                                                    scores.get(q.uuid)?.score ??
                                                    null
                                                }
                                                repondue={
                                                    scores.get(q.uuid)
                                                        ?.repondue ?? false
                                                }
                                            />
                                        ))}
                                    </article>
                                ))}
                            </section>
                        )}
                    </div>

                    <aside className="grid content-start gap-4">
                        <section
                            aria-labelledby="titre-parties"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-parties"
                                className="text-titre-carte font-semibold"
                            >
                                Partie par partie
                            </h2>
                            <ul className="grid gap-2.5">
                                {examen.parties.map((p) => (
                                    <li key={p.uuid} className="grid gap-1">
                                        <span className="flex items-baseline justify-between gap-3">
                                            <span className="truncate font-medium">
                                                {p.titre}
                                            </span>
                                            <span className="shrink-0 font-semibold font-data">
                                                {formaterNote(p.points)}
                                                <span className="font-medium text-ink-500">
                                                    {' '}
                                                    / {formaterNote(p.sur)}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="h-1.5 overflow-hidden rounded-full bg-ink-400/20">
                                            <span
                                                className={cn(
                                                    'block h-full rounded-full',
                                                    style.plein,
                                                )}
                                                style={{
                                                    width: `${p.sur > 0 ? (p.points / p.sur) * 100 : 0}%`,
                                                }}
                                            />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section
                            aria-labelledby="titre-evolution"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-evolution"
                                className="text-titre-carte font-semibold"
                            >
                                Ton évolution en {examen.sujet.matiere.nom}
                            </h2>
                            {precedent === null ? (
                                <p className="text-aide text-ink-600">
                                    Ton premier examen blanc dans cette matière
                                    : la prochaine fois, tu verras ta
                                    progression.
                                </p>
                            ) : (
                                <>
                                    <p className="flex items-center gap-2 text-interface">
                                        {examen.note >= precedent.note ? (
                                            <TrendingUp
                                                aria-hidden
                                                className="size-4 text-juste-700 dark:text-juste-400"
                                            />
                                        ) : (
                                            <TrendingDown
                                                aria-hidden
                                                className="size-4 text-ink-500"
                                            />
                                        )}
                                        {examen.note >= precedent.note
                                            ? `+${formaterNote(Math.round((examen.note - precedent.note) * 100) / 100)} depuis le précédent`
                                            : `${formaterNote(Math.round((examen.note - precedent.note) * 100) / 100)} depuis le précédent`}
                                    </p>
                                    <ul className="grid gap-1 text-aide text-ink-600">
                                        {precedents.map((p) => (
                                            <li
                                                key={p.uuid}
                                                className="flex justify-between gap-3"
                                            >
                                                <span data-capture="variable">
                                                    {formaterJour(p.termine_le)}
                                                </span>
                                                <span className="font-semibold text-ink-900 font-data">
                                                    {formaterNote(p.note)}/20
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function QuestionCorrigee({
    enonce,
    corrige,
    score,
    repondue,
}: {
    enonce: SujetEleve['parties'][number]['questions'][number]['enonce'];
    corrige: SujetEleve['parties'][number]['questions'][number]['corrige'];
    score: number | null;
    repondue: boolean;
}) {
    const [ouvert, setOuvert] = useState(false);
    const verdict = repondue ? verdictDe(score) : 'a_evaluer';

    return (
        <div className="grid gap-3 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
            <div className="flex items-start justify-between gap-3">
                <ContenuBlocs doc={enonce} className="text-interface" />
                <span
                    className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-meta font-semibold',
                        verdict === 'juste' &&
                            'bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400',
                        verdict === 'partiel' &&
                            'bg-indice-400/[0.16] text-indice-700 dark:bg-indice-400/15 dark:text-indice-400',
                        verdict === 'faux' &&
                            'bg-faux-600/[0.10] text-faux-600 dark:bg-faux-400/15 dark:text-faux-400',
                        verdict === 'a_evaluer' && 'bg-craie-100 text-ink-600',
                    )}
                >
                    {MOTS[verdict]}
                </span>
            </div>
            {ouvert ? (
                <CorrigePasAPas etapes={corrige} toutVoir />
            ) : (
                <Button
                    variant="doux"
                    taille="compacte"
                    className="w-fit"
                    onClick={() => setOuvert(true)}
                >
                    Voir le corrigé
                </Button>
            )}
        </div>
    );
}
