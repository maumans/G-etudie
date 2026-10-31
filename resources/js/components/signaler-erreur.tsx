import { router } from '@inertiajs/react';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Choix, GroupeChoix } from '@/components/ui/choix';
import { Champ } from '@/components/ui/champ';
import {
    Feuille,
    FeuilleContenu,
    FeuilleDeclencheur,
} from '@/components/ui/feuille';
import { Textarea } from '@/components/ui/textarea';
import { enregistrer } from '@/lib/hors-ligne';
import { cn } from '@/lib/utils';
import { signalements } from '@/routes/eleve';

export type CibleSignalement = 'question' | 'lecon' | 'sujet';

/**
 * Les motifs, dans l'ordre et avec les libellés de App\Enums\MotifSignalement
 * (SignalementsTest vérifie que les deux listes sont les mêmes).
 */
export const MOTIFS_SIGNALEMENT = [
    { valeur: 'enonce', libelle: 'L’énoncé contient une erreur' },
    { valeur: 'corrige', libelle: 'Le corrigé est faux' },
    {
        valeur: 'reponse_refusee',
        libelle: 'Ma réponse juste est comptée fausse',
    },
    {
        valeur: 'incomprehensible',
        libelle: 'Je ne comprends pas l’explication',
    },
    { valeur: 'autre', libelle: 'Autre chose' },
] as const;

export const MESSAGE_MAX = 500;

type Motif = (typeof MOTIFS_SIGNALEMENT)[number]['valeur'];

/**
 * « Signaler une erreur » (PLAN M5) : un lien discret sous une question, une
 * leçon ou une annale, qui ouvre une feuille (motif, précision facultative).
 * Le signalement part par la file d'opérations (`signalement.creer`,
 * HORS_LIGNE.md A.6) : sans réseau, il attend et part au retour, une fois.
 * L'équipe répond dans « Mes signalements » — pas de discussion.
 */
export function SignalerErreur({
    cible,
    uuid,
    version,
    className,
}: {
    cible: CibleSignalement;
    uuid: string;
    version?: number | null;
    className?: string;
}) {
    const [ouvert, setOuvert] = useState(false);
    const [motif, setMotif] = useState<Motif | null>(null);
    const [message, setMessage] = useState('');
    const [envoi, setEnvoi] = useState(false);

    function envoyer() {
        if (motif === null) {
            return;
        }

        setEnvoi(true);
        enregistrer({
            type: 'signalement.creer',
            charge: {
                cible,
                uuid,
                version: version ?? null,
                motif,
                message: message.trim() === '' ? null : message.trim(),
            },
            priorite: 3,
        })
            .then(() => {
                setOuvert(false);
                setMotif(null);
                setMessage('');
                toast.success('Merci ! L’équipe va vérifier.', {
                    description:
                        'Tu liras sa réponse dans « Mes signalements ».',
                    action: {
                        label: 'Voir',
                        onClick: () => router.visit(signalements().url),
                    },
                });
            })
            .catch(() =>
                toast.error(
                    'Le signalement n’a pas pu être gardé sur le téléphone. Réessaie.',
                ),
            )
            .finally(() => setEnvoi(false));
    }

    return (
        <Feuille open={ouvert} onOpenChange={setOuvert}>
            <FeuilleDeclencheur asChild>
                <Button
                    variant="ghost"
                    taille="petite"
                    className={cn('w-fit text-ink-500', className)}
                >
                    <Flag aria-hidden />
                    Signaler une erreur
                </Button>
            </FeuilleDeclencheur>
            <FeuilleContenu
                titre="Signaler une erreur"
                description="Dis-nous ce qui ne va pas : un enseignant vérifie chaque signalement."
                pied={
                    <Button
                        className="w-full"
                        disabled={motif === null || envoi}
                        onClick={envoyer}
                    >
                        Envoyer le signalement
                    </Button>
                }
            >
                <div className="grid gap-5">
                    <GroupeChoix libelle="Ce qui ne va pas">
                        {MOTIFS_SIGNALEMENT.map((m, rang) => (
                            <Choix
                                key={m.valeur}
                                lettre={String(rang + 1)}
                                etat={
                                    motif === m.valeur
                                        ? 'selectionne'
                                        : 'neutre'
                                }
                                onChoisir={() => setMotif(m.valeur)}
                            >
                                {m.libelle}
                            </Choix>
                        ))}
                    </GroupeChoix>
                    <Champ
                        libelle="Précise si tu veux (facultatif)"
                        aide={`${message.length} / ${MESSAGE_MAX} caractères. N’écris ni ton nom ni ton numéro.`}
                    >
                        {(attributs) => (
                            <Textarea
                                {...attributs}
                                rows={3}
                                maxLength={MESSAGE_MAX}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Par exemple : à la question 2, le résultat devrait être 12."
                            />
                        )}
                    </Champ>
                </div>
            </FeuilleContenu>
        </Feuille>
    );
}
