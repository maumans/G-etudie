import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Compass,
    Database,
    Flag,
    Sparkles,
    Timer,
} from 'lucide-react';
import { useMemo } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { formaterJour } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { texteEnBlocs } from '@/lib/tuteur/texte';
import { cn } from '@/lib/utils';
import { show as ficheQuestion } from '@/routes/contenu/questions';
import { classer, index } from '@/routes/contenu/tuteur';

type Message = {
    uuid: string;
    role: 'eleve' | 'tuteur';
    texte: string;
    statut: string | null;
    statut_libelle: string | null;
    depuis_cache: boolean;
    modele: string | null;
    premier_mot_ms: number | null;
    signale: string | null;
    signalement_classe: boolean;
    le: string;
};

type Props = {
    conversation: {
        uuid: string;
        objet: 'question' | 'etape' | 'libre';
        titre: string;
        matiere: { cle: CleMatiere; nom: string } | null;
        notion: string | null;
        question: string | null;
        version: number | null;
        etape: number | null;
        le: string;
        est_exemple: boolean;
        messages: Message[];
    };
};

/**
 * Une conversation du journal du tuteur (lot 10) : ce que l'élève a demandé,
 * ce que le tuteur a répondu, et de quoi améliorer le contenu (la question
 * à la version vue, le signalement à classer). Anonyme.
 */
export default function FicheTuteur({ conversation }: Props) {
    const c = conversation;

    return (
        <div className="grid max-w-3xl gap-6">
            <Link
                href={index()}
                className="flex w-fit items-center gap-1.5 text-aide font-medium text-ink-600 hover:text-ink-900"
            >
                <ArrowLeft aria-hidden className="size-4" />
                Le journal du tuteur
            </Link>
            <EnteteEcran
                titreOnglet="Conversation avec le tuteur"
                titre={<strong>{c.titre}</strong>}
                description={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {c.matiere && (
                            <span className="flex items-center gap-1.5">
                                <TuileMatiere
                                    teinte={c.matiere.cle}
                                    taille="petite"
                                />
                                {c.matiere.nom}
                            </span>
                        )}
                        {c.notion && <span>· {c.notion}</span>}
                        <span data-capture="variable">
                            · {formaterJour(c.le)}
                        </span>
                    </span>
                }
                action={
                    c.question ? (
                        <Button asChild variant="outline" taille="compacte">
                            <Link
                                href={ficheQuestion(c.question, {
                                    query: { version: c.version ?? '' },
                                })}
                            >
                                Ouvrir la question
                                {c.version ? ` (version ${c.version})` : ''}
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            {c.est_exemple && <BandeauExemple />}

            <ol className="grid gap-4 rounded-carte border bg-card p-4 shadow-carte sm:p-6">
                {c.messages.map((m) => (
                    <li key={m.uuid}>
                        {m.role === 'eleve' ? (
                            <p className="ml-auto w-fit max-w-[85%] rounded-[14px] rounded-br-[4px] bg-ink-900 px-3.5 py-2.5 text-interface whitespace-pre-line text-craie-50">
                                {m.texte}
                            </p>
                        ) : (
                            <ReponseJournal message={m} />
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}

function ReponseJournal({ message: m }: { message: Message }) {
    const doc = useMemo(() => texteEnBlocs(m.texte), [m.texte]);
    const recentre = m.statut === 'hors_sujet' || m.statut === 'refus';

    return (
        <article
            className={cn(
                'grid grid-cols-[2rem_minmax(0,1fr)] gap-3',
                m.signale &&
                    !m.signalement_classe &&
                    'rounded-carte bg-nimba-500/[0.06] p-3 ring-1 ring-nimba-500/25 dark:bg-nimba-400/[0.08]',
            )}
        >
            <span
                aria-hidden
                className="mt-0.5 flex size-8 items-center justify-center rounded-[10px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
            >
                {recentre ? (
                    <Compass className="size-4" />
                ) : (
                    <Sparkles className="size-4" />
                )}
            </span>
            <div className="grid min-w-0 gap-2">
                <p className="flex flex-wrap items-center gap-2 text-aide">
                    <span className="font-semibold">N’karamögö</span>
                    {m.statut !== 'complete' && m.statut_libelle && (
                        <Badge variant="neutre">{m.statut_libelle}</Badge>
                    )}
                    {m.depuis_cache && (
                        <span className="flex items-center gap-1 text-meta text-ink-500">
                            <Database aria-hidden className="size-3" />
                            servie du cache
                        </span>
                    )}
                    {m.premier_mot_ms !== null && !m.depuis_cache && (
                        <span
                            className="flex items-center gap-1 text-meta text-ink-500 font-data"
                            data-capture="variable"
                        >
                            <Timer aria-hidden className="size-3" />
                            {(m.premier_mot_ms / 1000).toLocaleString('fr-FR', {
                                maximumFractionDigits: 1,
                            })}{' '}
                            s
                        </span>
                    )}
                </p>
                {recentre || m.statut === 'erreur' ? (
                    <p className="text-interface text-ink-600">{m.texte}</p>
                ) : (
                    <ContenuBlocs
                        doc={doc}
                        className="gap-2.5 text-interface"
                    />
                )}
                {m.signale && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                        <p className="flex items-center gap-1.5 text-aide font-medium text-nimba-700 dark:text-nimba-300">
                            <Flag aria-hidden className="size-3.5" />
                            Signalée : {m.signale}
                        </p>
                        {m.signalement_classe ? (
                            <span className="text-meta text-ink-500">
                                Classée
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                taille="petite"
                                onClick={() =>
                                    router.post(
                                        classer(m.uuid).url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Classer
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
