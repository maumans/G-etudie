import { Head, Link } from '@inertiajs/react';
import {
    CircleHelp,
    ListOrdered,
    MessagesSquare,
    Plus,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { FilTuteur } from '@/components/tuteur/fil-tuteur';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ProgressionSegments } from '@/components/ui/progression';
import { useTuteur } from '@/hooks/use-tuteur';
import type { ConversationInitiale } from '@/hooks/use-tuteur';
import { depuis } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import type { QuotaTuteur } from '@/types/global';
import { abonnement, tuteur as routeTuteur } from '@/routes/eleve';
import { show } from '@/routes/eleve/tuteur';

type MatiereTuteur = { cle: CleMatiere; nom: string; slug: string };

type ResumeConversation = {
    uuid: string;
    objet: 'question' | 'etape' | 'libre';
    titre: string;
    matiere: { cle: CleMatiere; nom: string } | null;
    reponses: number;
    le: string;
    est_exemple: boolean;
};

type Props = {
    quota: QuotaTuteur;
    matieres: MatiereTuteur[];
    conversations: ResumeConversation[];
    conversation: (ResumeConversation & ConversationInitiale) | null;
    est_exemple: boolean;
    texte_max: number;
};

const OBJETS: Record<ResumeConversation['objet'], string> = {
    question: 'Sur une question',
    etape: 'Sur une étape de corrigé',
    libre: 'Question libre',
};

/**
 * « Mon tuteur » (lot 10, PLAN M11) : poser une question libre dans une de
 * ses matières, relire et prolonger ses conversations, voir ce qui reste
 * aujourd'hui. En ligne seulement (HORS_LIGNE.md A.2) : la page n'est pas
 * gardée hors ligne, la garde de navigation explique pourquoi.
 */
export default function MonTuteur(props: Props) {
    return (
        <>
            <Head title="Mon tuteur" />
            {/* Une conversation par clé : changer de conversation repart d'un fil neuf. */}
            <Contenu key={props.conversation?.uuid ?? 'nouvelle'} {...props} />
        </>
    );
}

function Contenu({
    quota,
    matieres,
    conversations,
    conversation,
    est_exemple,
    texte_max,
}: Props) {
    const etat = useTuteur({
        initiale: conversation,
        quotaInitial: quota.restants,
    });
    const enConversation = conversation !== null || etat.messages.length > 0;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="grid min-w-0 content-start gap-6">
                <header className="grid gap-1.5">
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Ton tuteur <strong>N’karamögö</strong>
                    </h1>
                    <p className="max-w-2xl text-ink-600">
                        Il reprend le corrigé de tes enseignants et te
                        l’explique plus simplement, avec un exemple. Sous chaque
                        question ratée, touche « Explique-moi ».
                    </p>
                </header>

                {est_exemple && <BandeauExemple />}

                {enConversation ? (
                    <section
                        aria-labelledby="titre-conversation"
                        className="grid gap-5 rounded-carte border bg-card p-4 shadow-carte sm:p-5"
                    >
                        <div className="flex items-start gap-3">
                            {conversation?.matiere ? (
                                <TuileMatiere
                                    teinte={conversation.matiere.cle}
                                    taille="grande"
                                />
                            ) : (
                                <span
                                    aria-hidden
                                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                >
                                    <Sparkles className="size-5" />
                                </span>
                            )}
                            <div className="grid min-w-0 flex-1 gap-0.5">
                                <h2
                                    id="titre-conversation"
                                    className="line-clamp-2 text-[0.9375rem] font-semibold"
                                >
                                    {conversation?.titre ?? 'Ta question'}
                                </h2>
                                <p className="text-aide text-ink-500">
                                    {conversation
                                        ? [
                                              OBJETS[conversation.objet],
                                              conversation.matiere?.nom,
                                          ]
                                              .filter(Boolean)
                                              .join(' · ')
                                        : 'Nouvelle conversation'}
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                taille="compacte"
                                className="shrink-0 max-sm:px-2.5"
                            >
                                <Link href={routeTuteur()}>
                                    <Plus aria-hidden />
                                    <span className="max-sm:sr-only">
                                        Nouvelle question
                                    </span>
                                </Link>
                            </Button>
                        </div>
                        <FilTuteur
                            tuteur={etat}
                            texteMax={texte_max}
                            abonne={quota.abonne}
                        />
                    </section>
                ) : (
                    <PoserQuestion
                        matieres={matieres}
                        texteMax={texte_max}
                        epuise={(etat.quota ?? 0) <= 0}
                        abonne={quota.abonne}
                        envoyer={(matiere, texte) =>
                            void etat.demander({
                                demande: 'question',
                                matiere,
                                texte,
                            })
                        }
                        refus={etat.refus?.message ?? null}
                    />
                )}

                {!enConversation && <CommentCaMarche />}
            </div>

            <aside className="grid content-start gap-4">
                <CarteQuota
                    quota={quota}
                    restants={etat.quota ?? quota.restants}
                />
                <ListeConversations
                    conversations={conversations}
                    active={conversation?.uuid ?? null}
                />
            </aside>
        </div>
    );
}

function PoserQuestion({
    matieres,
    texteMax,
    epuise,
    abonne,
    envoyer,
    refus,
}: {
    matieres: MatiereTuteur[];
    texteMax: number;
    epuise: boolean;
    abonne: boolean;
    envoyer: (matiere: string, texte: string) => void;
    refus: string | null;
}) {
    const [matiere, setMatiere] = useState(matieres[0]?.slug ?? '');
    const [texte, setTexte] = useState('');

    function soumettre(evenement: FormEvent) {
        evenement.preventDefault();

        if (texte.trim() !== '' && matiere !== '') {
            envoyer(matiere, texte.trim());
        }
    }

    return (
        <section
            aria-labelledby="titre-poser"
            className="relative isolate grid gap-5 overflow-hidden rounded-panneau surface-encre p-5 text-white shadow-releve sm:p-6"
        >
            <div className="grid gap-1">
                <h2
                    id="titre-poser"
                    className="flex items-center gap-2 text-[1rem] font-semibold"
                >
                    <Sparkles aria-hidden className="size-4 text-nimba-300" />
                    Pose ta question
                </h2>
                <p className="text-aide text-white/70">
                    Une notion du cours, une méthode, un mot que tu ne comprends
                    pas : le tuteur reste dans ta matière.
                </p>
            </div>

            <form onSubmit={soumettre} className="grid gap-4">
                <fieldset className="grid gap-2">
                    <legend className="mb-2 text-aide font-medium text-white/85">
                        Dans quelle matière ?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {matieres.map((m) => (
                            <label
                                key={m.slug}
                                className={cn(
                                    'flex h-9 cursor-pointer items-center gap-2 rounded-controle pr-3 pl-1.5 text-aide ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white',
                                    matiere === m.slug
                                        ? 'clair bg-white text-ink-900 ring-white'
                                        : 'bg-white/[0.06] text-white/85 ring-white/15 hover:bg-white/10',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="matiere"
                                    value={m.slug}
                                    checked={matiere === m.slug}
                                    onChange={() => setMatiere(m.slug)}
                                    className="sr-only"
                                />
                                <TuileMatiere
                                    teinte={m.cle}
                                    taille="petite"
                                    className={cn(
                                        matiere === m.slug
                                            ? 'clair'
                                            : 'bg-white/10 text-white/85',
                                    )}
                                />
                                {m.nom}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="grid gap-1.5">
                    <label
                        htmlFor="question-tuteur"
                        className="text-aide font-medium text-white/85"
                    >
                        Ta question
                    </label>
                    <textarea
                        id="question-tuteur"
                        rows={3}
                        value={texte}
                        maxLength={texteMax}
                        onChange={(e) => setTexte(e.target.value)}
                        placeholder="Par exemple : pourquoi met-on les côtés au carré dans le théorème de Pythagore ?"
                        className="min-h-24 w-full resize-none rounded-controle bg-white/[0.08] px-3.5 py-3 text-interface text-white ring-1 ring-white/20 outline-none placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-nimba-300"
                    />
                    <p className="text-right text-meta text-white/55 font-data">
                        {texte.length} / {texteMax}
                    </p>
                </div>

                {(refus || epuise) && (
                    <p
                        role="status"
                        className="rounded-controle bg-white/[0.08] px-3.5 py-3 text-aide text-white/85"
                    >
                        {refus ??
                            'Tu as utilisé tes explications d’aujourd’hui. Le tuteur revient demain matin.'}
                        {!abonne && (
                            <>
                                {' '}
                                <Link
                                    href={abonnement()}
                                    className="font-semibold text-nimba-300 underline underline-offset-4"
                                >
                                    Voir l’abonnement
                                </Link>
                            </>
                        )}
                    </p>
                )}

                <Button
                    type="submit"
                    className="w-full sm:w-fit"
                    disabled={texte.trim() === '' || matiere === '' || epuise}
                >
                    Demander au tuteur
                </Button>
            </form>
        </section>
    );
}

function CommentCaMarche() {
    const gestes = [
        {
            icone: CircleHelp,
            titre: 'Sous une question ratée',
            texte: '« Explique-moi » reprend ta réponse et le corrigé.',
        },
        {
            icone: ListOrdered,
            titre: 'Sur une étape du corrigé',
            texte: '« Je ne comprends pas cette étape » : il t’explique celle-là.',
        },
        {
            icone: MessagesSquare,
            titre: 'Ici, une question libre',
            texte: 'Dans une de tes matières, à ton niveau.',
        },
    ];

    return (
        <section aria-labelledby="titre-gestes" className="grid gap-3">
            <h2 id="titre-gestes" className="text-[0.9375rem] font-semibold">
                Trois façons de l’appeler
            </h2>
            <ul className="grid divide-y rounded-carte border bg-card shadow-carte sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {gestes.map((g) => (
                    <li key={g.titre} className="flex gap-3 p-4">
                        <span
                            aria-hidden
                            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                        >
                            <g.icone className="size-[1.125rem]" />
                        </span>
                        <div className="grid gap-0.5">
                            <p className="text-interface font-semibold">
                                {g.titre}
                            </p>
                            <p className="text-aide text-ink-600">{g.texte}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function CarteQuota({
    quota,
    restants,
}: {
    quota: QuotaTuteur;
    restants: number;
}) {
    return (
        <section
            aria-labelledby="titre-quota"
            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
        >
            <h2 id="titre-quota" className="text-[0.9375rem] font-semibold">
                Aujourd’hui
            </h2>
            <p className="flex items-baseline gap-1.5">
                <span className="text-[2rem] leading-none font-semibold tracking-tight font-data">
                    {restants}
                </span>
                <span className="text-interface font-medium text-ink-500">
                    / {quota.limite}{' '}
                    {restants > 1
                        ? 'explications restantes'
                        : 'explication restante'}
                </span>
            </p>
            <ProgressionSegments
                valeur={
                    quota.limite === 0 ? 0 : (100 * restants) / quota.limite
                }
                libelle="Explications restantes aujourd’hui"
                segments={Math.min(quota.limite, 15) || 1}
            />
            <p className="text-aide text-ink-500">
                {quota.abonne ? (
                    `Avec ton abonnement : ${pluriel(quota.limite, 'explication')} par jour. Un recentrage ne compte pas.`
                ) : (
                    <>
                        {pluriel(
                            quota.limite,
                            'explication gratuite',
                            'explications gratuites',
                        )}{' '}
                        par jour.{' '}
                        <Link
                            href={abonnement()}
                            className="font-medium text-nimba-700 underline-offset-4 hover:underline dark:text-nimba-300"
                        >
                            Avec l’abonnement, bien plus
                        </Link>
                        .
                    </>
                )}
            </p>
        </section>
    );
}

function ListeConversations({
    conversations,
    active,
}: {
    conversations: ResumeConversation[];
    active: string | null;
}) {
    return (
        <section
            aria-labelledby="titre-conversations"
            className="grid gap-1 rounded-carte border bg-card p-2 shadow-carte"
        >
            <h2
                id="titre-conversations"
                className="px-3 pt-3 pb-1 text-[0.9375rem] font-semibold"
            >
                Tes conversations
            </h2>
            {conversations.length === 0 ? (
                <p className="px-3 pb-3 text-aide text-ink-500">
                    Tes explications s’afficheront ici : tu pourras les relire
                    avant l’examen.
                </p>
            ) : (
                <ul className="grid">
                    {conversations.map((c) => (
                        <li key={c.uuid}>
                            <Link
                                href={show(c.uuid)}
                                prefetch
                                aria-current={
                                    c.uuid === active ? 'page' : undefined
                                }
                                className={cn(
                                    'flex items-start gap-3 rounded-[12px] px-3 py-2.5 transition-colors outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                                    c.uuid === active &&
                                        'bg-nimba-500/[0.08] dark:bg-nimba-400/10',
                                )}
                            >
                                {c.matiere ? (
                                    <TuileMatiere teinte={c.matiere.cle} />
                                ) : (
                                    <span
                                        aria-hidden
                                        className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-craie-100 text-ink-600 dark:bg-white/[0.06]"
                                    >
                                        <Sparkles className="size-4" />
                                    </span>
                                )}
                                <span className="grid min-w-0 gap-0.5">
                                    <span className="line-clamp-2 text-interface font-medium">
                                        {c.titre}
                                    </span>
                                    <span className="text-meta text-ink-600">
                                        {OBJETS[c.objet]} ·{' '}
                                        <span data-capture="variable">
                                            {depuis(c.le)}
                                        </span>
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
