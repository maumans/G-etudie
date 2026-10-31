import { ArrowDown, ArrowUp, Plus, Sigma, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Textarea } from '@/components/ui/textarea';
import type {
    Critere,
    DonneesQuestion,
    Element,
    TypeQuestion,
} from '@/lib/contenu/questions';
import { lireNombre } from '@/lib/contenu/questions';
import { texteVersTrous, trousVersTexte } from '@/lib/contenu/trous';
import { cn } from '@/lib/utils';

type Attendue = Record<string, unknown>;

type Props = {
    type: TypeQuestion;
    donnees: DonneesQuestion;
    attendue: Attendue;
    changer: (donnees: DonneesQuestion, attendue: Attendue) => void;
};

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Premier repère libre d'une famille (a…f, g1…g6, e1…e8…). */
function repereLibre(pris: string[], candidats: string[]): string | null {
    return candidats.find((c) => !pris.includes(c)) ?? null;
}

const serie = (prefixe: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${prefixe}${i + 1}`);

/** Éléments vides, pour qu'un formulaire neuf ait déjà sa forme. */
export const vides = (prefixe: string, n: number): Element[] =>
    serie(prefixe, n).map((id) => ({ id, texte: '' }));

/**
 * La partie « réponse » de l'écran de saisie, propre à chaque type (format :
 * `App\Support\FormatQuestion`). Le brouillon peut rester incomplet ; ce qui
 * manque est dit par le serveur avant l'envoi en relecture.
 */
export function FormulaireReponse(props: Props) {
    switch (props.type) {
        case 'qcm_une':
        case 'qcm_plusieurs':
            return <FormulaireQcm {...props} />;
        case 'vrai_faux':
            return <FormulaireVraiFaux {...props} />;
        case 'numerique':
            return <FormulaireNumerique {...props} />;
        case 'courte':
            return <FormulaireCourte {...props} />;
        case 'trous':
            return <FormulaireTrous {...props} />;
        case 'appariement':
            return <FormulaireAppariement {...props} />;
        case 'ordre':
            return <FormulaireOrdre {...props} />;
        case 'ouverte':
            return <FormulaireBareme {...props} />;
    }
}

/** Un élément : texte, et formule LaTeX facultative (dépliée à la demande). */
function LigneElement({
    element,
    libelle,
    changer,
    avant,
    apres,
}: {
    element: Element;
    libelle: string;
    changer: (element: Element) => void;
    avant?: React.ReactNode;
    apres?: React.ReactNode;
}) {
    const [formule, setFormule] = useState(element.latex !== undefined);

    return (
        <div className="grid gap-2 rounded-controle border border-contour bg-card p-2.5 shadow-xs dark:bg-relief/40">
            <div className="flex items-center gap-2">
                {avant}
                <Input
                    taille="compacte"
                    aria-label={libelle}
                    value={element.texte}
                    maxLength={300}
                    placeholder={formule ? 'Texte (facultatif)' : 'Texte'}
                    onChange={(e) =>
                        changer({ ...element, texte: e.target.value })
                    }
                    className="min-w-0 flex-1"
                />
                <Button
                    type="button"
                    variant="ghost"
                    taille="icone-compacte"
                    aria-label={
                        formule
                            ? `Retirer la formule de « ${libelle} »`
                            : `Ajouter une formule à « ${libelle} »`
                    }
                    aria-pressed={formule}
                    onClick={() => {
                        if (formule) {
                            const { latex: _retiree, ...reste } = element;

                            changer(reste);
                        }

                        setFormule(!formule);
                    }}
                    className={cn(
                        formule && 'bg-ink-900/[0.07] dark:bg-white/10',
                    )}
                >
                    <Sigma aria-hidden />
                </Button>
                {apres}
            </div>
            {formule && (
                <Input
                    taille="compacte"
                    aria-label={`Formule de « ${libelle} » (LaTeX)`}
                    value={element.latex ?? ''}
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder="x = \frac{3}{4}"
                    onChange={(e) =>
                        changer({ ...element, latex: e.target.value })
                    }
                    className="font-mono text-[0.8125rem]"
                />
            )}
        </div>
    );
}

function BoutonRetirer({
    libelle,
    onClick,
    desactive = false,
}: {
    libelle: string;
    onClick: () => void;
    desactive?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            ton="danger"
            taille="icone-compacte"
            aria-label={libelle}
            disabled={desactive}
            onClick={onClick}
        >
            <Trash2 aria-hidden />
        </Button>
    );
}

function BoutonAjouter({
    children,
    onClick,
    desactive,
}: {
    children: React.ReactNode;
    onClick: () => void;
    desactive: boolean;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            taille="compacte"
            className="w-fit"
            disabled={desactive}
            onClick={onClick}
        >
            <Plus aria-hidden />
            {children}
        </Button>
    );
}

function Aide({ children }: { children: React.ReactNode }) {
    return <p className="text-aide text-ink-500">{children}</p>;
}

function FormulaireQcm({ type, donnees, attendue, changer }: Props) {
    const plusieurs = type === 'qcm_plusieurs';
    const options =
        donnees.options && donnees.options.length > 0
            ? donnees.options
            : ['a', 'b', 'c', 'd'].map((id) => ({ id, texte: '' }));
    const bonnes = plusieurs
        ? ((attendue.options as string[] | undefined) ?? [])
        : typeof attendue.option === 'string'
          ? [attendue.option]
          : [];

    function ecrire(suivantes: Element[], justes: string[]) {
        const ids = suivantes.map((o) => o.id);
        const gardees = justes.filter((j) => ids.includes(j));

        changer(
            { options: suivantes },
            plusieurs
                ? { options: gardees }
                : gardees[0]
                  ? { option: gardees[0] }
                  : {},
        );
    }

    function basculer(id: string) {
        if (!plusieurs) {
            ecrire(options, [id]);

            return;
        }

        ecrire(
            options,
            bonnes.includes(id)
                ? bonnes.filter((b) => b !== id)
                : [...bonnes, id],
        );
    }

    return (
        <div className="grid gap-3">
            <Aide>
                {plusieurs
                    ? 'Cochez toutes les bonnes réponses : une réponse incomplète compte en partie.'
                    : 'Cochez la bonne réponse. L’élève voit les propositions dans cet ordre.'}
            </Aide>
            <ul className="grid gap-2" aria-label="Propositions">
                {options.map((option, rang) => (
                    <li key={option.id}>
                        <LigneElement
                            element={option}
                            libelle={`Proposition ${LETTRES[rang]}`}
                            changer={(suivante) =>
                                ecrire(
                                    options.map((o) =>
                                        o.id === option.id ? suivante : o,
                                    ),
                                    bonnes,
                                )
                            }
                            avant={
                                <label className="flex shrink-0 items-center gap-2 pr-1 text-aide font-semibold text-ink-600">
                                    {plusieurs ? (
                                        <Checkbox
                                            checked={bonnes.includes(option.id)}
                                            onCheckedChange={() =>
                                                basculer(option.id)
                                            }
                                            aria-label={`Proposition ${LETTRES[rang]} juste`}
                                        />
                                    ) : (
                                        <input
                                            type="radio"
                                            name="bonne-option"
                                            checked={bonnes.includes(option.id)}
                                            onChange={() => basculer(option.id)}
                                            aria-label={`Proposition ${LETTRES[rang]} juste`}
                                            className="size-[18px] accent-nimba-600"
                                        />
                                    )}
                                    <span aria-hidden className="w-3 font-data">
                                        {LETTRES[rang]}
                                    </span>
                                </label>
                            }
                            apres={
                                <BoutonRetirer
                                    libelle={`Retirer la proposition ${LETTRES[rang]}`}
                                    desactive={options.length <= 2}
                                    onClick={() =>
                                        ecrire(
                                            options.filter(
                                                (o) => o.id !== option.id,
                                            ),
                                            bonnes,
                                        )
                                    }
                                />
                            }
                        />
                    </li>
                ))}
            </ul>
            <BoutonAjouter
                desactive={options.length >= 6}
                onClick={() => {
                    const id = repereLibre(
                        options.map((o) => o.id),
                        ['a', 'b', 'c', 'd', 'e', 'f'],
                    );

                    if (id) {
                        ecrire([...options, { id, texte: '' }], bonnes);
                    }
                }}
            >
                Ajouter une proposition
            </BoutonAjouter>
        </div>
    );
}

function FormulaireVraiFaux({ attendue, changer }: Props) {
    const nom = useId();

    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-aide text-ink-500">
                L’affirmation est dans l’énoncé. Elle est :
            </legend>
            <div className="flex gap-2">
                {[
                    { valeur: true, libelle: 'Vraie' },
                    { valeur: false, libelle: 'Fausse' },
                ].map((c) => (
                    <label
                        key={c.libelle}
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-controle border border-contour bg-card px-3.5 text-interface font-medium shadow-xs has-[:checked]:border-nimba-600 has-[:checked]:ring-1 has-[:checked]:ring-nimba-600 dark:bg-relief/40 dark:has-[:checked]:border-nimba-300 dark:has-[:checked]:ring-nimba-300"
                    >
                        <input
                            type="radio"
                            name={nom}
                            checked={attendue.valeur === c.valeur}
                            onChange={() => changer({}, { valeur: c.valeur })}
                            className="size-4 accent-nimba-600"
                        />
                        {c.libelle}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

function FormulaireNumerique({ donnees, attendue, changer }: Props) {
    const ids = { valeur: useId(), tolerance: useId(), unite: useId() };
    // Ce qui est tapé reste tel quel tant que ce n'est pas un nombre.
    const [saisie, setSaisie] = useState({
        valeur:
            typeof attendue.valeur === 'number'
                ? String(attendue.valeur).replace('.', ',')
                : '',
        tolerance:
            typeof attendue.tolerance === 'number'
                ? String(attendue.tolerance).replace('.', ',')
                : '0',
    });
    const relative = attendue.relative === true;

    function ecrire(
        modif: Partial<typeof saisie>,
        rel = relative,
        unite = donnees.unite,
    ) {
        const suivante = { ...saisie, ...modif };
        setSaisie(suivante);
        const valeur = lireNombre(suivante.valeur);
        const tolerance = lireNombre(suivante.tolerance);

        changer(unite ? { unite } : {}, {
            ...(valeur !== null ? { valeur } : {}),
            tolerance: tolerance ?? 0,
            relative: rel,
        });
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
                <label htmlFor={ids.valeur} className="text-aide font-medium">
                    Valeur attendue
                </label>
                <Input
                    id={ids.valeur}
                    taille="compacte"
                    inputMode="decimal"
                    value={saisie.valeur}
                    onChange={(e) => ecrire({ valeur: e.target.value })}
                    className="font-data"
                    placeholder="3,14"
                />
            </div>
            <div className="grid gap-1.5">
                <label htmlFor={ids.unite} className="text-aide font-medium">
                    Unité affichée{' '}
                    <span className="font-normal text-ink-500">
                        (facultatif)
                    </span>
                </label>
                <Input
                    id={ids.unite}
                    taille="compacte"
                    maxLength={20}
                    value={donnees.unite ?? ''}
                    onChange={(e) => ecrire({}, relative, e.target.value)}
                    placeholder="cm, mol/L, GNF…"
                />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <label
                    htmlFor={ids.tolerance}
                    className="text-aide font-medium"
                >
                    Tolérance
                </label>
                <div className="flex gap-2">
                    <Input
                        id={ids.tolerance}
                        taille="compacte"
                        inputMode="decimal"
                        value={saisie.tolerance}
                        onChange={(e) => ecrire({ tolerance: e.target.value })}
                        className="w-28 font-data"
                    />
                    <ListeDeroulante
                        taille="compacte"
                        aria-label="Nature de la tolérance"
                        value={relative ? 'relative' : 'absolue'}
                        onChange={(e) =>
                            ecrire({}, e.target.value === 'relative')
                        }
                        className="w-48"
                    >
                        <option value="absolue">en valeur (±)</option>
                        <option value="relative">en pourcentage (%)</option>
                    </ListeDeroulante>
                </div>
                <Aide>
                    L’élève tape le nombre seul (virgule ou point), sans
                    l’unité. 0 : la valeur exacte.
                </Aide>
            </div>
        </div>
    );
}

function FormulaireCourte({ attendue, changer }: Props) {
    const acceptees = (attendue.acceptees as string[] | undefined)?.length
        ? (attendue.acceptees as string[])
        : [''];

    function ecrire(suivantes: string[]) {
        changer({}, { acceptees: suivantes });
    }

    return (
        <div className="grid gap-3">
            <Aide>
                Majuscules, accents et ponctuation ne comptent pas. Ajoutez les
                autres formes justes (« l’hypoténuse », « hypothénuse »…).
            </Aide>
            <ul className="grid gap-2" aria-label="Formes acceptées">
                {acceptees.map((forme, rang) => (
                    <li key={rang} className="flex items-center gap-2">
                        <Input
                            taille="compacte"
                            aria-label={`Forme acceptée ${rang + 1}`}
                            value={forme}
                            maxLength={100}
                            onChange={(e) =>
                                ecrire(
                                    acceptees.map((a, i) =>
                                        i === rang ? e.target.value : a,
                                    ),
                                )
                            }
                        />
                        <BoutonRetirer
                            libelle={`Retirer la forme ${rang + 1}`}
                            desactive={acceptees.length <= 1}
                            onClick={() =>
                                ecrire(acceptees.filter((_, i) => i !== rang))
                            }
                        />
                    </li>
                ))}
            </ul>
            <BoutonAjouter
                desactive={acceptees.length >= 10}
                onClick={() => ecrire([...acceptees, ''])}
            >
                Ajouter une forme
            </BoutonAjouter>
        </div>
    );
}

function FormulaireTrous({ donnees, attendue, changer }: Props) {
    const id = useId();
    const [texte, setTexte] = useState(() =>
        trousVersTexte(
            donnees.segments ?? [],
            (attendue.trous ?? {}) as Record<string, string[]>,
        ),
    );
    const { segments, trous } = texteVersTrous(texte);
    const nombre = Object.keys(trous).length;

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-aide font-medium">
                Le texte et ses trous
            </label>
            <Textarea
                id={id}
                value={texte}
                rows={4}
                onChange={(e) => {
                    setTexte(e.target.value);
                    const lu = texteVersTrous(e.target.value);
                    changer({ segments: lu.segments }, { trous: lu.trous });
                }}
                placeholder="Les mangues que Fanta a [achetées] étaient mûres. Ses amies ont [marchée / *marché / marchées] jusqu’au marché."
            />
            <Aide>
                Entre crochets, un trou : <code>[achetées]</code>. Plusieurs
                formes justes : <code>[achetées / achetees]</code>. Une étoile
                fait une liste de choix, l’étoilée est juste :{' '}
                <code>[marchée / *marché]</code>.
            </Aide>
            <p className="text-meta text-ink-500">
                {nombre === 0
                    ? 'Aucun trou pour l’instant.'
                    : `${nombre} trou${nombre > 1 ? 's' : ''} : ${segments
                          .filter(
                              (s): s is { trou: string; choix?: string[] } =>
                                  'trou' in s,
                          )
                          .map((s) => (s.choix ? 'liste' : 'à écrire'))
                          .join(', ')}.`}
            </p>
        </div>
    );
}

function FormulaireAppariement({ donnees, attendue, changer }: Props) {
    const gauche =
        donnees.gauche && donnees.gauche.length > 0
            ? donnees.gauche
            : vides('g', 3);
    const droite =
        donnees.droite && donnees.droite.length > 0
            ? donnees.droite
            : vides('d', 3);
    const paires = (attendue.paires ?? {}) as Record<string, string>;

    function ecrire(g: Element[], d: Element[], p: Record<string, string>) {
        const idsD = d.map((x) => x.id);
        const gardees = Object.fromEntries(
            Object.entries(p).filter(
                ([cle, val]) =>
                    g.some((x) => x.id === cle) && idsD.includes(val),
            ),
        );

        changer({ gauche: g, droite: d }, { paires: gardees });
    }

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid content-start gap-2.5">
                <p className="text-aide font-semibold">
                    À gauche, et ce qui va avec
                </p>
                {gauche.map((g, rang) => (
                    <div key={g.id} className="grid gap-1.5">
                        <LigneElement
                            element={g}
                            libelle={`Élément de gauche ${rang + 1}`}
                            changer={(suivant) =>
                                ecrire(
                                    gauche.map((x) =>
                                        x.id === g.id ? suivant : x,
                                    ),
                                    droite,
                                    paires,
                                )
                            }
                            apres={
                                <BoutonRetirer
                                    libelle={`Retirer l’élément de gauche ${rang + 1}`}
                                    desactive={gauche.length <= 2}
                                    onClick={() =>
                                        ecrire(
                                            gauche.filter((x) => x.id !== g.id),
                                            droite,
                                            paires,
                                        )
                                    }
                                />
                            }
                        />
                        <ListeDeroulante
                            taille="compacte"
                            aria-label={`Ce qui va avec l’élément de gauche ${rang + 1}`}
                            value={paires[g.id] ?? ''}
                            onChange={(e) =>
                                ecrire(gauche, droite, {
                                    ...paires,
                                    [g.id]: e.target.value,
                                })
                            }
                        >
                            <option value="">Va avec…</option>
                            {droite.map((d, i) => (
                                <option key={d.id} value={d.id}>
                                    {d.texte ||
                                        d.latex ||
                                        `Élément de droite ${i + 1}`}
                                </option>
                            ))}
                        </ListeDeroulante>
                    </div>
                ))}
                <BoutonAjouter
                    desactive={gauche.length >= 6}
                    onClick={() => {
                        const id = repereLibre(
                            gauche.map((x) => x.id),
                            serie('g', 6),
                        );

                        if (id) {
                            ecrire(
                                [...gauche, { id, texte: '' }],
                                droite,
                                paires,
                            );
                        }
                    }}
                >
                    Ajouter à gauche
                </BoutonAjouter>
            </div>
            <div className="grid content-start gap-2.5">
                <p className="text-aide font-semibold">À droite</p>
                <Aide>
                    L’élève les reçoit mélangés. Un élément de trop rend
                    l’exercice moins devinable.
                </Aide>
                {droite.map((d, rang) => (
                    <LigneElement
                        key={d.id}
                        element={d}
                        libelle={`Élément de droite ${rang + 1}`}
                        changer={(suivant) =>
                            ecrire(
                                gauche,
                                droite.map((x) =>
                                    x.id === d.id ? suivant : x,
                                ),
                                paires,
                            )
                        }
                        apres={
                            <BoutonRetirer
                                libelle={`Retirer l’élément de droite ${rang + 1}`}
                                desactive={droite.length <= 2}
                                onClick={() =>
                                    ecrire(
                                        gauche,
                                        droite.filter((x) => x.id !== d.id),
                                        paires,
                                    )
                                }
                            />
                        }
                    />
                ))}
                <BoutonAjouter
                    desactive={droite.length >= 8}
                    onClick={() => {
                        const id = repereLibre(
                            droite.map((x) => x.id),
                            serie('d', 8),
                        );

                        if (id) {
                            ecrire(
                                gauche,
                                [...droite, { id, texte: '' }],
                                paires,
                            );
                        }
                    }}
                >
                    Ajouter à droite
                </BoutonAjouter>
            </div>
        </div>
    );
}

function FormulaireOrdre({ donnees, changer }: Props) {
    const elements =
        donnees.elements && donnees.elements.length > 0
            ? donnees.elements
            : vides('e', 3);

    // Saisis dans le bon ordre : l'ordre attendu est celui de la liste.
    function ecrire(suivants: Element[]) {
        changer({ elements: suivants }, { ordre: suivants.map((e) => e.id) });
    }

    function deplacer(rang: number, sens: -1 | 1) {
        const suivants = [...elements];

        [suivants[rang], suivants[rang + sens]] = [
            suivants[rang + sens],
            suivants[rang],
        ];
        ecrire(suivants);
    }

    return (
        <div className="grid gap-3">
            <Aide>
                Écrivez les éléments dans le bon ordre : l’élève les recevra
                mélangés.
            </Aide>
            <ol className="grid gap-2" aria-label="Éléments, dans le bon ordre">
                {elements.map((element, rang) => (
                    <li key={element.id}>
                        <LigneElement
                            element={element}
                            libelle={`Élément ${rang + 1}`}
                            changer={(suivant) =>
                                ecrire(
                                    elements.map((x) =>
                                        x.id === element.id ? suivant : x,
                                    ),
                                )
                            }
                            avant={
                                <span
                                    aria-hidden
                                    className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-ink-900 text-aide font-semibold text-craie-50 font-data"
                                >
                                    {rang + 1}
                                </span>
                            }
                            apres={
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Monter l’élément ${rang + 1}`}
                                        disabled={rang === 0}
                                        onClick={() => deplacer(rang, -1)}
                                    >
                                        <ArrowUp aria-hidden />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        taille="icone-compacte"
                                        aria-label={`Descendre l’élément ${rang + 1}`}
                                        disabled={rang === elements.length - 1}
                                        onClick={() => deplacer(rang, 1)}
                                    >
                                        <ArrowDown aria-hidden />
                                    </Button>
                                    <BoutonRetirer
                                        libelle={`Retirer l’élément ${rang + 1}`}
                                        desactive={elements.length <= 2}
                                        onClick={() =>
                                            ecrire(
                                                elements.filter(
                                                    (x) => x.id !== element.id,
                                                ),
                                            )
                                        }
                                    />
                                </>
                            }
                        />
                    </li>
                ))}
            </ol>
            <BoutonAjouter
                desactive={elements.length >= 8}
                onClick={() => {
                    const id = repereLibre(
                        elements.map((x) => x.id),
                        serie('e', 8),
                    );

                    if (id) {
                        ecrire([...elements, { id, texte: '' }]);
                    }
                }}
            >
                Ajouter un élément
            </BoutonAjouter>
        </div>
    );
}

function FormulaireBareme({ donnees, changer }: Props) {
    const bareme: Critere[] =
        donnees.bareme && donnees.bareme.length > 0
            ? donnees.bareme
            : [{ id: 'c1', critere: '', points: 1 }];
    const total = bareme.reduce((s, c) => s + (c.points || 0), 0);

    function ecrire(suivant: Critere[]) {
        changer({ bareme: suivant }, {});
    }

    return (
        <div className="grid gap-3">
            <Aide>
                L’élève rédige, lit le corrigé, puis coche les critères qu’il
                remplit. Écrivez-les comme il les cochera : « J’ai cité le
                théorème ». La rédaction modèle va dans le corrigé.
            </Aide>
            <ul className="grid gap-2" aria-label="Critères du barème">
                {bareme.map((critere, rang) => (
                    <li
                        key={critere.id}
                        className="flex items-center gap-2 rounded-controle border border-contour bg-card p-2.5 shadow-xs dark:bg-relief/40"
                    >
                        <Input
                            taille="compacte"
                            aria-label={`Critère ${rang + 1}`}
                            value={critere.critere}
                            maxLength={300}
                            placeholder="J’ai…"
                            onChange={(e) =>
                                ecrire(
                                    bareme.map((c) =>
                                        c.id === critere.id
                                            ? { ...c, critere: e.target.value }
                                            : c,
                                    ),
                                )
                            }
                            className="min-w-0 flex-1"
                        />
                        <Input
                            taille="compacte"
                            type="number"
                            min={1}
                            max={10}
                            aria-label={`Points du critère ${rang + 1}`}
                            value={critere.points}
                            onChange={(e) =>
                                ecrire(
                                    bareme.map((c) =>
                                        c.id === critere.id
                                            ? {
                                                  ...c,
                                                  points: Math.max(
                                                      1,
                                                      Math.min(
                                                          10,
                                                          Number(
                                                              e.target.value,
                                                          ) || 1,
                                                      ),
                                                  ),
                                              }
                                            : c,
                                    ),
                                )
                            }
                            className="w-16 font-data"
                        />
                        <span className="text-meta text-ink-500">pts</span>
                        <BoutonRetirer
                            libelle={`Retirer le critère ${rang + 1}`}
                            desactive={bareme.length <= 1}
                            onClick={() =>
                                ecrire(
                                    bareme.filter((c) => c.id !== critere.id),
                                )
                            }
                        />
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <BoutonAjouter
                    desactive={bareme.length >= 8}
                    onClick={() => {
                        const id = repereLibre(
                            bareme.map((c) => c.id),
                            serie('c', 8),
                        );

                        if (id) {
                            ecrire([...bareme, { id, critere: '', points: 1 }]);
                        }
                    }}
                >
                    Ajouter un critère
                </BoutonAjouter>
                <span className="text-aide text-ink-600 font-data">
                    Total : {total} points
                </span>
            </div>
        </div>
    );
}
