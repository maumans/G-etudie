import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { formaterJour } from '@/lib/dates';
import { cn, formaterGnf } from '@/lib/utils';
import { abonnement } from '@/routes/eleve';
import { edit as verifierNumero } from '@/routes/compte/verification';
import { store } from '@/routes/eleve/paiements';

type Moyen = { cle: 'orange_money' | 'mtn_momo'; libelle: string };

type Props = {
    formule: {
        cle: 'mensuel' | 'annee';
        nom: string;
        prix_gnf: number;
        mois: number;
        duree: string;
        fin_si_paye: string;
    };
    moyens: Moyen[];
    mobile_money: boolean;
    numero_verifie: boolean;
    abonne_jusqu_au: string | null;
};

const SIGLES: Record<Moyen['cle'], string> = {
    orange_money: 'OM',
    mtn_momo: 'MoMo',
};

/**
 * Payer une formule par mobile money (lot 9) : le moyen, le numéro qui paie
 * (le sien ou celui d'un parent), puis la demande part à l'opérateur. Le
 * montant affiché est celui du serveur ; le téléphone n'en envoie aucun.
 */
export default function Payer({
    formule,
    moyens,
    mobile_money,
    numero_verifie,
    abonne_jusqu_au,
}: Props) {
    const formulaire = useForm({
        formule: formule.cle,
        moyen: '' as Moyen['cle'] | '',
        numero: '',
    });
    const pret =
        formulaire.data.moyen !== '' && formulaire.data.numero.length >= 13;

    return (
        <>
            <Head title={`Payer · ${formule.nom}`} />
            <div className="grid grid-cols-1 gap-6">
                <div className="grid gap-4">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2 w-fit"
                    >
                        <Link href={abonnement()} prefetch>
                            <ArrowLeft aria-hidden />
                            Mon abonnement
                        </Link>
                    </Button>
                    <header className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500">
                            Formule {formule.nom} · {formule.duree}
                        </p>
                        <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                            Payer{' '}
                            <strong>{formaterGnf(formule.prix_gnf)}</strong>
                        </h1>
                    </header>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <section className="grid gap-5 rounded-carte border bg-card p-5 shadow-carte sm:p-6">
                        {!numero_verifie ? (
                            <div className="grid gap-3">
                                <h2 className="text-titre-carte font-semibold">
                                    D’abord, vérifie ton numéro
                                </h2>
                                <p className="text-interface text-ink-600">
                                    C’est lui qui protège ton abonnement : si tu
                                    oublies ton mot de passe, il te le rend. Un
                                    code par SMS suffit.
                                </p>
                                <Button asChild className="w-fit">
                                    <Link href={verifierNumero()}>
                                        Vérifier mon numéro
                                    </Link>
                                </Button>
                            </div>
                        ) : !mobile_money ? (
                            <div className="grid gap-3">
                                <h2 className="text-titre-carte font-semibold">
                                    Le paiement mobile ouvre bientôt
                                </h2>
                                <p className="text-interface text-ink-600">
                                    En attendant, un code prépayé acheté en
                                    librairie ou à l’école ouvre ton abonnement.
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-fit"
                                >
                                    <Link href={abonnement()}>
                                        J’ai un code
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <form
                                className="grid gap-5"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    formulaire.post(store().url);
                                }}
                            >
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-interface font-medium">
                                        Payer avec
                                    </legend>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {moyens.map((moyen) => {
                                            const choisi =
                                                formulaire.data.moyen ===
                                                moyen.cle;

                                            return (
                                                <label
                                                    key={moyen.cle}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                                                        choisi
                                                            ? 'border-nimba-600 bg-nimba-600/[0.06] ring-1 ring-nimba-600 dark:border-nimba-300 dark:bg-nimba-300/10 dark:ring-nimba-300'
                                                            : 'border-input hover:bg-craie-100 dark:hover:bg-white/[0.03]',
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="moyen"
                                                        value={moyen.cle}
                                                        checked={choisi}
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
                                                    <span className="grid gap-0.5">
                                                        <span className="text-interface font-semibold">
                                                            {moyen.libelle}
                                                        </span>
                                                        <span className="text-meta text-ink-500">
                                                            Code secret sur le
                                                            téléphone
                                                        </span>
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
                                    aide="Le tien, ou celui d’un parent : c’est ce téléphone qui recevra la demande."
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

                                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-[12px] bg-craie-100 p-4 text-interface dark:bg-white/[0.04]">
                                    <dt className="text-ink-600">
                                        {formule.nom} · {formule.duree}
                                    </dt>
                                    <dd className="text-right font-semibold font-data">
                                        {formaterGnf(formule.prix_gnf)}
                                    </dd>
                                    <dt className="text-ink-600">
                                        Abonné jusqu’au
                                    </dt>
                                    <dd className="text-right font-medium">
                                        {formaterJour(formule.fin_si_paye)}
                                    </dd>
                                </dl>
                                {abonne_jusqu_au && (
                                    <p className="-mt-2 text-aide text-ink-500">
                                        Ton abonnement actuel court jusqu’au{' '}
                                        {formaterJour(abonne_jusqu_au)} : la
                                        nouvelle période commence ce jour-là.
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    taille="grande"
                                    className="w-full sm:w-fit"
                                    disabled={!pret || formulaire.processing}
                                >
                                    <Lock aria-hidden />
                                    Payer {formaterGnf(formule.prix_gnf)}
                                </Button>
                            </form>
                        )}
                    </section>

                    <aside className="grid content-start gap-4">
                        <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
                            <h2 className="text-[0.9375rem] font-semibold">
                                Comment ça se passe
                            </h2>
                            <ol className="grid gap-3.5 text-aide text-ink-600">
                                {[
                                    'Tu choisis l’opérateur et le numéro qui paie.',
                                    'Le téléphone du payeur reçoit une demande : il la confirme avec son code secret.',
                                    'Ton abonnement s’ouvre dès que l’opérateur nous le confirme, en général en moins d’une minute.',
                                ].map((etape, rang) => (
                                    <li key={rang} className="flex gap-3">
                                        <span
                                            aria-hidden
                                            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                                        >
                                            {rang + 1}
                                        </span>
                                        {etape}
                                    </li>
                                ))}
                            </ol>
                        </section>
                        <section className="grid gap-2.5 rounded-carte border bg-card p-5 shadow-carte">
                            <p className="flex items-center gap-2 text-interface font-semibold">
                                <ShieldCheck
                                    aria-hidden
                                    className="size-[18px] text-juste-600 dark:text-juste-400"
                                />
                                Ton code secret reste à toi
                            </p>
                            <p className="text-aide text-ink-600">
                                N’karamögö ne le demande jamais et ne le voit
                                jamais. Personne ne doit te le demander par
                                téléphone.
                            </p>
                            <p className="flex items-center gap-2 border-t pt-2.5 text-aide text-ink-600">
                                <Smartphone
                                    aria-hidden
                                    className="size-4 shrink-0 text-ink-500"
                                />
                                Le numéro du payeur est gardé chiffré.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}
