import { Link, router, usePage } from '@inertiajs/react';
import {
    Clock,
    CloudOff,
    KeyRound,
    RotateCw,
    Smartphone,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    copieDuDocument,
    estInstallee,
    estIphone,
    useHorsLigne,
} from '@/lib/hors-ligne';
import { heureCopie, texteCopie } from '@/lib/hors-ligne/copies';
import { nombreDeReponses } from '@/lib/hors-ligne/libelles';
import { cn } from '@/lib/utils';
import { login } from '@/routes';

/**
 * Bandeaux non bloquants du hors ligne (HORS_LIGNE.md A.3.8, A.3.9), sous la
 * barre du haut. Une ligne, une icône, une phrase qui rassure ; jamais un
 * écran bloqué.
 */

function Bandeau({
    icone: Icone,
    children,
    action,
    className,
}: {
    icone: typeof Clock;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            role="status"
            className={cn(
                'flex items-center gap-3 rounded-controle px-3 py-2.5 text-aide',
                className,
            )}
        >
            <Icone aria-hidden className="size-4 shrink-0" />
            <p className="min-w-0 flex-1">{children}</p>
            {action}
        </div>
    );
}

/** « Pas de connexion » ou « session expirée ». `eleve` : tutoiement et réponses. */
export function BandeauReseau({ eleve = true }: { eleve?: boolean }) {
    const { reseau, enAttente } = useHorsLigne();

    if (reseau === 'hors_ligne') {
        return (
            <Bandeau
                icone={CloudOff}
                className="bg-ink-900/[0.06] text-ink-900 dark:bg-white/[0.06]"
            >
                {eleve
                    ? 'Pas de connexion. Tes réponses sont gardées sur le téléphone et partiront toutes seules.'
                    : 'Pas de connexion : cet espace demande le réseau.'}
            </Bandeau>
        );
    }

    if (reseau === 'session_expiree') {
        return (
            <Bandeau
                icone={KeyRound}
                className="bg-indice-400/20 text-ink-900 dark:bg-indice-400/15"
                action={
                    <Button asChild taille="petite" variant="encre">
                        <Link href={login()}>Se reconnecter</Link>
                    </Button>
                }
            >
                {enAttente > 0
                    ? `Reconnecte-toi pour envoyer tes ${nombreDeReponses(enAttente)} — elles sont gardées.`
                    : 'Ta session a expiré : reconnecte-toi.'}
            </Bandeau>
        );
    }

    return null;
}

/**
 * « Accueil au 21:14 — dernière version gardée sur ce téléphone ».
 * « Actualiser » reste offert ; l'actualisation automatique au retour du
 * réseau vit dans lib/hors-ligne (demarrerHorsLigne).
 */
export function BandeauCopie() {
    const page = usePage();
    const heure = heureCopie(
        page.props as Record<string, unknown>,
        copieDuDocument(page.url),
    );
    const { reseau } = useHorsLigne();

    if (!heure) {
        return null;
    }

    return (
        <Bandeau
            icone={Clock}
            className="bg-craie-100 text-ink-600"
            action={
                reseau === 'en_ligne' ? (
                    <Button
                        taille="petite"
                        variant="outline"
                        onClick={() => router.reload()}
                    >
                        <RotateCw aria-hidden />
                        Actualiser
                    </Button>
                ) : undefined
            }
        >
            {texteCopie(page.component, heure)}
        </Bandeau>
    );
}

const CLE_IPHONE = 'nkaramogo:notice-iphone-fermee';

/**
 * iPhone, application non installée : Safari efface le stockage d'un site
 * après sept jours sans visite — packs et réponses gardées compris (A.3.2).
 */
export function BandeauIphone() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let fermee = false;

        try {
            fermee = window.localStorage.getItem(CLE_IPHONE) !== null;
        } catch {
            // stockage indisponible : on montre la notice
        }

        setVisible(estIphone() && !estInstallee() && !fermee);
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <Bandeau
            icone={Smartphone}
            className="bg-nimba-600/[0.10] text-ink-900 dark:bg-nimba-300/15"
            action={
                <button
                    type="button"
                    aria-label="Fermer"
                    className="rounded-full p-1 text-ink-600 hover:text-ink-900"
                    onClick={() => {
                        try {
                            window.localStorage.setItem(CLE_IPHONE, '1');
                        } catch {
                            // sans stockage, la notice reviendra : sans gravité
                        }

                        setVisible(false);
                    }}
                >
                    <X aria-hidden className="size-4" />
                </button>
            }
        >
            Installe N’karamögö sur ton écran d’accueil (Partager → Sur l’écran
            d’accueil), sinon l’iPhone efface tes téléchargements après quelques
            jours sans ouverture.
        </Bandeau>
    );
}
