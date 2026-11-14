import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardList, UserPlus } from 'lucide-react';
import { AvisMotDePasseProvisoire } from '@/components/suivi/mot-de-passe-provisoire';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { formaterJour } from '@/lib/dates';
import { TYPES_ETABLISSEMENT as TYPES } from '@/lib/etablissements';
import { pluriel } from '@/lib/utils';
import { index } from '@/routes/console/etablissements';
import { store as nommer } from '@/routes/console/etablissements/gestionnaires';
import { store as accorder } from '@/routes/console/etablissements/licences';
import type { Licence, MotDePasseProvisoire } from '@/types/suivi';

type Props = {
    etablissement: {
        id: number;
        nom: string;
        type: string;
        commune: string | null;
        prefecture: string | null;
        region: string | null;
        est_exemple: boolean;
    };
    rattachements: {
        id: number;
        role: string;
        libelle_role: string;
        prenom: string;
        pseudo: string;
    }[];
    licences: Licence[];
    mot_de_passe_provisoire: MotDePasseProvisoire;
};

/** Console › un établissement (lot 11) : ses comptes rattachés, ses licences. */
export default function EtablissementConsole({
    etablissement,
    rattachements,
    licences,
    mot_de_passe_provisoire,
}: Props) {
    const aujourdhui = new Date().toISOString().slice(0, 10);

    return (
        <>
            <Head title={etablissement.nom} />
            <div className="grid grid-cols-1 gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Établissements
                    </Link>
                </Button>
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {TYPES[etablissement.type] ?? etablissement.type}
                        {[
                            etablissement.commune,
                            etablissement.prefecture,
                        ].filter(Boolean).length > 0 &&
                            ` · ${[etablissement.commune, etablissement.prefecture].filter(Boolean).join(', ')}`}
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        <strong>{etablissement.nom}</strong>
                    </h1>
                </header>
                {etablissement.est_exemple && <BandeauExemple />}
                <AvisMotDePasseProvisoire avis={mot_de_passe_provisoire} />

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
                        <h2 className="text-[0.9375rem] font-semibold">
                            Comptes rattachés
                        </h2>
                        {rattachements.length === 0 ? (
                            <p className="text-aide text-ink-600">
                                Personne encore : nommez d’abord le
                                gestionnaire.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {rattachements.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex items-center justify-between gap-3 py-2.5"
                                    >
                                        <span className="grid min-w-0">
                                            <span className="truncate font-semibold">
                                                {r.prenom}
                                            </span>
                                            <span className="truncate text-meta text-ink-500">
                                                {r.pseudo}
                                            </span>
                                        </span>
                                        <Badge
                                            variant={
                                                r.role ===
                                                'gestionnaire_etablissement'
                                                    ? 'nimba'
                                                    : 'neutre'
                                            }
                                        >
                                            {r.libelle_role}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Form
                            {...nommer.form(etablissement.id)}
                            resetOnSuccess
                            className="grid gap-3 border-t pt-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <p className="flex items-center gap-2 text-interface font-medium">
                                        <UserPlus
                                            aria-hidden
                                            className="size-4 text-ink-500"
                                        />
                                        Nommer un gestionnaire
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Champ
                                            libelle="Prénom"
                                            erreur={errors.prenom}
                                        >
                                            {(a) => (
                                                <Input
                                                    {...a}
                                                    name="prenom"
                                                    required
                                                    maxLength={60}
                                                />
                                            )}
                                        </Champ>
                                        <Champ
                                            libelle="Numéro"
                                            erreur={errors.telephone}
                                        >
                                            {(a) => (
                                                <TelephoneInput
                                                    {...a}
                                                    name="telephone"
                                                />
                                            )}
                                        </Champ>
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="sm:w-fit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Nommer
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>

                    <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
                        <h2 className="text-[0.9375rem] font-semibold">
                            Licences
                        </h2>
                        {licences.length === 0 ? (
                            <p className="flex items-center gap-2 text-aide text-ink-600">
                                <ClipboardList
                                    aria-hidden
                                    className="size-4 text-ink-500"
                                />
                                Aucune licence.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {licences.map((l) => (
                                    <li
                                        key={l.id}
                                        className="grid gap-0.5 py-2.5"
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="font-semibold font-data">
                                                {l.prises}/
                                                {pluriel(l.places, 'place')}
                                            </span>
                                            <Badge
                                                variant={
                                                    l.en_cours
                                                        ? 'juste'
                                                        : 'neutre'
                                                }
                                            >
                                                {l.en_cours
                                                    ? 'En cours'
                                                    : 'Hors période'}
                                            </Badge>
                                        </span>
                                        <span className="text-aide text-ink-500">
                                            Du {formaterJour(l.debut)} au{' '}
                                            {formaterJour(l.fin)}
                                            {l.reference && ` · ${l.reference}`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Form
                            {...accorder.form(etablissement.id)}
                            resetOnSuccess
                            className="grid gap-3 border-t pt-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <p className="text-interface font-medium">
                                        Accorder une licence
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2 sm:[&>*:first-child]:col-span-2">
                                        <Champ
                                            libelle="Places"
                                            erreur={errors.places}
                                        >
                                            {(a) => (
                                                <NumberInput
                                                    {...a}
                                                    name="places"
                                                    min={1}
                                                    max={5000}
                                                    required
                                                />
                                            )}
                                        </Champ>
                                        <Champ
                                            libelle="Début"
                                            erreur={errors.debut}
                                        >
                                            {(a) => (
                                                <DateInput
                                                    {...a}
                                                    name="debut"
                                                    defaultValue={aujourdhui}
                                                    required
                                                />
                                            )}
                                        </Champ>
                                        <Champ
                                            libelle="Fin"
                                            erreur={errors.fin}
                                        >
                                            {(a) => (
                                                <DateInput
                                                    {...a}
                                                    name="fin"
                                                    required
                                                />
                                            )}
                                        </Champ>
                                    </div>
                                    <Champ
                                        libelle="Référence du contrat"
                                        erreur={errors.reference}
                                    >
                                        {(a) => (
                                            <Input
                                                {...a}
                                                name="reference"
                                                maxLength={120}
                                            />
                                        )}
                                    </Champ>
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="sm:w-fit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Accorder
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>
                </div>
            </div>
        </>
    );
}
