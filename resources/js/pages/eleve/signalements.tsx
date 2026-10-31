import { Head, Link } from '@inertiajs/react';
import {
    CircleCheck,
    Clock3,
    Flag,
    MessageSquareText,
    XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { depuis } from '@/lib/dates';
import { cn, pluriel } from '@/lib/utils';
import { index as annales } from '@/routes/eleve/annales';

type Signalement = {
    uuid: string;
    cible: string;
    titre: string;
    motif: string;
    message: string | null;
    statut: 'ouvert' | 'traite' | 'rejete';
    statut_libelle: string;
    reponse: string | null;
    nouvelle: boolean;
    saisi_le: string;
    traite_le: string | null;
};

const STATUTS = {
    ouvert: {
        icone: Clock3,
        mot: 'En cours de vérification',
        classe: 'text-ink-600',
    },
    traite: {
        icone: CircleCheck,
        mot: 'Corrigé, merci !',
        classe: 'text-juste-700 dark:text-juste-400',
    },
    rejete: {
        icone: XCircle,
        mot: 'Vérifié : le contenu est juste',
        classe: 'text-ink-600',
    },
} as const;

/**
 * « Mes signalements » (PLAN M5) : ce que l'élève a signalé et la réponse de
 * l'équipe, une seule fois, sans discussion (pas de messagerie libre,
 * CLAUDE.md § 9). Un signalement fait hors ligne apparaît ici une fois
 * envoyé.
 */
export default function Signalements({
    signalements,
}: {
    signalements: Signalement[];
}) {
    const ouverts = signalements.filter((s) => s.statut === 'ouvert').length;

    return (
        <>
            <Head title="Mes signalements" />
            <div className="grid max-w-3xl grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Mes <strong>signalements</strong>
                    </h1>
                    <p className="text-ink-600">
                        Une erreur dans une question, une leçon ou une annale ?
                        Tu l’as signalée, un enseignant l’a vérifiée.
                        {ouverts > 0 &&
                            ` ${pluriel(ouverts, 'signalement')} en cours de vérification.`}
                    </p>
                </header>

                {signalements.length === 0 ? (
                    <EtatVide
                        illustration={Flag}
                        titre="Aucun signalement pour l’instant"
                        message="Sous chaque question, « Signaler une erreur » prévient l’équipe. Elle te répond ici."
                        action={
                            <Button asChild variant="outline">
                                <Link href={annales()}>Voir les annales</Link>
                            </Button>
                        }
                    />
                ) : (
                    <ul className="grid gap-3">
                        {signalements.map((s) => {
                            const statut = STATUTS[s.statut];

                            return (
                                <li
                                    key={s.uuid}
                                    className={cn(
                                        'grid gap-3 rounded-carte border bg-card p-4 shadow-carte sm:p-5',
                                        s.nouvelle &&
                                            'border-nimba-500/50 ring-2 ring-nimba-500/15',
                                    )}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p
                                            className={cn(
                                                'flex items-center gap-1.5 text-aide font-semibold',
                                                statut.classe,
                                            )}
                                        >
                                            <statut.icone
                                                aria-hidden
                                                className="size-4"
                                            />
                                            {statut.mot}
                                        </p>
                                        <span className="flex items-center gap-2">
                                            {s.nouvelle && (
                                                <Badge variant="nimba">
                                                    Nouvelle réponse
                                                </Badge>
                                            )}
                                            <span
                                                className="text-meta text-ink-500"
                                                data-capture="variable"
                                            >
                                                {depuis(s.saisi_le)}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="grid gap-0.5">
                                        <p className="line-clamp-2 font-semibold">
                                            {s.titre}
                                        </p>
                                        <p className="text-aide text-ink-500">
                                            {s.cible} · {s.motif}
                                        </p>
                                    </div>
                                    {s.message && (
                                        <p className="text-aide text-ink-600 italic">
                                            « {s.message} »
                                        </p>
                                    )}
                                    {s.reponse && (
                                        <div className="flex gap-2.5 rounded-controle bg-craie-100 p-3 dark:bg-white/[0.04]">
                                            <MessageSquareText
                                                aria-hidden
                                                className="mt-0.5 size-4 shrink-0 text-nimba-700 dark:text-nimba-300"
                                            />
                                            <div className="grid gap-0.5">
                                                <p className="text-aide font-semibold">
                                                    L’équipe N’karamögö
                                                </p>
                                                <p className="text-interface whitespace-pre-line text-ink-600">
                                                    {s.reponse}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}
