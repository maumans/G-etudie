import { Link } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';
import { Fragment } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { TexteElement } from '@/components/questions/commun';
import { cn, pluriel } from '@/lib/utils';
import type { QuestionPublique } from '@/lib/vitrine';
import { register } from '@/routes';

const LETTRES = 'ABCDEFGHIJ';

/**
 * Une question d'annale sur la page publique (lot 8) : l'énoncé tel qu'il
 * est imprimé, et ce que la question propose (options, éléments à relier
 * ou à ordonner, texte à trous) — **jamais la réponse** : le serveur ne
 * l'envoie pas (AnnalesPubliques). Le corrigé est annoncé, réservé aux
 * inscrits.
 */
export function EnoncePublic({
    question,
    numero,
}: {
    question: QuestionPublique;
    numero: number;
}) {
    const { donnees } = question;

    return (
        <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 border-t py-5 first:border-t-0 first:pt-1">
            <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
            >
                {numero}
            </span>
            <div className="grid min-w-0 gap-3.5">
                <span className="sr-only">Question {numero}</span>
                <ContenuBlocs doc={question.enonce} />

                {(question.type === 'qcm_une' ||
                    question.type === 'qcm_plusieurs') &&
                    donnees.options && (
                        <ul className="grid gap-1.5">
                            {donnees.options.map((option, index) => (
                                <li
                                    key={option.id}
                                    className="flex items-baseline gap-2.5 rounded-controle border bg-background px-3 py-2"
                                >
                                    <span className="text-aide font-semibold text-ink-500 font-data">
                                        {LETTRES[index] ?? index + 1}.
                                    </span>
                                    <span className="min-w-0">
                                        <TexteElement element={option} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                {question.type === 'vrai_faux' && (
                    <p className="text-aide text-ink-500">Vrai ou faux ?</p>
                )}

                {question.type === 'numerique' && (
                    <p className="text-aide text-ink-500">
                        Réponse attendue : un nombre
                        {donnees.unite ? ` (en ${donnees.unite})` : ''}.
                    </p>
                )}

                {question.type === 'trous' && donnees.segments && (
                    <p className="leading-relaxed">
                        {donnees.segments.map((segment, index) =>
                            'texte' in segment ? (
                                <Fragment key={index}>{segment.texte}</Fragment>
                            ) : (
                                <span
                                    key={index}
                                    className="mx-1 inline-block min-w-16 border-b-2 border-dotted border-ink-400 align-baseline"
                                    aria-label="trou à compléter"
                                >
                                    {segment.choix && (
                                        <span className="text-aide text-ink-500">
                                            {segment.choix.join(' / ')}
                                        </span>
                                    )}
                                </span>
                            ),
                        )}
                    </p>
                )}

                {question.type === 'appariement' &&
                    donnees.gauche &&
                    donnees.droite && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[donnees.gauche, donnees.droite].map(
                                (colonne, c) => (
                                    <ul
                                        key={c}
                                        className="grid content-start gap-1.5"
                                    >
                                        {colonne.map((element, index) => (
                                            <li
                                                key={element.id}
                                                className="flex items-baseline gap-2.5 rounded-controle border bg-background px-3 py-2"
                                            >
                                                <span className="text-aide font-semibold text-ink-500 font-data">
                                                    {c === 0
                                                        ? index + 1
                                                        : LETTRES[index]}
                                                </span>
                                                <span className="min-w-0">
                                                    <TexteElement
                                                        element={element}
                                                    />
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ),
                            )}
                        </div>
                    )}

                {question.type === 'ordre' && donnees.elements && (
                    <ul className="grid gap-1.5">
                        {donnees.elements.map((element) => (
                            <li
                                key={element.id}
                                className="rounded-controle border bg-background px-3 py-2"
                            >
                                <TexteElement element={element} />
                            </li>
                        ))}
                    </ul>
                )}

                <CorrigeReserve etapes={question.corrige_etapes} />
            </div>
        </li>
    );
}

function CorrigeReserve({
    etapes,
    className,
}: {
    etapes: number;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'flex flex-wrap items-center gap-x-2 gap-y-1 text-aide text-ink-500',
                className,
            )}
        >
            <LockKeyhole aria-hidden className="size-3.5" />
            <span>
                {etapes > 0
                    ? `Corrigé pas à pas en ${pluriel(etapes, 'étape')}, réservé aux inscrits.`
                    : 'Corrigé réservé aux inscrits.'}
            </span>
            <Link
                href={register()}
                className="font-medium text-nimba-700 underline-offset-4 hover:underline dark:text-nimba-300"
            >
                Créer un compte gratuit
            </Link>
        </p>
    );
}
