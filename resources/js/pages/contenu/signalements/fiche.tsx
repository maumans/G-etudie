import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ExternalLink,
    MessageSquareText,
    Send,
    UserRound,
} from 'lucide-react';
import { Section } from '@/components/contenu/section';
import { RevueQuestion } from '@/components/questions/revue-question';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionEleve } from '@/lib/contenu/questions';
import { formaterJourHeure } from '@/lib/dates';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { index, repondre } from '@/routes/contenu/signalements';
import type { SignalementResume, StatutSignalement } from './index';

type Props = {
    signalement: SignalementResume & { reponse_vue: boolean; autres: number };
    question: QuestionEleve | null;
    statuts: {
        valeur: Exclude<StatutSignalement, 'ouvert'>;
        libelle: string;
    }[];
};

/**
 * Fiche d'un signalement : ce que l'élève a vu (la version de la question
 * qu'il avait sous les yeux), ce qu'il en dit, le lien pour corriger le
 * contenu, et la réponse — une seule, lue par l'élève dans « Mes
 * signalements ». De l'élève, seul son pseudo est montré.
 */
export default function Fiche({ signalement, question, statuts }: Props) {
    const style = signalement.contenu?.matiere
        ? MATIERES[signalement.contenu.matiere.teinte]
        : null;
    const formulaire = useForm<{
        statut: Exclude<StatutSignalement, 'ouvert'>;
        reponse: string;
    }>({
        statut: signalement.statut === 'rejete' ? 'rejete' : 'traite',
        reponse: signalement.reponse ?? '',
    });
    const figee = signalement.reponse_vue;

    return (
        <div className="grid gap-6">
            <Head title="Signalement" />
            <div className="grid gap-4">
                <Button
                    asChild
                    variant="ghost"
                    taille="compacte"
                    className="-ml-2 w-fit"
                >
                    <Link href={index()} prefetch>
                        <ArrowLeft aria-hidden />
                        Les signalements
                    </Link>
                </Button>
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'mt-1 flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-craie-100',
                            style?.tuile,
                        )}
                    >
                        {style && <style.icone className="size-5" />}
                    </span>
                    <div className="grid min-w-0 gap-1.5">
                        <p className="text-aide text-ink-500">
                            {signalement.cible_libelle}
                            {signalement.contenu?.matiere &&
                                ` · ${signalement.contenu.matiere.nom}`}
                            {signalement.version !== null &&
                                ` · version ${signalement.version} vue par l’élève`}
                        </p>
                        <h1 className="text-titre-ecran titre-contraste">
                            <strong>{signalement.motif_libelle}</strong>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-aide text-ink-500">
                            {signalement.statut === 'ouvert' ? (
                                <Badge variant="nimba">À traiter</Badge>
                            ) : (
                                <Badge
                                    variant={
                                        signalement.statut === 'traite'
                                            ? 'juste'
                                            : 'neutre'
                                    }
                                >
                                    {signalement.statut_libelle}
                                </Badge>
                            )}
                            <span className="flex items-center gap-1">
                                <UserRound aria-hidden className="size-3.5" />@
                                {signalement.eleve}
                            </span>
                            <span data-capture="variable">
                                {formaterJourHeure(signalement.saisi_le)}
                            </span>
                            {signalement.autres > 0 && (
                                <span>
                                    ·{' '}
                                    {pluriel(
                                        signalement.autres,
                                        'autre signalement',
                                    )}{' '}
                                    sur ce contenu
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="grid min-w-0 gap-6">
                    {signalement.message && (
                        <div className="flex gap-3 rounded-carte border bg-card p-4 shadow-carte">
                            <MessageSquareText
                                aria-hidden
                                className="mt-0.5 size-5 shrink-0 text-ink-500"
                            />
                            <div className="grid gap-0.5">
                                <p className="text-aide font-semibold">
                                    Ce qu’en dit l’élève
                                </p>
                                <p className="whitespace-pre-line text-ink-600">
                                    « {signalement.message} »
                                </p>
                            </div>
                        </div>
                    )}

                    <Section
                        titre={
                            question
                                ? 'La question vue par l’élève'
                                : (signalement.contenu?.titre ??
                                  'Contenu retiré')
                        }
                        description={
                            question
                                ? 'La question telle que l’élève l’a vue, avec sa réponse attendue et son corrigé.'
                                : 'Ouvrez le contenu pour le vérifier.'
                        }
                        action={
                            signalement.contenu?.lien && (
                                <Button
                                    asChild
                                    variant="outline"
                                    taille="compacte"
                                >
                                    <a href={signalement.contenu.lien}>
                                        <ExternalLink aria-hidden />
                                        Ouvrir pour corriger
                                    </a>
                                </Button>
                            )
                        }
                    >
                        {question && <RevueQuestion question={question} />}
                    </Section>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        formulaire.post(repondre(signalement.uuid).url);
                    }}
                    className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve lg:sticky lg:top-6"
                >
                    <div className="grid gap-1">
                        <h2 className="text-titre-carte font-semibold">
                            Répondre à l’élève
                        </h2>
                        <p className="text-aide text-white/75">
                            {figee
                                ? 'L’élève a lu la réponse : elle ne change plus.'
                                : 'Une phrase claire, au tutoiement. Elle s’affiche dans « Mes signalements ».'}
                        </p>
                    </div>
                    <fieldset className="grid gap-2" disabled={figee}>
                        <legend className="sr-only">Décision</legend>
                        {statuts.map((s) => (
                            <label
                                key={s.valeur}
                                className="flex cursor-pointer items-center gap-2.5 rounded-controle border border-white/20 px-3 py-2.5 text-interface has-[:checked]:border-white/70 has-[:checked]:bg-white/10"
                            >
                                <input
                                    type="radio"
                                    name="statut"
                                    value={s.valeur}
                                    checked={
                                        formulaire.data.statut === s.valeur
                                    }
                                    onChange={() =>
                                        formulaire.setData('statut', s.valeur)
                                    }
                                    className="accent-nimba-500"
                                />
                                {s.libelle}
                            </label>
                        ))}
                    </fieldset>
                    <div className="clair rounded-controle">
                        <Champ
                            libelle={
                                <span className="text-white">Ta réponse</span>
                            }
                            erreur={
                                formulaire.errors.reponse ??
                                formulaire.errors.statut
                            }
                        >
                            {(attributs) => (
                                <Textarea
                                    {...attributs}
                                    rows={4}
                                    maxLength={2000}
                                    disabled={figee}
                                    value={formulaire.data.reponse}
                                    onChange={(e) =>
                                        formulaire.setData(
                                            'reponse',
                                            e.target.value,
                                        )
                                    }
                                    placeholder={
                                        formulaire.data.statut === 'traite'
                                            ? 'Merci ! Tu avais raison : le corrigé de la question 2 est réparé.'
                                            : 'Merci d’avoir vérifié. Le corrigé est juste : regarde l’étape 2…'
                                    }
                                />
                            )}
                        </Champ>
                    </div>
                    <Button
                        type="submit"
                        disabled={figee || formulaire.processing}
                    >
                        {formulaire.processing ? (
                            <Spinner />
                        ) : (
                            <Send aria-hidden />
                        )}
                        {signalement.statut === 'ouvert'
                            ? 'Envoyer la réponse'
                            : 'Corriger la réponse'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
