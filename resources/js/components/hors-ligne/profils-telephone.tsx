import { Link, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    CircleUser,
    Download,
    KeyRound,
    Laptop,
    LockKeyhole,
    UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    basculerVersProfil,
    estAppareilPartage,
    lireProfils,
    signalerProfils,
    surProfils,
} from '@/lib/hors-ligne';
import { base } from '@/lib/hors-ligne';
import { definirCode, PROFILS_MAX } from '@/lib/hors-ligne/profils';
import type { ProfilLocal } from '@/lib/hors-ligne/profils';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit as monCompte } from '@/routes/compte/profil';
import { telechargements } from '@/routes/eleve';

/**
 * Les profils du téléphone (HORS_LIGNE.md A.7, HL6) : « Qui révise ? ».
 * Passer à un autre profil demande son **code à 4 chiffres** (local, sans
 * réseau) ; le profil qui n'a pas encore choisi le sien le fait ici. Jamais
 * sur un ordinateur partagé (rien n'y est gardé).
 */

export function useProfilsTelephone(): ProfilLocal[] {
    const [profils, setProfils] = useState<ProfilLocal[]>([]);

    useEffect(() => {
        let actif = true;
        const lire = () =>
            void lireProfils().then((liste) => actif && setProfils(liste));
        lire();
        const fin = surProfils(lire);

        return () => {
            actif = false;
            fin();
        };
    }, []);

    return profils;
}

/** Pastille à l'initiale : jamais de photo (données minimales). */
export function PastilleProfil({
    prenom,
    taille = 'normale',
}: {
    prenom: string;
    taille?: 'normale' | 'grande';
}) {
    return (
        <span
            aria-hidden
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-soleil-300 to-soleil-500 font-semibold text-soleil-900',
                taille === 'grande'
                    ? 'size-10 text-interface'
                    : 'size-8 text-aide',
            )}
        >
            {(prenom.charAt(0) || '?').toUpperCase()}
        </span>
    );
}

function formaterAttente(ms: number): string {
    const secondes = Math.ceil(ms / 1000);

    return secondes < 60 ? `${secondes} s` : `${Math.ceil(secondes / 60)} min`;
}

/** Saisir le code d'un profil, puis ouvrir sa session. */
export function SaisieCodeProfil({
    profil,
    onRetour,
}: {
    profil: ProfilLocal;
    onRetour: () => void;
}) {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [reconnexion, setReconnexion] = useState(false);
    const [occupe, setOccupe] = useState(false);

    const essayer = async (saisi: string) => {
        setOccupe(true);
        const resultat = await basculerVersProfil(profil.id, saisi);
        setOccupe(false);

        if (resultat.ok) {
            return;
        }

        setCode('');

        if (resultat.raison === 'reconnexion') {
            setReconnexion(true);
            setMessage(resultat.message);

            return;
        }

        const { verdict } = resultat;

        if (!verdict.ok) {
            setMessage(
                verdict.attente_ms > 0
                    ? `Trop d’essais. Réessaie dans ${formaterAttente(verdict.attente_ms)}.`
                    : `Ce n’est pas le bon code. ${verdict.restants > 1 ? `Encore ${verdict.restants} essais.` : 'Encore 1 essai.'}`,
            );
        }
    };

    return (
        <div className="grid gap-5">
            <div className="flex items-center gap-3">
                <PastilleProfil prenom={profil.prenom} taille="grande" />
                <div className="grid">
                    <span className="font-semibold">{profil.prenom}</span>
                    <span className="text-aide text-ink-500">
                        @{profil.pseudo}
                    </span>
                </div>
            </div>
            {reconnexion ? (
                <Button onClick={() => quitterPourSeConnecter()}>
                    <KeyRound aria-hidden /> Se connecter avec le mot de passe
                </Button>
            ) : (
                <CodeInput
                    longueur={4}
                    valeur={code}
                    onValeur={setCode}
                    onComplet={(saisi) => void essayer(saisi)}
                    disabled={occupe}
                    autoFocus
                    aria-label={`Code de ${profil.prenom}`}
                    aria-invalid={message !== null && !reconnexion}
                    aria-describedby="message-code"
                />
            )}
            <p
                id="message-code"
                role={message ? 'alert' : undefined}
                className={cn(
                    'min-h-5 text-aide',
                    message
                        ? 'text-faux-700 dark:text-faux-400'
                        : 'text-ink-500',
                )}
            >
                {message ??
                    'Le code à 4 chiffres choisi sur ce téléphone. Oublié ? Reconnecte-toi avec ton mot de passe.'}
            </p>
            <Button
                variant="ghost"
                ton="neutre"
                taille="compacte"
                className="justify-self-start"
                onClick={onRetour}
            >
                <ChevronLeft aria-hidden /> Autres profils
            </Button>
        </div>
    );
}

/**
 * Se déconnecter **sans quitter le téléphone** (« Ajouter un profil ») : le
 * profil reste dans « Qui révise ? », ses réponses en file partent avec son
 * jeton ; on arrive sur la connexion.
 */
function quitterPourSeConnecter(): void {
    router.flushAll();
    router.post(
        logout().url,
        {},
        { onFinish: () => window.location.assign('/login') },
    );
}

/** Choisir son code la première fois : deux saisies identiques. */
export function ProtegerProfil({
    id,
    onFini,
}: {
    id: number;
    onFini?: () => void;
}) {
    const [premier, setPremier] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [erreur, setErreur] = useState<string | null>(null);

    const saisir = async (saisi: string) => {
        if (premier === null) {
            setPremier(saisi);
            setCode('');

            return;
        }

        if (saisi !== premier) {
            setErreur('Les deux codes ne sont pas les mêmes. Recommence.');
            setPremier(null);
            setCode('');

            return;
        }

        await definirCode(base, id, saisi);
        signalerProfils();
        onFini?.();
    };

    return (
        <div className="grid gap-3">
            <p className="text-aide text-ink-600">
                {premier === null
                    ? 'Choisis un code à 4 chiffres : il protège ton profil quand quelqu’un d’autre révise sur ce téléphone.'
                    : 'Tape-le une seconde fois.'}
            </p>
            <CodeInput
                key={premier === null ? 'premier' : 'second'}
                longueur={4}
                valeur={code}
                onValeur={setCode}
                onComplet={(saisi) => void saisir(saisi)}
                aria-label={
                    premier === null
                        ? 'Ton code à 4 chiffres'
                        : 'Confirme ton code'
                }
                aria-invalid={erreur !== null}
            />
            {erreur && (
                <p
                    role="alert"
                    className="text-aide text-faux-700 dark:text-faux-400"
                >
                    {erreur}
                </p>
            )}
        </div>
    );
}

/** La liste « Qui révise ? » : un profil se choisit, son code s'ouvre. */
export function ListeProfils({
    profils,
    actif,
    onChoisir,
}: {
    profils: ProfilLocal[];
    actif: number | null;
    onChoisir: (profil: ProfilLocal) => void;
}) {
    const autres = profils.filter((profil) => profil.id !== actif);

    if (autres.length === 0) {
        return null;
    }

    return (
        <ul className="grid gap-1" aria-label="Autres profils de ce téléphone">
            {autres.map((profil) => {
                const pret = profil.code !== null && profil.jeton !== null;

                return (
                    <li key={profil.id}>
                        <button
                            type="button"
                            disabled={!pret}
                            onClick={() => onChoisir(profil)}
                            className="flex w-full items-center gap-3 rounded-controle p-2 text-left transition-colors outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                        >
                            <PastilleProfil
                                prenom={profil.prenom}
                                taille="grande"
                            />
                            <span className="grid min-w-0 flex-1">
                                <span className="truncate font-semibold">
                                    {profil.prenom}
                                </span>
                                <span className="truncate text-aide text-ink-500">
                                    {pret
                                        ? `@${profil.pseudo}`
                                        : 'Doit se reconnecter avec son mot de passe'}
                                </span>
                            </span>
                            {pret ? (
                                <LockKeyhole
                                    aria-hidden
                                    className="size-4 text-ink-400"
                                />
                            ) : null}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/** La feuille ouverte depuis la pastille du profil (habillage élève). */
export function FeuilleProfils({
    ouvert,
    onOuvert,
}: {
    ouvert: boolean;
    onOuvert: (ouvert: boolean) => void;
}) {
    const { auth } = usePage().props;
    const profils = useProfilsTelephone();
    const [choisi, setChoisi] = useState<ProfilLocal | null>(null);
    const [proteger, setProteger] = useState(false);
    const partage = estAppareilPartage();
    const moi = profils.find((profil) => profil.id === auth.user?.id) ?? null;
    const sansCode = !partage && moi !== null && moi.code === null;

    const fermer = useCallback(
        (etat: boolean) => {
            onOuvert(etat);

            if (!etat) {
                setChoisi(null);
                setProteger(false);
            }
        },
        [onOuvert],
    );

    if (!auth.user) {
        return null;
    }

    return (
        <Dialog open={ouvert} onOpenChange={fermer}>
            <DialogContent className="gap-5 sm:max-w-md [&>*]:min-w-0">
                <DialogHeader>
                    <DialogTitle>
                        {choisi ? 'Ouvrir ce profil' : 'Qui révise ?'}
                    </DialogTitle>
                    <DialogDescription>
                        {partage
                            ? 'Ordinateur partagé : rien n’est gardé ici après ta déconnexion.'
                            : `Jusqu’à ${PROFILS_MAX} profils sur ce téléphone, chacun avec son code.`}
                    </DialogDescription>
                </DialogHeader>

                {choisi ? (
                    <SaisieCodeProfil
                        profil={choisi}
                        onRetour={() => setChoisi(null)}
                    />
                ) : (
                    <>
                        <div className="flex items-center gap-3 rounded-carte bg-craie-100 p-3">
                            <PastilleProfil
                                prenom={auth.user.prenom}
                                taille="grande"
                            />
                            <div className="grid min-w-0 flex-1">
                                <span className="truncate font-semibold">
                                    {auth.user.prenom}
                                </span>
                                <span className="truncate text-aide text-ink-600">
                                    @{auth.user.pseudo}
                                </span>
                            </div>
                            {partage ? (
                                <Laptop
                                    aria-hidden
                                    className="size-4 text-ink-500"
                                />
                            ) : (
                                <Badge variant="nimba">Actif</Badge>
                            )}
                        </div>

                        {sansCode &&
                            (proteger ? (
                                <ProtegerProfil
                                    id={moi.id}
                                    onFini={() => setProteger(false)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setProteger(true)}
                                    className="flex items-center gap-3 rounded-carte border border-nimba-500/40 p-3 text-left outline-none hover:border-nimba-500 focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <span
                                        aria-hidden
                                        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                    >
                                        <LockKeyhole className="size-5" />
                                    </span>
                                    <span className="grid flex-1">
                                        <span className="font-semibold">
                                            Garde ton profil ici
                                        </span>
                                        <span className="text-aide text-ink-600">
                                            Un code à 4 chiffres, pour revenir
                                            sans mot de passe.
                                        </span>
                                    </span>
                                    <ChevronRight
                                        aria-hidden
                                        className="size-4 text-ink-400"
                                    />
                                </button>
                            ))}

                        <ListeProfils
                            profils={profils}
                            actif={auth.user.id}
                            onChoisir={setChoisi}
                        />

                        <div className="grid gap-1 border-t pt-4">
                            {!partage && profils.length < PROFILS_MAX && (
                                <>
                                    <Button
                                        variant="ghost"
                                        ton="neutre"
                                        className="justify-start"
                                        disabled={sansCode}
                                        aria-describedby={
                                            sansCode
                                                ? 'ajout-profil-aide'
                                                : undefined
                                        }
                                        onClick={() => quitterPourSeConnecter()}
                                    >
                                        <UserPlus aria-hidden /> Ajouter un
                                        profil
                                    </Button>
                                    {sansCode && (
                                        <p
                                            id="ajout-profil-aide"
                                            className="-mt-1 px-4 pb-1 text-meta text-ink-500"
                                        >
                                            Choisis d’abord ton code : ton
                                            profil restera sur ce téléphone.
                                        </p>
                                    )}
                                </>
                            )}
                            <Button
                                asChild
                                variant="ghost"
                                ton="neutre"
                                className="justify-start"
                            >
                                <Link
                                    href={telechargements()}
                                    onClick={() => fermer(false)}
                                >
                                    <Download aria-hidden /> Téléchargements
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                ton="neutre"
                                className="justify-start"
                            >
                                <Link
                                    href={monCompte()}
                                    onClick={() => fermer(false)}
                                >
                                    <CircleUser aria-hidden /> Mon compte
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
