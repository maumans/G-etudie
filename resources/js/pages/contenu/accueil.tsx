import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardCheck,
    ListTree,
    MessageSquareWarning,
    PenLine,
    Plus,
} from 'lucide-react';
import { Section } from '@/components/contenu/section';
import { BadgeStatut, STATUTS } from '@/components/contenu/statut-lecon';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ProgressionSegments } from '@/components/ui/progression';
import { usePeut } from '@/hooks/use-peut';
import { depuis } from '@/lib/dates';
import { MATIERES } from '@/lib/matieres';
import type { CleMatiere } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { create, edit, index, relecture, show } from '@/routes/contenu/lecons';
import { index as programme } from '@/routes/contenu/referentiel/programme';
import type { StatutContenu } from '@/types';

type LeconCourte = {
    uuid: string;
    titre: string;
    statut: StatutContenu;
    auteur: string;
    notion: string;
    matiere: { nom: string; teinte: CleMatiere };
    modifiee_le: string;
    commentaire: string | null;
};

type Couverture = {
    matiere: { nom: string; teinte: CleMatiere };
    classe: string;
    examens: string[];
    chapitres: number;
    notions: number;
    couvertes: number;
};

type Props = {
    compteurs: Record<StatutContenu, number>;
    a_relire: LeconCourte[] | null;
    nombre_a_relire: number | null;
    a_reprendre: LeconCourte[] | null;
    mes_brouillons: LeconCourte[] | null;
    couverture: Couverture[];
    est_exemple: boolean;
};

function salutation(maintenant: Date): string {
    const heure = maintenant.getUTCHours();

    return heure >= 18 || heure < 4 ? 'Bonsoir' : 'Bonjour';
}

/**
 * Tableau de bord du back-office : ce qui attend ce compte, l'état du
 * catalogue, et la couverture des matières phares (ce qui manque).
 */
export default function Accueil({
    compteurs,
    a_relire,
    nombre_a_relire,
    a_reprendre,
    mes_brouillons,
    couverture,
    est_exemple,
}: Props) {
    const { auth } = usePage().props;
    const peut = usePeut();
    const maintenant = new Date();
    const date = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Africa/Conakry',
    }).format(maintenant);

    return (
        <>
            <Head title="Tableau de bord" />
            <div className="grid gap-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500 first-letter:uppercase">
                            {date}
                        </p>
                        <h1 className="text-titre-ecran titre-contraste lg:text-titre-ecran-large">
                            {salutation(maintenant)},{' '}
                            <strong>{auth.user?.prenom}</strong>
                        </h1>
                        <p className="text-ink-600">
                            Une leçon juste, relue par un autre enseignant :
                            c’est ce qui fait qu’un élève peut nous croire.
                        </p>
                    </div>
                    {peut('contenu.rediger') && (
                        <Button asChild>
                            <Link href={create()} prefetch>
                                <Plus aria-hidden />
                                Nouvelle leçon
                            </Link>
                        </Button>
                    )}
                </header>

                {est_exemple && <BandeauExemple />}

                <ul
                    aria-label="Leçons par statut"
                    className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
                >
                    {(Object.keys(STATUTS) as StatutContenu[]).map((statut) => {
                        const { pluriel: titre, icone: Icone } =
                            STATUTS[statut];

                        return (
                            <li key={statut}>
                                <Link
                                    href={index({ query: { statut } })}
                                    prefetch
                                    className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte transition-colors outline-none hover:border-ink-400/50 focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <span className="flex items-center justify-between gap-2 text-aide font-medium text-ink-600">
                                        {titre}
                                        <Icone
                                            aria-hidden
                                            className="size-4 text-ink-500"
                                        />
                                    </span>
                                    <span className="text-[1.75rem] leading-none font-semibold tracking-tight font-data">
                                        {formaterNombre(compteurs[statut])}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-6">
                        <MomentFort
                            nombreARelire={nombre_a_relire}
                            premiereARelire={a_relire?.[0]}
                            aReprendre={a_reprendre?.[0]}
                        />

                        {a_relire !== null && (
                            <Section
                                id="a-relire"
                                titre="À relire"
                                description="Les leçons des autres qui attendent votre décision."
                                action={
                                    <Link
                                        href={relecture()}
                                        prefetch
                                        className="text-aide font-medium text-ink-500 hover:text-ink-900"
                                    >
                                        Tout voir
                                    </Link>
                                }
                                contenuClassName="px-0 pb-1"
                            >
                                {a_relire.length === 0 ? (
                                    <p className="border-t px-5 py-5 text-aide text-ink-500">
                                        Rien à relire pour l’instant.
                                    </p>
                                ) : (
                                    <ul className="divide-y border-t">
                                        {a_relire.map((lecon) => (
                                            <LigneCourte
                                                key={lecon.uuid}
                                                lecon={lecon}
                                                href={show(lecon.uuid).url}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </Section>
                        )}

                        <Section
                            id="couverture"
                            titre="Couverture des matières phares"
                            description="Part des notions du programme qui ont une leçon publiée."
                            action={
                                peut('referentiel.gerer') && (
                                    <Link
                                        href={programme()}
                                        prefetch
                                        className="text-aide font-medium text-ink-500 hover:text-ink-900"
                                    >
                                        Programme
                                    </Link>
                                )
                            }
                            contenuClassName="px-0 pb-1"
                        >
                            {couverture.length === 0 ? (
                                <p className="border-t px-5 py-5 text-aide text-ink-500">
                                    Aucune matière phare pour l’année courante.
                                </p>
                            ) : (
                                <ul className="divide-y border-t">
                                    {couverture.map((ligne) => (
                                        <LigneCouverture
                                            key={`${ligne.matiere.nom}-${ligne.classe}`}
                                            ligne={ligne}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Section>
                    </div>

                    <div className="grid content-start gap-6">
                        {a_reprendre !== null && a_reprendre.length > 0 && (
                            <Section
                                titre="Renvoyées, à reprendre"
                                contenuClassName="grid gap-3"
                            >
                                {a_reprendre.map((lecon) => (
                                    <Link
                                        key={lecon.uuid}
                                        href={edit(lecon.uuid)}
                                        className="hover:border-indice-500 grid gap-1.5 rounded-[12px] border border-indice-400/45 bg-indice-400/[0.08] p-3 outline-none focus-visible:outline-2 focus-visible:outline-ring dark:bg-indice-400/[0.06]"
                                    >
                                        <span className="flex items-center gap-2 font-semibold">
                                            <MessageSquareWarning
                                                aria-hidden
                                                className="size-4 shrink-0 text-indice-600 dark:text-indice-400"
                                            />
                                            <span className="truncate">
                                                {lecon.titre}
                                            </span>
                                        </span>
                                        {lecon.commentaire && (
                                            <span className="line-clamp-2 text-aide text-ink-600">
                                                « {lecon.commentaire} »
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </Section>
                        )}

                        {mes_brouillons !== null && (
                            <Section
                                titre="Mes brouillons"
                                action={
                                    <Link
                                        href={index({
                                            query: {
                                                vue: 'miennes',
                                                statut: 'brouillon',
                                            },
                                        })}
                                        prefetch
                                        className="text-aide font-medium text-ink-500 hover:text-ink-900"
                                    >
                                        Tout voir
                                    </Link>
                                }
                                contenuClassName="px-0 pb-1"
                            >
                                {mes_brouillons.length === 0 ? (
                                    <p className="border-t px-5 py-4 text-aide text-ink-500">
                                        Aucun brouillon en cours.
                                    </p>
                                ) : (
                                    <ul className="divide-y border-t">
                                        {mes_brouillons.map((lecon) => (
                                            <LigneCourte
                                                key={lecon.uuid}
                                                lecon={lecon}
                                                href={edit(lecon.uuid).url}
                                                compacte
                                            />
                                        ))}
                                    </ul>
                                )}
                            </Section>
                        )}

                        <Section titre="Le circuit d’une leçon">
                            <ol className="grid gap-3 text-aide text-ink-600">
                                {[
                                    [
                                        'Rédiger',
                                        'Rattachée à une notion du programme, avec ses formules et ses encadrés.',
                                    ],
                                    [
                                        'Relire',
                                        'Par un autre enseignant : l’auteur ne relit jamais sa propre leçon.',
                                    ],
                                    [
                                        'Publier',
                                        'L’élève la voit. Une correction ouvre une nouvelle version, relue à son tour.',
                                    ],
                                ].map(([titre, texte], rang) => (
                                    <li key={titre} className="flex gap-3">
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                                            {rang + 1}
                                        </span>
                                        <span>
                                            <strong className="font-semibold text-ink-900">
                                                {titre}.
                                            </strong>{' '}
                                            {texte}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    </div>
                </div>
            </div>
        </>
    );
}

/** Le geste qui attend ce compte : relire d'abord, sinon reprendre, sinon écrire. */
function MomentFort({
    nombreARelire,
    premiereARelire,
    aReprendre,
}: {
    nombreARelire: number | null;
    premiereARelire?: LeconCourte;
    aReprendre?: LeconCourte;
}) {
    const peut = usePeut();

    let contenu: {
        titre: React.ReactNode;
        texte: string;
        action: React.ReactNode;
        icone: typeof ClipboardCheck;
    };

    if (nombreARelire && premiereARelire) {
        contenu = {
            icone: ClipboardCheck,
            titre: (
                <>
                    {pluriel(nombreARelire, 'leçon attend', 'leçons attendent')}{' '}
                    <strong>votre relecture</strong>
                </>
            ),
            texte: `La plus récente : « ${premiereARelire.titre} », par ${premiereARelire.auteur}.`,
            action: (
                <Link href={show(premiereARelire.uuid)}>
                    Relire maintenant
                    <ArrowRight aria-hidden />
                </Link>
            ),
        };
    } else if (aReprendre) {
        contenu = {
            icone: PenLine,
            titre: (
                <>
                    Une leçon <strong>vous est renvoyée</strong>
                </>
            ),
            texte: `« ${aReprendre.titre} » : le relecteur vous a laissé un commentaire.`,
            action: (
                <Link href={edit(aReprendre.uuid)}>
                    Reprendre la leçon
                    <ArrowRight aria-hidden />
                </Link>
            ),
        };
    } else if (peut('contenu.rediger')) {
        contenu = {
            icone: PenLine,
            titre: (
                <>
                    Rien ne vous attend : <strong>écrivez la suite</strong>
                </>
            ),
            texte: 'Une notion sans leçon, c’est un élève qui révise seul.',
            action: (
                <Link href={create()}>
                    Nouvelle leçon
                    <ArrowRight aria-hidden />
                </Link>
            ),
        };
    } else {
        contenu = {
            icone: ListTree,
            titre: (
                <>
                    Rien à relire <strong>pour l’instant</strong>
                </>
            ),
            texte: 'Les leçons envoyées en relecture apparaîtront ici.',
            action: (
                <Link href={index()}>
                    Voir les leçons
                    <ArrowRight aria-hidden />
                </Link>
            ),
        };
    }

    return (
        <section className="relative isolate flex flex-col gap-5 overflow-hidden rounded-carte surface-marque p-6 text-white shadow-releve sm:flex-row sm:items-center sm:justify-between">
            <span
                aria-hidden
                className="absolute -top-12 -right-12 -z-10 size-44 rounded-full border-[30px] border-white/10"
            />
            <div className="grid gap-1.5">
                <p className="flex items-center gap-1.5 text-aide font-medium text-white/85">
                    <contenu.icone aria-hidden className="size-4" />
                    Votre prochaine action
                </p>
                <h2 className="text-[1.5rem] leading-tight titre-contraste">
                    {contenu.titre}
                </h2>
                <p className="text-white/85">{contenu.texte}</p>
            </div>
            <Button
                asChild
                taille="grande"
                className="w-full shrink-0 bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
            >
                {contenu.action}
            </Button>
        </section>
    );
}

function LigneCourte({
    lecon,
    href,
    compacte = false,
}: {
    lecon: LeconCourte;
    href: string;
    compacte?: boolean;
}) {
    return (
        <li className="relative flex items-center gap-3 px-5 py-3 transition-colors hover:bg-craie-100/50 dark:hover:bg-white/[0.02]">
            <TuileMatiere
                teinte={lecon.matiere.teinte}
                taille={compacte ? 'normale' : 'grande'}
            />
            <div className="grid min-w-0 flex-1 gap-0.5">
                <Link
                    href={href}
                    prefetch
                    className="truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                >
                    {lecon.titre}
                </Link>
                <p
                    className="truncate text-meta text-ink-500"
                    data-capture="variable"
                >
                    {compacte
                        ? lecon.notion
                        : `${lecon.matiere.nom} · ${lecon.notion} · ${lecon.auteur}`}{' '}
                    · {depuis(lecon.modifiee_le)}
                </p>
            </div>
            {!compacte && <BadgeStatut statut={lecon.statut} />}
        </li>
    );
}

function LigneCouverture({ ligne }: { ligne: Couverture }) {
    const style = MATIERES[ligne.matiere.teinte];
    const part =
        ligne.notions === 0 ? 0 : (ligne.couvertes / ligne.notions) * 100;

    return (
        <li className="grid gap-2.5 px-5 py-3.5">
            <div className="flex items-center gap-3">
                <TuileMatiere teinte={ligne.matiere.teinte} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                    <p className="truncate font-semibold">
                        {ligne.matiere.nom}{' '}
                        <span className="font-normal text-ink-500">
                            · {ligne.classe}
                        </span>
                    </p>
                    <p className="truncate text-meta text-ink-500">
                        {ligne.examens.join(', ')}
                    </p>
                </div>
                <p className="shrink-0 text-right">
                    {ligne.notions === 0 ? (
                        <span className="text-aide text-ink-500">
                            Programme à saisir
                        </span>
                    ) : (
                        <>
                            <span className="text-[1.125rem] font-semibold font-data">
                                {formaterNombre(ligne.couvertes)}
                            </span>
                            <span className="text-aide text-ink-500">
                                {' '}
                                / {pluriel(ligne.notions, 'notion')}
                            </span>
                        </>
                    )}
                </p>
            </div>
            <ProgressionSegments
                valeur={part}
                libelle={`${ligne.matiere.nom}, ${ligne.classe}`}
                couleur={style.plein}
                className={cn(ligne.notions === 0 && 'opacity-50')}
            />
        </li>
    );
}
