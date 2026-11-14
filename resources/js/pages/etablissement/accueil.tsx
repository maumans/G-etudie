import { Form, Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Building2,
    Gauge,
    Presentation,
    UserMinus,
    UserPlus,
    UsersRound,
} from 'lucide-react';
import {
    Carte,
    EnteteEcran,
    Initiale,
    TitreCarte,
    TuileChiffre,
    TuileMatiere,
} from '@/components/suivi/elements';
import { AvisMotDePasseProvisoire } from '@/components/suivi/mot-de-passe-provisoire';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ProgressionBarre } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { formaterJour } from '@/lib/dates';
import { edit as monCompte } from '@/routes/compte/profil';
import { pluriel } from '@/lib/utils';
import { licences as pageLicences } from '@/routes/etablissement';
import { retirer, store } from '@/routes/etablissement/enseignants';
import { show as pageGroupe } from '@/routes/etablissement/groupes';
import type {
    Licence,
    MotDePasseProvisoire,
    NotionFaible,
    ResumeGroupe,
} from '@/types/suivi';

type Props = {
    etablissement: {
        id: number;
        nom: string;
        commune: string | null;
        est_exemple: boolean;
    } | null;
    groupes: (ResumeGroupe & {
        enseignant: string;
        jauge_moyenne: number | null;
        actifs_semaine: number;
        notions_faibles: NotionFaible[];
    })[];
    resume: {
        groupes: number;
        eleves: number;
        enseignants: number;
        jauge_moyenne: number | null;
    } | null;
    licences: Licence[];
    enseignants: {
        id: number;
        prenom: string;
        pseudo: string;
        groupes: number;
        rattache_le: string;
    }[];
    mot_de_passe_provisoire: MotDePasseProvisoire;
};

/**
 * Espace établissement (lot 11, PLAN M14) : le rapport de préparation par
 * groupe — « le produit qu'on vend aux écoles » —, les enseignants
 * rattachés et la licence en cours.
 */
export default function AccueilEtablissement({
    etablissement,
    groupes,
    resume,
    licences,
    enseignants,
    mot_de_passe_provisoire,
}: Props) {
    const confirmer = useConfirmer();

    if (etablissement === null || resume === null) {
        return (
            <>
                <Head title="Établissement" />
                <div className="grid gap-6">
                    <EnteteEcran
                        meta="Espace établissement"
                        titre={
                            <>
                                Votre <strong>établissement</strong>
                            </>
                        }
                    />
                    <Carte>
                        <EtatVide
                            illustration={Building2}
                            titre="Pas encore d’établissement rattaché"
                            message="L’équipe N’karamögö rattache votre compte à votre école à la signature du partenariat. En attendant, vérifiez votre numéro : c’est par lui qu’elle vous retrouve."
                            action={
                                <Button
                                    asChild
                                    variant="outline"
                                    taille="compacte"
                                >
                                    <Link href={monCompte()}>Mon compte</Link>
                                </Button>
                            }
                        />
                    </Carte>
                </div>
            </>
        );
    }

    const courante = licences.find((l) => l.en_cours);

    return (
        <>
            <Head title={etablissement.nom} />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta={['Rapport de préparation', etablissement.commune]
                        .filter(Boolean)
                        .join(' · ')}
                    titre={<strong>{etablissement.nom}</strong>}
                    chapeau={`${pluriel(resume.groupes, 'groupe')}, ${pluriel(resume.eleves, 'élève')} inscrits par leurs enseignants. Les chiffres viennent de ce que les élèves font vraiment.`}
                />
                {(etablissement.est_exemple ||
                    groupes.some((g) => g.est_exemple)) && <BandeauExemple />}
                <AvisMotDePasseProvisoire avis={mot_de_passe_provisoire} />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    <TuileChiffre
                        icone={Presentation}
                        libelle="Groupes"
                        valeur={resume.groupes}
                    />
                    <TuileChiffre
                        icone={UsersRound}
                        libelle="Élèves"
                        valeur={resume.eleves}
                    />
                    <TuileChiffre
                        icone={Gauge}
                        libelle="Jauge moyenne"
                        valeur={resume.jauge_moyenne}
                        unite="%"
                    />
                    <TuileChiffre
                        icone={Activity}
                        libelle="Enseignants"
                        valeur={resume.enseignants}
                    />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <Carte aria-labelledby="titre-rapport" className="h-fit">
                        <TitreCarte id="titre-rapport">Par groupe</TitreCarte>
                        {groupes.length === 0 ? (
                            <div className="mt-4">
                                <EtatVide
                                    illustration={Presentation}
                                    titre="Aucun groupe encore"
                                    message="Rattachez vos enseignants : chacun crée le groupe de sa classe et en donne le code à ses élèves."
                                    action={
                                        <Button
                                            asChild
                                            variant="outline"
                                            taille="compacte"
                                        >
                                            <a href="#ajouter-enseignant">
                                                Rattacher un enseignant
                                            </a>
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="mt-2 divide-y">
                                {groupes.map((groupe) => (
                                    <li key={groupe.id}>
                                        <Link
                                            href={pageGroupe(groupe.id)}
                                            prefetch
                                            className="-mx-2 grid gap-3 rounded-controle px-2 py-4 outline-none hover:bg-craie-100/70 focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,1fr)_10rem] dark:hover:bg-relief/60"
                                        >
                                            <span className="grid min-w-0 gap-0.5">
                                                <span className="truncate font-semibold">
                                                    {groupe.nom}
                                                </span>
                                                <span className="truncate text-aide text-ink-500">
                                                    {groupe.examen} ·{' '}
                                                    {groupe.enseignant} ·{' '}
                                                    {pluriel(
                                                        groupe.eleves,
                                                        'élève',
                                                    )}{' '}
                                                    · {groupe.actifs_semaine}{' '}
                                                    actifs cette semaine
                                                </span>
                                            </span>
                                            <span className="grid gap-1">
                                                <span className="flex items-baseline justify-between text-meta text-ink-500">
                                                    Jauge moyenne
                                                    <span className="text-interface font-bold text-ink-900 font-data">
                                                        {groupe.jauge_moyenne ===
                                                        null
                                                            ? '—'
                                                            : `${groupe.jauge_moyenne} %`}
                                                    </span>
                                                </span>
                                                <ProgressionBarre
                                                    valeur={
                                                        groupe.jauge_moyenne ??
                                                        0
                                                    }
                                                    libelle={`Jauge moyenne de ${groupe.nom}`}
                                                />
                                            </span>
                                            {groupe.notions_faibles.length >
                                                0 && (
                                                <span className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
                                                    <span className="text-meta text-ink-500">
                                                        À retravailler :
                                                    </span>
                                                    {groupe.notions_faibles.map(
                                                        (notion) => (
                                                            <span
                                                                key={
                                                                    notion.notion_id
                                                                }
                                                                className="flex items-center gap-1.5 rounded-badge bg-craie-100 py-0.5 pr-2 pl-0.5 text-meta text-ink-600 dark:bg-relief"
                                                            >
                                                                <TuileMatiere
                                                                    cle={
                                                                        notion.cle
                                                                    }
                                                                    taille="petite"
                                                                />
                                                                {notion.notion}{' '}
                                                                ·{' '}
                                                                {notion.moyenne}{' '}
                                                                %
                                                            </span>
                                                        ),
                                                    )}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Carte>

                    <div className="grid content-start gap-5 lg:gap-6">
                        <section className="relative isolate grid gap-3 overflow-hidden rounded-carte surface-marque p-5 text-white shadow-releve">
                            <span
                                aria-hidden
                                className="absolute -top-10 -right-10 -z-10 size-36 rounded-full border-[24px] border-white/10"
                            />
                            <h2 className="text-[0.9375rem] font-semibold">
                                Licence en cours
                            </h2>
                            {courante ? (
                                <>
                                    <p className="text-[2.25rem] leading-none font-bold font-data">
                                        {courante.prises}
                                        <span className="text-[1.125rem] font-semibold text-white/75">
                                            {' '}
                                            / {courante.places} places
                                        </span>
                                    </p>
                                    <div
                                        role="progressbar"
                                        aria-label="Places attribuées"
                                        aria-valuemin={0}
                                        aria-valuemax={courante.places}
                                        aria-valuenow={courante.prises}
                                        className="h-2 overflow-hidden rounded-full bg-white/25"
                                    >
                                        <div
                                            className="h-full rounded-full bg-white"
                                            style={{
                                                width: `${Math.min(100, (courante.prises / Math.max(1, courante.places)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="text-aide text-white/85">
                                        Jusqu’au {formaterJour(courante.fin)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-white/85">
                                    Aucune licence en cours. Elle s’ajoute à la
                                    signature du contrat avec N’karamögö.
                                </p>
                            )}
                            <Button
                                asChild
                                className="w-full bg-white text-nimba-700 hover:bg-white/90"
                            >
                                <Link href={pageLicences()} prefetch>
                                    Attribuer les places
                                </Link>
                            </Button>
                        </section>

                        <Carte
                            id="ajouter-enseignant"
                            aria-labelledby="titre-enseignants"
                            className="scroll-mt-20"
                        >
                            <TitreCarte id="titre-enseignants">
                                Enseignants
                            </TitreCarte>
                            {enseignants.length === 0 ? (
                                <p className="mt-2 text-aide text-ink-600">
                                    Aucun enseignant rattaché.
                                </p>
                            ) : (
                                <ul className="mt-1 divide-y">
                                    {enseignants.map((enseignant) => (
                                        <li
                                            key={enseignant.id}
                                            className="flex items-center gap-3 py-2.5"
                                        >
                                            <Initiale
                                                prenom={enseignant.prenom}
                                                className="size-8 text-aide"
                                            />
                                            <span className="grid min-w-0 flex-1">
                                                <span className="truncate font-semibold">
                                                    {enseignant.prenom}
                                                </span>
                                                <span className="truncate text-meta text-ink-500">
                                                    {pluriel(
                                                        enseignant.groupes,
                                                        'groupe',
                                                    )}
                                                </span>
                                            </span>
                                            <Button
                                                variant="ghost"
                                                taille="icone-compacte"
                                                aria-label={`Retirer ${enseignant.prenom} de l’établissement`}
                                                onClick={async () => {
                                                    if (
                                                        await confirmer({
                                                            titre: `Retirer ${enseignant.prenom} ?`,
                                                            message:
                                                                'Ses groupes restent les siens, mais ne comptent plus pour l’établissement.',
                                                            action: 'Retirer',
                                                            ton: 'danger',
                                                        })
                                                    ) {
                                                        router.delete(
                                                            retirer(
                                                                enseignant.id,
                                                            ).url,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                    }
                                                }}
                                            >
                                                <UserMinus aria-hidden />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Form
                                {...store.form()}
                                resetOnSuccess
                                className="mt-4 grid gap-3 border-t pt-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <p className="flex items-center gap-2 text-interface font-medium">
                                            <UserPlus
                                                aria-hidden
                                                className="size-4 text-ink-500"
                                            />
                                            Rattacher un enseignant
                                        </p>
                                        <Champ
                                            libelle="Prénom"
                                            erreur={errors.prenom}
                                        >
                                            {(attributs) => (
                                                <Input
                                                    {...attributs}
                                                    name="prenom"
                                                    required
                                                    maxLength={60}
                                                />
                                            )}
                                        </Champ>
                                        <Champ
                                            libelle="Numéro"
                                            aide="S’il n’a pas encore de compte, il est ouvert avec un mot de passe provisoire."
                                            erreur={errors.telephone}
                                        >
                                            {(attributs) => (
                                                <TelephoneInput
                                                    {...attributs}
                                                    name="telephone"
                                                />
                                            )}
                                        </Champ>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Rattacher
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
