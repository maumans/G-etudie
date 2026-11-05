import {
    Activity,
    ChartPie,
    BookOpen,
    ChartNoAxesCombined,
    CircleUser,
    ClipboardCheck,
    FileQuestion,
    FileText,
    Flag,
    House,
    LayoutDashboard,
    Library,
    ListTree,
    ScrollText,
    Timer,
    Wallet,
} from 'lucide-react';
import type { EntreeNavigation } from '@/components/lien-navigation';
import { accueil as accueilConsole } from '@/routes/console';
import { accueil as accueilContenu } from '@/routes/contenu';
import { index as indexLecons, relecture } from '@/routes/contenu/lecons';
import { index as indexQuestions } from '@/routes/contenu/questions';
import { index as matieresReferentiel } from '@/routes/contenu/referentiel/matieres';
import {
    accueil as accueilEleve,
    cours as coursEleve,
    progression as progressionEleve,
} from '@/routes/eleve';
import { index as annalesEleve } from '@/routes/eleve/annales';
import { index as examensBlancs } from '@/routes/eleve/examens-blancs';
import { index as indexAnnales } from '@/routes/contenu/annales';
import { index as indexSignalements } from '@/routes/contenu/signalements';
import { edit as monCompte } from '@/routes/compte/profil';

/**
 * Navigation des trois espaces connectés (DESIGN.md § 7). Une entrée sans
 * `href` correspond à un écran d'un lot à venir : affichée, désactivée.
 */

/** Espace élève : Accueil · Cours · Annales · Examens blancs · Moi. */
export const NAVIGATION_ELEVE: EntreeNavigation[] = [
    { libelle: 'Accueil', icone: House, href: accueilEleve().url },
    {
        libelle: 'Cours',
        icone: BookOpen,
        href: coursEleve().url,
        actifSous: '/eleve/cours',
        // Une leçon et une fiche appartiennent aux cours.
        actifAussiSous: ['/eleve/lecons', '/eleve/chapitres'],
    },
    {
        libelle: 'Annales',
        icone: FileText,
        href: annalesEleve().url,
        actifSous: '/eleve/annales',
    },
    {
        libelle: 'Examens blancs',
        icone: Timer,
        href: examensBlancs().url,
        actifSous: '/eleve/examens-blancs',
    },
    {
        libelle: 'Ma progression',
        icone: ChartPie,
        href: progressionEleve().url,
        actifSous: '/eleve/progression',
        lateralSeulement: true,
    },
    {
        libelle: 'Moi',
        icone: CircleUser,
        href: monCompte().url,
        actifSous: '/compte',
    },
];

/** Back-office contenu : rédacteurs, relecteurs, admin contenu. */
export const NAVIGATION_CONTENU: EntreeNavigation[] = [
    {
        libelle: 'Tableau de bord',
        icone: LayoutDashboard,
        href: accueilContenu().url,
    },
    {
        libelle: 'Référentiel',
        icone: ListTree,
        href: matieresReferentiel().url,
        actifSous: '/contenu/referentiel',
        permission: 'referentiel.gerer',
    },
    {
        libelle: 'Leçons',
        icone: Library,
        href: indexLecons().url,
        actifSous: '/contenu/lecons',
    },
    {
        libelle: 'Questions',
        icone: FileQuestion,
        href: indexQuestions().url,
        actifSous: '/contenu/questions',
    },
    {
        libelle: 'Annales',
        icone: FileText,
        href: indexAnnales().url,
        actifSous: '/contenu/annales',
    },
    {
        libelle: 'Relecture',
        icone: ClipboardCheck,
        href: relecture().url,
        permission: 'contenu.relire',
    },
    {
        libelle: 'Signalements',
        icone: Flag,
        href: indexSignalements().url,
        actifSous: '/contenu/signalements',
        permission: 'signalements.traiter',
    },
];

/** Compte sans espace (parent, enseignant, gestionnaire avant le lot 11). */
export const NAVIGATION_COMPTE: EntreeNavigation[] = [
    {
        libelle: 'Mon compte',
        icone: CircleUser,
        href: monCompte().url,
        actifSous: '/compte',
    },
];

/** Console plateforme : superadmin. */
export const NAVIGATION_CONSOLE: EntreeNavigation[] = [
    {
        libelle: "Vue d'ensemble",
        icone: LayoutDashboard,
        href: accueilConsole().url,
    },
    { libelle: 'Activité', icone: Activity },
    { libelle: 'Contenu', icone: Library },
    { libelle: 'Revenus', icone: Wallet },
    { libelle: 'Impact', icone: ChartNoAxesCombined },
    { libelle: 'Journal des accès', icone: ScrollText },
];
