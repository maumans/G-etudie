import { Form, router } from '@inertiajs/react';
import {
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    ShieldCheck,
    ShieldOff,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EnteteCompte, SectionCompte } from '@/components/entete-compte';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { ProgressionBarre } from '@/components/ui/progression';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
    confirm,
    disable,
    enable,
    regenerateRecoveryCodes,
} from '@/routes/two-factor';

type Etat = 'inactive' | 'a_confirmer' | 'active';

/**
 * « Mon compte › Sécurité » (personnel seulement, DA4) : la double
 * authentification est proposée, jamais imposée. Vouvoiement : l'écran ne
 * s'adresse qu'au personnel (DESIGN.md § 9).
 */
export default function Securite({
    etat,
    configuration,
    codesSecours,
    session,
    activite,
}: {
    etat: Etat;
    configuration: { qrSvg: string; cle: string } | null;
    codesSecours: string[];
    session: { debut: string; fin: string };
    activite: { id: number; libelle: string; le: string }[];
}) {
    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Sécurité" />

            <SectionCompte
                titre="Double authentification"
                description="À la connexion, un code à 6 chiffres de votre application d'authentification est demandé en plus du mot de passe. Votre compte ouvre des données d'élèves mineurs : nous vous la recommandons."
            >
                <EtatActuel etat={etat} />
                {etat === 'inactive' && <Activation />}
                {etat === 'a_confirmer' && configuration && (
                    <Configuration {...configuration} />
                )}
            </SectionCompte>

            <div className="grid gap-6 md:grid-cols-2">
                <SessionTravail {...session} />
                <Activite entrees={activite} />
            </div>

            {etat === 'active' && (
                <>
                    <CodesSecours codes={codesSecours} />
                    <SectionCompte
                        titre="Désactiver la double authentification"
                        description="Votre compte ne sera plus protégé que par le mot de passe."
                        danger
                    >
                        <Desactivation />
                    </SectionCompte>
                </>
            )}
        </div>
    );
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
});

const JOUR_HEURE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/** « 14:05 » aujourd'hui, « 31 oct. à 02:05 » un autre jour. */
function formaterMoment(iso: string): string {
    const date = new Date(iso);

    return date.toDateString() === new Date().toDateString()
        ? HEURE.format(date)
        : JOUR_HEURE.format(date).replace(',', ' à');
}

/**
 * Les 12 h de la session de travail (HL-D10). Heures et liste d'activité
 * changent à chaque connexion : `data-capture="variable"` les masque dans
 * les captures de référence.
 */
function SessionTravail({ debut, fin }: { debut: string; fin: string }) {
    const ouverture = new Date(debut).getTime();
    const duree = new Date(fin).getTime() - ouverture;
    const ecoule = Math.round(((Date.now() - ouverture) / duree) * 100);

    return (
        <SectionCompte
            titre="Session de travail"
            description="Par sécurité, les comptes du personnel se reconnectent toutes les 12 heures."
        >
            <div data-capture="variable" className="grid gap-4">
                <ProgressionBarre
                    valeur={ecoule}
                    libelle="Part écoulée de la session de travail"
                />
                <dl className="grid grid-cols-2 divide-x text-aide">
                    <div className="grid gap-0.5 pr-4">
                        <dt className="text-ink-500">Ouverte à</dt>
                        <dd className="text-interface font-semibold text-ink-900 font-data">
                            {formaterMoment(debut)}
                        </dd>
                    </div>
                    <div className="grid gap-0.5 pl-4">
                        <dt className="text-ink-500">Reconnexion à</dt>
                        <dd className="text-interface font-semibold text-ink-900 font-data">
                            {formaterMoment(fin)}
                        </dd>
                    </div>
                </dl>
            </div>
        </SectionCompte>
    );
}

/** Derniers gestes sensibles faits par ce compte ou sur lui (journal des accès). */
function Activite({
    entrees,
}: {
    entrees: { id: number; libelle: string; le: string }[];
}) {
    return (
        <SectionCompte
            titre="Activité du compte"
            description="Un geste que vous n'avez pas fait ? Changez votre mot de passe."
        >
            <div data-capture="variable">
                {entrees.length === 0 ? (
                    <p className="text-aide text-ink-500">
                        Aucun geste sensible enregistré pour l'instant.
                    </p>
                ) : (
                    <ul className="grid divide-y">
                        {entrees.map((entree) => (
                            <li
                                key={entree.id}
                                className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                            >
                                <span className="min-w-0 text-interface text-ink-900">
                                    {entree.libelle}
                                </span>
                                <span className="shrink-0 text-meta text-ink-500 font-data">
                                    {formaterMoment(entree.le)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </SectionCompte>
    );
}

const ETATS: Record<
    Etat,
    { titre: string; detail: string; badge: string; active: boolean }
> = {
    inactive: {
        titre: 'Mot de passe seul',
        detail: "Aucun code n'est demandé à la connexion.",
        badge: 'Désactivée',
        active: false,
    },
    a_confirmer: {
        titre: 'Configuration en cours',
        detail: 'Terminez les deux étapes ci-dessous pour l’activer.',
        badge: 'À terminer',
        active: false,
    },
    active: {
        titre: 'Compte protégé',
        detail: 'Un code de votre application est demandé à chaque connexion.',
        badge: 'Active',
        active: true,
    },
};

/** Ligne d'état : tuile, titre, précision, badge (DESIGN.md, « ligne de liste »). */
function EtatActuel({ etat }: { etat: Etat }) {
    const { titre, detail, badge, active } = ETATS[etat];
    const Icone = active ? ShieldCheck : ShieldOff;

    return (
        <div className="flex items-center gap-3 rounded-controle bg-craie-100 p-3">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    active
                        ? 'bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400'
                        : 'bg-relief text-ink-600 ring-1 ring-black/5 dark:ring-white/5',
                )}
            >
                <Icone className="size-[18px]" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-interface font-semibold text-ink-900">
                        {titre}
                    </span>
                    <Badge
                        variant={
                            active
                                ? 'juste'
                                : etat === 'a_confirmer'
                                  ? 'indice'
                                  : 'neutre'
                        }
                    >
                        {badge}
                    </Badge>
                </span>
                <span className="text-aide text-ink-600">{detail}</span>
            </span>
        </div>
    );
}

function Activation() {
    return (
        <Form {...enable.form()} className="grid gap-3">
            {({ processing }) => (
                <Button
                    type="submit"
                    disabled={processing}
                    className="sm:w-fit"
                >
                    {processing && <Spinner />}
                    Activer la double authentification
                </Button>
            )}
        </Form>
    );
}

/** Étape numérotée : pastille à l'encre, titre, contenu. */
function Etape({
    numero,
    titre,
    children,
}: {
    numero: number;
    titre: string;
    children: React.ReactNode;
}) {
    return (
        <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-3">
            <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
            >
                {numero}
            </span>
            <span className="text-interface font-semibold text-ink-900">
                {titre}
            </span>
            <div className="col-start-2 grid gap-3">{children}</div>
        </li>
    );
}

function Configuration({ qrSvg, cle }: { qrSvg: string; cle: string }) {
    const cleLisible = cle.match(/.{1,4}/g)?.join(' ') ?? cle;

    const copier = async () => {
        try {
            await navigator.clipboard.writeText(cle);
            toast.success('Clé copiée.');
        } catch {
            toast.error('Copie impossible : recopiez la clé à la main.');
        }
    };

    return (
        <ol className="grid gap-6 border-t pt-5">
            <Etape numero={1} titre="Scannez ce code avec votre application">
                <p className="text-aide text-ink-600">
                    Google Authenticator, Microsoft Authenticator, Aegis ou
                    toute application compatible.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Blanc fixe, même en sombre : un lecteur de QR en a besoin. */}
                    <div
                        role="img"
                        aria-label="QR code à scanner avec l'application d'authentification"
                        className="clair w-fit shrink-0 rounded-[12px] bg-white p-2 ring-1 ring-black/10 [&_svg]:size-40"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                    <div className="grid gap-2">
                        <p className="text-aide text-ink-600">
                            Impossible de scanner ? Saisissez cette clé :
                        </p>
                        <p className="text-interface font-medium tracking-wide break-all text-ink-900 font-data">
                            {cleLisible}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            taille="compacte"
                            className="w-fit"
                            onClick={copier}
                        >
                            <Copy aria-hidden />
                            Copier la clé
                        </Button>
                    </div>
                </div>
            </Etape>
            <Etape numero={2} titre="Saisissez le code affiché">
                <Form
                    {...confirm.form()}
                    errorBag="confirmTwoFactorAuthentication"
                    resetOnError
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <Champ
                                libelle="Code à 6 chiffres"
                                erreur={errors.code}
                            >
                                {(attributs) => (
                                    <CodeInput
                                        {...attributs}
                                        name="code"
                                        longueur={6}
                                    />
                                )}
                            </Champ>
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Confirmer et activer
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                        router.delete(disable.url(), {
                                            preserveScroll: true,
                                        })
                                    }
                                >
                                    Annuler
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Etape>
        </ol>
    );
}

function CodesSecours({ codes }: { codes: string[] }) {
    const [visibles, setVisibles] = useState(false);

    return (
        <SectionCompte
            titre="Codes de secours"
            description="Téléphone perdu ? Chaque code remplace une fois le code de l'application. Gardez-les hors du téléphone, sur papier par exemple."
        >
            {visibles ? (
                <ul
                    aria-label="Codes de secours"
                    className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-controle bg-craie-100 p-4 sm:grid-cols-4"
                >
                    {codes.map((code) => (
                        <li
                            key={code}
                            className="text-aide font-medium text-ink-900 font-data"
                        >
                            {code}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-controle bg-craie-100 p-4 text-aide text-ink-600">
                    {codes.length} codes disponibles, masqués.
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibles((v) => !v)}
                >
                    {visibles ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    {visibles ? 'Masquer les codes' : 'Afficher les codes'}
                </Button>
                <Form
                    {...regenerateRecoveryCodes.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setVisibles(true)}
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            variant="ghost"
                            disabled={processing}
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <RefreshCw aria-hidden />
                            )}
                            Générer de nouveaux codes
                        </Button>
                    )}
                </Form>
            </div>
        </SectionCompte>
    );
}

function Desactivation() {
    const confirmer = useConfirmer();
    const [enCours, setEnCours] = useState(false);

    const desactiver = async () => {
        const accepte = await confirmer({
            titre: 'Désactiver la double authentification ?',
            message:
                'Les codes de secours actuels ne serviront plus. Vous pourrez la réactiver à tout moment.',
            action: 'Désactiver',
            ton: 'danger',
        });

        if (!accepte) {
            return;
        }

        router.delete(disable.url(), {
            preserveScroll: true,
            onStart: () => setEnCours(true),
            onFinish: () => setEnCours(false),
        });
    };

    return (
        <Button
            type="button"
            variant="outline"
            ton="danger"
            disabled={enCours}
            className="sm:w-fit"
            onClick={desactiver}
        >
            {enCours ? <Spinner /> : <ShieldOff aria-hidden />}
            Désactiver
        </Button>
    );
}
