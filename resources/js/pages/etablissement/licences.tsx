import { Head, router, usePage } from '@inertiajs/react';
import { BadgeCheck, ClipboardList, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Carte,
    EnteteEcran,
    Initiale,
    TitreCarte,
} from '@/components/suivi/elements';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { EtatVide } from '@/components/ui/etat-vide';
import { Input } from '@/components/ui/input';
import { formaterJour } from '@/lib/dates';
import { pluriel } from '@/lib/utils';
import { accueil } from '@/routes/etablissement';
import { attribuer, reprendre } from '@/routes/etablissement/licences';
import type { Identite, Licence } from '@/types/suivi';

type Props = {
    etablissement: { nom: string; est_exemple: boolean };
    licences: Licence[];
    courante: number | null;
    eleves: (Identite & { groupes: string[]; a_une_place: boolean })[];
};

/**
 * Les licences de l'établissement (lot 11, décision 3) : les places de la
 * licence en cours, attribuées aux élèves des groupes de l'école. Une place
 * attribuée abonne l'élève jusqu'à la fin de la licence ; reprise, elle
 * redevient libre.
 */
export default function LicencesEtablissement({
    etablissement,
    licences,
    courante,
    eleves,
}: Props) {
    const confirmer = useConfirmer();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [filtre, setFiltre] = useState('');
    const licence = licences.find((l) => l.id === courante) ?? null;
    const libres = licence ? licence.places - licence.prises : 0;
    // La liste n'est pas paginée (élèves des groupes de l'école) : le filtre reste local.
    const visibles = useMemo(() => {
        const terme = filtre.trim().toLowerCase();

        return terme === ''
            ? eleves
            : eleves.filter((e) =>
                  `${e.prenom} ${e.pseudo} ${e.groupes.join(' ')}`
                      .toLowerCase()
                      .includes(terme),
              );
    }, [eleves, filtre]);

    return (
        <>
            <Head title="Licences" />
            <div className="grid gap-5 lg:gap-6">
                <EnteteEcran
                    meta={etablissement.nom}
                    titre={
                        <>
                            Les <strong>licences</strong>
                        </>
                    }
                    chapeau={
                        licence
                            ? `${pluriel(libres, 'place libre', 'places libres')} sur ${licence.places}, jusqu’au ${formaterJour(licence.fin)}.`
                            : 'Aucune licence en cours : elle s’ajoute à la signature du contrat avec N’karamögö.'
                    }
                />
                {(etablissement.est_exemple ||
                    licences.some((l) => l.est_exemple)) && <BandeauExemple />}
                {(errors.eleve || errors.licence) && (
                    <p
                        role="alert"
                        className="rounded-carte border border-faux-600/30 bg-faux-600/[0.06] p-4 text-faux-700 dark:border-faux-400/30 dark:text-faux-400"
                    >
                        {errors.eleve ?? errors.licence}
                    </p>
                )}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    <Carte aria-labelledby="titre-eleves" className="p-0">
                        <div className="grid gap-3 border-b p-4 sm:p-5">
                            <TitreCarte id="titre-eleves">
                                Élèves de l’établissement
                            </TitreCarte>
                            <div className="relative">
                                <Search
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
                                />
                                <Input
                                    aria-label="Filtrer les élèves"
                                    placeholder="Prénom, pseudo ou groupe"
                                    value={filtre}
                                    onChange={(e) => setFiltre(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        {eleves.length === 0 ? (
                            <div className="p-5">
                                <EtatVide
                                    illustration={UsersRound}
                                    titre="Aucun élève dans vos groupes"
                                    message="Les élèves apparaissent ici quand ils ont rejoint le groupe de leur enseignant."
                                    action={
                                        <Button
                                            variant="outline"
                                            taille="compacte"
                                            onClick={() =>
                                                router.visit(accueil().url)
                                            }
                                        >
                                            Voir le rapport
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {visibles.map((eleve) => (
                                    <li
                                        key={eleve.id}
                                        className="flex items-center gap-3 px-4 py-3 sm:px-5"
                                    >
                                        <Initiale prenom={eleve.prenom} />
                                        <span className="grid min-w-0 flex-1 gap-0.5">
                                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="min-w-0 truncate font-semibold">
                                                    {eleve.prenom}
                                                </span>
                                                {eleve.a_une_place && (
                                                    <Badge variant="juste">
                                                        <BadgeCheck
                                                            aria-hidden
                                                        />
                                                        Place attribuée
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="truncate text-aide text-ink-500">
                                                {eleve.pseudo} ·{' '}
                                                {eleve.groupes.join(', ')}
                                            </span>
                                        </span>
                                        {licence &&
                                            (eleve.a_une_place ? (
                                                <Button
                                                    variant="ghost"
                                                    taille="compacte"
                                                    onClick={async () => {
                                                        if (
                                                            await confirmer({
                                                                titre: `Reprendre la place de ${eleve.prenom} ?`,
                                                                message:
                                                                    'Son abonnement par l’établissement s’arrête aujourd’hui ; la place redevient libre.',
                                                                action: 'Reprendre',
                                                            })
                                                        ) {
                                                            router.delete(
                                                                reprendre({
                                                                    licence:
                                                                        licence.id,
                                                                    eleve: eleve.id,
                                                                }).url,
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Reprendre
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    taille="compacte"
                                                    disabled={libres <= 0}
                                                    onClick={() =>
                                                        router.post(
                                                            attribuer(
                                                                licence.id,
                                                            ).url,
                                                            { eleve: eleve.id },
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    Attribuer
                                                </Button>
                                            ))}
                                    </li>
                                ))}
                                {visibles.length === 0 && (
                                    <li className="px-5 py-4 text-aide text-ink-500">
                                        Aucun élève ne correspond à « {filtre}{' '}
                                        ».
                                    </li>
                                )}
                            </ul>
                        )}
                    </Carte>

                    <div className="grid content-start gap-5">
                        {licence && (
                            <section className="grid gap-3 rounded-carte surface-encre p-5 text-white shadow-releve">
                                <h2 className="text-[0.9375rem] font-semibold">
                                    Licence en cours
                                </h2>
                                <p className="text-[2.25rem] leading-none font-bold font-data">
                                    {libres}
                                    <span className="text-[1.125rem] font-semibold text-white/70">
                                        {' '}
                                        libres
                                    </span>
                                </p>
                                <div
                                    role="progressbar"
                                    aria-label="Places attribuées"
                                    aria-valuemin={0}
                                    aria-valuemax={licence.places}
                                    aria-valuenow={licence.prises}
                                    className="h-2 overflow-hidden rounded-full bg-white/20"
                                >
                                    <div
                                        className="h-full rounded-full bg-nimba-400"
                                        style={{
                                            width: `${Math.min(100, (licence.prises / Math.max(1, licence.places)) * 100)}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-aide text-white/75">
                                    {licence.prises} attribuées sur{' '}
                                    {licence.places} · jusqu’au{' '}
                                    {formaterJour(licence.fin)}
                                </p>
                            </section>
                        )}
                        <Carte aria-labelledby="titre-historique">
                            <TitreCarte id="titre-historique">
                                Toutes les licences
                            </TitreCarte>
                            {licences.length === 0 ? (
                                <p className="mt-2 flex items-start gap-2 text-aide text-ink-600">
                                    <ClipboardList
                                        aria-hidden
                                        className="mt-0.5 size-4 shrink-0 text-ink-500"
                                    />
                                    Aucune licence pour l’instant.
                                </p>
                            ) : (
                                <ul className="mt-1 divide-y">
                                    {licences.map((l) => (
                                        <li
                                            key={l.id}
                                            className="grid gap-0.5 py-2.5"
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="font-semibold font-data">
                                                    {pluriel(l.places, 'place')}
                                                </span>
                                                <Badge
                                                    variant={
                                                        l.en_cours
                                                            ? 'juste'
                                                            : 'neutre'
                                                    }
                                                >
                                                    {l.en_cours
                                                        ? 'En cours'
                                                        : 'Terminée ou à venir'}
                                                </Badge>
                                            </span>
                                            <span className="text-aide text-ink-500">
                                                Du {formaterJour(l.debut)} au{' '}
                                                {formaterJour(l.fin)}
                                                {l.reference &&
                                                    ` · ${l.reference}`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Carte>
                    </div>
                </div>
            </div>
        </>
    );
}
