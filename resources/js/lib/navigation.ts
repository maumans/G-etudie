import {
    Activity,
    Building2,
    ClipboardList,
    HeartHandshake,
    Presentation,
    UsersRound,
    ChartPie,
    BookOpen,
    ChartNoAxesCombined,
    CircleUser,
    Download,
    ClipboardCheck,
    FileQuestion,
    FileText,
    Flag,
    House,
    LayoutDashboard,
    Lightbulb,
    Link2,
    ShieldCheck,
    Library,
    ListTree,
    ScrollText,
    Sparkles,
    ReceiptText,
    Ticket,
    Timer,
    Wallet,
    WalletCards,
} from 'lucide-react';
import type { EntreeNavigation } from '@/components/lien-navigation';
import {
    accueil as accueilConsole,
    activite as activiteConsole,
    contenu as contenuConsole,
    revenus as revenusConsole,
} from '@/routes/console';
import { index as impactConsole } from '@/routes/console/impact';
import { index as journalConsole } from '@/routes/console/journal';
import { index as personnelConsole } from '@/routes/console/personnel';
import { index as codesConsole } from '@/routes/console/codes';
import { index as paiementsConsole } from '@/routes/console/paiements';
import { index as tuteurConsole } from '@/routes/console/tuteur';
import { index as etablissementsConsole } from '@/routes/console/etablissements';
import { index as groupesEleve } from '@/routes/eleve/groupes';
import { accueil as accueilEnseignant } from '@/routes/enseignant';
import {
    accueil as accueilEtablissement,
    licences as licencesEtablissement,
} from '@/routes/etablissement';
import { accueil as accueilParent } from '@/routes/parent';
import { index as journalTuteur } from '@/routes/contenu/tuteur';
import { accueil as accueilContenu } from '@/routes/contenu';
import { index as indexLecons, relecture } from '@/routes/contenu/lecons';
import { index as indexQuestions } from '@/routes/contenu/questions';
import { index as matieresReferentiel } from '@/routes/contenu/referentiel/matieres';
import {
    abonnement as abonnementEleve,
    accueil as accueilEleve,
    cours as coursEleve,
    culture as cultureEleve,
    progression as progressionEleve,
    telechargements as telechargementsEleve,
    tuteur as tuteurEleve,
} from '@/routes/eleve';
import { index as annalesEleve } from '@/routes/eleve/annales';
import { index as examensBlancs } from '@/routes/eleve/examens-blancs';
import { index as indexAnnales } from '@/routes/contenu/annales';
import { index as indexSignalements } from '@/routes/contenu/signalements';
import { index as indexRessources } from '@/routes/contenu/ressources';
import { index as indexModeration } from '@/routes/contenu/moderation';
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
        // Lot 10 : sur mobile, depuis la carte du tuteur de l'accueil et les
        // boutons « Explique-moi ».
        libelle: 'Mon tuteur',
        icone: Sparkles,
        href: tuteurEleve().url,
        actifSous: '/eleve/tuteur',
        lateralSeulement: true,
        permission: 'tuteur.utiliser',
    },
    {
        // Lot 12 : sur mobile, depuis la carte « La question du jour » de l'accueil.
        libelle: 'Culture générale',
        icone: Lightbulb,
        href: cultureEleve().url,
        actifSous: '/eleve/culture',
        lateralSeulement: true,
    },
    {
        // Lot 11 : sur mobile, depuis la carte « Mes devoirs » de l'accueil.
        libelle: 'Mes groupes',
        icone: UsersRound,
        href: groupesEleve().url,
        actifSous: '/eleve/groupes',
        lateralSeulement: true,
        permission: 'groupes.rejoindre',
    },
    {
        // Lot 7 (HL5) : sur mobile, depuis « Qui révise ? » (pastille du haut).
        libelle: 'Téléchargements',
        icone: Download,
        href: telechargementsEleve().url,
        actifSous: '/eleve/telechargements',
        lateralSeulement: true,
    },
    {
        // Lot 9 : sur mobile, depuis « Qui révise ? » et les étiquettes
        // « Avec l'abonnement ».
        libelle: 'Abonnement',
        icone: WalletCards,
        href: abonnementEleve().url,
        actifSous: '/eleve/abonnement',
        actifAussiSous: ['/eleve/paiements'],
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
        // Lot 12 (PLAN M19) : liens sortants par notion.
        libelle: 'Ressources',
        icone: Link2,
        href: indexRessources().url,
        actifSous: '/contenu/ressources',
    },
    {
        libelle: 'Signalements',
        icone: Flag,
        href: indexSignalements().url,
        actifSous: '/contenu/signalements',
        permission: 'signalements.traiter',
    },
    {
        libelle: 'Tuteur',
        icone: Sparkles,
        href: journalTuteur().url,
        actifSous: '/contenu/tuteur',
        permission: 'tuteur.journal',
    },
    {
        // Lot 12 (PLAN M13) : mots refusés dans les fils des groupes.
        libelle: 'Modération',
        icone: ShieldCheck,
        href: indexModeration().url,
        actifSous: '/contenu/moderation',
        permission: 'contenu.administrer',
    },
];

/** Lot 11 : espace parent. */
export const NAVIGATION_PARENT: EntreeNavigation[] = [
    {
        libelle: 'Mes enfants',
        icone: HeartHandshake,
        href: accueilParent().url,
        actifAussiSous: ['/parent/enfants', '/parent/paiements'],
    },
    {
        libelle: 'Mon compte',
        icone: CircleUser,
        href: monCompte().url,
        actifSous: '/compte',
    },
];

/** Lot 11 : espace enseignant. */
export const NAVIGATION_ENSEIGNANT: EntreeNavigation[] = [
    {
        libelle: 'Mes groupes',
        icone: Presentation,
        href: accueilEnseignant().url,
        actifAussiSous: ['/enseignant/groupes', '/enseignant/devoirs'],
    },
];

/** Lot 11 : espace établissement (gestionnaire). */
export const NAVIGATION_ETABLISSEMENT: EntreeNavigation[] = [
    {
        libelle: 'Rapport de préparation',
        icone: Building2,
        href: accueilEtablissement().url,
        actifAussiSous: ['/etablissement/groupes'],
    },
    {
        libelle: 'Licences',
        icone: ClipboardList,
        href: licencesEtablissement().url,
        actifSous: '/etablissement/licences',
    },
];

/** Compte sans espace. */
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
    {
        libelle: 'Codes prépayés',
        icone: Ticket,
        href: codesConsole().url,
        actifSous: '/console/codes',
        permission: 'codes.gerer',
    },
    {
        libelle: 'Établissements',
        icone: Building2,
        href: etablissementsConsole().url,
        actifSous: '/console/etablissements',
        permission: 'etablissements.administrer',
    },
    {
        libelle: 'Paiements',
        icone: ReceiptText,
        href: paiementsConsole().url,
        actifSous: '/console/paiements',
        permission: 'paiements.voir',
    },
    {
        libelle: 'Tuteur',
        icone: Sparkles,
        href: tuteurConsole().url,
        actifSous: '/console/tuteur',
        permission: 'tuteur.couts',
    },
    // Lot 13 (PLAN M18).
    {
        libelle: 'Activité',
        icone: Activity,
        href: activiteConsole().url,
        actifSous: '/console/activite',
    },
    {
        libelle: 'Contenu',
        icone: Library,
        href: contenuConsole().url,
        actifSous: '/console/contenu',
    },
    {
        libelle: 'Revenus',
        icone: Wallet,
        href: revenusConsole().url,
        actifSous: '/console/revenus',
        permission: 'paiements.voir',
    },
    {
        libelle: 'Impact',
        icone: ChartNoAxesCombined,
        href: impactConsole().url,
        actifSous: '/console/impact',
        permission: 'console.impact',
    },
    {
        libelle: 'Journal des accès',
        icone: ScrollText,
        href: journalConsole().url,
        actifSous: '/console/journal',
        permission: 'console.journal',
    },
    {
        libelle: 'Personnel',
        icone: UsersRound,
        href: personnelConsole().url,
        actifSous: '/console/personnel',
        permission: 'comptes.administrer',
    },
];
