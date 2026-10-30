import {
    Activity,
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
import { index as matieresReferentiel } from '@/routes/contenu/referentiel/matieres';
import { accueil as accueilEleve } from '@/routes/eleve';
import { edit as monCompte } from '@/routes/compte/profil';

/**
 * Navigation des trois espaces connectés (DESIGN.md § 7). Une entrée sans
 * `href` correspond à un écran d'un lot à venir : affichée, désactivée.
 */

/** Espace élève : Accueil · Cours · Annales · Examens blancs · Moi. */
export const NAVIGATION_ELEVE: EntreeNavigation[] = [
    { libelle: 'Accueil', icone: House, href: accueilEleve().url },
    { libelle: 'Cours', icone: BookOpen },
    { libelle: 'Annales', icone: FileText },
    { libelle: 'Examens blancs', icone: Timer },
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
    { libelle: 'Leçons', icone: Library },
    { libelle: 'Questions', icone: FileQuestion },
    { libelle: 'Annales', icone: FileText },
    { libelle: 'Relecture', icone: ClipboardCheck },
    { libelle: 'Signalements', icone: Flag },
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
