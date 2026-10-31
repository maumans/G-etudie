import { Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleAlert,
    FileUp,
    ScanText,
    ShieldCheck,
    UserRoundCheck,
} from 'lucide-react';
import { useRef } from 'react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { Spinner } from '@/components/ui/spinner';
import { formaterPoids } from '@/lib/contenu/sujets';
import type { CleMatiere } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { index } from '@/routes/contenu/annales';
import { store } from '@/routes/contenu/annales/imports';
import { index as programme } from '@/routes/contenu/referentiel/programme';

type Props = {
    examens: {
        id: number;
        code: string;
        nom: string;
        series: { id: number; code: string; nom: string }[];
    }[];
    matieres: { id: number; nom: string; teinte: CleMatiere }[];
    /** « examen:matière » dont le programme a des notions. */
    avec_programme: string[];
    types: { valeur: 'officiel' | 'blanc_maison'; libelle: string }[];
    taille_max_ko: number;
    extracteur: 'claude' | 'simule';
    annee: number;
};

const ETAPES = [
    {
        icone: ScanText,
        titre: 'L’IA transcrit',
        texte: 'Énoncé mot pour mot, formules en LaTeX, découpage en parties et en questions. Elle propose aussi une réponse et un corrigé.',
    },
    {
        icone: UserRoundCheck,
        titre: 'Vous vérifiez',
        texte: 'Le document original à côté, chaque question à confirmer : rien ne part en relecture tant qu’une réponse proposée n’est pas vérifiée.',
    },
    {
        icone: ShieldCheck,
        titre: 'Un relecteur publie',
        texte: 'Un autre enseignant relit l’annale et toutes ses questions, puis la publie d’un geste.',
    },
];

/**
 * Back-office › Annales › Importer (PLAN M17, « import assisté ») : un PDF
 * ou une photo du sujet, ce qu'il est (examen, série, matière, session).
 * La lecture se fait en file ; l'annale apparaît en brouillon dans la liste.
 */
export default function Importer({
    examens,
    matieres,
    avec_programme,
    types,
    taille_max_ko,
    extracteur,
    annee,
}: Props) {
    const fichier = useRef<HTMLInputElement>(null);
    const formulaire = useForm<{
        document: File | null;
        examen_id: number | '';
        serie_id: number | '';
        matiere_id: number | '';
        session: number;
        type: 'officiel' | 'blanc_maison';
    }>({
        document: null,
        examen_id: examens[0]?.id ?? '',
        serie_id: '',
        matiere_id: '',
        session: annee - 1,
        type: 'officiel',
    });
    const { data, setData, errors, processing } = formulaire;
    const examen = examens.find((e) => e.id === data.examen_id);
    const sansProgramme =
        data.examen_id !== '' &&
        data.matiere_id !== '' &&
        !avec_programme.includes(`${data.examen_id}:${data.matiere_id}`);
    const tropLourd =
        data.document !== null && data.document.size > taille_max_ko * 1024;

    function envoyer(evenement: React.FormEvent) {
        evenement.preventDefault();
        formulaire.post(store().url, { forceFormData: true });
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-4">
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className="-ml-2 w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Les annales
                    </Link>
                </Button>
                <EnteteEcran
                    titreOnglet="Importer un sujet"
                    titre={
                        <>
                            Importer un <strong>sujet</strong>
                        </>
                    }
                    description="Téléversez le sujet tel qu’il a été distribué. L’énoncé n’est pas à ressaisir : vous le vérifiez."
                />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <form
                    onSubmit={envoyer}
                    className="grid gap-5 rounded-carte border bg-card p-5 shadow-carte sm:p-6"
                >
                    <Champ
                        libelle="Le document"
                        aide={`PDF ou photo (JPEG, PNG, WebP), ${Math.round(taille_max_ko / 1024)} Mo au plus. Une page nette, bien éclairée, se lit mieux.`}
                        erreur={
                            errors.document ??
                            (tropLourd
                                ? `Ce document pèse ${formaterPoids(data.document?.size ?? 0)} : ${Math.round(taille_max_ko / 1024)} Mo au plus.`
                                : undefined)
                        }
                    >
                        {(attributs) => (
                            <label
                                className={cn(
                                    'flex cursor-pointer flex-col items-center gap-2 rounded-carte border border-dashed border-ink-400/70 bg-craie-100/60 px-4 py-7 text-center transition-colors focus-within:outline-2 focus-within:outline-ring hover:border-ink-600 dark:bg-white/[0.02]',
                                    data.document && 'border-solid',
                                )}
                            >
                                <FileUp
                                    aria-hidden
                                    className="size-6 text-nimba-600 dark:text-nimba-300"
                                />
                                <span className="font-semibold">
                                    {data.document
                                        ? data.document.name
                                        : 'Choisir le fichier du sujet'}
                                </span>
                                <span className="text-aide text-ink-500">
                                    {data.document
                                        ? formaterPoids(data.document.size)
                                        : 'PDF, JPEG, PNG ou WebP'}
                                </span>
                                <input
                                    {...attributs}
                                    ref={fichier}
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(e) =>
                                        setData(
                                            'document',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </label>
                        )}
                    </Champ>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Champ libelle="Examen" erreur={errors.examen_id}>
                            {(attributs) => (
                                <ListeDeroulante
                                    {...attributs}
                                    value={data.examen_id}
                                    onChange={(e) => {
                                        setData((d) => ({
                                            ...d,
                                            examen_id: Number(e.target.value),
                                            serie_id: '',
                                        }));
                                    }}
                                >
                                    {examens.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.nom}
                                        </option>
                                    ))}
                                </ListeDeroulante>
                            )}
                        </Champ>
                        {examen && examen.series.length > 0 ? (
                            <Champ libelle="Série" erreur={errors.serie_id}>
                                {(attributs) => (
                                    <ListeDeroulante
                                        {...attributs}
                                        value={data.serie_id}
                                        onChange={(e) =>
                                            setData(
                                                'serie_id',
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                            )
                                        }
                                    >
                                        <option value="">Choisir…</option>
                                        {examen.series.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code} — {s.nom}
                                            </option>
                                        ))}
                                    </ListeDeroulante>
                                )}
                            </Champ>
                        ) : (
                            <Champ libelle="Session" erreur={errors.session}>
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        type="number"
                                        inputMode="numeric"
                                        min={1990}
                                        max={annee + 1}
                                        value={data.session}
                                        onChange={(e) =>
                                            setData(
                                                'session',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                        )}
                        <Champ libelle="Matière" erreur={errors.matiere_id}>
                            {(attributs) => (
                                <ListeDeroulante
                                    {...attributs}
                                    value={data.matiere_id}
                                    onChange={(e) =>
                                        setData(
                                            'matiere_id',
                                            e.target.value
                                                ? Number(e.target.value)
                                                : '',
                                        )
                                    }
                                >
                                    <option value="">Choisir…</option>
                                    {matieres.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.nom}
                                        </option>
                                    ))}
                                </ListeDeroulante>
                            )}
                        </Champ>
                        {examen && examen.series.length > 0 && (
                            <Champ libelle="Session" erreur={errors.session}>
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        type="number"
                                        inputMode="numeric"
                                        min={1990}
                                        max={annee + 1}
                                        value={data.session}
                                        onChange={(e) =>
                                            setData(
                                                'session',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                )}
                            </Champ>
                        )}
                    </div>

                    {sansProgramme && (
                        <p className="flex items-start gap-2 rounded-controle bg-indice-400/[0.10] px-3 py-2.5 text-aide text-ink-600 dark:bg-indice-400/[0.08]">
                            <CircleAlert
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-indice-700 dark:text-indice-400"
                            />
                            <span>
                                Le programme de cette matière n’a encore aucune
                                notion pour cet examen : chaque question doit
                                être rattachée à une notion.{' '}
                                <Link
                                    href={programme()}
                                    className="font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
                                >
                                    Saisir le programme
                                </Link>
                            </span>
                        </p>
                    )}

                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-interface font-medium">
                            Ce sujet est…
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {types.map((t) => (
                                <label
                                    key={t.valeur}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-controle border px-3 py-2.5 transition-colors has-[:checked]:border-ink-900 has-[:checked]:bg-craie-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring dark:has-[:checked]:border-craie-50/60 dark:has-[:checked]:bg-white/[0.04]',
                                        'border-contour',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="type"
                                        value={t.valeur}
                                        checked={data.type === t.valeur}
                                        onChange={() =>
                                            setData('type', t.valeur)
                                        }
                                        className="mt-1 accent-nimba-600"
                                    />
                                    <span className="grid gap-0.5">
                                        <span className="font-medium">
                                            {t.libelle}
                                        </span>
                                        <span className="text-aide text-ink-600">
                                            {t.valeur === 'officiel'
                                                ? 'Tombé à l’examen national.'
                                                : 'Écrit par l’équipe, sur le modèle de l’examen.'}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-aide text-ink-500">
                            {extracteur === 'claude'
                                ? 'Lecture par l’API Claude : quelques minutes pour un sujet complet.'
                                : 'Lecture simulée (pas de clé d’API) : un sujet fictif marqué « Exemple » sera créé.'}
                        </p>
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                data.document === null ||
                                data.matiere_id === '' ||
                                sansProgramme ||
                                tropLourd
                            }
                        >
                            {processing ? <Spinner /> : <FileUp aria-hidden />}
                            Lancer la lecture
                        </Button>
                    </div>
                </form>

                <aside
                    aria-labelledby="titre-etapes"
                    className="grid gap-5 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6"
                >
                    <h2
                        id="titre-etapes"
                        className="text-titre-carte font-semibold"
                    >
                        Du scan à l’annale publiée
                    </h2>
                    <ol className="grid gap-5">
                        {ETAPES.map((etape, rang) => (
                            <li key={etape.titre} className="flex gap-3">
                                <span
                                    aria-hidden
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-aide font-semibold font-data"
                                >
                                    {rang + 1}
                                </span>
                                <span className="grid gap-0.5">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                        <etape.icone
                                            aria-hidden
                                            className="size-4 text-nimba-300"
                                        />
                                        {etape.titre}
                                    </span>
                                    <span className="text-aide text-white/75">
                                        {etape.texte}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                    <p className="border-t border-white/15 pt-4 text-meta text-white/60">
                        L’IA ne fait que transcrire : un énoncé n’est jamais
                        inventé, et aucun corrigé n’est publié sans un
                        enseignant.
                    </p>
                </aside>
            </div>
        </div>
    );
}
