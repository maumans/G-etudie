import { Head, router, usePage } from '@inertiajs/react';
import {
    Globe2,
    History,
    Landmark,
    Play,
    Share2,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { JourCulture } from '@/components/culture/question-du-jour';
import { QuestionDuJour } from '@/components/culture/question-du-jour';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ProgressionBarre } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import { partagerCarteCulture } from '@/lib/culture/carte';
import { formaterJour } from '@/lib/dates';
import { afficherDepuisLaBase, base, horsLigneSur } from '@/lib/hors-ligne';
import { MATIERES } from '@/lib/matieres';
import { prochaineSeanceLocale } from '@/lib/progression/locale';
import { cn, pluriel } from '@/lib/utils';
import { quiz } from '@/routes/eleve/culture';
import { show as pageSeance } from '@/routes/eleve/seances';

type Theme = {
    id: number;
    titre: string;
    questions: number;
    faites: number;
    reussite: number | null;
    est_exemple: boolean;
};

type Props = {
    jour: JourCulture | null;
    themes: Theme[];
    historique: {
        uuid: string;
        termine_le: string;
        questions: number;
        score: number | null;
        justes: number;
    }[];
    est_exemple: boolean;
    prenom: string;
    aujourdhui: string;
};

const ICONES_THEMES: Record<string, LucideIcon> = {
    Guinée: Landmark,
    Afrique: Globe2,
    Monde: Globe2,
};

/**
 * « Lancer un quiz » : en ligne, le serveur compose (ou reprend) le quiz ;
 * hors ligne, l'appareil ouvre le quiz préparé que l'instantané lui a
 * laissé (HL4) — aucune question n'est choisie ici.
 */
async function lancer(auteurId: number | undefined, theme?: number) {
    if (horsLigneSur() && auteurId !== undefined && theme === undefined) {
        const uuid = await prochaineSeanceLocale(base, auteurId, 'culture');

        if (
            uuid !== null &&
            (await afficherDepuisLaBase(pageSeance.url(uuid)))
        ) {
            return;
        }
    }

    router.post(quiz.url(), theme === undefined ? {} : { theme });
}

/**
 * Culture générale (lot 12, PLAN M10) : Guinée, Afrique, Monde. La question
 * du jour (la même pour tous), des quiz de cinq questions par thème, et la
 * carte à partager pour défier ses amis. Hors examen : rien ici ne touche à
 * la jauge.
 */
export default function Culture({
    jour,
    themes,
    historique,
    est_exemple,
    prenom,
}: Props) {
    const { auth } = usePage().props;
    const [enCours, setEnCours] = useState<number | 'tous' | null>(null);
    const style = MATIERES.culture;
    const total = themes.reduce((somme, t) => somme + t.questions, 0);
    const dernier = historique[0];

    function demarrer(theme?: number) {
        setEnCours(theme ?? 'tous');
        void lancer(auth.user?.id, theme).finally(() => setEnCours(null));
    }

    return (
        <>
            <Head title="Culture générale" />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta="Culture générale"
                    titre={
                        <>
                            La Guinée, l’Afrique et <strong>le monde</strong>
                        </>
                    }
                    chapeau="Une question par jour, la même pour toute la Guinée, et des quiz de cinq questions. Pour le plaisir de savoir : rien ici ne compte dans ta jauge."
                />
                {est_exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <div className="grid content-start gap-5 lg:gap-6">
                        <section className="relative isolate grid gap-4 overflow-hidden rounded-carte surface-encre p-5 text-white shadow-releve sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
                            <span
                                aria-hidden
                                className="absolute -top-12 -right-12 -z-10 size-44 rounded-full bg-culture-400/25 blur-2xl"
                            />
                            <div className="grid gap-1.5">
                                <p className="flex items-center gap-2 text-aide font-medium text-white/75">
                                    <Sparkles aria-hidden className="size-4" />
                                    {pluriel(total, 'question')} dans{' '}
                                    {pluriel(themes.length, 'thème')}
                                </p>
                                <h2 className="text-[1.375rem] leading-tight font-semibold">
                                    Un quiz de cinq questions
                                </h2>
                                <p className="text-aide text-white/80">
                                    D’abord celles que tu n’as jamais vues.
                                    Trois minutes, et tu peux partager ton
                                    score.
                                </p>
                            </div>
                            <Button
                                // `clair` : un bouton blanc reste blanc, son texte reste encre, en sombre aussi.
                                className="clair w-full bg-white text-ink-900 shadow-flottant hover:bg-white/90 sm:w-fit"
                                disabled={total === 0 || enCours !== null}
                                onClick={() => demarrer()}
                            >
                                {enCours === 'tous' ? (
                                    <Spinner />
                                ) : (
                                    <Play
                                        aria-hidden
                                        className="fill-current"
                                    />
                                )}
                                Lancer un quiz
                            </Button>
                        </section>

                        <QuestionDuJour jour={jour} jouerTout />

                        <Carte aria-labelledby="titre-themes">
                            <TitreCarte id="titre-themes">
                                Les thèmes
                            </TitreCarte>
                            {themes.length === 0 ? (
                                <p className="mt-3 rounded-controle bg-craie-100 p-4 text-aide text-ink-600 dark:bg-relief/60">
                                    Les thèmes arrivent : l’équipe pédagogique
                                    rédige les questions et vérifie leurs
                                    sources.
                                </p>
                            ) : (
                                <ul className="mt-2 divide-y">
                                    {themes.map((theme) => {
                                        const Icone =
                                            ICONES_THEMES[theme.titre] ??
                                            style.icone;

                                        return (
                                            <li
                                                key={theme.id}
                                                className="flex items-center gap-3 py-3 last:pb-0"
                                            >
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                                                        style.tuile,
                                                    )}
                                                >
                                                    <Icone className="size-5" />
                                                </span>
                                                <div className="grid min-w-0 flex-1 gap-1.5">
                                                    <p className="flex items-baseline justify-between gap-3">
                                                        <span className="truncate font-semibold">
                                                            {theme.titre}
                                                        </span>
                                                        <span className="shrink-0 text-meta text-ink-500">
                                                            {theme.faites}/
                                                            {theme.questions}{' '}
                                                            faites
                                                            {theme.reussite !==
                                                                null &&
                                                                ` · ${theme.reussite} %`}
                                                        </span>
                                                    </p>
                                                    <ProgressionBarre
                                                        valeur={Math.round(
                                                            (100 *
                                                                theme.faites) /
                                                                Math.max(
                                                                    1,
                                                                    theme.questions,
                                                                ),
                                                        )}
                                                        libelle={`${theme.titre} : ${theme.faites} questions faites sur ${theme.questions}`}
                                                        couleur={style.plein}
                                                    />
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    taille="compacte"
                                                    aria-label={`Quiz : ${theme.titre}`}
                                                    disabled={enCours !== null}
                                                    onClick={() =>
                                                        horsLigneSur()
                                                            ? demarrer()
                                                            : demarrer(theme.id)
                                                    }
                                                >
                                                    {enCours === theme.id && (
                                                        <Spinner />
                                                    )}
                                                    Quiz
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Carte>
                    </div>

                    <div className="grid content-start gap-5 lg:gap-6">
                        <Carte aria-labelledby="titre-defi-amis">
                            <TitreCarte id="titre-defi-amis">
                                Défie tes amis
                            </TitreCarte>
                            <p className="mt-2 text-aide text-ink-600">
                                Partage ton score sur WhatsApp : une image avec
                                ton prénom et ton résultat, rien d’autre. À eux
                                de faire mieux !
                            </p>
                            {dernier ? (
                                <div className="mt-4 grid gap-3">
                                    <p className="flex items-baseline gap-1.5">
                                        <span className="text-[1.75rem] leading-none font-bold font-data">
                                            {dernier.justes}
                                        </span>
                                        <span className="font-semibold text-ink-500">
                                            /{dernier.questions}
                                        </span>
                                        <span className="ml-1 text-aide text-ink-500">
                                            au dernier quiz
                                        </span>
                                    </p>
                                    <Button
                                        variant="doux"
                                        onClick={() =>
                                            void partagerCarteCulture({
                                                prenom,
                                                justes: dernier.justes,
                                                total: dernier.questions,
                                                exemple: est_exemple,
                                            })
                                                .then((r) =>
                                                    r === 'telechargee'
                                                        ? toast.success(
                                                              'Image enregistrée : envoie-la à tes amis.',
                                                          )
                                                        : undefined,
                                                )
                                                .catch(() => undefined)
                                        }
                                    >
                                        <Share2 aria-hidden />
                                        Partager mon score
                                    </Button>
                                </div>
                            ) : (
                                <p className="mt-3 rounded-controle bg-craie-100 p-3 text-aide text-ink-600 dark:bg-relief/60">
                                    Fais un premier quiz : ton score apparaîtra
                                    ici.
                                </p>
                            )}
                        </Carte>

                        <Carte aria-labelledby="titre-historique">
                            <TitreCarte id="titre-historique">
                                Mes derniers quiz
                            </TitreCarte>
                            {historique.length === 0 ? (
                                <p className="mt-3 flex items-center gap-2 text-aide text-ink-500">
                                    <History
                                        aria-hidden
                                        className="size-4 shrink-0"
                                    />
                                    Aucun quiz terminé pour l’instant.
                                </p>
                            ) : (
                                <ul className="mt-1 divide-y">
                                    {historique.map((q) => (
                                        <li
                                            key={q.uuid}
                                            className="flex items-center justify-between gap-3 py-2.5"
                                        >
                                            <span className="text-ink-600">
                                                {formaterJour(q.termine_le)}
                                            </span>
                                            <span className="font-semibold font-data">
                                                {q.justes}/{q.questions}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
