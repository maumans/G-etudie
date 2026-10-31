import { Eye, Lightbulb, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Button } from '@/components/ui/button';
import type { QuestionEleve, ReponseQuestion } from '@/lib/contenu/questions';
import { pluriel } from '@/lib/utils';
import { CorrigePasAPas } from './aides-question';
import { ExerciceQuestion } from './exercice-question';
import { SaisieQuestion } from './saisie-question';

/** La bonne réponse, écrite comme si l'élève l'avait donnée. */
function reponseAttendue(question: QuestionEleve): ReponseQuestion {
    const a = question.attendue;

    switch (question.type) {
        case 'qcm_une':
            return { option: a.option as string };
        case 'qcm_plusieurs':
            return { options: (a.options as string[]) ?? [] };
        case 'vrai_faux':
            return { valeur: a.valeur as boolean };
        case 'numerique':
            return {
                valeur:
                    typeof a.valeur === 'number'
                        ? String(a.valeur).replace('.', ',')
                        : '',
            };
        case 'courte':
            return { texte: ((a.acceptees as string[]) ?? [])[0] ?? '' };
        case 'trous':
            return {
                trous: Object.fromEntries(
                    Object.entries(
                        (a.trous ?? {}) as Record<string, string[]>,
                    ).map(([id, formes]) => [id, formes[0] ?? '']),
                ),
            };
        case 'appariement':
            return { paires: (a.paires ?? {}) as Record<string, string> };
        case 'ordre':
            return { ordre: (a.ordre as string[]) ?? [] };
        case 'ouverte':
            return {};
    }
}

/**
 * Une question à relire (fiche du back-office) : l'énoncé, la bonne
 * réponse marquée, tous les indices, tout le corrigé, le barème ; et
 * « Essayer », pour la jouer comme l'élève.
 */
export function RevueQuestion({ question }: { question: QuestionEleve }) {
    const [essai, setEssai] = useState(false);

    if (essai) {
        return (
            <div className="grid gap-4">
                <Button
                    variant="outline"
                    taille="compacte"
                    className="w-fit"
                    onClick={() => setEssai(false)}
                >
                    <ListChecks aria-hidden />
                    Revenir à la relecture
                </Button>
                <ExerciceQuestion
                    question={question}
                    titre="Essayez-la : rien n’est enregistré"
                    className="shadow-none"
                />
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <ContenuBlocs doc={question.enonce} />

            <section aria-label="Bonne réponse" className="grid gap-3">
                <p className="text-aide font-semibold text-ink-900">
                    {question.type === 'ouverte'
                        ? 'Le barème'
                        : 'La bonne réponse'}
                </p>
                {question.type === 'ouverte' ? (
                    <ul className="grid gap-1.5 text-interface">
                        {(question.donnees.bareme ?? []).map((c) => (
                            <li
                                key={c.id}
                                className="flex items-start justify-between gap-3 rounded-controle border border-contour px-3 py-2"
                            >
                                <span>{c.critere}</span>
                                <span className="shrink-0 text-meta font-medium text-ink-500 font-data">
                                    {pluriel(c.points, 'pt')}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <SaisieQuestion
                        question={question}
                        reponse={reponseAttendue(question)}
                        changer={() => undefined}
                        corrigee
                        libelle="Réponse attendue"
                    />
                )}
            </section>

            {question.indices.length > 0 && (
                <section aria-label="Indices" className="grid gap-2.5">
                    {question.indices.map((indice, rang) => (
                        <aside
                            key={rang}
                            className="grid gap-2 rounded-carte border border-indice-400/45 bg-indice-400/[0.10] px-4 py-3 dark:border-indice-400/30 dark:bg-indice-400/[0.08]"
                        >
                            <p className="flex items-center gap-2 text-aide font-semibold text-indice-700 dark:text-indice-400">
                                <Lightbulb aria-hidden className="size-4" />
                                Indice {rang + 1}
                            </p>
                            <ContenuBlocs
                                doc={indice}
                                className="text-interface"
                            />
                        </aside>
                    ))}
                </section>
            )}

            <CorrigePasAPas
                etapes={question.corrige}
                toutVoir
                className="border-t pt-5"
            />

            <Button
                variant="outline"
                taille="compacte"
                className="w-fit"
                onClick={() => setEssai(true)}
            >
                <Eye aria-hidden />
                Essayer comme l’élève
            </Button>
        </div>
    );
}
