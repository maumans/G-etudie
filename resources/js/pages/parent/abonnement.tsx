import { Form, Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Lock, ShieldCheck, Ticket } from 'lucide-react';
import { Carte, EnteteEcran, TitreCarte } from '@/components/suivi/elements';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { formaterJour } from '@/lib/dates';
import { cn, formaterGnf } from '@/lib/utils';
import { edit as verifierNumero } from '@/routes/compte/verification';
import { code, show } from '@/routes/parent/enfants';
import { store } from '@/routes/parent/enfants/paiements';
import type { EtatAbonnement, Identite } from '@/types/suivi';

type Formule = {
    cle: 'mensuel' | 'annee';
    nom: string;
    prix_gnf: number;
    mois: number;
    duree: string;
};
type Moyen = { cle: 'orange_money' | 'mtn_momo'; libelle: string };

type Props = {
    enfant: Identite;
    etat: EtatAbonnement;
    formules: Formule[];
    avantages: string[];
    moyens: Moyen[];
    mobile_money: boolean;
    numero_verifie: boolean;
};

const SIGLES: Record<Moyen['cle'], string> = {
    orange_money: 'OM',
    mtn_momo: 'MoMo',
};

/**
 * Payer l'abonnement de son enfant (lot 11, décision 2 ; lot 9 : « parents
 * payeurs »). Le paiement est celui du parent ; c'est l'enfant qui est
 * abonné. Le montant vient du serveur ; le téléphone n'en envoie aucun.
 */
export default function AbonnementEnfant({
    enfant,
    etat,
    formules,
    avantages,
    moyens,
    mobile_money,
    numero_verifie,
}: Props) {
    const formulaire = useForm({
        formule: (formules[formules.length - 1]?.cle ??
            'mensuel') as Formule['cle'],
        moyen: '' as Moyen['cle'] | '',
        numero: '',
    });
    const choisie =
        formules.find((f) => f.cle === formulaire.data.formule) ?? formules[0];
    const pret =
        formulaire.data.moyen !== '' && formulaire.data.numero.length >= 13;

    return (
        <>
            <Head title={`Abonnement de ${enfant.prenom}`} />
            <div className="grid gap-5 lg:gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={show(enfant.id)} prefetch>
                        <ArrowLeft aria-hidden />
                        {enfant.prenom}
                    </Link>
                </Button>
                <EnteteEcran
                    meta={
                        etat.abonne && etat.fin
                            ? `Abonné jusqu’au ${formaterJour(etat.fin)}`
                            : 'Formule gratuite'
                    }
                    titre={
                        <>
                            L’abonnement de <strong>{enfant.prenom}</strong>
                        </>
                    }
                    chapeau="Vous payez depuis votre téléphone ; c’est son compte qui s’ouvre. Une nouvelle période commence à la fin de celle en cours : aucun jour perdu."
                />
                {etat.est_exemple && <BandeauExemple />}

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <Carte className="grid gap-5 sm:p-6">
                        {!numero_verifie ? (
                            <div className="grid gap-3">
                                <h2 className="text-titre-carte font-semibold">
                                    D’abord, vérifiez votre numéro
                                </h2>
                                <p className="text-ink-600">
                                    Un code par SMS suffit : c’est lui qui
                                    protège le paiement.
                                </p>
                                <Button asChild className="w-fit">
                                    <Link href={verifierNumero()}>
                                        Vérifier mon numéro
                                    </Link>
                                </Button>
                            </div>
                        ) : !mobile_money ? (
                            <div className="grid gap-2">
                                <h2 className="text-titre-carte font-semibold">
                                    Le paiement mobile ouvre bientôt
                                </h2>
                                <p className="text-ink-600">
                                    En attendant, un code prépayé acheté en
                                    librairie ou à l’école ouvre l’abonnement (à
                                    côté).
                                </p>
                            </div>
                        ) : (
                            <form
                                className="grid gap-5"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    formulaire.post(store(enfant.id).url);
                                }}
                            >
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-interface font-medium">
                                        Formule
                                    </legend>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {formules.map((formule) => {
                                            const actif =
                                                formulaire.data.formule ===
                                                formule.cle;

                                            return (
                                                <label
                                                    key={formule.cle}
                                                    className={cn(
                                                        'grid cursor-pointer gap-1 rounded-[12px] border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                                                        actif
                                                            ? 'border-nimba-600 bg-nimba-600/[0.06] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                                                            : 'border-input hover:bg-craie-100 dark:hover:bg-white/[0.03]',
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="formule"
                                                        value={formule.cle}
                                                        checked={actif}
                                                        onChange={() =>
                                                            formulaire.setData(
                                                                'formule',
                                                                formule.cle,
                                                            )
                                                        }
                                                        className="sr-only"
                                                    />
                                                    <span className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold">
                                                            {formule.nom}
                                                        </span>
                                                        <span className="text-meta text-ink-500">
                                                            {formule.duree}
                                                        </span>
                                                    </span>
                                                    <span className="text-[1.375rem] leading-tight font-bold font-data">
                                                        {formaterGnf(
                                                            formule.prix_gnf,
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-interface font-medium">
                                        Payer avec
                                    </legend>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {moyens.map((moyen) => {
                                            const actif =
                                                formulaire.data.moyen ===
                                                moyen.cle;

                                            return (
                                                <label
                                                    key={moyen.cle}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                                                        actif
                                                            ? 'border-nimba-600 bg-nimba-600/[0.06] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                                                            : 'border-input hover:bg-craie-100 dark:hover:bg-white/[0.03]',
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="moyen"
                                                        value={moyen.cle}
                                                        checked={actif}
                                                        onChange={() =>
                                                            formulaire.setData(
                                                                'moyen',
                                                                moyen.cle,
                                                            )
                                                        }
                                                        className="sr-only"
                                                    />
                                                    <span
                                                        aria-hidden
                                                        className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-ink-900 text-[0.6875rem] font-bold tracking-tight text-craie-50"
                                                    >
                                                        {SIGLES[moyen.cle]}
                                                    </span>
                                                    <span className="text-interface font-semibold">
                                                        {moyen.libelle}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {formulaire.errors.moyen && (
                                        <p className="text-aide text-faux-600 dark:text-faux-400">
                                            {formulaire.errors.moyen}
                                        </p>
                                    )}
                                </fieldset>
                                <Champ
                                    libelle="Numéro qui paie"
                                    aide="Ce téléphone recevra la demande à confirmer avec votre code secret."
                                    erreur={formulaire.errors.numero}
                                >
                                    {(attributs) => (
                                        <TelephoneInput
                                            {...attributs}
                                            valeur={formulaire.data.numero}
                                            onValeur={(v) =>
                                                formulaire.setData('numero', v)
                                            }
                                        />
                                    )}
                                </Champ>
                                <Button
                                    type="submit"
                                    taille="grande"
                                    className="w-full sm:w-fit"
                                    disabled={!pret || formulaire.processing}
                                >
                                    {formulaire.processing ? (
                                        <Spinner />
                                    ) : (
                                        <Lock aria-hidden />
                                    )}
                                    Payer{' '}
                                    {choisie
                                        ? formaterGnf(choisie.prix_gnf)
                                        : ''}
                                </Button>
                            </form>
                        )}
                    </Carte>

                    <div className="grid content-start gap-5">
                        <Carte className="grid gap-3">
                            <TitreCarte>Ce que l’abonnement ouvre</TitreCarte>
                            <ul className="grid gap-2 text-aide text-ink-600">
                                {avantages.map((avantage) => (
                                    <li
                                        key={avantage}
                                        className="flex items-start gap-2"
                                    >
                                        <Check
                                            aria-hidden
                                            className="mt-0.5 size-4 shrink-0 text-juste-600 dark:text-juste-400"
                                        />
                                        {avantage}
                                    </li>
                                ))}
                            </ul>
                        </Carte>
                        <Carte className="grid gap-3">
                            <TitreCarte>
                                <span className="flex items-center gap-2">
                                    <Ticket
                                        aria-hidden
                                        className="size-4 text-ink-500"
                                    />
                                    Un code prépayé
                                </span>
                            </TitreCarte>
                            <Form
                                {...code.form(enfant.id)}
                                resetOnError
                                className="grid gap-3"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <Champ
                                            libelle="Code de la carte"
                                            erreur={errors.code}
                                        >
                                            {(attributs) => (
                                                <Input
                                                    {...attributs}
                                                    name="code"
                                                    required
                                                    autoComplete="off"
                                                    className="uppercase font-data"
                                                    placeholder="XXXX-XXXX-XXXX"
                                                />
                                            )}
                                        </Champ>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Utiliser le code
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </Carte>
                        <p className="flex items-start gap-2 px-1 text-aide text-ink-500">
                            <ShieldCheck
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-juste-600 dark:text-juste-400"
                            />
                            N’karamögö ne vous demande jamais votre code secret
                            mobile money.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
