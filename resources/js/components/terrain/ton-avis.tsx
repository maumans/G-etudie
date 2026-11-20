import { Check, Frown, Meh, MessageSquareHeart, Smile, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Textarea } from '@/components/ui/textarea';
import { COMMENTAIRE_MAX, ETIQUETTES, REPONSES } from '@/lib/terrain/avis';
import type { EcranAvis, ReponseAvis } from '@/lib/terrain/avis';
import { donnerAvis } from '@/lib/terrain';
import { cn } from '@/lib/utils';

const ICONES: Record<ReponseAvis, LucideIcon> = {
    oui: Smile,
    un_peu: Meh,
    non: Frown,
};

/** Couleur de la réponse choisie : toujours avec son icône et son mot. */
const CHOISIE: Record<ReponseAvis, string> = {
    oui: 'border-juste-600 bg-juste-600/[0.08] text-juste-700 ring-1 ring-juste-600 dark:border-juste-400 dark:bg-juste-400/10 dark:text-juste-400 dark:ring-juste-400',
    un_peu: 'border-indice-700 bg-indice-400/20 text-indice-700 ring-1 ring-indice-700 dark:border-indice-400 dark:bg-indice-400/10 dark:text-indice-400 dark:ring-indice-400',
    non: 'border-faux-600 bg-faux-600/[0.06] text-faux-700 ring-1 ring-faux-600 dark:border-faux-400 dark:bg-faux-400/10 dark:text-faux-400 dark:ring-faux-400',
};

/**
 * « Ton avis » (lot 14 ; la plaquette : « test d'essai, critiques, prise en
 * compte ») : Oui / Un peu / Non, puis ce qui a gêné et un mot facultatif.
 * Le geste part par la file (`avis.donner`) : sans réseau, il attend.
 * Une erreur dans un contenu passe par « Signaler une erreur ».
 */
export function TonAvis({
    ecran,
    question = 'Cette séance t’a aidé ?',
    onFermer,
    className,
}: {
    ecran: EcranAvis;
    question?: string;
    onFermer?: () => void;
    className?: string;
}) {
    const [reponse, setReponse] = useState<ReponseAvis | null>(null);
    const [etiquettes, setEtiquettes] = useState<string[]>([]);
    const [commentaire, setCommentaire] = useState('');
    const [envoi, setEnvoi] = useState(false);
    const [envoye, setEnvoye] = useState(false);

    function basculer(cle: string) {
        setEtiquettes((deja) =>
            deja.includes(cle) ? deja.filter((e) => e !== cle) : [...deja, cle],
        );
    }

    function envoyer() {
        if (reponse === null) {
            return;
        }

        setEnvoi(true);
        donnerAvis({ ecran, reponse, etiquettes, commentaire })
            .then(() => setEnvoye(true))
            .catch(() =>
                toast.error(
                    'Ton avis n’a pas pu être gardé sur le téléphone. Réessaie.',
                ),
            )
            .finally(() => setEnvoi(false));
    }

    if (envoye) {
        return (
            <section
                aria-live="polite"
                className={cn(
                    'flex items-center gap-3 rounded-carte border bg-card p-4 text-left shadow-carte',
                    className,
                )}
            >
                <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400"
                >
                    <Check className="size-5" />
                </span>
                <div className="grid gap-0.5">
                    <p className="font-semibold">Merci pour ton avis.</p>
                    <p className="text-aide text-ink-600">
                        L’équipe lit chaque avis pour améliorer N’karamögö.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section
            aria-labelledby={`titre-avis-${ecran}`}
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-4 text-left shadow-carte sm:p-5',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                >
                    <MessageSquareHeart className="size-5" />
                </span>
                <div className="grid flex-1 gap-0.5">
                    <h2 id={`titre-avis-${ecran}`} className="text-titre-carte">
                        {question}
                    </h2>
                    <p className="text-aide text-ink-500">
                        Ton avis aide l’équipe à améliorer l’application.
                    </p>
                </div>
                {onFermer && (
                    <button
                        type="button"
                        onClick={onFermer}
                        aria-label="Fermer sans donner d’avis"
                        className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-500 outline-none hover:bg-ink-900/[0.05] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.06]"
                    >
                        <X aria-hidden className="size-4" />
                    </button>
                )}
            </div>

            <div
                role="radiogroup"
                aria-label={question}
                className="grid grid-cols-3 gap-2"
            >
                {REPONSES.map(({ cle, libelle }) => {
                    const Icone = ICONES[cle];
                    const choisie = reponse === cle;

                    return (
                        <button
                            key={cle}
                            type="button"
                            role="radio"
                            aria-checked={choisie}
                            onClick={() => setReponse(cle)}
                            className={cn(
                                'flex h-11 items-center justify-center gap-2 rounded-controle border text-interface font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                choisie
                                    ? CHOISIE[cle]
                                    : 'border-contour text-ink-900 hover:border-ink-400 hover:bg-craie-50 dark:hover:bg-relief',
                            )}
                        >
                            <Icone aria-hidden className="size-[18px]" />
                            {libelle}
                        </button>
                    );
                })}
            </div>

            {reponse !== null && (
                <>
                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-aide font-medium text-ink-600">
                            {reponse === 'oui'
                                ? 'Quelque chose à améliorer ? (facultatif)'
                                : 'Qu’est-ce qui t’a gêné ?'}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {ETIQUETTES.map(({ cle, libelle }) => {
                                const active = etiquettes.includes(cle);

                                return (
                                    <button
                                        key={cle}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => basculer(cle)}
                                        className={cn(
                                            'flex h-9 items-center gap-1.5 rounded-controle border px-3 text-aide font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring',
                                            active
                                                ? 'border-nimba-600 bg-nimba-600/[0.08] text-nimba-700 dark:border-nimba-300 dark:bg-nimba-300/10 dark:text-nimba-300'
                                                : 'border-contour text-ink-600 hover:border-ink-400 hover:text-ink-900',
                                        )}
                                    >
                                        {active && (
                                            <Check
                                                aria-hidden
                                                className="size-3.5"
                                            />
                                        )}
                                        {libelle}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                    <Champ
                        libelle="Un mot de plus (facultatif)"
                        aide={`${commentaire.length} / ${COMMENTAIRE_MAX}. N’écris ni ton nom ni ton numéro. Une erreur dans un exercice : « Signaler une erreur ».`}
                    >
                        {(attributs) => (
                            <Textarea
                                {...attributs}
                                rows={2}
                                maxLength={COMMENTAIRE_MAX}
                                value={commentaire}
                                onChange={(e) => setCommentaire(e.target.value)}
                                placeholder="Par exemple : les annales mettent du temps à s’ouvrir."
                            />
                        )}
                    </Champ>
                    <Button
                        variant="encre"
                        className="w-full sm:w-fit"
                        disabled={envoi}
                        onClick={envoyer}
                    >
                        Envoyer mon avis
                    </Button>
                </>
            )}
        </section>
    );
}
