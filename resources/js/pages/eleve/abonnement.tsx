import { Head, Link, useForm } from '@inertiajs/react';
import {
    BadgeCheck,
    CalendarDays,
    Check,
    MonitorSmartphone,
    ReceiptText,
    ShieldCheck,
    Ticket,
    Timer,
} from 'lucide-react';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { ProgressionSegments } from '@/components/ui/progression';
import type { DroitsAppareil } from '@/lib/abonnement';
import { diagnostic, grouper, nettoyer } from '@/lib/code-acces';
import { formaterJour } from '@/lib/dates';
import { cn, formaterGnf, formaterNombre, pluriel } from '@/lib/utils';
import { edit as verifierNumero } from '@/routes/compte/verification';
import { index as appareils } from '@/routes/compte/appareils';
import { code as utiliserCode, payer } from '@/routes/eleve/abonnement';
import { show as voirPaiement } from '@/routes/eleve/paiements';

type Formule = {
    cle: 'mensuel' | 'annee';
    nom: string;
    prix_gnf: number;
    mois: number;
    duree: string;
    fin_si_paye: string;
};

type LigneHistorique = {
    cle: string;
    date: string | null;
    formule: string;
    moyen: string;
    montant_gnf: number | null;
    statut: 'en_attente' | 'reussi' | 'echoue' | 'expire';
    libelle_statut: string;
    paiement: string | null;
};

type Props = {
    etat: {
        abonne: boolean;
        formule: string | null;
        debut: string | null;
        fin: string | null;
        jours_restants: number | null;
        est_exemple: boolean;
    };
    droits: DroitsAppareil;
    formules: Formule[];
    avantages: string[];
    gratuit: string[];
    mobile_money: boolean;
    numero_verifie: boolean;
    appareils: { actifs: number; limite: number; depasse: boolean } | null;
    historique: LigneHistorique[];
};

const VARIANTE_STATUT = {
    en_attente: 'indice',
    reussi: 'juste',
    echoue: 'faux',
    expire: 'neutre',
} as const;

/**
 * « Mon abonnement » (lot 9, PLAN M16) : où en est l'élève, les deux
 * formules et leurs prix en GNF (config/vitrine.php), payer par mobile
 * money, utiliser un code prépayé, l'historique. En ligne seulement.
 */
export default function Abonnement({
    etat,
    droits,
    formules,
    avantages,
    gratuit,
    mobile_money,
    numero_verifie,
    appareils: etatAppareils,
    historique,
}: Props) {
    const mensuel = formules.find((f) => f.cle === 'mensuel');

    return (
        <>
            <Head title="Mon abonnement" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {etat.abonne
                            ? `Formule ${etat.formule ?? 'en cours'}`
                            : 'Formule gratuite'}
                    </p>
                    <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                        Ton <strong>abonnement</strong>
                    </h1>
                    <p className="max-w-xl text-ink-600">
                        Les cours et la séance du jour restent gratuits.
                        L’abonnement ajoute les corrigés détaillés de toutes les
                        annales, les examens blancs sans limite et toutes tes
                        matières hors connexion.
                    </p>
                </header>

                {etat.est_exemple && <BandeauExemple />}

                {etatAppareils?.depasse && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-carte border border-indice-400/50 bg-indice-400/15 p-4 text-interface">
                        <MonitorSmartphone
                            aria-hidden
                            className="size-[18px] shrink-0 text-indice-700 dark:text-indice-400"
                        />
                        <span className="min-w-0 flex-1">
                            Ton abonnement vaut pour {etatAppareils.limite}{' '}
                            appareils ; ton compte est ouvert sur{' '}
                            <span data-capture="variable">
                                {etatAppareils.actifs}
                            </span>
                            . Retire ceux que tu n’utilises plus pour retrouver
                            tes téléchargements.
                        </span>
                        <Button asChild variant="outline" taille="compacte">
                            <Link href={appareils()}>Mes appareils</Link>
                        </Button>
                    </p>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-6">
                        <EtatAbonnement etat={etat} droits={droits} />

                        <section
                            aria-labelledby="titre-formules"
                            className="grid gap-3"
                        >
                            <div className="grid gap-1">
                                <h2
                                    id="titre-formules"
                                    className="text-titre-carte font-semibold"
                                >
                                    {etat.abonne
                                        ? 'Prolonger ton abonnement'
                                        : 'Choisir une formule'}
                                </h2>
                                <p className="text-aide text-ink-500">
                                    {etat.abonne
                                        ? 'La nouvelle période commence à la fin de celle en cours : tu ne perds aucun jour.'
                                        : 'Paiement par Orange Money ou MTN MoMo, ou avec un code prépayé.'}
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {formules.map((formule) => (
                                    <CarteFormule
                                        key={formule.cle}
                                        formule={formule}
                                        conseillee={formule.cle === 'annee'}
                                        economie={
                                            mensuel && formule.cle === 'annee'
                                                ? mensuel.prix_gnf *
                                                      formule.mois -
                                                  formule.prix_gnf
                                                : 0
                                        }
                                        mobileMoney={mobile_money}
                                        numeroVerifie={numero_verifie}
                                    />
                                ))}
                            </div>
                            {!mobile_money && (
                                <p className="text-aide text-ink-600">
                                    Le paiement mobile ouvre bientôt. En
                                    attendant, un code prépayé (librairie,
                                    école) ouvre ton abonnement.
                                </p>
                            )}
                            {mobile_money && !numero_verifie && (
                                <p className="text-aide text-ink-600">
                                    Pour payer, vérifie d’abord ton numéro :{' '}
                                    <Link
                                        href={verifierNumero()}
                                        className="font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
                                    >
                                        recevoir un code par SMS
                                    </Link>
                                    .
                                </p>
                            )}
                        </section>

                        <Comparaison gratuit={gratuit} avantages={avantages} />
                    </div>

                    <aside className="grid content-start gap-4">
                        <SaisieCode />
                        <Historique lignes={historique} />
                    </aside>
                </div>
            </div>
        </>
    );
}

function EtatAbonnement({
    etat,
    droits,
}: {
    etat: Props['etat'];
    droits: DroitsAppareil;
}) {
    if (etat.abonne && etat.fin) {
        const total =
            etat.debut !== null
                ? (new Date(etat.fin).getTime() -
                      new Date(etat.debut).getTime()) /
                  86_400_000
                : (etat.jours_restants ?? 0);
        const ecoule =
            total > 0
                ? Math.min(
                      100,
                      Math.max(
                          0,
                          ((total - (etat.jours_restants ?? 0)) / total) * 100,
                      ),
                  )
                : 0;

        return (
            <section
                aria-labelledby="titre-etat"
                className="grid gap-5 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                        <h2
                            id="titre-etat"
                            className="flex items-center gap-2 text-aide font-medium text-white/70"
                        >
                            <BadgeCheck aria-hidden className="size-4" />
                            Abonné · {etat.formule}
                        </h2>
                        <p className="text-[1.375rem] leading-tight font-semibold">
                            Jusqu’au {formaterJour(etat.fin)}
                        </p>
                    </div>
                    <p className="flex items-baseline gap-1.5">
                        <span className="text-[2.25rem] leading-none font-bold tracking-tight font-data">
                            {etat.jours_restants}
                        </span>
                        <span className="font-semibold text-white/60">
                            {(etat.jours_restants ?? 0) > 1
                                ? 'jours restants'
                                : 'jour restant'}
                        </span>
                    </p>
                </div>
                <ProgressionSegments
                    valeur={ecoule}
                    libelle="Part de la période déjà passée"
                    segments={24}
                    couleur="bg-nimba-400"
                />
                <ul className="grid gap-2 border-t border-white/15 pt-4 text-aide text-white/80 sm:grid-cols-3">
                    <li className="flex items-center gap-2">
                        <Check aria-hidden className="size-4 text-nimba-300" />
                        Tous les corrigés
                    </li>
                    <li className="flex items-center gap-2">
                        <Check aria-hidden className="size-4 text-nimba-300" />
                        Examens blancs illimités
                    </li>
                    <li className="flex items-center gap-2">
                        <Check aria-hidden className="size-4 text-nimba-300" />
                        Toutes les matières hors ligne
                    </li>
                </ul>
            </section>
        );
    }

    const { limite, faits } = droits.examens_blancs;
    const restants = limite === null ? null : Math.max(0, limite - faits);

    return (
        <section
            aria-labelledby="titre-etat"
            className="grid gap-5 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
        >
            <div className="grid gap-1">
                <h2
                    id="titre-etat"
                    className="text-aide font-medium text-white/70"
                >
                    Ce mois-ci, en gratuit
                </h2>
                <p className="text-[1.375rem] leading-tight font-semibold">
                    Tu révises déjà gratuitement.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 rounded-[12px] bg-white/[0.06] p-4">
                    <p className="flex items-center gap-2 text-aide text-white/70">
                        <Timer aria-hidden className="size-4" />
                        Examens blancs
                    </p>
                    <p className="flex items-baseline gap-1.5">
                        <span className="text-[1.75rem] leading-none font-bold tracking-tight font-data">
                            {restants ?? '—'}
                        </span>
                        <span className="text-aide font-medium text-white/60">
                            sur {limite} encore ce mois
                        </span>
                    </p>
                    {limite !== null && (
                        <div aria-hidden className="flex gap-1">
                            {Array.from({ length: limite }, (_, i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        'h-1.5 flex-1 rounded-full',
                                        i < faits
                                            ? 'bg-white/20'
                                            : 'bg-nimba-400',
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="grid gap-2 rounded-[12px] bg-white/[0.06] p-4">
                    <p className="flex items-center gap-2 text-aide text-white/70">
                        <ShieldCheck aria-hidden className="size-4" />
                        Corrigés détaillés
                    </p>
                    <p className="text-interface text-white/85">
                        Le sujet le plus récent de chaque matière, et ceux que
                        l’équipe ouvre à tous.
                    </p>
                </div>
            </div>
        </section>
    );
}

function CarteFormule({
    formule,
    conseillee,
    economie,
    mobileMoney,
    numeroVerifie,
}: {
    formule: Formule;
    conseillee: boolean;
    economie: number;
    mobileMoney: boolean;
    numeroVerifie: boolean;
}) {
    const peutPayer = mobileMoney && numeroVerifie;

    return (
        <article
            className={cn(
                'grid content-between gap-4 rounded-carte border bg-card p-5 shadow-carte',
                conseillee && 'border-nimba-500 ring-1 ring-nimba-500',
            )}
        >
            <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-titre-carte font-semibold">
                        {formule.nom}
                    </h3>
                    {conseillee && economie > 0 && (
                        <Badge variant="nimba">
                            {formaterGnf(economie)} d’économie
                        </Badge>
                    )}
                </div>
                <p className="flex items-baseline gap-1.5">
                    <span className="text-[1.75rem] leading-none font-bold tracking-tight font-data">
                        {formaterNombre(formule.prix_gnf)}
                    </span>
                    <span className="font-medium text-ink-500">
                        GNF · {formule.duree}
                    </span>
                </p>
                <p className="flex items-center gap-2 text-aide text-ink-600">
                    <CalendarDays aria-hidden className="size-4 text-ink-500" />
                    Payé aujourd’hui : jusqu’au{' '}
                    {formaterJour(formule.fin_si_paye)}
                </p>
            </div>
            {peutPayer ? (
                <Button
                    asChild
                    variant={conseillee ? 'default' : 'outline'}
                    className="w-full"
                >
                    <Link href={payer(formule.cle)} prefetch>
                        Payer par mobile money
                    </Link>
                </Button>
            ) : (
                <Button
                    variant="outline"
                    className="w-full"
                    disabled
                    aria-describedby="titre-formules"
                >
                    Payer par mobile money
                </Button>
            )}
        </article>
    );
}

function Comparaison({
    gratuit,
    avantages,
}: {
    gratuit: string[];
    avantages: string[];
}) {
    return (
        <section
            aria-labelledby="titre-comparaison"
            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte sm:grid-cols-2 sm:gap-6"
        >
            <h2 id="titre-comparaison" className="sr-only">
                Ce que comprend chaque formule
            </h2>
            <div className="grid content-start gap-3">
                <p className="text-[0.9375rem] font-semibold">Gratuit</p>
                <ul className="grid gap-2.5 text-aide text-ink-600">
                    {gratuit.map((ligne) => (
                        <li key={ligne} className="flex gap-2">
                            <Check
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-ink-500"
                            />
                            {ligne}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="grid content-start gap-3 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                <p className="text-[0.9375rem] font-semibold">Abonnement</p>
                <ul className="grid gap-2.5 text-aide text-ink-900">
                    {avantages.map((ligne) => (
                        <li key={ligne} className="flex gap-2">
                            <Check
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-nimba-600 dark:text-nimba-400"
                            />
                            {ligne}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function SaisieCode() {
    const formulaire = useForm({ code: '' });
    const probleme =
        nettoyer(formulaire.data.code).length >= 12
            ? diagnostic(formulaire.data.code)
            : null;
    const pret =
        nettoyer(formulaire.data.code).length === 12 && probleme === null;

    return (
        <section
            aria-labelledby="titre-code"
            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
        >
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                >
                    <Ticket className="size-5" />
                </span>
                <div className="grid gap-0.5">
                    <h2
                        id="titre-code"
                        className="text-[0.9375rem] font-semibold"
                    >
                        J’ai un code
                    </h2>
                    <p className="text-aide text-ink-500">
                        Une carte achetée en librairie, à l’école ou chez un
                        revendeur.
                    </p>
                </div>
            </div>
            <form
                className="grid gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    formulaire.post(utiliserCode().url, {
                        preserveScroll: true,
                        onSuccess: () => formulaire.reset(),
                    });
                }}
            >
                <Champ
                    libelle="Code de la carte"
                    aide={probleme ?? 'Les 12 caractères, avec ou sans tirets.'}
                    erreur={formulaire.errors.code}
                >
                    {(attributs) => (
                        <Input
                            {...attributs}
                            value={formulaire.data.code}
                            onChange={(e) =>
                                formulaire.setData(
                                    'code',
                                    grouper(e.target.value),
                                )
                            }
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder="XXXX-XXXX-XXXX"
                            className="tracking-[0.12em] uppercase font-data"
                        />
                    )}
                </Champ>
                <Button
                    type="submit"
                    variant="encre"
                    disabled={!pret || formulaire.processing}
                >
                    Utiliser le code
                </Button>
            </form>
        </section>
    );
}

function Historique({ lignes }: { lignes: LigneHistorique[] }) {
    return (
        <section
            aria-labelledby="titre-historique"
            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
        >
            <h2
                id="titre-historique"
                className="flex items-center gap-2 text-[0.9375rem] font-semibold"
            >
                <ReceiptText aria-hidden className="size-[18px] text-ink-500" />
                Historique
            </h2>
            {lignes.length === 0 ? (
                <p className="text-aide text-ink-500">
                    Aucun paiement ni code pour l’instant.
                </p>
            ) : (
                <ul className="grid divide-y">
                    {lignes.map((ligne) => {
                        const contenu = (
                            <>
                                <span className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="truncate text-interface font-medium">
                                        {ligne.formule} · {ligne.moyen}
                                    </span>
                                    <span className="text-meta text-ink-500">
                                        {ligne.date
                                            ? formaterJour(ligne.date)
                                            : ''}
                                        {ligne.montant_gnf !== null &&
                                            ` · ${formaterGnf(ligne.montant_gnf)}`}
                                    </span>
                                </span>
                                <Badge variant={VARIANTE_STATUT[ligne.statut]}>
                                    {ligne.libelle_statut}
                                </Badge>
                            </>
                        );

                        return (
                            <li
                                key={ligne.cle}
                                className="py-2.5 first:pt-0 last:pb-0"
                            >
                                {ligne.paiement ? (
                                    <Link
                                        href={voirPaiement(ligne.paiement)}
                                        className="flex items-center gap-3 rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-ring"
                                    >
                                        {contenu}
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {contenu}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {lignes.length > 0 && (
                <p className="text-meta text-ink-500">
                    {pluriel(lignes.length, 'opération')} récente
                    {lignes.length > 1 ? 's' : ''}.
                </p>
            )}
        </section>
    );
}
