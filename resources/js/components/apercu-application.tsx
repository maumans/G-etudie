import { Check, Flame, Play, Star } from 'lucide-react';
import { JaugePreparation } from '@/components/jauge-preparation';
import type { SegmentJauge } from '@/components/jauge-preparation';
import { cn } from '@/lib/utils';

/**
 * Aperçu de l'espace élève dans un cadre de téléphone (vitrine, connexion) :
 * la jauge de préparation, la séance du jour et la série, dessinées en HTML
 * et SVG — zéro image à télécharger. Décor : les valeurs sont celles d'un
 * élève imaginaire ; l'aperçu est caché aux lecteurs d'écran, une phrase le
 * décrit à sa place. Il tient la place de la photo du héros tant qu'elle
 * n'est pas fournie (config/vitrine.php).
 */
const SEGMENTS: SegmentJauge[] = [
    { cle: 'maths', maitrise: 72 },
    { cle: 'physique', maitrise: 35 },
    { cle: 'biologie', maitrise: 58 },
    { cle: 'francais', maitrise: 66 },
    { cle: 'histoire', maitrise: 40 },
];

const SEMAINE: { jour: string; etat: 'fait' | 'grace' | 'en_cours' }[] = [
    { jour: 'Lu', etat: 'fait' },
    { jour: 'Ma', etat: 'fait' },
    { jour: 'Me', etat: 'grace' },
    { jour: 'Je', etat: 'fait' },
    { jour: 'Ve', etat: 'en_cours' },
];

export function ApercuApplication({ className }: { className?: string }) {
    return (
        <figure className={cn('relative', className)}>
            <figcaption className="sr-only">
                Aperçu de l'espace élève : la jauge de préparation par matière,
                la séance du jour et la série de jours de révision.
            </figcaption>
            <div
                aria-hidden
                className="relative mx-auto w-[17.5rem] rounded-[2.75rem] bg-[#1e1814] p-2.5 shadow-flottant ring-1 ring-black/10"
            >
                <div className="clair overflow-hidden rounded-[2.2rem] bg-craie-50 text-ink-900">
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[0.625rem] font-semibold">
                        <span className="font-data">20:41</span>
                        <span className="h-4 w-16 rounded-full bg-[#1e1814]" />
                        <span className="font-data">4G</span>
                    </div>

                    <div className="grid gap-3 px-4 pt-2 pb-5">
                        <div className="flex items-center justify-between">
                            <div className="grid">
                                <span className="text-[0.625rem] text-ink-500">
                                    Mardi soir
                                </span>
                                <span className="text-sm tracking-tight">
                                    Bonsoir, <strong>Aïssatou</strong>
                                </span>
                            </div>
                            <span className="flex items-center gap-1 rounded-full bg-nimba-500/15 px-2 py-1 text-[0.625rem] font-bold text-nimba-700">
                                <Flame className="size-3 fill-current" />6 jours
                            </span>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl surface-marque p-3.5 text-white">
                            <span className="text-[0.5625rem] font-semibold tracking-wider text-white/80 uppercase">
                                Ta séance du jour
                            </span>
                            <p className="mt-0.5 text-[0.9375rem] leading-snug font-bold">
                                Maths et physique
                            </p>
                            <p className="text-[0.625rem] text-white/85">
                                15 min · 12 questions
                            </p>
                            <span className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-bold text-nimba-700">
                                <Play className="size-3 fill-current" />
                                Commencer
                            </span>
                        </div>

                        <div className="rounded-2xl border bg-card px-3 pt-3 pb-2 shadow-carte">
                            <JaugePreparation
                                pourcentage={54}
                                examen="BEPC"
                                segments={SEGMENTS}
                                className="max-w-[11rem]"
                            />
                        </div>

                        <div className="flex justify-between rounded-2xl border bg-card px-3 py-2.5 shadow-carte">
                            {SEMAINE.map(({ jour, etat }) => (
                                <span
                                    key={jour}
                                    className="grid justify-items-center gap-1"
                                >
                                    <span className="text-[0.5625rem] font-medium text-ink-500">
                                        {jour}
                                    </span>
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full',
                                            etat === 'fait' &&
                                                'bg-nimba-500 text-white',
                                            etat === 'grace' &&
                                                'bg-soleil-400 text-soleil-900',
                                            etat === 'en_cours' &&
                                                'border-2 border-dashed border-nimba-500',
                                        )}
                                    >
                                        {etat === 'fait' && (
                                            <Check
                                                className="size-3"
                                                strokeWidth={3}
                                            />
                                        )}
                                        {etat === 'grace' && (
                                            <Star className="size-3 fill-current" />
                                        )}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </figure>
    );
}
