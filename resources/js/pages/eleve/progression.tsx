import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    ChevronRight,
    CloudUpload,
    ListChecks,
    Play,
    RotateCcw,
} from 'lucide-react';
import type { SegmentJauge } from '@/components/jauge-preparation';
import { JaugePreparation } from '@/components/jauge-preparation';
import { CarteSerie } from '@/components/progression/carte-serie';
import { CarteDefi, PastilleBadge } from '@/components/progression/motivation';
import { Badge as Etiquette } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import {
    ProgressionBarre,
    ProgressionSegments,
} from '@/components/ui/progression';
import { useProgressionLocale } from '@/hooks/use-progression-locale';
import { afficherDepuisLaBase, base, moteur } from '@/lib/hors-ligne';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import type { Badge, Defi, EtatNotion, Points } from '@/lib/motivation';
import { ETATS_NOTION, jourEnClair } from '@/lib/motivation';
import type { Jauge, Serie } from '@/lib/progression/locale';
import { prochaineSeanceLocale } from '@/lib/progression/locale';
import { cn, pluriel } from '@/lib/utils';
import { cours } from '@/routes/eleve';
import { matiere as pageMatiere } from '@/routes/eleve/cours';
import { commencer } from '@/routes/eleve/seance';
import { show as pageSeance } from '@/routes/eleve/seances';

type Notion = {
    id: number;
    titre: string;
    maitrise: number | null;
    etat: EtatNotion;
    prochaine_revision_le: string | null;
};

type MatiereDetail = {
    cle: CleMatiere;
    nom: string;
    slug: string;
    maitrise: number;
    notions: number;
    maitrisees: number;
    chapitres: { id: number; titre: string; notions: Notion[] }[];
};

type Props = {
    examen: string;
    est_exemple: boolean;
    jauge: Jauge & { matieres: SegmentJauge[] };
    detail: {
        matieres: MatiereDetail[];
        a_revoir: (Notion & { cle: CleMatiere; chapitre: string })[];
        resume: {
            maitrisees: number;
            en_cours: number;
            a_revoir: number;
            nouvelles: number;
        };
    };
    serie: Serie;
    points: Points;
    badges: Badge[];
    defi: Defi | null;
    seance: {
        en_cours: string | null;
        questions: number;
        duree_minutes: number;
    };
};

/**
 * « Ma progression » (lot 6, PLAN M8-M9) : la jauge en grand, les notions à
 * revoir aujourd'hui (le moment fort, avec la séance qui les reprend), puis
 * chaque matière, chapitre par chapitre, notion par notion — maîtrise et
 * prochaine révision. À côté : la série, le défi, les badges. Tout vient du
 * serveur (MaitriseService, MotivationService) ; hors ligne, la copie de
 * l'écran, complétée de la dernière jauge gardée sur le téléphone.
 */
export default function Progression({
    examen,
    est_exemple,
    jauge,
    detail,
    serie,
    points,
    badges,
    defi,
    seance,
}: Props) {
    const { auth } = usePage().props;
    const local = useProgressionLocale(auth.user?.id, { jauge, serie });
    const obtenus = badges.filter((b) => b.obtenu_le !== null);
    const lienFaibles = (cle: CleMatiere) => {
        const matiere = detail.matieres.find((m) => m.cle === cle);

        return matiere
            ? pageMatiere.url(matiere.slug, { query: { faibles: 1 } })
            : null;
    };

    return (
        <>
            <Head title="Ma progression" />
            <div className="grid gap-5 lg:gap-6">
                <header className="grid gap-1.5">
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Ma <strong>progression</strong>
                    </h1>
                    <p className="text-ink-600">
                        Ce que tu maîtrises, ce qui revient, et ce qui compte le
                        plus pour le {examen}.
                    </p>
                </header>

                {est_exemple && <BandeauExemple />}

                {detail.matieres.every((m) => m.notions === 0) ? (
                    <EtatVide
                        illustration={ListChecks}
                        titre="Ta progression démarre au premier exercice"
                        message="Les exercices de ton examen arrivent : l'équipe pédagogique les rédige. Tu peux déjà lire les cours."
                        action={
                            <Button asChild>
                                <Link href={cours()}>Voir mes cours</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                        <div className="grid min-w-0 content-start gap-5 lg:gap-6">
                            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
                                <section className="grid content-between gap-3 rounded-carte border bg-card p-5 shadow-carte">
                                    <h2 className="text-[0.9375rem]">
                                        Ma jauge de préparation
                                    </h2>
                                    <JaugePreparation
                                        pourcentage={local.jauge.pourcentage}
                                        examen={examen}
                                        segments={local.jauge.matieres}
                                        lienSegment={lienFaibles}
                                    />
                                    <dl className="grid grid-cols-3 gap-2 text-center">
                                        <Chiffre
                                            valeur={detail.resume.maitrisees}
                                            libelle="maîtrisées"
                                        />
                                        <Chiffre
                                            valeur={detail.resume.en_cours}
                                            libelle="en cours"
                                        />
                                        <Chiffre
                                            valeur={detail.resume.nouvelles}
                                            libelle="à découvrir"
                                        />
                                    </dl>
                                    {local.nonComptees > 0 && (
                                        <p className="flex items-center justify-center gap-1.5 text-meta text-ink-500">
                                            <CloudUpload
                                                aria-hidden
                                                className="size-3.5"
                                            />
                                            {pluriel(
                                                local.nonComptees,
                                                'réponse pas encore comptée',
                                                'réponses pas encore comptées',
                                            )}
                                        </p>
                                    )}
                                </section>
                                <ARevoir
                                    debut={
                                        detail.resume.maitrisees +
                                            detail.resume.en_cours ===
                                        0
                                    }
                                    notions={detail.a_revoir}
                                    seance={seance}
                                    auteurId={auth.user?.id}
                                />
                            </div>

                            <section
                                aria-labelledby="titre-matieres"
                                className="grid gap-3"
                            >
                                <h2
                                    id="titre-matieres"
                                    className="text-[0.9375rem]"
                                >
                                    Notion par notion
                                </h2>
                                <ul className="grid gap-4">
                                    {detail.matieres
                                        .filter((m) => m.notions > 0)
                                        .map((matiere) => (
                                            <CarteMatiere
                                                key={matiere.cle}
                                                matiere={matiere}
                                            />
                                        ))}
                                </ul>
                            </section>
                        </div>

                        <div className="grid content-start gap-5 lg:gap-6">
                            <CarteSerie
                                serie={local.serie}
                                points={points}
                                provisoire={local.serie.provisoire}
                            />
                            <CarteDefi defi={defi} />
                            <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[0.9375rem]">
                                        Mes badges
                                    </h2>
                                    <span className="text-aide text-ink-500 font-data">
                                        {obtenus.length}/{badges.length}
                                    </span>
                                </div>
                                <ul className="grid grid-cols-1 gap-2.5">
                                    {badges.map((badge) => (
                                        <li
                                            key={badge.cle}
                                            className="flex items-center gap-3"
                                        >
                                            <PastilleBadge badge={badge} />
                                            <span className="grid min-w-0 flex-1">
                                                <span
                                                    className={cn(
                                                        'truncate font-semibold',
                                                        badge.obtenu_le ===
                                                            null &&
                                                            'text-ink-600',
                                                    )}
                                                >
                                                    {badge.nom}
                                                    <span className="sr-only">
                                                        {badge.obtenu_le
                                                            ? ' : obtenu'
                                                            : ' : à gagner'}
                                                    </span>
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {badge.description}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-aide font-semibold text-ink-600 font-data">
                                                +{badge.points}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function Chiffre({ valeur, libelle }: { valeur: number; libelle: string }) {
    return (
        <div className="grid gap-0.5 rounded-controle bg-craie-100 px-2 py-2 dark:bg-relief/60">
            <dt className="order-2 text-meta text-ink-600">{libelle}</dt>
            <dd className="text-xl leading-none font-bold font-data">
                {valeur}
            </dd>
        </div>
    );
}

async function reviser(auteurId?: number) {
    if (moteur.etat.reseau === 'hors_ligne' && auteurId !== undefined) {
        const uuid = await prochaineSeanceLocale(base, auteurId);

        if (
            uuid !== null &&
            (await afficherDepuisLaBase(pageSeance.url(uuid)))
        ) {
            return;
        }
    }

    router.post(commencer.url());
}

/**
 * À revoir aujourd'hui : le moment fort de l'écran. La séance du jour les
 * reprend en premier (SeanceService), d'où un seul bouton.
 */
function ARevoir({
    debut,
    notions,
    seance,
    auteurId,
}: {
    /** Rien encore de travaillé : on parle du premier soir, pas des révisions. */
    debut: boolean;
    notions: Props['detail']['a_revoir'];
    seance: Props['seance'];
    auteurId?: number;
}) {
    return (
        // L'action dominante d'abord sur mobile (visible sans défiler).
        <section className="relative isolate order-first flex flex-col justify-between gap-5 overflow-hidden rounded-carte surface-marque p-6 text-white shadow-releve md:order-none">
            <span
                aria-hidden
                className="absolute -top-10 -right-10 -z-10 size-40 rounded-full border-[28px] border-white/10"
            />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
                <p className="flex items-center gap-1.5 text-aide font-medium text-white/85">
                    <RotateCcw aria-hidden className="size-3.5" />
                    Révision espacée
                </p>
                <h2 className="text-[1.5rem] leading-tight titre-contraste">
                    {notions.length > 0 ? (
                        <>
                            {pluriel(
                                notions.length,
                                'notion revient',
                                'notions reviennent',
                            )}{' '}
                            <strong>aujourd’hui.</strong>
                        </>
                    ) : debut ? (
                        <>
                            Tout commence <strong>ce soir.</strong>
                        </>
                    ) : (
                        <>
                            Rien à revoir <strong>aujourd’hui.</strong>
                        </>
                    )}
                </h2>
                {notions.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-1.5">
                        {notions.slice(0, 4).map((notion) => {
                            const matiere = MATIERES[notion.cle];

                            return (
                                <li
                                    key={notion.id}
                                    className="flex items-center gap-2 text-aide"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-nimba-700">
                                        <matiere.icone
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">
                                        <span className="font-semibold">
                                            {notion.titre}
                                        </span>
                                        <span className="text-white/80">
                                            {' '}
                                            · {matiere.nom}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-white/85 font-data">
                                        {notion.maitrise ?? 0} %
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-aide text-white/85">
                        {debut
                            ? 'Ta séance du jour choisit les notions où tes efforts comptent le plus. Une notion réussie reviendra ensuite après 1, 3, 7, 14 puis 30 jours.'
                            : 'Une notion réussie revient après 1, 3, 7, 14 puis 30 jours, pour vérifier qu’elle tient.'}
                    </p>
                )}
            </div>
            {seance.questions > 0 &&
                (seance.en_cours ? (
                    <Button
                        asChild
                        taille="grande"
                        className="w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
                    >
                        <Link href={pageSeance(seance.en_cours)}>
                            <Play aria-hidden className="fill-current" />
                            Reprendre ma séance
                        </Link>
                    </Button>
                ) : (
                    <Button
                        taille="grande"
                        onClick={() => void reviser(auteurId)}
                        className="w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
                    >
                        <Play aria-hidden className="fill-current" />
                        {notions.length > 0
                            ? 'Réviser maintenant'
                            : 'Ma séance du jour'}
                    </Button>
                ))}
        </section>
    );
}

function CarteMatiere({ matiere }: { matiere: MatiereDetail }) {
    const style = MATIERES[matiere.cle];

    return (
        <li className="min-w-0 rounded-carte border bg-card shadow-carte">
            <div className="flex items-center gap-3 p-5 pb-4">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        style.tuile,
                    )}
                >
                    <style.icone className="size-[18px]" />
                </span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className="truncate text-titre-carte">
                            {matiere.nom}
                        </h3>
                        <span className="shrink-0 text-xl leading-none font-bold font-data">
                            {matiere.maitrise}
                            <span className="text-sm font-semibold text-ink-500">
                                {' '}
                                %
                            </span>
                        </span>
                    </div>
                    <ProgressionSegments
                        valeur={matiere.maitrise}
                        couleur={style.plein}
                        libelle={`${matiere.nom} : maîtrise ${matiere.maitrise} %`}
                    />
                    <p className="text-meta text-ink-500">
                        <span className="font-semibold text-ink-900 font-data">
                            {matiere.maitrisees}/{matiere.notions}
                        </span>{' '}
                        notions maîtrisées
                    </p>
                </div>
            </div>
            {matiere.chapitres.map((chapitre) => (
                <div key={chapitre.id} className="border-t">
                    <p className="px-5 pt-3 pb-1 text-aide font-semibold text-ink-600">
                        {chapitre.titre}
                    </p>
                    <ul className="divide-y">
                        {chapitre.notions.map((notion) => (
                            <LigneNotion
                                key={notion.id}
                                notion={notion}
                                couleur={style.plein}
                            />
                        ))}
                    </ul>
                </div>
            ))}
            <Link
                href={pageMatiere(matiere.slug)}
                prefetch
                className="flex items-center justify-between gap-3 rounded-b-carte border-t px-5 py-3 text-aide font-medium text-ink-600 outline-none hover:bg-craie-100/60 hover:text-ink-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:hover:bg-white/[0.03]"
            >
                Les cours de {matiere.nom}
                <ChevronRight aria-hidden className="size-4" />
            </Link>
        </li>
    );
}

function LigneNotion({ notion, couleur }: { notion: Notion; couleur: string }) {
    const etat = ETATS_NOTION[notion.etat];

    // Mobile : le titre en entier sur sa ligne, puis barre, % et état ;
    // à partir de 640 px, une seule ligne.
    return (
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <span className="col-span-2 grid min-w-0 gap-0.5 sm:col-span-1">
                <span className="font-medium">{notion.titre}</span>
                {notion.prochaine_revision_le && notion.etat !== 'a_revoir' && (
                    <span
                        data-capture="variable"
                        className="flex items-center gap-1 text-meta text-ink-500"
                    >
                        <CalendarClock aria-hidden className="size-3" />
                        revient le {jourEnClair(notion.prochaine_revision_le)}
                    </span>
                )}
            </span>
            <ProgressionBarre
                valeur={notion.maitrise ?? 0}
                couleur={couleur}
                libelle={`${notion.titre} : ${notion.maitrise ?? 0} %`}
            />
            <span className="flex items-center gap-2 justify-self-end">
                <span className="w-9 text-right text-aide font-semibold font-data">
                    {notion.maitrise === null ? '—' : `${notion.maitrise} %`}
                </span>
                <Etiquette variant={etat.variante}>{etat.libelle}</Etiquette>
            </span>
        </li>
    );
}
