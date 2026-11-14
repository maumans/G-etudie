import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, FileQuestion, ListChecks } from 'lucide-react';
import { useState } from 'react';
import {
    Carte,
    EnteteEcran,
    TitreCarte,
    TuileMatiere,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { DateInput } from '@/components/ui/date-input';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { create, store } from '@/routes/enseignant/devoirs';
import { show as pageGroupe } from '@/routes/enseignant/groupes';
import type { ResumeGroupe } from '@/types/suivi';

type Question = {
    uuid: string;
    extrait: string;
    type: string;
    difficulte: number;
    notion: string;
    chapitre: string;
    matiere: { cle: CleMatiere; nom: string };
    est_exemple: boolean;
};

type Props = {
    groupe: ResumeGroupe;
    filtres: { recherche: string; matiere: string };
    matieres: { slug: string; nom: string; cle: CleMatiere }[];
    questions: Question[];
    tronque: boolean;
    questions_max: number;
};

/** Demain, au format du champ date. */
function demainPlus(jours: number): string {
    const date = new Date();
    date.setDate(date.getDate() + jours);

    return date.toISOString().slice(0, 10);
}

/**
 * Donner un devoir (lot 11, décision 6) : des questions **publiées** du
 * programme du groupe, dans l'ordre choisi, et une échéance. L'enseignant
 * ne rédige pas de question (rien n'est publié sans relecture).
 */
export default function NouveauDevoir({
    groupe,
    filtres,
    matieres,
    questions,
    tronque,
    questions_max,
}: Props) {
    const formulaire = useForm({
        titre: '',
        consigne: '',
        echeance: demainPlus(7),
        questions: [] as string[],
    });
    const [recherche, setRecherche] = useState(filtres.recherche);
    // Les questions choisies restent connues même si un filtre les cache.
    const [connues, setConnues] = useState<Record<string, Question>>({});
    const choisies = formulaire.data.questions;

    // CLAUDE.md § 4 : `filtres` d'abord, ce que la page contrôle ensuite.
    const filtrer = (changement: Partial<Props['filtres']>) =>
        router.get(
            create(groupe.id).url,
            { ...filtres, recherche, ...changement },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['questions', 'filtres', 'tronque'],
            },
        );

    const basculer = (question: Question) => {
        const deja = choisies.includes(question.uuid);

        if (!deja && choisies.length >= questions_max) {
            return;
        }

        setConnues((avant) => ({ ...avant, [question.uuid]: question }));
        formulaire.setData(
            'questions',
            deja
                ? choisies.filter((u) => u !== question.uuid)
                : [...choisies, question.uuid],
        );
    };

    const envoyer = (evenement: React.FormEvent) => {
        evenement.preventDefault();
        formulaire.post(store(groupe.id).url);
    };

    return (
        <>
            <Head title={`Nouveau devoir · ${groupe.nom}`} />
            <form onSubmit={envoyer} className="grid gap-5 lg:gap-6">
                <Button
                    asChild
                    variant="ghost"
                    taille="petite"
                    className="w-fit"
                >
                    <Link href={pageGroupe(groupe.id)} prefetch>
                        <ArrowLeft aria-hidden />
                        {groupe.nom}
                    </Link>
                </Button>
                <EnteteEcran
                    meta={`${groupe.nom} · ${groupe.examen}`}
                    titre={
                        <>
                            Un devoir,{' '}
                            <strong>quelques questions bien choisies</strong>
                        </>
                    }
                    chapeau="Les questions viennent du programme relu par l’équipe pédagogique. Vos élèves les font comme une séance, même sans connexion une fois commencée."
                />

                {questions.some((q) => q.est_exemple) && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
                    <Carte aria-labelledby="titre-questions" className="p-0">
                        <div className="grid gap-3 border-b p-4 sm:p-5">
                            <TitreCarte id="titre-questions">
                                Choisir les questions
                            </TitreCarte>
                            <SearchInput
                                aria-label="Rechercher une question"
                                placeholder="Notion, chapitre ou mot de l’énoncé"
                                valeur={recherche}
                                onValeur={setRecherche}
                                onRecherche={(terme) =>
                                    filtrer({ recherche: terme })
                                }
                            />
                            <div
                                role="group"
                                aria-label="Matière"
                                className="flex flex-wrap gap-1.5"
                            >
                                {[
                                    { slug: '', nom: 'Toutes', cle: null },
                                    ...matieres,
                                ].map((m) => (
                                    <Button
                                        key={m.slug || 'toutes'}
                                        type="button"
                                        taille="petite"
                                        variant={
                                            filtres.matiere === m.slug
                                                ? 'encre'
                                                : 'ghost'
                                        }
                                        aria-pressed={
                                            filtres.matiere === m.slug
                                        }
                                        onClick={() =>
                                            filtrer({ matiere: m.slug })
                                        }
                                    >
                                        {m.cle && (
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'size-2 rounded-full',
                                                    MATIERES[m.cle].plein,
                                                )}
                                            />
                                        )}
                                        {m.nom}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {questions.length === 0 ? (
                            <div className="p-5">
                                <EtatVide
                                    illustration={FileQuestion}
                                    titre="Aucune question ici"
                                    message="Rien de publié pour ces filtres. L’équipe pédagogique ajoute des questions chaque semaine."
                                    action={
                                        <Button
                                            type="button"
                                            variant="outline"
                                            taille="compacte"
                                            onClick={() => {
                                                setRecherche('');
                                                filtrer({
                                                    recherche: '',
                                                    matiere: '',
                                                });
                                            }}
                                        >
                                            Tout afficher
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul
                                className="divide-y"
                                aria-label="Questions publiées"
                            >
                                {questions.map((question) => {
                                    const rang = choisies.indexOf(
                                        question.uuid,
                                    );
                                    const choisie = rang >= 0;

                                    return (
                                        <li key={question.uuid}>
                                            <button
                                                type="button"
                                                aria-pressed={choisie}
                                                onClick={() =>
                                                    basculer(question)
                                                }
                                                className={cn(
                                                    'flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5',
                                                    choisie
                                                        ? 'bg-nimba-500/[0.07] dark:bg-nimba-400/10'
                                                        : 'hover:bg-craie-100/70 dark:hover:bg-relief/50',
                                                )}
                                            >
                                                <TuileMatiere
                                                    cle={question.matiere.cle}
                                                    taille="petite"
                                                />
                                                <span className="grid min-w-0 flex-1 gap-0.5">
                                                    <span className="line-clamp-2 text-interface text-ink-900">
                                                        {question.extrait}
                                                    </span>
                                                    <span className="truncate text-meta text-ink-500">
                                                        {question.notion} ·{' '}
                                                        {question.chapitre}
                                                    </span>
                                                </span>
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'flex size-7 shrink-0 items-center justify-center rounded-full border text-meta font-semibold font-data',
                                                        choisie
                                                            ? 'border-nimba-600 bg-nimba-600 text-white'
                                                            : 'border-input text-transparent',
                                                    )}
                                                >
                                                    {choisie ? (
                                                        rang + 1
                                                    ) : (
                                                        <Check className="size-3.5" />
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {tronque && (
                            <p className="border-t px-5 py-3 text-aide text-ink-500">
                                D’autres questions existent : affinez la
                                recherche.
                            </p>
                        )}
                    </Carte>

                    <div className="grid content-start gap-5 lg:sticky lg:top-6">
                        <Carte className="grid gap-4">
                            <TitreCarte>Le devoir</TitreCarte>
                            <Champ
                                libelle="Titre"
                                erreur={formulaire.errors.titre}
                            >
                                {(attributs) => (
                                    <Input
                                        {...attributs}
                                        value={formulaire.data.titre}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'titre',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        maxLength={120}
                                        placeholder="Théorème de Pythagore"
                                    />
                                )}
                            </Champ>
                            <Champ
                                libelle="Consigne (facultatif)"
                                erreur={formulaire.errors.consigne}
                            >
                                {(attributs) => (
                                    <Textarea
                                        {...attributs}
                                        value={formulaire.data.consigne}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'consigne',
                                                e.target.value,
                                            )
                                        }
                                        maxLength={1000}
                                        rows={3}
                                        placeholder="Faites-le avant le cours de jeudi."
                                    />
                                )}
                            </Champ>
                            <Champ
                                libelle="À rendre au plus tard le"
                                erreur={formulaire.errors.echeance}
                            >
                                {(attributs) => (
                                    <DateInput
                                        {...attributs}
                                        value={formulaire.data.echeance}
                                        min={demainPlus(0)}
                                        onChange={(e) =>
                                            formulaire.setData(
                                                'echeance',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                )}
                            </Champ>
                        </Carte>

                        <Carte className="grid gap-3">
                            <TitreCarte
                                action={
                                    <Badge
                                        variant={
                                            choisies.length > 0
                                                ? 'nimba'
                                                : 'neutre'
                                        }
                                    >
                                        {choisies.length}/{questions_max}
                                    </Badge>
                                }
                            >
                                Questions choisies
                            </TitreCarte>
                            {choisies.length === 0 ? (
                                <p className="flex items-start gap-2 text-aide text-ink-600">
                                    <ListChecks
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Touchez une question pour l’ajouter ;
                                    l’ordre de vos choix est celui du devoir.
                                </p>
                            ) : (
                                <ol className="grid gap-1.5">
                                    {choisies.map((uuid, rang) => {
                                        const q =
                                            connues[uuid] ??
                                            questions.find(
                                                (x) => x.uuid === uuid,
                                            );

                                        return (
                                            <li
                                                key={uuid}
                                                className="flex items-center gap-2 text-aide"
                                            >
                                                <span className="w-5 shrink-0 text-right font-semibold text-ink-500 font-data">
                                                    {rang + 1}.
                                                </span>
                                                <span className="truncate">
                                                    {q?.notion ?? 'Question'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                            {formulaire.errors.questions && (
                                <p className="text-aide text-faux-600 dark:text-faux-400">
                                    {formulaire.errors.questions}
                                </p>
                            )}
                            <Button
                                type="submit"
                                disabled={
                                    formulaire.processing ||
                                    choisies.length === 0
                                }
                                className="w-full"
                            >
                                {formulaire.processing && <Spinner />}
                                Donner le devoir
                                {choisies.length > 0 &&
                                    ` (${pluriel(choisies.length, 'question')})`}
                            </Button>
                        </Carte>
                    </div>
                </div>
            </form>
        </>
    );
}
