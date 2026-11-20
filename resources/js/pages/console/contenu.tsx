import { Head, Link } from '@inertiajs/react';
import { BookOpen, FileQuestion, FileText, Flag } from 'lucide-react';
import {
    ChiffreCle,
    EnteteCarte,
    Repartition,
} from '@/components/console/graphiques';
import { TuileMatiere } from '@/components/contenu/tuile-matiere';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { EtatVide } from '@/components/ui/etat-vide';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { accueil as accueilContenu } from '@/routes/contenu';
import { index as signalements } from '@/routes/contenu/signalements';
import type { ContenuPlateforme } from '@/types/console';

const icone = 'size-4 text-nimba-600 dark:text-nimba-300';

/**
 * Console › Contenu (lot 13, PLAN M18) : ce qui est publié, ce qui attend
 * la relecture, les signalements des élèves (et le délai pour les traiter,
 * PLAN § 15), la couverture du programme des matières phares — la même que
 * celle du back-office (CouvertureProgramme).
 */
export default function ContenuPage({
    contenu,
}: {
    contenu: ContenuPlateforme;
}) {
    const { signalements: s } = contenu;

    return (
        <>
            <Head title="Contenu" />
            <div className="grid grid-cols-1 gap-6">
                <header className="grid gap-1.5">
                    <p className="text-aide font-medium text-ink-500">
                        Catalogue, relecture, signalements
                    </p>
                    <h1 className="text-titre-ecran titre-contraste">
                        Le <strong>contenu</strong>, ce qui manque et ce qui
                        attend
                    </h1>
                </header>

                {contenu.est_exemple && <BandeauExemple />}

                <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <ChiffreCle
                        icone={<BookOpen aria-hidden className={icone} />}
                        libelle="Leçons publiées"
                        valeur={formaterNombre(contenu.publies.lecons)}
                        note={`${formaterNombre(contenu.en_relecture.lecons)} en relecture`}
                    />
                    <ChiffreCle
                        icone={<FileQuestion aria-hidden className={icone} />}
                        libelle="Questions publiées"
                        valeur={formaterNombre(contenu.publies.questions)}
                        note={`${formaterNombre(contenu.en_relecture.questions)} en relecture`}
                    />
                    <ChiffreCle
                        icone={<FileText aria-hidden className={icone} />}
                        libelle="Annales publiées"
                        valeur={formaterNombre(contenu.publies.annales)}
                        note={`${formaterNombre(contenu.en_relecture.annales)} en relecture · ${formaterNombre(contenu.imports_en_cours)} import(s) en cours`}
                    />
                    <ChiffreCle
                        icone={<Flag aria-hidden className={icone} />}
                        libelle="Signalements ouverts"
                        valeur={formaterNombre(s.ouverts)}
                        note={
                            s.delai_median_heures === null
                                ? 'Aucun traité sur 90 jours'
                                : `Traités en ${formaterNombre(s.delai_median_heures)} h (médiane, 90 jours)`
                        }
                    />
                </dl>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                    <section
                        aria-labelledby="titre-couverture"
                        className="grid min-w-0 gap-4 rounded-carte border bg-card p-5 shadow-carte"
                    >
                        <EnteteCarte
                            id="titre-couverture"
                            titre="Couverture du programme, matières phares"
                            lien={accueilContenu().url}
                            libelleLien="Back-office"
                        />
                        {contenu.couverture.length === 0 ? (
                            <EtatVide
                                titre="Aucune matière phare pour l’année"
                                message="Le responsable pédagogique choisit les matières phares dans Référentiel › Épreuves."
                                action={
                                    <Button
                                        asChild
                                        variant="outline"
                                        taille="compacte"
                                    >
                                        <Link href={accueilContenu().url}>
                                            Ouvrir le back-office
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <ul className="grid">
                                {contenu.couverture.map((l) => {
                                    const part =
                                        l.notions === 0
                                            ? 0
                                            : Math.round(
                                                  (100 * l.couvertes) /
                                                      l.notions,
                                              );

                                    return (
                                        <li
                                            key={`${l.matiere.nom}-${l.classe}`}
                                            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b py-3 last:border-b-0"
                                        >
                                            <TuileMatiere
                                                teinte={l.matiere.teinte}
                                                taille="grande"
                                            />
                                            <div className="grid min-w-0 gap-1.5">
                                                <p className="truncate text-interface font-semibold">
                                                    {l.matiere.nom}{' '}
                                                    <span className="font-normal text-ink-500">
                                                        · {l.classe}
                                                    </span>
                                                </p>
                                                <span
                                                    aria-hidden
                                                    className="h-1.5 overflow-hidden rounded-full bg-ink-400/15"
                                                >
                                                    <span
                                                        className={cn(
                                                            'block h-full rounded-full',
                                                            MATIERES[
                                                                l.matiere.teinte
                                                            ].plein,
                                                        )}
                                                        style={{
                                                            width: `${part}%`,
                                                        }}
                                                    />
                                                </span>
                                                <p className="text-meta text-ink-500">
                                                    {l.examens.join(', ')} ·{' '}
                                                    {formaterNombre(
                                                        l.couvertes,
                                                    )}{' '}
                                                    sur{' '}
                                                    {pluriel(
                                                        l.notions,
                                                        'notion',
                                                    )}{' '}
                                                    avec leur leçon ·{' '}
                                                    {pluriel(
                                                        l.chapitres,
                                                        'chapitre',
                                                    )}
                                                </p>
                                            </div>
                                            <span className="text-[1.125rem] font-bold font-data">
                                                {part} %
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <aside className="grid gap-6">
                        <section
                            aria-labelledby="titre-lecons"
                            className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-lecons"
                                className="text-[0.9375rem] font-semibold"
                            >
                                Leçons, par statut
                            </h2>
                            <Repartition
                                libelle="Leçons par statut"
                                parts={[
                                    {
                                        cle: 'publie',
                                        libelle: 'Publiées',
                                        valeur: contenu.lecons.publie,
                                        classe: 'bg-juste-600 dark:bg-juste-400',
                                    },
                                    {
                                        cle: 'en_relecture',
                                        libelle: 'En relecture',
                                        valeur: contenu.lecons.en_relecture,
                                        classe: 'bg-nimba-500 dark:bg-nimba-400',
                                    },
                                    {
                                        cle: 'brouillon',
                                        libelle: 'Brouillons',
                                        valeur: contenu.lecons.brouillon,
                                        classe: 'bg-ink-400/50',
                                    },
                                    {
                                        cle: 'archive',
                                        libelle: 'Archivées',
                                        valeur: contenu.lecons.archive,
                                        classe: 'bg-ink-400/25',
                                    },
                                ]}
                            />
                        </section>
                        <section
                            aria-labelledby="titre-signalements"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <EnteteCarte
                                id="titre-signalements"
                                titre="Signalements des élèves"
                                lien={signalements().url}
                                libelleLien="Traiter"
                            />
                            <dl className="grid text-interface">
                                {[
                                    ['Ouverts', s.ouverts],
                                    [
                                        'Ouverts depuis plus de 7 jours',
                                        s.ouverts_depuis_7_jours,
                                    ],
                                    [
                                        'Traités sur 90 jours',
                                        s.traites_90_jours,
                                    ],
                                ].map(([libelle, n]) => (
                                    <div
                                        key={libelle}
                                        className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
                                    >
                                        <dt className="text-ink-600">
                                            {libelle}
                                        </dt>
                                        <dd className="font-semibold font-data">
                                            {formaterNombre(n as number)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}
