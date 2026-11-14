import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Archive, ClipboardList, Presentation, UsersRound } from 'lucide-react';
import { useState } from 'react';
import {
    Carte,
    EnteteEcran,
    ListeNotionsFaibles,
    TitreCarte,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { ListeDeroulante } from '@/components/ui/liste-deroulante';
import { ProgressionSegments } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import { cn, pluriel } from '@/lib/utils';
import { show, store } from '@/routes/enseignant/groupes';
import type { NotionFaible, ResumeGroupe } from '@/types/suivi';

type Groupe = ResumeGroupe & {
    jauge_moyenne: number | null;
    actifs_semaine?: number;
    devoirs_ouverts: number;
    notions_faibles: NotionFaible[];
};

type Props = {
    groupes: Groupe[];
    examens: {
        id: number;
        nom: string;
        series: { id: number; nom: string; code: string }[];
    }[];
    etablissements: { id: number; nom: string }[];
};

/**
 * Espace enseignant (lot 11, PLAN M14) : ses groupes, chacun avec sa jauge
 * moyenne et ses deux notions les plus faibles ; créer un groupe.
 */
export default function AccueilEnseignant({
    groupes,
    examens,
    etablissements,
}: Props) {
    const { auth } = usePage().props;
    const ouverts = groupes.filter((g) => !g.archive);
    const archives = groupes.filter((g) => g.archive);
    const eleves = ouverts.reduce((total, g) => total + g.eleves, 0);

    return (
        <>
            <Head title="Mes groupes" />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta="Espace enseignant"
                    titre={
                        <>
                            Bonjour, <strong>{auth.user?.prenom}</strong>
                        </>
                    }
                    chapeau={
                        ouverts.length === 0
                            ? 'Créez un groupe pour votre classe : vos élèves le rejoignent avec son code, vous suivez ce qu’ils travaillent.'
                            : `${pluriel(ouverts.length, 'groupe')}, ${pluriel(eleves, 'élève')}. Ce que la classe maîtrise mal, d’un coup d’œil.`
                    }
                />

                {groupes.some((g) => g.est_exemple) && <BandeauExemple />}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <div className="grid content-start gap-5">
                        {ouverts.length === 0 ? (
                            <Carte>
                                <EtatVide
                                    illustration={Presentation}
                                    titre="Aucun groupe pour l’instant"
                                    message="Un groupe par classe : la 10e A, la Terminale SE… Le formulaire est à côté."
                                    action={
                                        <Button
                                            asChild
                                            variant="outline"
                                            taille="compacte"
                                        >
                                            <a href="#nouveau-groupe">
                                                Créer un groupe
                                            </a>
                                        </Button>
                                    }
                                />
                            </Carte>
                        ) : (
                            <ul className="grid gap-4 md:grid-cols-2">
                                {ouverts.map((groupe) => (
                                    <CarteGroupe
                                        key={groupe.id}
                                        groupe={groupe}
                                    />
                                ))}
                            </ul>
                        )}

                        {archives.length > 0 && (
                            <Carte>
                                <TitreCarte>Groupes archivés</TitreCarte>
                                <ul className="mt-2 divide-y">
                                    {archives.map((groupe) => (
                                        <li key={groupe.id}>
                                            <Link
                                                href={show(groupe.id)}
                                                prefetch
                                                className="flex items-center gap-3 py-2.5 text-ink-600 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                                            >
                                                <Archive
                                                    aria-hidden
                                                    className="size-4"
                                                />
                                                <span className="flex-1 truncate">
                                                    {groupe.nom}
                                                </span>
                                                <span className="text-aide">
                                                    {groupe.examen}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </Carte>
                        )}
                    </div>

                    <NouveauGroupe
                        examens={examens}
                        etablissements={etablissements}
                    />
                </div>
            </div>
        </>
    );
}

function CarteGroupe({ groupe }: { groupe: Groupe }) {
    return (
        <li>
            <Link
                href={show(groupe.id)}
                prefetch
                className="grid h-full content-start gap-4 rounded-carte border bg-card p-5 shadow-carte transition-[border-color,box-shadow] outline-none hover:border-ink-400/60 hover:shadow-releve focus-visible:outline-2 focus-visible:outline-ring"
            >
                <span className="flex items-start justify-between gap-3">
                    <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-titre-carte font-semibold">
                            {groupe.nom}
                        </span>
                        <span className="truncate text-aide text-ink-500">
                            {[groupe.examen, groupe.etablissement]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    </span>
                    <Badge variant="nimba" className="tracking-wider font-data">
                        {groupe.code}
                    </Badge>
                </span>

                <span className="flex items-end justify-between gap-3">
                    <span className="grid gap-0.5">
                        <span className="text-meta text-ink-500">
                            Jauge moyenne
                        </span>
                        <span className="text-[1.75rem] leading-none font-bold font-data">
                            {groupe.jauge_moyenne ?? '—'}
                            {groupe.jauge_moyenne !== null && (
                                <span className="text-base font-semibold text-ink-500">
                                    {' '}
                                    %
                                </span>
                            )}
                        </span>
                    </span>
                    <span className="grid justify-items-end gap-1 text-meta text-ink-500">
                        <span className="flex items-center gap-1.5">
                            <UsersRound aria-hidden className="size-3.5" />
                            {pluriel(groupe.eleves, 'élève')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <ClipboardList aria-hidden className="size-3.5" />
                            {pluriel(
                                groupe.devoirs_ouverts,
                                'devoir ouvert',
                                'devoirs ouverts',
                            )}
                        </span>
                    </span>
                </span>
                <ProgressionSegments
                    valeur={groupe.jauge_moyenne ?? 0}
                    libelle={`Jauge moyenne de ${groupe.nom}`}
                />

                <span className="grid gap-2 border-t pt-3">
                    <span className="text-meta font-medium text-ink-500">
                        À retravailler
                    </span>
                    {groupe.notions_faibles.length === 0 ? (
                        <span className="text-aide text-ink-600">
                            {groupe.eleves === 0
                                ? `Donnez le code ${groupe.code} à vos élèves.`
                                : 'Rien de faible pour l’instant.'}
                        </span>
                    ) : (
                        <ListeNotionsFaibles
                            notions={groupe.notions_faibles}
                            total={groupe.eleves}
                            compacte
                        />
                    )}
                </span>
            </Link>
        </li>
    );
}

function NouveauGroupe({
    examens,
    etablissements,
}: Pick<Props, 'examens' | 'etablissements'>) {
    const [examen, setExamen] = useState<number | ''>(examens[0]?.id ?? '');
    const series = examens.find((e) => e.id === examen)?.series ?? [];

    return (
        <Carte
            id="nouveau-groupe"
            aria-labelledby="titre-nouveau-groupe"
            className="h-fit scroll-mt-20"
        >
            <TitreCarte id="titre-nouveau-groupe">Créer un groupe</TitreCarte>
            <p className="mt-1 text-aide text-ink-500">
                Il reçoit un code de six caractères à donner à vos élèves.
            </p>
            <Form
                {...store.form()}
                resetOnSuccess={['nom']}
                className="mt-4 grid gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <Champ libelle="Nom du groupe" erreur={errors.nom}>
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    name="nom"
                                    required
                                    maxLength={80}
                                    placeholder="10e A"
                                />
                            )}
                        </Champ>
                        <Champ libelle="Examen préparé" erreur={errors.examen}>
                            {(attributs) => (
                                <ListeDeroulante
                                    {...attributs}
                                    name="examen"
                                    value={examen}
                                    onChange={(e) =>
                                        setExamen(Number(e.target.value))
                                    }
                                >
                                    {examens.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.nom}
                                        </option>
                                    ))}
                                </ListeDeroulante>
                            )}
                        </Champ>
                        {series.length > 0 && (
                            <Champ libelle="Série" erreur={errors.serie}>
                                {(attributs) => (
                                    <ListeDeroulante
                                        {...attributs}
                                        name="serie"
                                        required
                                    >
                                        {series.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code} — {s.nom}
                                            </option>
                                        ))}
                                    </ListeDeroulante>
                                )}
                            </Champ>
                        )}
                        {etablissements.length > 0 && (
                            <Champ
                                libelle="Établissement"
                                erreur={errors.etablissement}
                            >
                                {(attributs) => (
                                    <ListeDeroulante
                                        {...attributs}
                                        name="etablissement"
                                    >
                                        {etablissements.map((e) => (
                                            <option key={e.id} value={e.id}>
                                                {e.nom}
                                            </option>
                                        ))}
                                        <option value="">
                                            Aucun (cours particuliers)
                                        </option>
                                    </ListeDeroulante>
                                )}
                            </Champ>
                        )}
                        <Button
                            type="submit"
                            disabled={processing}
                            className={cn('w-full')}
                        >
                            {processing && <Spinner />}
                            Créer le groupe
                        </Button>
                    </>
                )}
            </Form>
        </Carte>
    );
}
