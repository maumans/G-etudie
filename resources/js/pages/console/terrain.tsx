import { Form, Head, Link, router } from '@inertiajs/react';
import {
    Bug,
    CheckCircle2,
    CloudOff,
    FileWarning,
    Frown,
    MapPin,
    Meh,
    MessageSquareHeart,
    Smartphone,
    Smile,
    Unplug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ChiffreCle } from '@/components/console/graphiques';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    formaterJour,
    formaterJourCourt,
    formaterJourHeure,
} from '@/lib/dates';
import { formaterDecalage, formaterOctets } from '@/lib/terrain/diagnostic';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { index } from '@/routes/console/terrain';
import { traiter } from '@/routes/console/terrain/avis';
import { store as creerCampagne } from '@/routes/console/terrain/campagnes';

type Vue = 'avis' | 'erreurs' | 'diagnostics';
type Reponse = 'oui' | 'un_peu' | 'non';

type Filtres = {
    vue: Vue;
    campagne: number | null;
    reponse: Reponse | null;
    statut: 'a_traiter' | 'traites' | null;
    code: string;
};

type Campagne = {
    id: number;
    nom: string;
    lieu: string;
    etablissement: string | null;
    debut: string;
    fin: string;
    notes: string | null;
    est_exemple: boolean;
};

type Avis = {
    id: number;
    reponse: Reponse;
    libelle: string;
    etiquettes: string[];
    commentaire: string | null;
    ecran: string;
    eleve: string;
    examen: string | null;
    etablissement: string | null;
    version_app: string | null;
    le: string;
    traite: { decision: string | null; par: string | null; le: string } | null;
    est_exemple: boolean;
};

type Erreur = {
    id: number;
    type: 'script' | 'promesse' | 'import' | 'file';
    libelle: string;
    message: string;
    source: string | null;
    pile: string | null;
    version_app: string | null;
    navigateur: string | null;
    occurrences: number;
    premiere_le: string;
    derniere_le: string;
};

type DiagnosticListe = {
    id: number;
    code: string;
    appareil: string | null;
    version_app: string | null;
    donnees: Record<string, string | number | boolean | null>;
    le: string;
};

type Page<T> = { donnees: T[]; page: number; derniere: number; total: number };

type Props = {
    filtres: Filtres;
    campagnes: Campagne[];
    campagne: Campagne | null;
    periode: { du: string; au: string };
    etablissements: { id: number; nom: string }[];
    bilan: {
        avis: number;
        oui: number;
        un_peu: number;
        non: number;
        a_traiter: number;
        erreurs: number;
        occurrences: number;
        diagnostics: number;
    };
    etiquettes: { cle: string; libelle: string; nombre: number }[];
    exemple: boolean;
    liste: Page<Avis> | Page<Erreur> | Page<DiagnosticListe>;
};

const REPONSES: Record<
    Reponse,
    { icone: LucideIcon; tuile: string; barre: string }
> = {
    oui: {
        icone: Smile,
        tuile: 'bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400',
        barre: 'bg-juste-600 dark:bg-juste-400',
    },
    un_peu: {
        icone: Meh,
        tuile: 'bg-indice-400/25 text-indice-700 dark:bg-indice-400/15 dark:text-indice-400',
        barre: 'bg-indice-400',
    },
    non: {
        icone: Frown,
        tuile: 'bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400',
        barre: 'bg-faux-600 dark:bg-faux-400',
    },
};

const TYPES_ERREUR: Record<Erreur['type'], LucideIcon> = {
    script: Bug,
    promesse: Unplug,
    import: FileWarning,
    file: CloudOff,
};

const ECRANS: Record<string, string> = {
    seance: 'après une séance',
    quiz: 'après un quiz',
    devoir: 'après un devoir',
    appareils: 'depuis « Appareils »',
    menu: 'depuis le menu',
};

const ONGLETS: { vue: Vue; libelle: string }[] = [
    { vue: 'avis', libelle: 'Avis des élèves' },
    { vue: 'erreurs', libelle: 'Erreurs' },
    { vue: 'diagnostics', libelle: 'Diagnostics' },
];

/**
 * Console › Terrain (lot 14, PLAN § 12) : ce que disent les élèves et ce
 * que voient leurs téléphones, sur une campagne d'essai ou les 30 derniers
 * jours. Un avis se traite avec la décision prise (« prise en compte »).
 */
export default function Terrain(props: Props) {
    const { filtres, campagnes, campagne, periode, bilan, exemple } = props;

    function filtrer(modif: Partial<Filtres>) {
        const suivant = { ...filtres, ...modif };
        const requete = Object.fromEntries(
            Object.entries(suivant).filter(([, v]) => v !== null && v !== ''),
        );
        router.get(index().url, requete, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const lien = (page: number) =>
        index({
            query: {
                ...Object.fromEntries(
                    Object.entries(filtres).filter(
                        ([, v]) => v !== null && v !== '',
                    ),
                ),
                page,
            },
        }).url;

    const aide =
        bilan.avis === 0 ? 0 : Math.round((bilan.oui / bilan.avis) * 100);

    return (
        <>
            <Head title="Terrain" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        {campagne
                            ? `${campagne.nom} · ${campagne.lieu}`
                            : 'Les 30 derniers jours'}{' '}
                        · du {formaterJourCourt(periode.du)} au{' '}
                        {formaterJourCourt(periode.au)}
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Ce que disent <strong>les élèves</strong>, ce que voient{' '}
                        <strong>leurs téléphones</strong>
                    </h1>
                </header>

                {exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <ChiffreCle
                        libelle="Avis reçus"
                        valeur={formaterNombre(bilan.avis)}
                        note={
                            bilan.a_traiter > 0
                                ? `${pluriel(bilan.a_traiter, 'avis', 'avis')} à traiter`
                                : 'Tous traités'
                        }
                    />
                    <ChiffreCle
                        libelle="« Ça m’a aidé »"
                        valeur={String(aide)}
                        unite="%"
                        note={`${bilan.un_peu} « un peu » · ${bilan.non} « non »`}
                    />
                    <ChiffreCle
                        libelle="Erreurs distinctes"
                        valeur={formaterNombre(bilan.erreurs)}
                        note={`${pluriel(bilan.occurrences, 'fois', 'fois')} en tout`}
                    />
                    <ChiffreCle
                        libelle="Diagnostics reçus"
                        valeur={formaterNombre(bilan.diagnostics)}
                    />
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
                    {/* Le premier réglage : avant la liste sur mobile, en tête de la colonne latérale sur ordinateur. */}
                    <section className="grid content-start gap-3 self-start rounded-carte border bg-card p-5 shadow-carte lg:col-start-2 lg:row-start-1">
                        <h2 className="text-[0.9375rem] font-semibold">
                            Campagne d’essai
                        </h2>
                        <ListeDeroulante
                            aria-label="Campagne d’essai"
                            taille="compacte"
                            value={filtres.campagne ?? ''}
                            onChange={(e) =>
                                filtrer({
                                    campagne: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                        >
                            <option value="">Les 30 derniers jours</option>
                            {campagnes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nom}
                                </option>
                            ))}
                        </ListeDeroulante>
                        {campagne && (
                            <div className="grid gap-1 text-aide text-ink-600">
                                <p className="flex items-center gap-1.5">
                                    <MapPin aria-hidden className="size-3.5" />
                                    {campagne.lieu}
                                    {campagne.etablissement &&
                                        ` · ${campagne.etablissement}`}
                                </p>
                                <p>
                                    Du {formaterJour(campagne.debut)} au{' '}
                                    {formaterJour(campagne.fin)}
                                </p>
                                {campagne.notes && (
                                    <p className="text-ink-500">
                                        {campagne.notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    <section
                        aria-labelledby="titre-liste"
                        className="min-w-0 self-start rounded-carte border bg-card shadow-carte lg:col-start-1 lg:row-span-2 lg:row-start-1"
                    >
                        <h2 id="titre-liste" className="sr-only">
                            {
                                ONGLETS.find((o) => o.vue === filtres.vue)
                                    ?.libelle
                            }
                        </h2>
                        <div className="grid gap-3 border-b px-4 py-3 sm:flex sm:items-center sm:justify-between">
                            <nav
                                aria-label="Ce qu’on regarde"
                                className="grid grid-cols-3 gap-0.5 rounded-controle bg-craie-100 p-1 sm:inline-flex"
                            >
                                {ONGLETS.map((o) => {
                                    const actif = filtres.vue === o.vue;

                                    return (
                                        <Link
                                            key={o.vue}
                                            href={
                                                index({
                                                    query: {
                                                        vue: o.vue,
                                                        ...(filtres.campagne
                                                            ? {
                                                                  campagne:
                                                                      filtres.campagne,
                                                              }
                                                            : {}),
                                                    },
                                                }).url
                                            }
                                            preserveScroll
                                            aria-current={
                                                actif ? 'page' : undefined
                                            }
                                            className={cn(
                                                'flex h-8 items-center justify-center rounded-[7px] px-3 text-aide font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring',
                                                actif
                                                    ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                                    : 'text-ink-600 hover:text-ink-900',
                                            )}
                                        >
                                            {o.libelle}
                                        </Link>
                                    );
                                })}
                            </nav>
                            {filtres.vue === 'avis' && (
                                <div className="grid grid-cols-2 gap-2 sm:flex">
                                    <ListeDeroulante
                                        aria-label="Réponse"
                                        taille="compacte"
                                        value={filtres.reponse ?? ''}
                                        onChange={(e) =>
                                            filtrer({
                                                reponse:
                                                    (e.target
                                                        .value as Reponse) ||
                                                    null,
                                            })
                                        }
                                    >
                                        <option value="">
                                            Toutes les réponses
                                        </option>
                                        <option value="oui">Oui</option>
                                        <option value="un_peu">Un peu</option>
                                        <option value="non">Non</option>
                                    </ListeDeroulante>
                                    <ListeDeroulante
                                        aria-label="Statut"
                                        taille="compacte"
                                        value={filtres.statut ?? ''}
                                        onChange={(e) =>
                                            filtrer({
                                                statut:
                                                    (e.target
                                                        .value as Filtres['statut']) ||
                                                    null,
                                            })
                                        }
                                    >
                                        <option value="">Tous</option>
                                        <option value="a_traiter">
                                            À traiter
                                        </option>
                                        <option value="traites">Traités</option>
                                    </ListeDeroulante>
                                </div>
                            )}
                            {filtres.vue === 'diagnostics' && (
                                <SearchInput
                                    valeur={filtres.code}
                                    libelle="Chercher un code de diagnostic"
                                    placeholder="Code, ex. 7K3FQX"
                                    onRecherche={(code) => filtrer({ code })}
                                    className="sm:w-56"
                                />
                            )}
                        </div>

                        {props.liste.donnees.length === 0 ? (
                            <div className="p-5">
                                <EtatVide
                                    illustration={
                                        filtres.vue === 'avis'
                                            ? MessageSquareHeart
                                            : filtres.vue === 'erreurs'
                                              ? Bug
                                              : Smartphone
                                    }
                                    titre={
                                        filtres.vue === 'avis'
                                            ? 'Aucun avis sur cette période'
                                            : filtres.vue === 'erreurs'
                                              ? 'Aucune erreur captée'
                                              : 'Aucun diagnostic'
                                    }
                                    message={
                                        filtres.vue === 'diagnostics'
                                            ? 'Un élève l’envoie depuis « Mon compte › Appareils » et vous donne son code.'
                                            : 'Choisissez une autre campagne ou retirez les filtres.'
                                    }
                                    action={
                                        <Button
                                            variant="outline"
                                            taille="compacte"
                                            onClick={() =>
                                                router.get(
                                                    index({
                                                        query: {
                                                            vue: filtres.vue,
                                                        },
                                                    }).url,
                                                )
                                            }
                                        >
                                            Effacer les filtres
                                        </Button>
                                    }
                                />
                            </div>
                        ) : filtres.vue === 'avis' ? (
                            <ListeAvis avis={props.liste.donnees as Avis[]} />
                        ) : filtres.vue === 'erreurs' ? (
                            <ListeErreurs
                                erreurs={props.liste.donnees as Erreur[]}
                            />
                        ) : (
                            <ListeDiagnostics
                                diagnostics={
                                    props.liste.donnees as DiagnosticListe[]
                                }
                            />
                        )}
                        <Pagination
                            className="border-t px-5 py-3"
                            page={props.liste.page}
                            derniere={props.liste.derniere}
                            lien={lien}
                        />
                    </section>

                    <aside className="grid content-start gap-6 lg:col-start-2 lg:row-start-2">
                        {filtres.vue === 'avis' && (
                            <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                                <h2 className="text-[0.9375rem] font-semibold">
                                    Ce qui gêne
                                </h2>
                                <RepartitionEtiquettes
                                    etiquettes={props.etiquettes}
                                    total={bilan.avis}
                                />
                            </section>
                        )}

                        <NouvelleCampagne
                            etablissements={props.etablissements}
                        />
                    </aside>
                </div>
            </div>
        </>
    );
}

function RepartitionEtiquettes({
    etiquettes,
    total,
}: {
    etiquettes: Props['etiquettes'];
    total: number;
}) {
    const max = Math.max(1, ...etiquettes.map((e) => e.nombre));

    if (total === 0) {
        return (
            <p className="text-aide text-ink-500">
                Rien encore : les étiquettes choisies par les élèves
                s’afficheront ici.
            </p>
        );
    }

    return (
        <ul className="grid gap-2.5">
            {etiquettes.map((e) => (
                <li key={e.cle} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-aide">
                        <span className="text-ink-900">{e.libelle}</span>
                        <span className="font-semibold font-data">
                            {e.nombre}
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-craie-100 dark:bg-relief">
                        <div
                            className="h-full rounded-full bg-nimba-500"
                            style={{ width: `${(e.nombre / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ListeAvis({ avis }: { avis: Avis[] }) {
    return (
        <ol className="divide-y">
            {avis.map((a) => (
                <LigneAvis key={a.id} avis={a} />
            ))}
        </ol>
    );
}

function LigneAvis({ avis }: { avis: Avis }) {
    const [ouvert, setOuvert] = useState(false);
    const reponse = REPONSES[avis.reponse];

    return (
        <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-4">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 items-center justify-center rounded-[12px]',
                    reponse.tuile,
                )}
            >
                <reponse.icone className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-interface font-semibold">
                        {avis.libelle}{' '}
                        <span className="font-normal text-ink-500">
                            {ECRANS[avis.ecran] ?? avis.ecran}
                        </span>
                    </p>
                    <time
                        dateTime={avis.le}
                        className="text-meta text-ink-600 font-data"
                    >
                        {formaterJourHeure(avis.le)}
                    </time>
                </div>
                <p className="text-meta text-ink-500">
                    {avis.eleve}
                    {avis.examen && ` · ${avis.examen}`}
                    {avis.etablissement && ` · ${avis.etablissement}`}
                    {avis.version_app && ` · version ${avis.version_app}`}
                </p>
                {avis.etiquettes.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                        {avis.etiquettes.map((e) => (
                            <li
                                key={e}
                                className="rounded-[7px] bg-craie-100 px-2 py-0.5 text-meta text-ink-600 dark:bg-relief"
                            >
                                {e}
                            </li>
                        ))}
                    </ul>
                )}
                {avis.commentaire && (
                    <blockquote className="border-l-2 border-nimba-500 pl-3 text-interface text-ink-900">
                        {avis.commentaire}
                    </blockquote>
                )}
                {avis.traite ? (
                    <p className="flex items-start gap-2 rounded-controle bg-juste-600/[0.08] px-3 py-2 text-aide text-ink-900 dark:bg-juste-400/10">
                        <CheckCircle2
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0 text-juste-700 dark:text-juste-400"
                        />
                        <span>
                            <span className="font-medium">
                                Traité
                                {avis.traite.par && ` par ${avis.traite.par}`}
                                {' · '}
                                {formaterJourCourt(avis.traite.le)}
                            </span>
                            {avis.traite.decision && (
                                <> — {avis.traite.decision}</>
                            )}
                        </span>
                    </p>
                ) : ouvert ? (
                    <Form
                        {...traiter.form(avis.id)}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setOuvert(false)}
                        className="grid gap-2"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Champ
                                    libelle="Décision prise"
                                    erreur={errors.decision}
                                >
                                    {(a) => (
                                        <Textarea
                                            {...a}
                                            name="decision"
                                            rows={2}
                                            maxLength={500}
                                            required
                                            placeholder="Par exemple : champ de réponse agrandi dans la prochaine version."
                                        />
                                    )}
                                </Champ>
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        taille="compacte"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Marquer traité
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        taille="compacte"
                                        onClick={() => setOuvert(false)}
                                    >
                                        Annuler
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                ) : (
                    <Button
                        variant="outline"
                        taille="compacte"
                        className="w-fit"
                        onClick={() => setOuvert(true)}
                    >
                        Traiter
                    </Button>
                )}
            </div>
        </li>
    );
}

function ListeErreurs({ erreurs }: { erreurs: Erreur[] }) {
    return (
        <ol className="divide-y">
            {erreurs.map((e) => {
                const Icone = TYPES_ERREUR[e.type];

                return (
                    <li
                        key={e.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-4"
                    >
                        <span
                            aria-hidden
                            className="flex size-10 items-center justify-center rounded-[12px] bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400"
                        >
                            <Icone className="size-[18px]" />
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <p className="text-interface font-semibold">
                                    {e.libelle}
                                </p>
                                <p className="text-meta text-ink-600">
                                    <span className="font-semibold text-ink-900 font-data">
                                        {formaterNombre(e.occurrences)}
                                    </span>{' '}
                                    fois · dernière le{' '}
                                    {formaterJourHeure(e.derniere_le)}
                                </p>
                            </div>
                            <p className="text-aide break-words text-ink-900 font-data">
                                {e.message}
                            </p>
                            <p className="text-meta text-ink-500">
                                {[
                                    e.source,
                                    e.navigateur,
                                    e.version_app && `version ${e.version_app}`,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                            {e.pile && (
                                <details className="text-meta text-ink-600">
                                    <summary className="cursor-pointer">
                                        Pile d’appels
                                    </summary>
                                    <pre className="mt-1 max-h-48 overflow-auto rounded-controle bg-craie-100 p-2 whitespace-pre-wrap font-data dark:bg-relief">
                                        {e.pile}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

type ValeurDiagnostic = string | number | boolean | null | undefined;

const CHAMPS_DIAGNOSTIC: [string, string, (v: ValeurDiagnostic) => string][] = [
    ['service_worker', 'Mode hors ligne', (v) => String(v ?? '—')],
    ['installee', 'Installée', (v) => (v ? 'Oui' : 'Non')],
    ['en_attente', 'En attente', (v) => String(v ?? 0)],
    ['a_corriger', 'À corriger', (v) => String(v ?? 0)],
    ['packs', 'Packs', (v) => String(v ?? 0)],
    [
        'packs_poids',
        'Poids des packs',
        (v) => formaterOctets(typeof v === 'number' ? v : null),
    ],
    [
        'stockage_utilise',
        'Place utilisée',
        (v) => formaterOctets(typeof v === 'number' ? v : null),
    ],
    [
        'stockage_persistant',
        'Stockage protégé',
        (v) => (v === null || v === undefined ? '—' : v ? 'Oui' : 'Non'),
    ],
    [
        'decalage_horloge_ms',
        'Horloge',
        (v) => formaterDecalage(typeof v === 'number' ? v : null),
    ],
    ['profils', 'Profils', (v) => String(v ?? 0)],
    ['memoire_go', 'Mémoire', (v) => (v ? `${v} Go` : '—')],
    ['reseau', 'Réseau', (v) => (v ? String(v).toUpperCase() : '—')],
    ['ecran', 'Écran', (v) => String(v ?? '—')],
    ['erreurs_gardees', 'Erreurs gardées', (v) => String(v ?? 0)],
];

function ListeDiagnostics({ diagnostics }: { diagnostics: DiagnosticListe[] }) {
    return (
        <ol className="divide-y">
            {diagnostics.map((d) => (
                <li key={d.id} className="grid gap-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="flex items-center gap-3">
                            <span className="rounded-[8px] bg-ink-900 px-2.5 py-1 text-interface font-bold tracking-[0.12em] text-craie-50 font-data">
                                {d.code}
                            </span>
                            <span className="text-interface font-semibold">
                                {[d.donnees.navigateur, d.donnees.systeme]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                    d.appareil ||
                                    'Appareil'}
                            </span>
                        </p>
                        <time
                            dateTime={d.le}
                            className="text-meta text-ink-600 font-data"
                        >
                            {formaterJourHeure(d.le)}
                        </time>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                        {CHAMPS_DIAGNOSTIC.map(([cle, libelle, format]) => (
                            <div key={cle} className="grid gap-0.5">
                                <dt className="text-meta text-ink-500">
                                    {libelle}
                                </dt>
                                <dd className="text-aide font-medium">
                                    {format(d.donnees[cle])}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {d.version_app && (
                        <p className="text-meta text-ink-500">
                            Version {d.version_app}
                        </p>
                    )}
                </li>
            ))}
        </ol>
    );
}

function NouvelleCampagne({
    etablissements,
}: {
    etablissements: Props['etablissements'];
}) {
    return (
        <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
            <div className="grid gap-1">
                <h2 className="text-[0.9375rem] font-semibold">
                    Nouvelle campagne
                </h2>
                <p className="text-aide text-ink-500">
                    Un essai avec de vrais élèves : seulement avec l’accord
                    écrit des parents et de l’établissement (TERRAIN.md).
                </p>
            </div>
            <Form
                {...creerCampagne.form()}
                resetOnSuccess
                className="grid gap-3"
            >
                {({ processing, errors }) => (
                    <>
                        <Champ libelle="Nom" erreur={errors.nom}>
                            {(a) => (
                                <Input
                                    {...a}
                                    name="nom"
                                    required
                                    maxLength={120}
                                    placeholder="Essai Kindia, 2ᵉ semaine"
                                />
                            )}
                        </Champ>
                        <Champ libelle="Lieu" erreur={errors.lieu}>
                            {(a) => (
                                <Input
                                    {...a}
                                    name="lieu"
                                    required
                                    maxLength={120}
                                    placeholder="Kindia"
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Établissement (facultatif)"
                            erreur={errors.etablissement_id}
                        >
                            {(a) => (
                                <ListeDeroulante
                                    {...a}
                                    name="etablissement_id"
                                    defaultValue=""
                                >
                                    <option value="">Aucun</option>
                                    {etablissements.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.nom}
                                        </option>
                                    ))}
                                </ListeDeroulante>
                            )}
                        </Champ>
                        <div className="grid grid-cols-2 gap-3">
                            <Champ libelle="Du" erreur={errors.debut}>
                                {(a) => (
                                    <Input
                                        {...a}
                                        type="date"
                                        name="debut"
                                        required
                                    />
                                )}
                            </Champ>
                            <Champ libelle="Au" erreur={errors.fin}>
                                {(a) => (
                                    <Input
                                        {...a}
                                        type="date"
                                        name="fin"
                                        required
                                    />
                                )}
                            </Champ>
                        </div>
                        <Champ
                            libelle="Notes (facultatif)"
                            erreur={errors.notes}
                        >
                            {(a) => (
                                <Textarea
                                    {...a}
                                    name="notes"
                                    rows={2}
                                    maxLength={1000}
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Créer la campagne
                        </Button>
                    </>
                )}
            </Form>
        </section>
    );
}
