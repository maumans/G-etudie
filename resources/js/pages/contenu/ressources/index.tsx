import { router, useForm, usePage } from '@inertiajs/react';
import {
    CircleCheck,
    ExternalLink,
    Link2,
    Link2Off,
    PencilLine,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { NumberInput } from '@/components/ui/number-input';
import { Pagination } from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formaterJour } from '@/lib/dates';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import type { RessourceEleve } from '@/lib/ressources';
import { poidsAnnonce } from '@/lib/ressources';
import { cn, formaterNombre } from '@/lib/utils';
import {
    index,
    retirer,
    store,
    update,
    verifier,
} from '@/routes/contenu/ressources';

type Etat = 'a_verifier' | 'verifiees' | 'cassees' | 'retirees';

type Ressource = RessourceEleve & {
    statut: 'proposee' | 'verifiee' | 'retiree';
    statut_libelle: string;
    notion: { id: number; titre: string; chapitre: string };
    matiere: { nom: string; teinte: CleMatiere };
    auteur: string | null;
    verifiee_par: string | null;
    verifiee_le: string | null;
    lien_casse_le: string | null;
    motif_retrait: string | null;
    poids_saisi_ko: number | null;
    peut_verifier: boolean;
    peut_modifier: boolean;
};

type Props = {
    ressources: {
        donnees: Ressource[];
        page: number;
        derniere: number;
        total: number;
    };
    filtre: Etat;
    compteurs: Record<Etat, number>;
    notions: { id: number; titre: string; chapitre: string; matiere: string }[];
    types: { valeur: RessourceEleve['type']; libelle: string }[];
    sites: string[];
};

const ETATS: { cle: Etat; libelle: string }[] = [
    { cle: 'a_verifier', libelle: 'À vérifier' },
    { cle: 'verifiees', libelle: 'Vérifiées' },
    { cle: 'cassees', libelle: 'Liens cassés' },
    { cle: 'retirees', libelle: 'Retirées' },
];

/**
 * Back-office › Ressources (lot 12, PLAN M19) : des liens vers des sites
 * libres et sûrs, par notion. Un rédacteur propose, un autre relecteur
 * vérifie (on ne vérifie jamais sa propre proposition) ; le contrôle de
 * chaque semaine signale les liens cassés.
 */
export default function Ressources({
    ressources,
    filtre,
    compteurs,
    notions,
    types,
    sites,
}: Props) {
    const { auth } = usePage().props;
    const peutProposer =
        auth.user?.permissions.includes('contenu.rediger') ?? false;
    const [modifiee, setModifiee] = useState<Ressource | null>(null);
    const [aRetirer, setARetirer] = useState<Ressource | null>(null);

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Ressources externes"
                titre={
                    <>
                        Les <strong>ressources</strong> pour aller plus loin
                    </>
                }
                description="Un lien sûr sous une leçon vaut une explication de plus. Chaque lien est vérifié par un relecteur avant que les élèves le voient."
            />
            {ressources.donnees.some((r) => r.est_exemple) && (
                <BandeauExemple />
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
                <section
                    aria-labelledby="titre-liste"
                    className="rounded-carte border bg-card shadow-carte"
                >
                    <h2 id="titre-liste" className="sr-only">
                        Liste des ressources
                    </h2>
                    <div
                        role="group"
                        aria-label="État"
                        className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto border-b px-5 py-4"
                    >
                        {ETATS.map((e) => {
                            const actif = filtre === e.cle;

                            return (
                                <button
                                    key={e.cle}
                                    type="button"
                                    aria-pressed={actif}
                                    onClick={() =>
                                        router.get(
                                            index({ query: { etat: e.cle } })
                                                .url,
                                            {},
                                            {
                                                preserveScroll: true,
                                                replace: true,
                                            },
                                        )
                                    }
                                    className={cn(
                                        'flex h-8 shrink-0 items-center gap-1.5 rounded-controle border px-2.5 text-aide font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                        actif
                                            ? 'border-ink-900 bg-ink-900 text-craie-50'
                                            : 'border-contour bg-card text-ink-600 hover:text-ink-900',
                                    )}
                                >
                                    {e.libelle}
                                    <span
                                        className={cn(
                                            'font-data',
                                            actif
                                                ? 'text-craie-50/70'
                                                : 'text-ink-500',
                                        )}
                                    >
                                        {formaterNombre(compteurs[e.cle])}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {ressources.donnees.length === 0 ? (
                        <div className="p-5">
                            <EtatVide
                                illustration={Link2}
                                titre={
                                    filtre === 'a_verifier'
                                        ? 'Rien à vérifier'
                                        : 'Aucune ressource ici'
                                }
                                message="Proposez un lien sous une notion : une page de Wikipédia, une vidéo de Khan Academy ou de Lumni…"
                                action={
                                    filtre !== 'a_verifier' &&
                                    compteurs.a_verifier > 0 ? (
                                        <Button
                                            variant="outline"
                                            taille="compacte"
                                            onClick={() =>
                                                router.get(index().url)
                                            }
                                        >
                                            Voir les ressources à vérifier
                                        </Button>
                                    ) : null
                                }
                                className="border-0 shadow-none"
                            />
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y">
                                {ressources.donnees.map((r) => (
                                    <LigneRessource
                                        key={r.uuid}
                                        ressource={r}
                                        modifier={() => setModifiee(r)}
                                        retirer={() => setARetirer(r)}
                                    />
                                ))}
                            </ul>
                            <div className="flex justify-end border-t px-5 py-3">
                                <Pagination
                                    page={ressources.page}
                                    derniere={ressources.derniere}
                                    lien={(page) =>
                                        index({ query: { etat: filtre, page } })
                                            .url
                                    }
                                />
                            </div>
                        </>
                    )}
                </section>

                <div className="grid min-w-0 content-start gap-5">
                    {peutProposer && (
                        <Formulaire notions={notions} types={types} />
                    )}
                    <Section
                        titre="Sites acceptés"
                        description="HTTPS seulement, jamais de lien raccourci."
                    >
                        <ul className="flex flex-wrap gap-1.5">
                            {sites.map((site) => (
                                <li key={site}>
                                    <Badge>{site}</Badge>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-aide text-ink-500">
                            Une vidéo YouTube se vérifie en entier : l’élève
                            sera prévenu que le site propose d’autres vidéos et
                            des publicités.
                        </p>
                    </Section>
                </div>
            </div>

            <Dialog
                open={modifiee !== null}
                onOpenChange={(o) => !o && setModifiee(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    {modifiee && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Modifier la ressource</DialogTitle>
                                <DialogDescription>
                                    Une fois modifiée, elle repasse en
                                    vérification.
                                </DialogDescription>
                            </DialogHeader>
                            <Formulaire
                                notions={notions}
                                types={types}
                                ressource={modifiee}
                                fini={() => setModifiee(null)}
                            />
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <DialogueRetrait
                ressource={aRetirer}
                fermer={() => setARetirer(null)}
            />
        </div>
    );
}

function LigneRessource({
    ressource,
    modifier,
    retirer: demanderRetrait,
}: {
    ressource: Ressource;
    modifier: () => void;
    retirer: () => void;
}) {
    const style = MATIERES[ressource.matiere.teinte];
    const [envoi, setEnvoi] = useState(false);

    return (
        <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="flex min-w-0 items-start gap-3">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        style.tuile,
                    )}
                >
                    <style.icone className="size-[18px]" />
                </span>
                <div className="grid min-w-0 gap-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                            href={ressource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="flex min-w-0 items-center gap-1.5 font-semibold outline-none hover:underline focus-visible:underline"
                        >
                            <span className="truncate">{ressource.titre}</span>
                            <ExternalLink
                                aria-hidden
                                className="size-3.5 shrink-0 text-ink-400"
                            />
                            <span className="sr-only">
                                (ouvre le site dans un nouvel onglet)
                            </span>
                        </a>
                        {ressource.lien_casse_le ? (
                            <Badge variant="faux">
                                <Link2Off aria-hidden />
                                Lien cassé
                            </Badge>
                        ) : (
                            <Badge
                                variant={
                                    ressource.statut === 'verifiee'
                                        ? 'juste'
                                        : ressource.statut === 'proposee'
                                          ? 'nimba'
                                          : 'neutre'
                                }
                            >
                                {ressource.statut_libelle}
                            </Badge>
                        )}
                    </p>
                    <p className="truncate text-aide text-ink-500">
                        {ressource.matiere.nom} · {ressource.notion.chapitre} ·{' '}
                        {ressource.notion.titre}
                    </p>
                    <p className="text-meta text-ink-500">
                        {ressource.site} · {ressource.type_libelle} ·{' '}
                        {poidsAnnonce(ressource.poids_ko)}
                        {ressource.auteur &&
                            ` · proposée par @${ressource.auteur}`}
                        {ressource.verifiee_par &&
                            ressource.verifiee_le &&
                            ` · vérifiée par @${ressource.verifiee_par} le ${formaterJour(ressource.verifiee_le)}`}
                    </p>
                    {ressource.motif_retrait && (
                        <p className="text-aide text-ink-600">
                            Retirée : {ressource.motif_retrait}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
                {ressource.peut_verifier && (
                    <Button
                        taille="compacte"
                        disabled={envoi}
                        onClick={() => {
                            setEnvoi(true);
                            router.post(
                                verifier(ressource.uuid).url,
                                {},
                                {
                                    preserveScroll: true,
                                    onFinish: () => setEnvoi(false),
                                },
                            );
                        }}
                    >
                        {envoi ? <Spinner /> : <CircleCheck aria-hidden />}
                        Vérifiée
                    </Button>
                )}
                {ressource.peut_modifier && ressource.statut !== 'retiree' && (
                    <Button
                        variant="outline"
                        taille="compacte"
                        onClick={modifier}
                    >
                        <PencilLine aria-hidden />
                        Modifier
                    </Button>
                )}
                {ressource.statut !== 'retiree' &&
                    (ressource.peut_verifier ||
                        ressource.statut === 'verifiee') && (
                        <Button
                            variant="ghost"
                            taille="icone-compacte"
                            aria-label={`Retirer « ${ressource.titre} »`}
                            onClick={demanderRetrait}
                        >
                            <Trash2 aria-hidden />
                        </Button>
                    )}
            </div>
        </li>
    );
}

function Formulaire({
    notions,
    types,
    ressource,
    fini,
}: {
    notions: Props['notions'];
    types: Props['types'];
    ressource?: Ressource;
    fini?: () => void;
}) {
    const formulaire = useForm({
        notion: ressource?.notion.id ?? '',
        url: ressource?.url ?? '',
        titre: ressource?.titre ?? '',
        type: ressource?.type ?? 'encyclopedie',
        description: ressource?.description ?? '',
        duree_minutes: ressource?.duree_minutes ?? '',
        poids_ko: ressource?.poids_saisi_ko ?? '',
    });
    const parMatiere = notions.reduce<Record<string, Props['notions']>>(
        (groupes, n) => {
            (groupes[n.matiere] ??= []).push(n);

            return groupes;
        },
        {},
    );

    function envoyer(evenement: React.FormEvent) {
        evenement.preventDefault();
        formulaire.transform((d) => ({
            ...d,
            duree_minutes: d.duree_minutes === '' ? null : d.duree_minutes,
            poids_ko: d.poids_ko === '' ? null : d.poids_ko,
        }));

        if (ressource) {
            formulaire.put(update(ressource.uuid).url, {
                preserveScroll: true,
                onSuccess: () => fini?.(),
            });
        } else {
            formulaire.post(store().url, {
                preserveScroll: true,
                onSuccess: () => formulaire.reset(),
            });
        }
    }

    const contenu = (
        <form onSubmit={envoyer} className="grid min-w-0 gap-4">
            {!ressource && (
                <Champ
                    libelle="Notion"
                    erreur={formulaire.errors.notion}
                    className="min-w-0"
                >
                    {(attributs) => (
                        <ListeDeroulante
                            {...attributs}
                            className="w-full min-w-0"
                            value={String(formulaire.data.notion)}
                            onChange={(e) =>
                                formulaire.setData(
                                    'notion',
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            required
                        >
                            <option value="">Choisir une notion…</option>
                            {Object.entries(parMatiere).map(
                                ([matiere, liste]) => (
                                    <optgroup key={matiere} label={matiere}>
                                        {liste.map((n) => (
                                            <option key={n.id} value={n.id}>
                                                {n.chapitre} — {n.titre}
                                            </option>
                                        ))}
                                    </optgroup>
                                ),
                            )}
                        </ListeDeroulante>
                    )}
                </Champ>
            )}
            <Champ
                libelle="Lien"
                aide="Collez l’adresse complète, https://…"
                erreur={formulaire.errors.url}
            >
                {(attributs) => (
                    <Input
                        {...attributs}
                        type="url"
                        inputMode="url"
                        value={formulaire.data.url}
                        onChange={(e) =>
                            formulaire.setData('url', e.target.value)
                        }
                        placeholder="https://fr.wikipedia.org/wiki/…"
                        required
                    />
                )}
            </Champ>
            <Champ
                libelle="Titre montré à l’élève"
                erreur={formulaire.errors.titre}
            >
                {(attributs) => (
                    <Input
                        {...attributs}
                        value={formulaire.data.titre}
                        onChange={(e) =>
                            formulaire.setData('titre', e.target.value)
                        }
                        maxLength={160}
                        required
                    />
                )}
            </Champ>
            <div className="grid grid-cols-2 gap-3">
                <Champ libelle="Type" erreur={formulaire.errors.type}>
                    {(attributs) => (
                        <ListeDeroulante
                            {...attributs}
                            value={formulaire.data.type}
                            onChange={(e) =>
                                formulaire.setData(
                                    'type',
                                    e.target.value as RessourceEleve['type'],
                                )
                            }
                        >
                            {types.map((t) => (
                                <option key={t.valeur} value={t.valeur}>
                                    {t.libelle}
                                </option>
                            ))}
                        </ListeDeroulante>
                    )}
                </Champ>
                {formulaire.data.type === 'video' ? (
                    <Champ
                        libelle="Durée (min)"
                        erreur={formulaire.errors.duree_minutes}
                    >
                        {(attributs) => (
                            <NumberInput
                                {...attributs}
                                valeur={
                                    formulaire.data.duree_minutes === ''
                                        ? null
                                        : Number(formulaire.data.duree_minutes)
                                }
                                onValeur={(v) =>
                                    formulaire.setData('duree_minutes', v ?? '')
                                }
                            />
                        )}
                    </Champ>
                ) : (
                    <Champ
                        libelle="Poids (Ko)"
                        facultatif
                        erreur={formulaire.errors.poids_ko}
                    >
                        {(attributs) => (
                            <NumberInput
                                {...attributs}
                                valeur={
                                    formulaire.data.poids_ko === ''
                                        ? null
                                        : Number(formulaire.data.poids_ko)
                                }
                                onValeur={(v) =>
                                    formulaire.setData('poids_ko', v ?? '')
                                }
                            />
                        )}
                    </Champ>
                )}
            </div>
            <Champ
                libelle="Ce qu’on y trouve"
                facultatif
                erreur={formulaire.errors.description}
            >
                {(attributs) => (
                    <Textarea
                        {...attributs}
                        value={formulaire.data.description}
                        onChange={(e) =>
                            formulaire.setData('description', e.target.value)
                        }
                        maxLength={300}
                        className="min-h-20"
                    />
                )}
            </Champ>
            <div className={cn('flex gap-2', ressource ? 'justify-end' : '')}>
                {ressource && (
                    <Button type="button" variant="outline" onClick={fini}>
                        Annuler
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={formulaire.processing}
                    className={ressource ? '' : 'w-full'}
                >
                    {formulaire.processing && <Spinner />}
                    {ressource ? 'Enregistrer' : 'Proposer la ressource'}
                </Button>
            </div>
        </form>
    );

    return ressource ? (
        contenu
    ) : (
        <Section
            titre="Proposer une ressource"
            description="Un relecteur la vérifiera avant que les élèves la voient."
        >
            {contenu}
        </Section>
    );
}

function DialogueRetrait({
    ressource,
    fermer,
}: {
    ressource: Ressource | null;
    fermer: () => void;
}) {
    const formulaire = useForm({ motif: '' });

    return (
        <Dialog open={ressource !== null} onOpenChange={(o) => !o && fermer()}>
            <DialogContent className="sm:max-w-md">
                {ressource && (
                    <form
                        className="grid gap-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            formulaire.post(retirer(ressource.uuid).url, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    formulaire.reset();
                                    fermer();
                                },
                            });
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                Retirer « {ressource.titre} »
                            </DialogTitle>
                            <DialogDescription>
                                Les élèves ne la verront plus ; elle reste ici,
                                avec votre motif.
                            </DialogDescription>
                        </DialogHeader>
                        <Champ
                            libelle="Pourquoi ?"
                            erreur={formulaire.errors.motif}
                        >
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    value={formulaire.data.motif}
                                    onChange={(e) =>
                                        formulaire.setData(
                                            'motif',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="La vidéo a été supprimée, la page a changé…"
                                    required
                                />
                            )}
                        </Champ>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={fermer}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={formulaire.processing}
                            >
                                Retirer
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
