import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Flame, HeartHandshake, KeyRound, Timer } from 'lucide-react';
import {
    Carte,
    EnteteEcran,
    Initiale,
    TitreCarte,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { CodeInput } from '@/components/ui/code-input';
import { ProgressionSegments } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import { pluriel } from '@/lib/utils';
import { show } from '@/routes/parent/enfants';
import { store } from '@/routes/parent/liens';
import type { SuiviEnfant } from '@/types/suivi';

/**
 * Espace parent (lot 11, PLAN M15) : chaque enfant suivi, en un coup d'œil
 * (jauge, temps de la semaine, série, dernier examen blanc) ; ajouter un
 * enfant avec le code qu'il a donné (décision 1).
 */
export default function AccueilParent({ enfants }: { enfants: SuiviEnfant[] }) {
    const { auth } = usePage().props;
    const exemple = enfants.some((e) =>
        e.examens_blancs.some((x) => x.est_exemple),
    );

    return (
        <>
            <Head title="Mes enfants" />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta="Espace parent"
                    titre={
                        <>
                            Bonjour, <strong>{auth.user?.prenom}</strong>
                        </>
                    }
                    chapeau={
                        enfants.length === 0
                            ? 'Suivez les révisions de votre enfant : son temps de travail, sa préparation à l’examen, ses examens blancs.'
                            : 'Ce que vos enfants ont fait cette semaine. Vous suivez, ils gardent la main.'
                    }
                />
                {exemple && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <div className="grid content-start gap-4">
                        {enfants.length === 0 ? (
                            <PremierLien />
                        ) : (
                            <ul className="grid gap-4 md:grid-cols-2">
                                {enfants.map((enfant) => (
                                    <CarteEnfant
                                        key={enfant.eleve.id}
                                        enfant={enfant}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                    {enfants.length > 0 && <AjouterEnfant />}
                </div>
            </div>
        </>
    );
}

function CarteEnfant({ enfant }: { enfant: SuiviEnfant }) {
    const dernier = enfant.examens_blancs[0];
    const jauge = enfant.jauge?.pourcentage ?? 0;

    return (
        <li>
            <Link
                href={show(enfant.eleve.id)}
                prefetch
                className="grid h-full content-start gap-4 rounded-carte border bg-card p-5 shadow-carte transition-[border-color,box-shadow] outline-none hover:border-ink-400/60 hover:shadow-releve focus-visible:outline-2 focus-visible:outline-ring"
            >
                <span className="flex items-center gap-3">
                    <Initiale prenom={enfant.eleve.prenom} />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="truncate text-titre-carte font-semibold">
                            {enfant.eleve.prenom}
                        </span>
                        <span className="truncate text-aide text-ink-500">
                            {enfant.examen ?? 'Examen pas encore choisi'}
                        </span>
                    </span>
                    {enfant.abonnement.abonne ? (
                        <Badge variant="juste">Abonné</Badge>
                    ) : (
                        <Badge>Gratuit</Badge>
                    )}
                </span>
                <span className="grid gap-2">
                    <span className="flex items-end justify-between gap-2">
                        <span className="text-meta text-ink-500">
                            Préparation à l’examen
                        </span>
                        <span className="text-[1.75rem] leading-none font-bold font-data">
                            {jauge}
                            <span className="text-base font-semibold text-ink-500">
                                {' '}
                                %
                            </span>
                        </span>
                    </span>
                    <ProgressionSegments
                        valeur={jauge}
                        libelle={`Préparation de ${enfant.eleve.prenom}`}
                    />
                </span>
                <span className="grid grid-cols-2 gap-3 border-t pt-3 text-aide">
                    <span className="flex items-center gap-2">
                        <Timer
                            aria-hidden
                            className="size-4 text-nimba-600 dark:text-nimba-300"
                        />
                        <span>
                            <span className="font-semibold text-ink-900 font-data">
                                {enfant.minutes_semaine} min
                            </span>{' '}
                            <span className="text-ink-500">en 7 jours</span>
                        </span>
                    </span>
                    <span className="flex items-center gap-2">
                        <Flame
                            aria-hidden
                            className="size-4 text-nimba-600 dark:text-nimba-300"
                        />
                        <span>
                            <span className="font-semibold text-ink-900 font-data">
                                {pluriel(enfant.serie, 'jour')}
                            </span>{' '}
                            <span className="text-ink-500">de suite</span>
                        </span>
                    </span>
                </span>
                <span className="text-aide text-ink-600">
                    {dernier
                        ? `Dernier examen blanc : ${dernier.note.toLocaleString('fr-FR')}/20 en ${dernier.matiere.nom}`
                        : 'Pas encore d’examen blanc.'}
                </span>
            </Link>
        </li>
    );
}

function FormulaireCode({ sombre = false }: { sombre?: boolean }) {
    return (
        <Form {...store.form()} resetOnError className="grid gap-4">
            {({ processing, errors }) => (
                <>
                    <Champ libelle="Code de votre enfant" erreur={errors.code}>
                        {(attributs) => (
                            <CodeInput
                                {...attributs}
                                name="code"
                                longueur={6}
                            />
                        )}
                    </Champ>
                    <Button
                        type="submit"
                        disabled={processing}
                        className={
                            sombre
                                ? 'w-full bg-white text-nimba-700 hover:bg-white/90 sm:w-fit'
                                : 'w-full'
                        }
                    >
                        {processing && <Spinner />}
                        Suivre cet enfant
                    </Button>
                </>
            )}
        </Form>
    );
}

/** Aucun enfant encore : le moment fort de l'écran est ce premier lien. */
function PremierLien() {
    return (
        <>
            <section className="relative isolate grid gap-5 overflow-hidden rounded-carte surface-marque p-6 text-white shadow-releve md:grid-cols-[minmax(0,1fr)_17rem] md:items-end">
                <span
                    aria-hidden
                    className="absolute -top-12 -right-12 -z-10 size-44 rounded-full border-[30px] border-white/10"
                />
                <div className="grid gap-2">
                    <p className="flex items-center gap-1.5 text-aide font-medium text-white/85">
                        <HeartHandshake aria-hidden className="size-4" />
                        Premier pas
                    </p>
                    <h2 className="text-[1.625rem] leading-tight titre-contraste">
                        Votre enfant vous donne{' '}
                        <strong>un code à six chiffres.</strong>
                    </h2>
                    <p className="text-white/85">
                        C’est lui qui choisit d’être suivi : le code se crée
                        dans son application et reste valable 24 heures.
                    </p>
                </div>
                <div className="clair rounded-[14px] bg-white p-4 text-ink-900">
                    <FormulaireCode />
                </div>
            </section>
            <Etapes />
        </>
    );
}

function Etapes() {
    return (
        <Carte aria-labelledby="titre-etapes">
            <TitreCarte id="titre-etapes">
                Où votre enfant trouve le code
            </TitreCarte>
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                    'Il ouvre N’karamögö sur son téléphone, puis « Moi ».',
                    'Il touche l’onglet « Parents », puis « Créer un code ».',
                    'Il vous dit les six chiffres ; vous les saisissez ici.',
                ].map((etape, rang) => (
                    <li key={etape} className="flex items-start gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data">
                            {rang + 1}
                        </span>
                        <span className="text-aide text-ink-600">{etape}</span>
                    </li>
                ))}
            </ol>
        </Carte>
    );
}

function AjouterEnfant() {
    return (
        <Carte aria-labelledby="titre-ajouter" className="h-fit">
            <TitreCarte id="titre-ajouter">
                <span className="flex items-center gap-2">
                    <KeyRound aria-hidden className="size-4 text-ink-500" />
                    Suivre un autre enfant
                </span>
            </TitreCarte>
            <p className="mt-1 mb-4 text-aide text-ink-500">
                Demandez-lui le code de l’onglet « Parents » de son compte.
            </p>
            <FormulaireCode />
        </Carte>
    );
}
