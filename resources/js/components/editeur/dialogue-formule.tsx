import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Formule } from '@/components/ui/formule';
import { Textarea } from '@/components/ui/textarea';
import { LONGUEUR_MAX_LATEX } from '@/lib/contenu/blocs';
import type { DemandeFormule } from './extensions';

/** Raccourcis : le code inséré au curseur, et ce que le bouton affiche. */
const RACCOURCIS: { code: string; apercu: string; nom: string }[] = [
    { code: '\\frac{a}{b}', apercu: '\\frac{a}{b}', nom: 'Fraction' },
    { code: '\\sqrt{x}', apercu: '\\sqrt{x}', nom: 'Racine carrée' },
    { code: 'x^{2}', apercu: 'x^{2}', nom: 'Puissance' },
    { code: 'x_{n}', apercu: 'x_{n}', nom: 'Indice' },
    { code: '\\leq', apercu: '\\leq', nom: 'Inférieur ou égal' },
    { code: '\\geq', apercu: '\\geq', nom: 'Supérieur ou égal' },
    { code: '\\times', apercu: '\\times', nom: 'Multiplié par' },
    { code: '\\pi', apercu: '\\pi', nom: 'Pi' },
    {
        code: '\\overrightarrow{AB}',
        apercu: '\\overrightarrow{AB}',
        nom: 'Vecteur',
    },
    { code: '\\Delta', apercu: '\\Delta', nom: 'Delta' },
];

/**
 * Saisie d'une formule en LaTeX, avec son rendu en direct (le même que chez
 * l'élève) et des raccourcis pour les symboles courants.
 */
export function DialogueFormule({
    demande,
    fermer,
}: {
    demande: DemandeFormule | null;
    fermer: () => void;
}) {
    return (
        <Dialog open={demande !== null} onOpenChange={(o) => !o && fermer()}>
            <DialogContent className="sm:max-w-xl">
                {demande && (
                    <Saisie
                        key={demande.latex + String(demande.bloc)}
                        demande={demande}
                        fermer={fermer}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function Saisie({
    demande,
    fermer,
}: {
    demande: DemandeFormule;
    fermer: () => void;
}) {
    const [latex, setLatex] = useState(demande.latex);
    const champ = useRef<HTMLTextAreaElement>(null);
    const nouvelle = demande.latex === '';
    const vide = latex.trim() === '';

    function inserer(code: string) {
        const zone = champ.current;
        const debut = zone?.selectionStart ?? latex.length;
        const fin = zone?.selectionEnd ?? latex.length;
        const suivant = latex.slice(0, debut) + code + latex.slice(fin);

        setLatex(suivant);
        requestAnimationFrame(() => {
            zone?.focus();
            zone?.setSelectionRange(debut + code.length, debut + code.length);
        });
    }

    function valider(evenement: React.FormEvent) {
        evenement.preventDefault();

        if (!vide) {
            demande.appliquer(latex.trim());
            fermer();
        }
    }

    return (
        <form onSubmit={valider} className="grid gap-5">
            <DialogHeader>
                <DialogTitle>
                    {nouvelle ? 'Insérer une formule' : 'Modifier la formule'}
                    {demande.bloc ? ' (centrée)' : ''}
                </DialogTitle>
                <DialogDescription>
                    Écrivez en LaTeX ; le rendu s’affiche dessous, tel que
                    l’élève le verra.
                </DialogDescription>
            </DialogHeader>

            <div
                role="group"
                aria-label="Symboles courants"
                className="flex flex-wrap gap-1.5"
            >
                {RACCOURCIS.map((r) => (
                    <button
                        key={r.code}
                        type="button"
                        title={r.nom}
                        aria-label={r.nom}
                        onClick={() => inserer(r.code)}
                        className="flex h-9 min-w-10 items-center justify-center rounded-[8px] border border-contour bg-card px-2 text-ink-900 transition-colors outline-none hover:border-ink-400 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <span aria-hidden className="pointer-events-none">
                            <Formule latex={r.apercu} />
                        </span>
                    </button>
                ))}
            </div>

            <Champ
                libelle="Code LaTeX"
                aide={`${latex.length} / ${LONGUEUR_MAX_LATEX} caractères`}
            >
                {(attributs) => (
                    <Textarea
                        {...attributs}
                        ref={champ}
                        value={latex}
                        onChange={(e) => setLatex(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                valider(e);
                            }
                        }}
                        maxLength={LONGUEUR_MAX_LATEX}
                        rows={3}
                        autoFocus
                        spellCheck={false}
                        autoCapitalize="none"
                        className="font-mono text-[0.875rem]"
                        placeholder="a^2 + b^2 = c^2"
                    />
                )}
            </Champ>

            <div
                aria-live="polite"
                className="grid min-h-16 place-items-center rounded-controle border border-dashed border-contour bg-craie-50 px-3 py-3 dark:bg-white/[0.02]"
            >
                {vide ? (
                    <span className="text-aide text-ink-500">
                        Le rendu apparaîtra ici.
                    </span>
                ) : (
                    <Formule latex={latex} bloc />
                )}
            </div>

            <DialogFooter className="sm:justify-between">
                {demande.supprimer ? (
                    <Button
                        type="button"
                        variant="ghost"
                        ton="danger"
                        onClick={() => {
                            demande.supprimer?.();
                            fermer();
                        }}
                    >
                        <Trash2 aria-hidden />
                        Supprimer
                    </Button>
                ) : (
                    <span />
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={fermer}>
                        Annuler
                    </Button>
                    <Button type="submit" disabled={vide}>
                        {nouvelle ? 'Insérer' : 'Enregistrer'}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    );
}
