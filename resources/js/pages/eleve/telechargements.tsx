import { Head, Link, router } from '@inertiajs/react';
import {
    CircleCheck,
    CloudOff,
    Download,
    HardDrive,
    Hourglass,
    Laptop,
    Lock,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { ProgressionBarre } from '@/components/ui/progression';
import { usePacksLocaux } from '@/hooks/use-packs-locaux';
import {
    estAppareilPartage,
    supprimer,
    telecharger,
    useHorsLigne,
} from '@/lib/hors-ligne';
import {
    ErreurPack,
    estUtilisable,
    placeSurLAppareil,
} from '@/lib/hors-ligne/packs';
import type { PackLocal } from '@/lib/hors-ligne/packs';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterOctets, pluriel } from '@/lib/utils';
import { abonnement as pageAbonnement } from '@/routes/eleve';
import { matiere as pageMatiere } from '@/routes/eleve/cours';

type PackServeur = {
    cle: string;
    titre: string;
    matiere: { cle: CleMatiere; nom: string; slug: string };
    phare: boolean;
    pret: boolean;
    version: string | null;
    genere_le: string | null;
    taille_octets: number;
    taille_sans_images: number;
    compte: { lecons: number; fiches: number; annales: number };
    est_exemple: boolean;
    pris: boolean;
    expire_le: string | null;
    permis: boolean;
    motif: string | null;
};

type Props = {
    examen: string;
    abonne: boolean;
    gratuits: number;
    gratuit: string | null;
    /** Lot 9 (HL-D8) : abonné ouvert sur trop d'appareils. */
    motif_appareils: string | null;
    packs: PackServeur[];
};

type Suivi = { recus: number; attendus: number; erreur: string | null };

/**
 * Téléchargements (HORS_LIGNE.md A.5, HL5) : un pack par matière de
 * l'examen, son poids **avant** de télécharger, puis l'état sur ce
 * téléphone (complet, à mettre à jour, interrompu). Télécharger et mettre à
 * jour demandent le réseau ; l'écran, lui, se relit hors ligne (copie +
 * état local). Les packs sont partagés par les profils du téléphone.
 */
export default function Telechargements({
    examen,
    abonne,
    gratuits,
    gratuit,
    motif_appareils,
    packs,
}: Props) {
    const { packs: locaux } = usePacksLocaux();
    const { reseau } = useHorsLigne();
    const horsLigne = reseau !== 'en_ligne';
    const [suivis, setSuivis] = useState<Record<string, Suivi>>({});
    const [place, setPlace] = useState<{
        utilise: number;
        disponible: number;
    } | null>(null);
    const confirmer = useConfirmer();
    const partage = estAppareilPartage();

    useEffect(() => {
        void placeSurLAppareil().then(setPlace);
    }, [locaux]);

    const presents = packs.filter((p) => locaux[p.cle]?.version);
    const poidsPresent = presents.reduce(
        (t, p) => t + (locaux[p.cle]?.taille_octets ?? 0),
        0,
    );
    // L'action dominante : le premier pack proposé qui n'est pas encore là.
    const premier = packs.find((p) => p.pret && p.permis && !locaux[p.cle]);

    const lancer = async (pack: PackServeur) => {
        setSuivis((s) => ({
            ...s,
            [pack.cle]: { recus: 0, attendus: 1, erreur: null },
        }));

        try {
            await telecharger(pack.cle, {
                premier: !pack.pris,
                surProgression: ({ recus, attendus }) =>
                    setSuivis((s) => ({
                        ...s,
                        [pack.cle]: { recus, attendus, erreur: null },
                    })),
            });
            setSuivis((s) => {
                const { [pack.cle]: _fini, ...reste } = s;

                return reste;
            });
            // La place gratuite vient d'être prise : les droits des autres
            // packs changent.
            router.reload({ only: ['packs', 'gratuit'] });
        } catch (erreur) {
            setSuivis((s) => ({
                ...s,
                [pack.cle]: {
                    recus: s[pack.cle]?.recus ?? 0,
                    attendus: s[pack.cle]?.attendus ?? 1,
                    erreur:
                        erreur instanceof ErreurPack
                            ? erreur.message
                            : 'Téléchargement interrompu. Réessaie.',
                },
            }));
        }
    };

    const retirer = async (pack: PackServeur) => {
        const accepte = await confirmer({
            titre: `Supprimer ${pack.matiere.nom} de ce téléphone ?`,
            message: horsLigne
                ? 'Le pack est effacé de ce téléphone. Ta place gratuite se libérera à ta prochaine connexion.'
                : 'Le pack est effacé de ce téléphone (pour tous ses profils). Tu pourras le reprendre plus tard.',
            action: 'Supprimer',
        });

        if (accepte) {
            await supprimer(pack.cle);

            if (!horsLigne) {
                router.reload({ only: ['packs', 'gratuit'] });
            }
        }
    };

    return (
        <>
            <Head title="Téléchargements" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {examen}
                    </p>
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Réviser <strong>sans réseau</strong>
                    </h1>
                    <p className="max-w-xl text-ink-600">
                        Télécharge une matière une fois : ses leçons, ses fiches
                        et ses annales s’ouvrent ensuite sans connexion, et tes
                        réponses partent toutes seules au retour du réseau.
                    </p>
                </header>

                {packs.some((p) => p.est_exemple) && <BandeauExemple />}

                {motif_appareils && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-carte border border-indice-400/50 bg-indice-400/15 p-4 text-interface">
                        <span className="min-w-0 flex-1">
                            {motif_appareils}
                        </span>
                        <Button asChild variant="outline" taille="compacte">
                            <Link href="/compte/appareils">Mes appareils</Link>
                        </Button>
                    </p>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-4">
                        {partage ? (
                            <EtatVide
                                illustration={Laptop}
                                titre="Ordinateur partagé : rien n’est gardé"
                                message="Tu t’es connecté en cochant « Ordinateur partagé ». Pour télécharger une matière, connecte-toi sur ton propre téléphone."
                                action={
                                    <Button asChild variant="outline">
                                        <Link href="/eleve/cours">
                                            Lire en ligne
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <section
                                aria-label="Packs de ton examen"
                                className="rounded-carte border bg-card shadow-carte"
                            >
                                <ul className="divide-y">
                                    {packs.map((pack) => (
                                        <LignePack
                                            key={pack.cle}
                                            pack={pack}
                                            local={locaux[pack.cle] ?? null}
                                            suivi={suivis[pack.cle] ?? null}
                                            dominant={pack === premier}
                                            abonne={abonne}
                                            horsLigne={horsLigne}
                                            onTelecharger={() =>
                                                void lancer(pack)
                                            }
                                            onSupprimer={() =>
                                                void retirer(pack)
                                            }
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <aside className="grid content-start gap-4">
                        <section
                            aria-labelledby="titre-telephone"
                            className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve"
                        >
                            <h2
                                id="titre-telephone"
                                className="flex items-center gap-2 text-aide font-medium text-white/70"
                            >
                                <HardDrive aria-hidden className="size-4" />
                                Sur ce téléphone
                            </h2>
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-[2.25rem] leading-none font-bold tracking-tight font-data">
                                    {presents.length}
                                </span>
                                <span className="font-semibold text-white/60">
                                    {presents.length > 1
                                        ? 'matières'
                                        : 'matière'}{' '}
                                    sur {packs.length}
                                </span>
                            </p>
                            <p className="text-aide text-white/75">
                                {presents.length === 0
                                    ? 'Rien encore. Commence par la matière que tu révises ce soir.'
                                    : `${formaterOctets(poidsPresent)} utilisés${place ? ` · ${formaterOctets(place.disponible)} libres` : ''}`}
                            </p>
                            <p className="border-t border-white/15 pt-3 text-meta text-white/65">
                                {abonne
                                    ? 'Abonné : tous les packs de ton examen.'
                                    : gratuit
                                      ? `Ton téléchargement gratuit : ${packs.find((p) => p.cle === gratuit)?.matiere.nom ?? 'une matière'}. Supprime-le pour en choisir un autre.`
                                      : `${pluriel(gratuits, 'matière')} au choix, gratuitement. Les autres viendront avec l’abonnement.`}
                            </p>
                            {!abonne && (
                                <Button
                                    asChild
                                    variant="outline"
                                    taille="compacte"
                                    className="w-fit border-white/25 bg-white/5 text-white hover:bg-white/10"
                                >
                                    <Link href={pageAbonnement()}>
                                        Toutes les matières avec l’abonnement
                                    </Link>
                                </Button>
                            )}
                        </section>

                        <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                            <h2 className="text-[0.9375rem] font-semibold">
                                Bon à savoir
                            </h2>
                            <ul className="grid gap-2.5 text-aide text-ink-600">
                                <li className="flex gap-2">
                                    <CircleCheck
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-juste-600 dark:text-juste-400"
                                    />
                                    Tes frères et sœurs qui ont un profil ici
                                    lisent le même pack : tu ne paies qu’une
                                    fois.
                                </li>
                                <li className="flex gap-2">
                                    <RefreshCw
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-nimba-600 dark:text-nimba-400"
                                    />
                                    Une mise à jour ne reprend que ce qui a
                                    changé : quelques Ko pour un corrigé
                                    corrigé.
                                </li>
                                <li className="flex gap-2">
                                    <CloudOff
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Coupé en plein téléchargement ? Il reprend
                                    là où il s’est arrêté.
                                </li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function LignePack({
    pack,
    local,
    suivi,
    dominant,
    abonne,
    horsLigne,
    onTelecharger,
    onSupprimer,
}: {
    pack: PackServeur;
    abonne: boolean;
    local: PackLocal | null;
    suivi: Suivi | null;
    dominant: boolean;
    horsLigne: boolean;
    onTelecharger: () => void;
    onSupprimer: () => void;
}) {
    const style = MATIERES[pack.matiere.cle];
    const Icone = style.icone;
    const enCours = suivi !== null && suivi.erreur === null;
    const complet = local?.version != null;
    const expire = local !== null && complet && !estUtilisable(local);
    const aMettreAJour =
        complet &&
        !expire &&
        (local.a_jour === false ||
            (pack.version !== null && pack.version !== local.version));
    const interrompu =
        local !== null && local.statut === 'en_cours' && !enCours;
    const vide =
        pack.compte.lecons + pack.compte.fiches + pack.compte.annales === 0;
    const pourcentage = enCours
        ? suivi.attendus === 0
            ? 100
            : (suivi.recus / suivi.attendus) * 100
        : 0;

    const contenu = [
        pluriel(pack.compte.lecons, 'leçon'),
        pluriel(pack.compte.fiches, 'fiche'),
        pluriel(pack.compte.annales, 'annale'),
    ].join(' · ');

    let etat: React.ReactNode = null;
    let action: React.ReactNode = null;

    if (!pack.pret) {
        etat = (
            <Badge>
                <Hourglass aria-hidden /> En préparation
            </Badge>
        );
    } else if (enCours) {
        etat = <Badge variant="nimba">Téléchargement…</Badge>;
    } else if (expire) {
        etat = <Badge variant="faux">Expiré</Badge>;
    } else if (aMettreAJour) {
        etat = <Badge variant="indice">Mise à jour disponible</Badge>;
        action = (
            <Button
                variant="doux"
                taille="compacte"
                disabled={horsLigne}
                onClick={onTelecharger}
            >
                <RefreshCw aria-hidden /> Mettre à jour
            </Button>
        );
    } else if (complet) {
        etat = (
            <Badge variant="juste">
                <CircleCheck aria-hidden /> Sur le téléphone
            </Badge>
        );
    } else if (interrompu) {
        etat = <Badge variant="indice">Interrompu</Badge>;
        action = (
            <Button
                variant={dominant ? 'default' : 'outline'}
                taille="compacte"
                disabled={horsLigne}
                onClick={onTelecharger}
            >
                <Download aria-hidden /> Reprendre
            </Button>
        );
    } else if (!pack.permis && abonne) {
        // Lot 9 (HL-D8) : abonné, mais ouvert sur trop d'appareils.
        etat = (
            <Badge variant="indice" title={pack.motif ?? undefined}>
                <Lock aria-hidden /> Retire un appareil
            </Badge>
        );
    } else if (!pack.permis) {
        // La phrase complète (place gratuite prise) est dite une fois,
        // dans « Sur ce téléphone » ; ici, une étiquette suffit.
        etat = (
            <Link
                href={pageAbonnement()}
                title={pack.motif ?? undefined}
                className="rounded-badge outline-none focus-visible:outline-2 focus-visible:outline-ring"
            >
                <Badge className="hover:bg-ink-600/[0.14]">
                    <Lock aria-hidden /> Avec l’abonnement
                </Badge>
            </Link>
        );
    } else if (pack.permis && !vide) {
        action = (
            <Button
                variant={dominant ? 'default' : 'outline'}
                taille="compacte"
                disabled={horsLigne}
                onClick={onTelecharger}
            >
                <Download aria-hidden /> Télécharger
            </Button>
        );
    }

    return (
        <li className="grid gap-3 p-4 sm:px-5">
            <div className="flex items-center gap-3">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        style.tuile,
                    )}
                >
                    <Icone className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {complet && !expire ? (
                            <Link
                                href={pageMatiere(pack.matiere.slug)}
                                className="font-semibold hover:underline"
                            >
                                {pack.matiere.nom}
                            </Link>
                        ) : (
                            <span className="font-semibold">
                                {pack.matiere.nom}
                            </span>
                        )}
                        {etat}
                    </div>
                    <span className="text-aide text-ink-500">
                        {vide ? 'Pas encore de contenu publié' : contenu}
                        {pack.pret && !vide && (
                            <>
                                {' · '}
                                <span className="font-medium text-ink-600 font-data">
                                    {formaterOctets(pack.taille_octets)}
                                </span>
                                {pack.taille_sans_images < pack.taille_octets &&
                                    ` (${formaterOctets(pack.taille_sans_images)} sans images)`}
                            </>
                        )}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {action}
                    {(complet || interrompu) && !enCours && (
                        <Button
                            variant="ghost"
                            ton="neutre"
                            taille="icone-compacte"
                            aria-label={`Supprimer ${pack.matiere.nom} de ce téléphone`}
                            onClick={onSupprimer}
                        >
                            <Trash2 aria-hidden className="text-ink-500" />
                        </Button>
                    )}
                </div>
            </div>

            {enCours && (
                <ProgressionBarre
                    valeur={pourcentage}
                    libelle={`Téléchargement de ${pack.matiere.nom}`}
                    couleur={style.plein}
                />
            )}
            {suivi?.erreur && (
                <p className="text-aide text-faux-700 dark:text-faux-400">
                    {suivi.erreur}
                </p>
            )}
            {horsLigne && !complet && pack.permis && !vide && (
                <p className="text-aide text-ink-500">
                    Télécharger demande une connexion.
                </p>
            )}
            {complet && local?.expire_le && !expire && (
                <p className="text-aide text-ink-500">
                    Mis à jour tant que ton abonnement dure (jusqu’au{' '}
                    {new Date(local.expire_le).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                    })}
                    ).
                </p>
            )}
        </li>
    );
}
