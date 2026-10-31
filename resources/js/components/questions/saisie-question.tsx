import { ArrowDown, ArrowUp } from 'lucide-react';
import { useId } from 'react';
import type { EtatChoix } from '@/components/ui/choix';
import { Choix, GroupeChoix } from '@/components/ui/choix';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { lireNombre, normaliserTexte } from '@/lib/contenu/questions';
import type {
    Element,
    QuestionEleve,
    ReponseQuestion,
} from '@/lib/contenu/questions';
import { cn } from '@/lib/utils';
import { MarquePartie, nombreFr, TexteElement } from './commun';

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

type Props = {
    question: Pick<QuestionEleve, 'type' | 'donnees' | 'attendue'>;
    reponse: ReponseQuestion;
    changer: (reponse: ReponseQuestion) => void;
    /** Après « Vérifier » : la saisie se fige et montre ce qui est juste. */
    corrigee: boolean;
    /** Libellé du champ (« Ta réponse » ; « Réponse attendue » à la relecture). */
    libelle?: string;
};

/**
 * La saisie d'une réponse, pour chacun des neuf types (PLAN M5), pensée
 * pour un téléphone d'entrée de gamme : cibles de 56 px, listes natives
 * plutôt que glisser-déposer, clavier numérique pour un nombre. Après
 * « Vérifier », chaque partie dit si elle est juste (icône + couleur) et la
 * bonne réponse s'affiche à côté — le corrigé pas à pas vient en dessous.
 */
export function SaisieQuestion(props: Props) {
    switch (props.question.type) {
        case 'qcm_une':
        case 'qcm_plusieurs':
            return <SaisieQcm {...props} />;
        case 'vrai_faux':
            return <SaisieVraiFaux {...props} />;
        case 'numerique':
            return <SaisieNumerique {...props} />;
        case 'courte':
            return <SaisieCourte {...props} />;
        case 'trous':
            return <SaisieTrous {...props} />;
        case 'appariement':
            return <SaisieAppariement {...props} />;
        case 'ordre':
            return <SaisieOrdre {...props} />;
        case 'ouverte':
            return <SaisieOuverte {...props} />;
    }
}

function SaisieQcm({ question, reponse, changer, corrigee }: Props) {
    const plusieurs = question.type === 'qcm_plusieurs';
    const options = question.donnees.options ?? [];
    const choisies = plusieurs
        ? (reponse.options ?? [])
        : reponse.option
          ? [reponse.option]
          : [];
    const bonnes = plusieurs
        ? ((question.attendue.options as string[] | undefined) ?? [])
        : typeof question.attendue.option === 'string'
          ? [question.attendue.option]
          : [];

    function etat(id: string): EtatChoix {
        const choisie = choisies.includes(id);

        if (!corrigee) {
            return choisie ? 'selectionne' : 'neutre';
        }

        if (bonnes.includes(id)) {
            return choisie ? 'juste' : 'bonne_reponse';
        }

        return choisie ? 'faux' : 'ecartee';
    }

    function choisir(id: string) {
        if (!plusieurs) {
            changer({ option: id });

            return;
        }

        changer({
            options: choisies.includes(id)
                ? choisies.filter((o) => o !== id)
                : [...choisies, id],
        });
    }

    return (
        <div className="grid gap-2.5">
            {plusieurs && !corrigee && (
                <p className="text-aide text-ink-600">
                    Coche toutes les bonnes réponses.
                </p>
            )}
            <GroupeChoix libelle="Réponses proposées" multiple={plusieurs}>
                {options.map((option, rang) => (
                    <Choix
                        key={option.id}
                        lettre={LETTRES[rang] ?? option.id.toUpperCase()}
                        etat={etat(option.id)}
                        multiple={plusieurs}
                        onChoisir={() => choisir(option.id)}
                    >
                        <TexteElement element={option} />
                    </Choix>
                ))}
            </GroupeChoix>
        </div>
    );
}

function SaisieVraiFaux({ question, reponse, changer, corrigee }: Props) {
    const bonne = question.attendue.valeur === true;

    function etat(valeur: boolean): EtatChoix {
        const choisie = reponse.valeur === valeur;

        if (!corrigee) {
            return choisie ? 'selectionne' : 'neutre';
        }

        if (valeur === bonne) {
            return choisie ? 'juste' : 'bonne_reponse';
        }

        return choisie ? 'faux' : 'ecartee';
    }

    return (
        <GroupeChoix
            libelle="Vrai ou faux"
            className="grid-cols-2 max-[359px]:grid-cols-1"
        >
            {[
                { valeur: true, lettre: 'V', libelle: 'Vrai' },
                { valeur: false, lettre: 'F', libelle: 'Faux' },
            ].map((c) => (
                <Choix
                    key={c.libelle}
                    lettre={c.lettre}
                    etat={etat(c.valeur)}
                    onChoisir={() => changer({ valeur: c.valeur })}
                >
                    {c.libelle}
                </Choix>
            ))}
        </GroupeChoix>
    );
}

/** Champ de réponse : bordure verte ou framboise une fois corrigé, et l'icône. */
function cadreCorrige(corrigee: boolean, juste: boolean) {
    if (!corrigee) {
        return undefined;
    }

    return juste
        ? 'border-juste-600 ring-1 ring-juste-600 dark:border-juste-400 dark:ring-juste-400'
        : 'border-faux-600 ring-1 ring-faux-600 dark:border-faux-400 dark:ring-faux-400';
}

function BonneReponse({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-aide text-ink-600">
            Réponse attendue :{' '}
            <strong className="font-semibold text-juste-700 dark:text-juste-400">
                {children}
            </strong>
        </p>
    );
}

function SaisieNumerique({
    question,
    reponse,
    changer,
    corrigee,
    libelle = 'Ta réponse',
}: Props) {
    const id = useId();
    const attendue = question.attendue as {
        valeur?: number;
        tolerance?: number;
        relative?: boolean;
    };
    const unite = question.donnees.unite;
    const saisie = typeof reponse.valeur === 'string' ? reponse.valeur : '';
    const nombre = lireNombre(saisie);
    const tolerance =
        attendue.relative === true
            ? (Math.abs(attendue.valeur ?? 0) * (attendue.tolerance ?? 0)) / 100
            : (attendue.tolerance ?? 0);
    const juste =
        nombre !== null &&
        Math.abs(nombre - (attendue.valeur ?? 0)) <=
            tolerance + 1e-9 * Math.max(1, Math.abs(attendue.valeur ?? 0));

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-aide font-medium text-ink-600">
                {libelle}
            </label>
            <div className="flex items-center gap-2.5">
                <div className="relative max-w-56 flex-1">
                    <Input
                        id={id}
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        value={saisie}
                        readOnly={corrigee}
                        aria-invalid={corrigee && !juste ? true : undefined}
                        onChange={(e) => changer({ valeur: e.target.value })}
                        className={cn(
                            'h-14 pr-10 text-lecture font-data sm:h-14 sm:text-lecture',
                            cadreCorrige(corrigee, juste),
                        )}
                    />
                    {corrigee && (
                        <span className="absolute top-1/2 right-3 -translate-y-1/2">
                            <MarquePartie juste={juste} />
                        </span>
                    )}
                </div>
                {unite && (
                    <span className="text-lecture font-medium text-ink-600">
                        {unite}
                    </span>
                )}
            </div>
            {!corrigee && saisie !== '' && nombre === null && (
                <p className="text-aide text-indice-700 dark:text-indice-400">
                    Écris seulement un nombre, par exemple 3,5
                    {unite ? ` (sans « ${unite} »)` : ''}.
                </p>
            )}
            {corrigee && !juste && (
                <BonneReponse>
                    {nombreFr(attendue.valeur)}
                    {unite ? ` ${unite}` : ''}
                    {tolerance > 0 ? ` (à ${nombreFr(tolerance)} près)` : ''}
                </BonneReponse>
            )}
        </div>
    );
}

function SaisieCourte({
    question,
    reponse,
    changer,
    corrigee,
    libelle = 'Ta réponse',
}: Props) {
    const id = useId();
    const acceptees =
        (question.attendue.acceptees as string[] | undefined) ?? [];
    const saisie = reponse.texte ?? '';
    const juste = acceptees.some(
        (a) =>
            normaliserTexte(a) === normaliserTexte(saisie) &&
            normaliserTexte(saisie) !== '',
    );

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-aide font-medium text-ink-600">
                {libelle}
            </label>
            <div className="relative">
                <Input
                    id={id}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    maxLength={100}
                    value={saisie}
                    readOnly={corrigee}
                    onChange={(e) => changer({ texte: e.target.value })}
                    className={cn(
                        'h-14 pr-10 text-lecture sm:h-14 sm:text-lecture',
                        cadreCorrige(corrigee, juste),
                    )}
                />
                {corrigee && (
                    <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        <MarquePartie juste={juste} />
                    </span>
                )}
            </div>
            {!corrigee && (
                <p className="text-meta text-ink-500">
                    Majuscules et accents ne comptent pas.
                </p>
            )}
            {corrigee && !juste && acceptees[0] && (
                <BonneReponse>{acceptees[0]}</BonneReponse>
            )}
        </div>
    );
}

function SaisieTrous({ question, reponse, changer, corrigee }: Props) {
    const segments = question.donnees.segments ?? [];
    const attendus = (question.attendue.trous ?? {}) as Record<
        string,
        string[]
    >;
    const saisis = reponse.trous ?? {};
    let numero = 0;

    function juste(id: string) {
        const saisi = normaliserTexte(saisis[id] ?? '');

        return (
            saisi !== '' &&
            (attendus[id] ?? []).some((a) => normaliserTexte(a) === saisi)
        );
    }

    return (
        <div className="grid gap-3">
            <p className="text-lecture leading-[2.4]">
                {segments.map((segment, rang) => {
                    if (!('trou' in segment)) {
                        return <span key={rang}>{segment.texte}</span>;
                    }

                    numero++;
                    const id = segment.trou;
                    const commun = cn(
                        'mx-0.5 inline-flex h-10 align-middle text-lecture sm:h-10 sm:text-lecture',
                        cadreCorrige(corrigee, juste(id)),
                    );

                    return (
                        <span
                            key={rang}
                            className="inline-flex items-center gap-1 align-middle"
                        >
                            {segment.choix ? (
                                <select
                                    aria-label={`Trou ${numero}`}
                                    value={saisis[id] ?? ''}
                                    disabled={corrigee}
                                    onChange={(e) =>
                                        changer({
                                            trous: {
                                                ...saisis,
                                                [id]: e.target.value,
                                            },
                                        })
                                    }
                                    className={cn(
                                        'rounded-controle border border-input bg-card px-2 shadow-xs outline-none focus-visible:border-nimba-600 focus-visible:ring-4 focus-visible:ring-nimba-600/15 disabled:opacity-100 dark:bg-relief/40',
                                        commun,
                                    )}
                                >
                                    <option value="">…</option>
                                    {segment.choix.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    aria-label={`Trou ${numero}`}
                                    autoComplete="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    maxLength={100}
                                    value={saisis[id] ?? ''}
                                    readOnly={corrigee}
                                    onChange={(e) =>
                                        changer({
                                            trous: {
                                                ...saisis,
                                                [id]: e.target.value,
                                            },
                                        })
                                    }
                                    className={cn('w-32 px-2.5', commun)}
                                />
                            )}
                            {corrigee && <MarquePartie juste={juste(id)} />}
                        </span>
                    );
                })}
            </p>
            {corrigee &&
                segments.some((s) => 'trou' in s && !juste(s.trou)) && (
                    <BonneReponse>
                        {segments
                            .filter((s): s is { trou: string } => 'trou' in s)
                            .map((s) => attendus[s.trou]?.[0] ?? '')
                            .join(' · ')}
                    </BonneReponse>
                )}
        </div>
    );
}

function SaisieAppariement({ question, reponse, changer, corrigee }: Props) {
    const gauche = question.donnees.gauche ?? [];
    const droite = question.donnees.droite ?? [];
    const paires = reponse.paires ?? {};
    const attendues = (question.attendue.paires ?? {}) as Record<
        string,
        string
    >;
    const texte = (element?: Element) =>
        element
            ? `${element.texte}${element.latex ? ` ${element.latex}` : ''}`
            : '';

    return (
        <ul className="grid gap-2.5">
            {gauche.map((g) => {
                const juste = paires[g.id] === attendues[g.id];

                return (
                    <li
                        key={g.id}
                        className="grid gap-2 rounded-controle border border-contour bg-card px-3 py-3 shadow-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center dark:bg-relief/40"
                    >
                        <span className="text-lecture font-medium">
                            <TexteElement element={g} />
                        </span>
                        <span className="flex items-center gap-2">
                            <select
                                aria-label={`Ce qui va avec « ${texte(g)} »`}
                                value={paires[g.id] ?? ''}
                                disabled={corrigee}
                                onChange={(e) =>
                                    changer({
                                        paires: {
                                            ...paires,
                                            [g.id]: e.target.value,
                                        },
                                    })
                                }
                                className={cn(
                                    'h-11 min-w-0 flex-1 rounded-controle border border-input bg-card px-2.5 text-interface shadow-xs outline-none focus-visible:border-nimba-600 focus-visible:ring-4 focus-visible:ring-nimba-600/15 disabled:opacity-100 dark:bg-relief/40',
                                    cadreCorrige(corrigee, juste),
                                )}
                            >
                                <option value="">Choisir…</option>
                                {droite.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {texte(d)}
                                    </option>
                                ))}
                            </select>
                            {corrigee && <MarquePartie juste={juste} />}
                        </span>
                        {corrigee && !juste && (
                            <span className="text-aide text-ink-600 sm:col-start-2">
                                Attendu :{' '}
                                <strong className="font-semibold text-juste-700 dark:text-juste-400">
                                    {texte(
                                        droite.find(
                                            (d) => d.id === attendues[g.id],
                                        ),
                                    )}
                                </strong>
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function SaisieOrdre({ question, reponse, changer, corrigee }: Props) {
    const elements = question.donnees.elements ?? [];
    const ordre = reponse.ordre ?? elements.map((e) => e.id);
    const attendu = (question.attendue.ordre as string[] | undefined) ?? [];
    const parId = new Map(elements.map((e) => [e.id, e]));

    function deplacer(rang: number, sens: -1 | 1) {
        const suivant = [...ordre];
        const cible = rang + sens;

        [suivant[rang], suivant[cible]] = [suivant[cible], suivant[rang]];
        changer({ ordre: suivant });
    }

    return (
        <div className="grid gap-3">
            {!corrigee && (
                <p className="text-aide text-ink-600">
                    Range les éléments avec les flèches, du premier au dernier.
                </p>
            )}
            <ol className="grid gap-2.5" aria-label="Ordre proposé">
                {ordre.map((id, rang) => {
                    const element = parId.get(id);
                    const juste = attendu[rang] === id;

                    if (!element) {
                        return null;
                    }

                    return (
                        <li
                            key={id}
                            className={cn(
                                'flex min-h-14 items-center gap-3 rounded-controle border border-contour bg-card py-1.5 pr-1.5 pl-3 shadow-xs dark:bg-relief/40',
                                cadreCorrige(corrigee, juste),
                            )}
                        >
                            <span
                                aria-hidden
                                className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-ink-900 text-aide font-semibold text-craie-50 font-data"
                            >
                                {rang + 1}
                            </span>
                            <span className="min-w-0 flex-1 text-lecture">
                                <TexteElement element={element} />
                            </span>
                            {corrigee ? (
                                <span className="pr-2">
                                    <MarquePartie juste={juste} />
                                </span>
                            ) : (
                                <span className="flex shrink-0 gap-0.5">
                                    <BoutonDeplacer
                                        icone={ArrowUp}
                                        libelle={`Monter « ${element.texte || element.latex} »`}
                                        desactive={rang === 0}
                                        onClick={() => deplacer(rang, -1)}
                                    />
                                    <BoutonDeplacer
                                        icone={ArrowDown}
                                        libelle={`Descendre « ${element.texte || element.latex} »`}
                                        desactive={rang === ordre.length - 1}
                                        onClick={() => deplacer(rang, 1)}
                                    />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
            {corrigee && attendu.some((id, rang) => ordre[rang] !== id) && (
                <div className="grid gap-1.5 text-aide text-ink-600">
                    <p>Le bon ordre :</p>
                    <ol className="grid list-decimal gap-1 pl-5 marker:font-semibold">
                        {attendu.map((id) => {
                            const element = parId.get(id);

                            return element ? (
                                <li key={id} className="text-ink-900">
                                    <TexteElement element={element} />
                                </li>
                            ) : null;
                        })}
                    </ol>
                </div>
            )}
        </div>
    );
}

function BoutonDeplacer({
    icone: Icone,
    libelle,
    desactive,
    onClick,
}: {
    icone: typeof ArrowUp;
    libelle: string;
    desactive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={libelle}
            disabled={desactive}
            onClick={onClick}
            className="flex size-11 items-center justify-center rounded-[8px] text-ink-600 outline-none hover:bg-craie-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30 dark:hover:bg-white/[0.06]"
        >
            <Icone aria-hidden className="size-[18px]" />
        </button>
    );
}

function SaisieOuverte({ reponse, changer, corrigee }: Props) {
    const id = useId();
    const texte = reponse.texte ?? '';

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-aide font-medium text-ink-600">
                Ta rédaction
            </label>
            <Textarea
                id={id}
                value={texte}
                readOnly={corrigee}
                maxLength={4000}
                onChange={(e) => changer({ texte: e.target.value })}
                className="min-h-44 text-lecture sm:text-lecture"
            />
            <p className="flex justify-between gap-3 text-meta text-ink-500">
                <span>
                    {corrigee
                        ? 'Compare ta rédaction au corrigé, puis coche ce que tu as fait.'
                        : 'Écris comme sur ta copie. Tu la compareras ensuite au corrigé.'}
                </span>
                <span className="shrink-0 font-data">
                    {texte.length} / 4 000
                </span>
            </p>
        </div>
    );
}
