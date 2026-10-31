import { Link, router } from '@inertiajs/react';
import { ChevronRight, Flag, MessageSquareText } from 'lucide-react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { index, show } from '@/routes/contenu/signalements';

export type StatutSignalement = 'ouvert' | 'traite' | 'rejete';

export type SignalementResume = {
    uuid: string;
    cible: 'question' | 'lecon' | 'sujet';
    cible_libelle: string;
    contenu: {
        titre: string;
        matiere: { nom: string; teinte: CleMatiere } | null;
        lien: string | null;
    } | null;
    version: number | null;
    motif: string;
    motif_libelle: string;
    message: string | null;
    statut: StatutSignalement;
    statut_libelle: string;
    reponse: string | null;
    eleve: string;
    traite_par: string | null;
    traite_le: string | null;
    saisi_le: string;
};

type Filtres = {
    statut: StatutSignalement | null;
    motif: string | null;
    cible: string | null;
};

type Props = {
    signalements: {
        donnees: SignalementResume[];
        page: number;
        derniere: number;
        total: number;
    };
    filtres: Filtres;
    compteurs: Record<StatutSignalement, number>;
    motifs: { valeur: string; libelle: string }[];
    cibles: { valeur: string; libelle: string }[];
};

const STATUTS: { cle: StatutSignalement; libelle: string }[] = [
    { cle: 'ouvert', libelle: 'Ouverts' },
    { cle: 'traite', libelle: 'Corrigés' },
    { cle: 'rejete', libelle: 'Sans suite' },
];

/**
 * Back-office › Signalements (PLAN M17) : les erreurs signalées par les
 * élèves, les plus anciennes ouvertes d'abord. Chaque signalement attend une
 * réponse, que l'élève lira dans « Mes signalements ».
 */
export default function Signalements({
    signalements,
    filtres,
    compteurs,
    motifs,
    cibles,
}: Props) {
    // `filtres` d'abord, ce que la page contrôle ensuite (CLAUDE.md § 4).
    // Statut vide = tous (sans paramètre, le serveur montre les ouverts).
    function filtrer(modifs: Partial<Filtres>) {
        const suivants = { ...filtres, ...modifs };

        router.get(
            index({ query: { ...suivants, statut: suivants.statut ?? '' } })
                .url,
            {},
            { preserveScroll: true, replace: true },
        );
    }

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Signalements"
                titre={
                    <>
                        Les <strong>signalements</strong> des élèves
                    </>
                }
                description="Une erreur vue par un élève, c’est une erreur que mille autres ont lue. Corrigez le contenu, puis répondez-lui."
            />

            <section
                aria-labelledby="titre-liste"
                className="rounded-carte border bg-card shadow-carte"
            >
                <h2 id="titre-liste" className="sr-only">
                    Liste des signalements
                </h2>
                <div className="grid gap-3 border-b px-5 py-4 sm:grid-cols-[minmax(0,1fr)_14rem_12rem] sm:items-center">
                    <div
                        role="group"
                        aria-label="Statut"
                        className="-mx-5 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
                    >
                        {STATUTS.map((s) => {
                            const actif = filtres.statut === s.cle;

                            return (
                                <button
                                    key={s.cle}
                                    type="button"
                                    aria-pressed={actif}
                                    onClick={() =>
                                        filtrer({
                                            statut: actif ? null : s.cle,
                                        })
                                    }
                                    className={cn(
                                        'flex h-8 shrink-0 items-center gap-1.5 rounded-controle border px-2.5 text-aide font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                        actif
                                            ? 'border-ink-900 bg-ink-900 text-craie-50'
                                            : 'border-contour bg-card text-ink-600 hover:text-ink-900',
                                    )}
                                >
                                    {s.libelle}
                                    <span
                                        className={cn(
                                            'font-data',
                                            actif
                                                ? 'text-craie-50/70'
                                                : 'text-ink-500',
                                        )}
                                    >
                                        {formaterNombre(compteurs[s.cle])}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <ListeDeroulante
                        aria-label="Motif"
                        value={filtres.motif ?? ''}
                        onChange={(e) =>
                            filtrer({ motif: e.target.value || null })
                        }
                    >
                        <option value="">Tous les motifs</option>
                        {motifs.map((m) => (
                            <option key={m.valeur} value={m.valeur}>
                                {m.libelle}
                            </option>
                        ))}
                    </ListeDeroulante>
                    <ListeDeroulante
                        aria-label="Contenu"
                        value={filtres.cible ?? ''}
                        onChange={(e) =>
                            filtrer({ cible: e.target.value || null })
                        }
                    >
                        <option value="">Tous les contenus</option>
                        {cibles.map((c) => (
                            <option key={c.valeur} value={c.valeur}>
                                {c.libelle}
                            </option>
                        ))}
                    </ListeDeroulante>
                </div>

                {signalements.donnees.length === 0 ? (
                    <div className="p-5">
                        <EtatVide
                            illustration={Flag}
                            titre={
                                filtres.statut === 'ouvert'
                                    ? 'Aucun signalement en attente'
                                    : 'Aucun signalement ne correspond'
                            }
                            message="Les élèves signalent une erreur sous chaque question, leçon ou annale. Leurs signalements arrivent ici."
                            action={
                                <Button
                                    variant="outline"
                                    taille="compacte"
                                    onClick={() =>
                                        filtrer({
                                            statut: null,
                                            motif: null,
                                            cible: null,
                                        })
                                    }
                                >
                                    Voir tous les signalements
                                </Button>
                            }
                            className="border-0 shadow-none"
                        />
                    </div>
                ) : (
                    <>
                        <ul className="divide-y">
                            {signalements.donnees.map((s) => (
                                <LigneSignalement
                                    key={s.uuid}
                                    signalement={s}
                                />
                            ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
                            <p className="text-aide text-ink-500">
                                {pluriel(signalements.total, 'signalement')}
                            </p>
                            <Pagination
                                page={signalements.page}
                                derniere={signalements.derniere}
                                lien={(page) =>
                                    index({
                                        query: {
                                            ...filtres,
                                            statut: filtres.statut ?? '',
                                            page,
                                        },
                                    }).url
                                }
                            />
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function LigneSignalement({ signalement }: { signalement: SignalementResume }) {
    const style = signalement.contenu?.matiere
        ? MATIERES[signalement.contenu.matiere.teinte]
        : null;

    return (
        <li className="relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-craie-100/50 dark:hover:bg-white/[0.02]">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600',
                    style?.tuile,
                )}
            >
                {style ? (
                    <style.icone className="size-[18px]" />
                ) : (
                    <Flag className="size-[18px]" />
                )}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                        href={show(signalement.uuid)}
                        prefetch
                        className="truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:underline"
                    >
                        {signalement.motif_libelle}
                    </Link>
                    {signalement.statut === 'ouvert' ? (
                        <Badge variant="nimba">À traiter</Badge>
                    ) : (
                        <Badge
                            variant={
                                signalement.statut === 'traite'
                                    ? 'juste'
                                    : 'neutre'
                            }
                        >
                            {signalement.statut_libelle}
                        </Badge>
                    )}
                </p>
                <p className="truncate text-aide text-ink-500">
                    {signalement.cible_libelle} ·{' '}
                    {signalement.contenu?.titre ?? 'contenu retiré'}
                </p>
                {signalement.message && (
                    <p className="flex items-start gap-1.5 text-aide text-ink-600">
                        <MessageSquareText
                            aria-hidden
                            className="mt-0.5 size-3.5 shrink-0"
                        />
                        <span className="line-clamp-1">
                            {signalement.message}
                        </span>
                    </p>
                )}
            </div>
            <span
                className="hidden shrink-0 text-meta text-ink-500 sm:inline"
                data-capture="variable"
            >
                @{signalement.eleve} · {depuis(signalement.saisi_le)}
            </span>
            <ChevronRight
                aria-hidden
                className="mt-1 size-4 shrink-0 text-ink-400"
            />
        </li>
    );
}
