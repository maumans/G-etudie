import { router, useForm } from '@inertiajs/react';
import { Ban, Flag, Hash, MessagesSquare, Plus, X } from 'lucide-react';
import { EnteteEcran } from '@/components/contenu/entete-ecran';
import { Section } from '@/components/contenu/section';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formaterNombre } from '@/lib/utils';
import { destroy, store } from '@/routes/contenu/moderation/mots';

type Props = {
    mots: { id: number; mot: string }[];
    regles: {
        texte_max: number;
        par_jour: number;
        intervalle: number;
        signalements: number;
    };
    activite: { publications: number; signalements: number; masquees: number };
};

/**
 * Back-office › Modération (lot 12, PLAN M13) : les mots refusés dans les
 * fils des groupes, et ce que le filtre refuse déjà seul. Le contenu des
 * fils n'est pas lu ici : chaque fil appartient à l'enseignant du groupe.
 */
export default function Moderation({ mots, regles, activite }: Props) {
    const formulaire = useForm({ mot: '' });

    return (
        <div className="grid gap-6">
            <EnteteEcran
                titreOnglet="Modération"
                titre={
                    <>
                        La <strong>modération</strong> des fils de groupe
                    </>
                }
                description="Les élèves sont des mineurs : un message qui contient un de ces mots est refusé avant d’être publié, avec une phrase qui demande de reformuler."
            />

            <ul className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        icone: MessagesSquare,
                        libelle: 'Messages publiés',
                        valeur: activite.publications,
                    },
                    {
                        icone: Flag,
                        libelle: 'Signalements d’élèves',
                        valeur: activite.signalements,
                    },
                    {
                        icone: Ban,
                        libelle: 'Messages masqués',
                        valeur: activite.masquees,
                    },
                ].map((t) => (
                    <li
                        key={t.libelle}
                        className="flex items-center gap-3 rounded-carte border bg-card p-4 shadow-carte"
                    >
                        <span
                            aria-hidden
                            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                        >
                            <t.icone className="size-5" />
                        </span>
                        <span className="grid">
                            <span className="text-[1.375rem] leading-tight font-bold font-data">
                                {formaterNombre(t.valeur)}
                            </span>
                            <span className="text-meta text-ink-500">
                                {t.libelle} · 30 jours
                            </span>
                        </span>
                    </li>
                ))}
            </ul>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
                <Section
                    titre="Mots refusés"
                    description="Comparés sans majuscules ni accents, en mot entier (« con » ne bloque pas « conjugaison »), même écrits avec des lettres répétées ou des points."
                >
                    {mots.length === 0 ? (
                        <p className="text-aide text-ink-600">
                            Aucun mot pour l’instant.
                        </p>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {mots.map((m) => (
                                <li
                                    key={m.id}
                                    className="flex items-center gap-1 rounded-controle border border-contour bg-craie-50 py-1 pr-1 pl-2.5 text-aide dark:bg-relief/50"
                                >
                                    {m.mot}
                                    <Button
                                        variant="ghost"
                                        taille="icone-compacte"
                                        className="size-6"
                                        aria-label={`Retirer « ${m.mot} »`}
                                        onClick={() =>
                                            router.delete(destroy(m.id).url, {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <X aria-hidden />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <form
                        className="mt-4 flex items-end gap-2 border-t pt-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            formulaire.post(store().url, {
                                preserveScroll: true,
                                onSuccess: () => formulaire.reset(),
                            });
                        }}
                    >
                        <Champ
                            libelle="Ajouter un mot ou une courte expression"
                            erreur={formulaire.errors.mot}
                            className="flex-1"
                        >
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    value={formulaire.data.mot}
                                    onChange={(e) =>
                                        formulaire.setData(
                                            'mot',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={60}
                                    autoComplete="off"
                                    required
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={formulaire.processing}>
                            {formulaire.processing ? (
                                <Spinner />
                            ) : (
                                <Plus aria-hidden />
                            )}
                            Ajouter
                        </Button>
                    </form>
                </Section>

                <Section titre="Ce que le filtre refuse déjà">
                    <ul className="grid gap-3 text-aide text-ink-600">
                        <li className="flex gap-2.5">
                            <Hash
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-ink-500"
                            />
                            Un numéro de téléphone, un lien, une adresse e-mail
                            : pas de contact privé entre élèves.
                        </li>
                        <li className="flex gap-2.5">
                            <MessagesSquare
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-ink-500"
                            />
                            {regles.texte_max} caractères par message,{' '}
                            {regles.par_jour} messages par jour et par groupe,
                            un toutes les {regles.intervalle} secondes.
                        </li>
                        <li className="flex gap-2.5">
                            <Flag
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-ink-500"
                            />
                            Signalé par {regles.signalements} élèves différents,
                            un message est masqué en attendant l’enseignant du
                            groupe.
                        </li>
                    </ul>
                    <p className="mt-4 border-t pt-3 text-meta text-ink-500">
                        Les messages eux-mêmes ne sont lus que par l’enseignant
                        du groupe.
                    </p>
                </Section>
            </div>
        </div>
    );
}
