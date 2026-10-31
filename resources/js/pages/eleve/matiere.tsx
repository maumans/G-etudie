import { Head, Link, router } from '@inertiajs/react';
import {
    BookmarkCheck,
    Check,
    ChevronLeft,
    Circle,
    Clock,
    ListTree,
    Play,
    RotateCcw,
} from 'lucide-react';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ProgressionBarre } from '@/components/ui/progression';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { cours } from '@/routes/eleve';
import { fiche } from '@/routes/eleve/chapitres';
import { show as pageLecon } from '@/routes/eleve/lecons';
import { commencer } from '@/routes/eleve/seance';

type LeconListe = {
    uuid: string;
    titre: string;
    minutes: number;
    etat: 'comprise' | 'a_revoir' | null;
    position: number;
};

type Chapitre = {
    id: number;
    titre: string;
    notions: { id: number; titre: string; lecons: LeconListe[] }[];
};

type Props = {
    matiere: { cle: CleMatiere; nom: string; slug: string };
    examen: string;
    est_exemple: boolean;
    questions: number;
    chapitres: Chapitre[];
};

/**
 * Une matière : ses chapitres, leurs notions et leurs leçons, avec l'état de
 * chacune (comprise, à revoir, commencée, à lire) et la fiche de révision
 * du chapitre. Une notion sans leçon publiée reste visible : l'élève voit
 * tout le programme saisi, et ce qui arrive.
 */
export default function Matiere({
    matiere,
    examen,
    est_exemple,
    questions,
    chapitres,
}: Props) {
    const style = MATIERES[matiere.cle];
    const lecons = chapitres.flatMap((c) => c.notions.flatMap((n) => n.lecons));
    const comprises = lecons.filter((l) => l.etat === 'comprise').length;

    return (
        <>
            <Head title={matiere.nom} />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-4">
                    <Link
                        href={cours()}
                        prefetch
                        className="-ml-1 flex items-center gap-1 self-start rounded-controle px-1 text-aide font-medium text-ink-600 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <ChevronLeft aria-hidden className="size-4" />
                        Mes cours
                    </Link>
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="flex items-center gap-4">
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-14 shrink-0 items-center justify-center rounded-[16px]',
                                    style.tuile,
                                )}
                            >
                                <style.icone className="size-6" />
                            </span>
                            <div className="grid gap-1">
                                <h1 className="text-[1.75rem] leading-tight font-semibold">
                                    {matiere.nom}
                                </h1>
                                <p className="text-aide text-ink-500">
                                    {examen} ·{' '}
                                    {pluriel(chapitres.length, 'chapitre')} ·{' '}
                                    {comprises}/{lecons.length} leçons comprises
                                </p>
                            </div>
                        </div>
                        {questions > 0 && (
                            <Button
                                onClick={() => router.post(commencer.url())}
                                className="self-start md:self-auto"
                            >
                                <Play aria-hidden className="fill-current" />
                                M'entraîner
                            </Button>
                        )}
                    </div>
                    {est_exemple && <BandeauExemple />}
                </header>

                {chapitres.length === 0 ? (
                    <EtatVide
                        illustration={ListTree}
                        titre="Le programme de cette matière arrive"
                        message="L'équipe pédagogique saisit les chapitres et rédige les leçons."
                        action={
                            <Button asChild variant="outline">
                                <Link href={cours()}>
                                    Voir mes autres matières
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <ol className="grid grid-cols-1 gap-5">
                        {chapitres.map((chapitre, rang) => (
                            <CarteChapitre
                                key={chapitre.id}
                                chapitre={chapitre}
                                numero={rang + 1}
                                couleur={style.plein}
                                tuile={style.tuile}
                            />
                        ))}
                    </ol>
                )}
            </div>
        </>
    );
}

function CarteChapitre({
    chapitre,
    numero,
    couleur,
    tuile,
}: {
    chapitre: Chapitre;
    numero: number;
    couleur: string;
    tuile: string;
}) {
    const lecons = chapitre.notions.flatMap((n) => n.lecons);
    const comprises = lecons.filter((l) => l.etat === 'comprise').length;

    return (
        <li className="min-w-0 rounded-carte border bg-card shadow-carte">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-[10px] text-aide font-bold font-data',
                            tuile,
                        )}
                    >
                        {numero}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-1.5">
                        <h2 className="text-titre-carte">{chapitre.titre}</h2>
                        <div className="flex items-center gap-3">
                            <ProgressionBarre
                                valeur={
                                    lecons.length === 0
                                        ? 0
                                        : (comprises / lecons.length) * 100
                                }
                                libelle={`${chapitre.titre} : ${comprises} leçons comprises sur ${lecons.length}`}
                                couleur={couleur}
                                className="max-w-40 flex-1"
                            />
                            <span className="text-meta text-ink-500 font-data">
                                {comprises}/{lecons.length}
                            </span>
                        </div>
                    </div>
                </div>
                {lecons.length > 0 && (
                    <Button
                        asChild
                        variant="outline"
                        taille="compacte"
                        className="self-start sm:self-auto"
                    >
                        <Link href={fiche(chapitre.id)} prefetch>
                            <BookmarkCheck aria-hidden />
                            Fiche de révision
                        </Link>
                    </Button>
                )}
            </div>
            <ul className="divide-y border-t">
                {chapitre.notions.map((notion) =>
                    notion.lecons.length === 0 ? (
                        <li
                            key={notion.id}
                            className="flex items-center gap-3 px-5 py-3 text-ink-500"
                        >
                            <Circle
                                aria-hidden
                                className="size-4 shrink-0 text-ink-400"
                                strokeDasharray="3 3"
                            />
                            <span className="min-w-0 flex-1 truncate">
                                {notion.titre}
                            </span>
                            <span className="shrink-0 text-meta">
                                leçon à venir
                            </span>
                        </li>
                    ) : (
                        notion.lecons.map((lecon) => (
                            <LigneLecon key={lecon.uuid} lecon={lecon} />
                        ))
                    ),
                )}
            </ul>
        </li>
    );
}

const ETATS = {
    comprise: {
        libelle: 'Comprise',
        icone: Check,
        pastille:
            'bg-juste-600 text-white dark:bg-juste-400 dark:text-[#110e0b]',
        texte: 'text-juste-700 dark:text-juste-400',
    },
    a_revoir: {
        libelle: 'À revoir',
        icone: RotateCcw,
        pastille: 'bg-soleil-400 text-soleil-900',
        texte: 'text-soleil-700 dark:text-soleil-300',
    },
} as const;

function LigneLecon({ lecon }: { lecon: LeconListe }) {
    const etat = lecon.etat ? ETATS[lecon.etat] : null;
    const commencee = !etat && lecon.position > 0;

    return (
        <li>
            <Link
                href={pageLecon(lecon.uuid)}
                prefetch
                className="flex items-center gap-3 px-5 py-3 transition-colors outline-none hover:bg-craie-100/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring dark:hover:bg-white/[0.03]"
            >
                <span
                    aria-hidden
                    className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full',
                        etat
                            ? etat.pastille
                            : 'border border-contour text-ink-500',
                    )}
                >
                    {etat ? (
                        <etat.icone className="size-3.5" strokeWidth={2.5} />
                    ) : (
                        <Play className="size-3 fill-current" />
                    )}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-medium text-ink-900">
                        {lecon.titre}
                    </span>
                    <span className="flex items-center gap-2 text-meta text-ink-500">
                        <span className="flex items-center gap-1">
                            <Clock aria-hidden className="size-3" />
                            {lecon.minutes} min
                        </span>
                        {etat && (
                            <span className={cn('font-medium', etat.texte)}>
                                {etat.libelle}
                            </span>
                        )}
                        {commencee && <span>Lue à {lecon.position} %</span>}
                    </span>
                </span>
            </Link>
        </li>
    );
}
