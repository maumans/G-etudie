import { Form, router } from '@inertiajs/react';
import { HeartHandshake, KeyRound, UserX } from 'lucide-react';
import { EnteteCompte, SectionCompte } from '@/components/entete-compte';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { Spinner } from '@/components/ui/spinner';
import { formaterJour, formaterJourHeure } from '@/lib/dates';
import { code as creerCode, retirer } from '@/routes/compte/parents';

type Props = {
    parents: { id: number; prenom: string; lie_le: string }[];
    code: { code: string; expire_le: string } | null;
    code_en_cours_expire_le: string | null;
    parents_max: number;
    validite_heures: number;
};

/**
 * « Mon compte › Parents » (lot 11, décision 1) : c'est toi qui choisis
 * d'être suivi. Le code n'apparaît qu'une fois ; ton parent le saisit dans
 * son espace. Tu peux retirer un lien à tout moment.
 */
export default function Parents({
    parents,
    code,
    code_en_cours_expire_le,
    parents_max,
    validite_heures,
}: Props) {
    const confirmer = useConfirmer();
    const complet = parents.length >= parents_max;

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-6">
            <EnteteCompte titre="Parents" />

            <SectionCompte
                titre="Donner un code à mon parent"
                description={`Ton parent voit ton temps de révision, ta jauge et tes notes d’examens blancs. Pas tes réponses une à une, ni tes échanges avec le tuteur. Le code sert une fois et dure ${validite_heures} heures.`}
            >
                {code ? (
                    <div
                        className="grid gap-3 rounded-[14px] surface-encre p-5 text-white"
                        role="status"
                    >
                        <p className="flex items-center gap-2 text-aide font-medium text-white/80">
                            <KeyRound aria-hidden className="size-4" />
                            Ton code, à dire à ton parent
                        </p>
                        <p
                            className="text-[2.5rem] leading-none font-bold tracking-[0.25em] font-data"
                            data-capture="variable"
                        >
                            {code.code.slice(0, 3)} {code.code.slice(3)}
                        </p>
                        <p className="text-aide text-white/70">
                            Valable jusqu’au {formaterJourHeure(code.expire_le)}
                            . Il ne s’affichera plus : note-le ou dis-le
                            maintenant.
                        </p>
                    </div>
                ) : (
                    code_en_cours_expire_le && (
                        <p className="text-aide text-ink-600">
                            Un code créé tout à l’heure est encore valable
                            jusqu’au{' '}
                            {formaterJourHeure(code_en_cours_expire_le)}. En
                            créer un nouveau annule l’ancien.
                        </p>
                    )
                )}
                <Form {...creerCode.form()} className="grid gap-2">
                    {({ processing, errors }) => (
                        <>
                            <Button
                                type="submit"
                                disabled={processing || complet}
                                className="sm:w-fit"
                                variant={code ? 'outline' : 'default'}
                            >
                                {processing && <Spinner />}
                                {code ? 'Créer un autre code' : 'Créer un code'}
                            </Button>
                            {complet && (
                                <p className="text-aide text-ink-500">
                                    Deux parents te suivent déjà : retire un
                                    lien pour en ajouter un autre.
                                </p>
                            )}
                            {errors.code && (
                                <p className="text-aide text-faux-600 dark:text-faux-400">
                                    {errors.code}
                                </p>
                            )}
                        </>
                    )}
                </Form>
            </SectionCompte>

            <SectionCompte titre="Qui me suit">
                {parents.length === 0 ? (
                    <p className="flex items-start gap-3 text-ink-600">
                        <HeartHandshake
                            aria-hidden
                            className="mt-0.5 size-5 shrink-0 text-ink-500"
                        />
                        Personne pour l’instant.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {parents.map((parent) => (
                            <li
                                key={parent.id}
                                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <span
                                    aria-hidden
                                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-900 font-semibold text-craie-50"
                                >
                                    {parent.prenom.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="grid min-w-0 flex-1">
                                    <span className="truncate font-semibold">
                                        {parent.prenom}
                                    </span>
                                    <span className="text-aide text-ink-500">
                                        Te suit depuis le{' '}
                                        {formaterJour(parent.lie_le)}
                                    </span>
                                </span>
                                <Button
                                    variant="ghost"
                                    taille="compacte"
                                    onClick={async () => {
                                        if (
                                            await confirmer({
                                                titre: `${parent.prenom} ne te suivra plus ?`,
                                                message:
                                                    'Pour te suivre de nouveau, il lui faudra un nouveau code de ta part.',
                                                action: 'Retirer',
                                                ton: 'danger',
                                            })
                                        ) {
                                            router.delete(
                                                retirer(parent.id).url,
                                                { preserveScroll: true },
                                            );
                                        }
                                    }}
                                >
                                    <UserX aria-hidden />
                                    Retirer
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCompte>
        </div>
    );
}
