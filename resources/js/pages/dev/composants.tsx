import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Check,
    Lightbulb,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Checkbox } from '@/components/ui/checkbox';
import { Choix, GroupeChoix } from '@/components/ui/choix';
import type { EtatChoix } from '@/components/ui/choix';
import { CodeInput } from '@/components/ui/code-input';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { DateInput } from '@/components/ui/date-input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { EtatVide } from '@/components/ui/etat-vide';
import {
    Feuille,
    FeuilleContenu,
    FeuilleDeclencheur,
    FeuilleFermer,
} from '@/components/ui/feuille';
import { Formule } from '@/components/ui/formule';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { Textarea } from '@/components/ui/textarea';
import { ZoneDonnee } from '@/components/ui/zone-donnee';
import { useAppearance } from '@/hooks/use-appearance';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterGnf } from '@/lib/utils';

/**
 * Catalogue du design system « Ardoise » (DESIGN.md § 12) : chaque primitive
 * dans tous ses états, dans le thème de la page puis dans le thème opposé.
 * Route réservée au développement (404 en production).
 */
export default function Composants() {
    const { resolvedAppearance } = useAppearance();
    const sombre = resolvedAppearance === 'dark';

    return (
        <>
            <Head title="Catalogue des composants" />
            <div className="min-h-dvh bg-background">
                <header className="border-b bg-card px-4 py-6 sm:px-8">
                    <p className="text-aide font-semibold tracking-wide text-nimba-700 uppercase dark:text-nimba-300">
                        N'karamögö · Ardoise
                    </p>
                    <h1 className="mt-1 text-titre-ecran sm:text-titre-ecran-large">
                        Catalogue des composants
                    </h1>
                    <p className="mt-2 max-w-2xl text-ink-600">
                        Page de développement, absente en production. Chaque
                        composant dans tous ses états, dans le thème de la page
                        puis dans le thème opposé.
                    </p>
                </header>
                <div className="grid grid-cols-1 xl:grid-cols-2">
                    <Panneau titre={sombre ? 'Thème sombre' : 'Thème clair'} />
                    <Panneau
                        titre={sombre ? 'Thème clair' : 'Thème sombre'}
                        className={sombre ? 'clair' : 'dark'}
                    />
                </div>
            </div>
        </>
    );
}

function Panneau({ titre, className }: { titre: string; className?: string }) {
    return (
        <section
            aria-label={titre}
            className={cn(
                'grid grid-cols-1 content-start gap-6 bg-background px-4 py-8 text-foreground sm:px-8',
                className,
            )}
        >
            <h2 className="text-titre-carte">{titre}</h2>
            <Couleurs />
            <Typographie />
            <Boutons />
            <Champs />
            <ChoixQcm />
            <Statuts />
            <Navigation />
            <Retours />
            <Donnees />
        </section>
    );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-4 rounded-carte border bg-card p-4 shadow-carte sm:p-6">
            <h3 className="text-titre-carte font-semibold">{titre}</h3>
            {children}
        </div>
    );
}

function Rangee({
    legende,
    children,
}: {
    legende: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-meta font-semibold tracking-wide text-ink-600 uppercase">
                {legende}
            </p>
            <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
    );
}

const NEUTRES = [
    { nom: 'craie-50', classe: 'bg-craie-50' },
    { nom: 'craie-100', classe: 'bg-craie-100' },
    { nom: 'card', classe: 'bg-card' },
    { nom: 'border', classe: 'bg-border' },
    { nom: 'ink-400', classe: 'bg-ink-400' },
    { nom: 'ink-600', classe: 'bg-ink-600' },
    { nom: 'ink-900', classe: 'bg-ink-900' },
];

const MARQUE = [
    { nom: 'nimba-300', classe: 'bg-nimba-300' },
    { nom: 'nimba-600', classe: 'bg-nimba-600' },
    { nom: 'nimba-700', classe: 'bg-nimba-700' },
    { nom: 'soleil-400', classe: 'bg-soleil-400' },
];

function Pastille({ nom, classe }: { nom: string; classe: string }) {
    return (
        <div className="grid w-20 gap-1.5">
            <div
                aria-hidden
                className={cn('h-12 rounded-controle border', classe)}
            />
            <p className="text-meta text-ink-600 font-data">{nom}</p>
        </div>
    );
}

function Couleurs() {
    return (
        <Bloc titre="Couleurs">
            <Rangee legende="Neutres">
                {NEUTRES.map((couleur) => (
                    <Pastille key={couleur.nom} {...couleur} />
                ))}
            </Rangee>
            <Rangee legende="Marque">
                {MARQUE.map((couleur) => (
                    <Pastille key={couleur.nom} {...couleur} />
                ))}
            </Rangee>
            <Rangee legende="Verdicts — icône + mot + couleur">
                <span className="flex items-center gap-1.5 font-semibold text-juste-600 dark:text-juste-400">
                    <Check aria-hidden className="size-5" strokeWidth={3} />
                    Juste
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-faux-600 dark:text-faux-400">
                    <X aria-hidden className="size-5" strokeWidth={3} />
                    Pas encore
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-indice-600 dark:text-indice-400">
                    <Lightbulb aria-hidden className="size-5" />
                    Indice
                </span>
            </Rangee>
            <Rangee legende="Matières">
                <div className="grid w-full grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
                    {Object.entries(MATIERES).map(([cle, matiere]) => (
                        <div
                            key={cle}
                            className={cn(
                                'flex items-center gap-2.5 rounded-controle border border-l-4 bg-card p-2',
                                matiere.arete,
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                                    matiere.tuile,
                                )}
                            >
                                <matiere.icone className="size-5" />
                            </span>
                            <span
                                className={cn(
                                    'min-w-0 text-aide font-semibold break-words hyphens-auto',
                                    matiere.texte,
                                )}
                            >
                                {matiere.nom}
                            </span>
                        </div>
                    ))}
                </div>
            </Rangee>
        </Bloc>
    );
}

function Typographie() {
    return (
        <Bloc titre="Typographie">
            <div className="grid gap-3">
                <p className="text-meta font-medium tracking-wide text-nimba-700 uppercase dark:text-nimba-300">
                    J-214 avant le BEPC
                </p>
                <p className="text-heros leading-none font-semibold tracking-tight">
                    <span className="font-data">47</span>
                    <span className="text-titre-ecran text-ink-500"> %</span>
                </p>
                <p className="text-vitrine leading-none font-semibold tracking-[-0.035em] max-sm:text-[2.5rem]">
                    Un soir,{' '}
                    <span className="font-accent font-normal tracking-normal text-nimba-600 italic dark:text-nimba-300">
                        quinze minutes.
                    </span>
                </p>
                <p className="text-titre-ecran-large font-semibold tracking-tight">
                    Titre d'écran desktop — Geist 28
                </p>
                <p className="text-titre-ecran font-semibold tracking-tight">
                    Titre d'écran mobile — Geist 22
                </p>
                <p className="text-titre-carte font-semibold tracking-tight">
                    Titre de carte — Geist 16
                </p>
                <p className="text-lecture">
                    Corps de lecture — Geist 17, interligne 1,65. Au marché de
                    Madina, un kilo de riz coûte {formaterGnf(12500)}.
                </p>
                <p>Interface — Geist 14.</p>
                <p className="text-aide text-ink-500">Aide — Geist 13.</p>
                <p className="text-meta text-ink-500">Méta — Geist 12.</p>
                <p className="text-titre-carte font-data">
                    13,5 / 20 · {formaterGnf(100000)} · 01:42:07
                </p>
            </div>
        </Bloc>
    );
}

function Boutons() {
    return (
        <Bloc titre="Boutons">
            <Rangee legende="Intensité">
                <Button>Commencer</Button>
                <Button variant="succes">Terminer l'examen</Button>
                <Button variant="destructive">
                    <Trash2 aria-hidden />
                    Supprimer
                </Button>
            </Rangee>
            <Rangee legende="Contour — neutre, nimba, danger">
                <Button variant="outline">Voir le corrigé</Button>
                <Button variant="outline" ton="nimba">
                    Passer l'examen blanc
                </Button>
                <Button variant="outline" ton="danger">
                    Abandonner
                </Button>
            </Rangee>
            <Rangee legende="Fantôme — neutre, nimba, danger">
                <Button variant="ghost">Plus tard</Button>
                <Button variant="ghost" ton="nimba">
                    <Lightbulb aria-hidden />
                    Un indice
                </Button>
                <Button variant="ghost" ton="danger">
                    Retirer
                </Button>
            </Rangee>
            <Rangee legende="Tailles — élève 48, back-office 40, petite 36, icône">
                <Button>Vérifier</Button>
                <Button taille="compacte">Enregistrer</Button>
                <Button taille="petite" variant="outline">
                    Modifier
                </Button>
                <Button taille="icone" variant="outline" aria-label="Ajouter">
                    <Plus aria-hidden />
                </Button>
                <Button
                    taille="icone-compacte"
                    variant="ghost"
                    aria-label="Supprimer"
                >
                    <Trash2 aria-hidden />
                </Button>
            </Rangee>
            <Rangee legende="États">
                <Button disabled>Désactivé</Button>
                <Button disabled>
                    <Spinner />
                    Envoi…
                </Button>
                <Button className="w-full sm:w-auto">
                    Pleine largeur sur mobile
                    <ArrowRight aria-hidden />
                </Button>
            </Rangee>
        </Bloc>
    );
}

function Champs() {
    const [recherche, setRecherche] = useState('');
    const [montant, setMontant] = useState<number | null>(25000);

    return (
        <Bloc titre="Champs">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Champ libelle="Prénom" aide="Visible par toi seul.">
                    {(attributs) => (
                        <Input {...attributs} defaultValue="Aïssatou" />
                    )}
                </Champ>
                <Champ libelle="Pseudo" erreur="Ce pseudo est déjà pris.">
                    {(attributs) => (
                        <Input {...attributs} defaultValue="mariama" />
                    )}
                </Champ>
                <Champ libelle="Établissement" facultatif>
                    {(attributs) => (
                        <Input {...attributs} placeholder="Lycée de Kountya" />
                    )}
                </Champ>
                <Champ libelle="Classe">
                    {(attributs) => (
                        <Input
                            {...attributs}
                            defaultValue="10e année"
                            disabled
                        />
                    )}
                </Champ>
                <Champ libelle="Back-office (40 px)">
                    {(attributs) => (
                        <Input
                            {...attributs}
                            taille="compacte"
                            defaultValue="Probabilités conditionnelles"
                        />
                    )}
                </Champ>
                <Champ
                    libelle="Numéro de téléphone"
                    aide="Indicatif +224 ajouté pour toi."
                >
                    {(attributs) => (
                        <TelephoneInput {...attributs} valeur="622123456" />
                    )}
                </Champ>
                <Champ libelle="Code reçu par SMS">
                    {(attributs) => <CodeInput {...attributs} longueur={6} />}
                </Champ>
                <Champ
                    libelle="Code du profil"
                    erreur="Code incorrect. Il te reste 2 essais."
                >
                    {(attributs) => <CodeInput {...attributs} longueur={4} />}
                </Champ>
                <Champ libelle="Date de l'examen">
                    {(attributs) => (
                        <DateInput {...attributs} defaultValue="2027-06-14" />
                    )}
                </Champ>
                <Champ
                    libelle="Montant (GNF)"
                    aide={
                        montant === null
                            ? 'Saisis un montant.'
                            : `Soit ${formaterGnf(montant)}.`
                    }
                >
                    {(attributs) => (
                        <NumberInput
                            {...attributs}
                            valeur={25000}
                            onValeur={setMontant}
                        />
                    )}
                </Champ>
                <Champ libelle="Note sur 20">
                    {(attributs) => (
                        <NumberInput {...attributs} valeur={13.5} decimales />
                    )}
                </Champ>
                <div className="grid gap-2">
                    <p className="text-interface font-medium">Recherche</p>
                    <SearchInput
                        libelle="Rechercher une leçon"
                        placeholder="Rechercher une leçon…"
                        onRecherche={setRecherche}
                    />
                    <p className="text-aide text-ink-600">
                        Dernière recherche lancée : « {recherche} »
                    </p>
                </div>
                <Champ libelle="Ta question" className="md:col-span-2">
                    {(attributs) => (
                        <Textarea
                            {...attributs}
                            placeholder="Explique ce que tu ne comprends pas…"
                        />
                    )}
                </Champ>
                <label className="flex min-h-12 items-center gap-3 md:col-span-2">
                    <Checkbox defaultChecked />
                    <span>Me rappeler ma séance à 20 h</span>
                </label>
            </div>
        </Bloc>
    );
}

const OPTIONS = [
    {
        lettre: 'A',
        latex: 'P(A \\cap B) = 0{,}12',
        libelle: 'P de A inter B égale 0,12',
    },
    {
        lettre: 'B',
        latex: 'P(A \\cap B) = 0{,}3',
        libelle: 'P de A inter B égale 0,3',
    },
    {
        lettre: 'C',
        latex: 'P(A \\cup B) = 0{,}7',
        libelle: 'P de A union B égale 0,7',
    },
];

function ChoixQcm() {
    const [choisie, setChoisie] = useState<string | null>('A');
    const apres: { lettre: string; etat: EtatChoix; texte: string }[] = [
        { lettre: 'A', etat: 'juste', texte: 'Choisie et juste' },
        { lettre: 'B', etat: 'faux', texte: 'Choisie, pas encore juste' },
        { lettre: 'C', etat: 'bonne_reponse', texte: 'Juste, pas choisie' },
        { lettre: 'D', etat: 'ecartee', texte: 'Ni choisie ni juste' },
    ];

    return (
        <Bloc titre="Options de QCM">
            <BandeauExemple />
            <p className="text-lecture">
                On donne <Formule latex="P(A) = 0{,}4" /> et{' '}
                <Formule latex="P(B \mid A) = 0{,}3" />. Que vaut{' '}
                <Formule latex="P(A \cap B)" /> ?
            </p>
            <GroupeChoix libelle="Réponses possibles">
                {OPTIONS.map((option) => (
                    <Choix
                        key={option.lettre}
                        lettre={option.lettre}
                        etat={
                            choisie === option.lettre ? 'selectionne' : 'neutre'
                        }
                        onChoisir={() => setChoisie(option.lettre)}
                    >
                        <Formule
                            latex={option.latex}
                            libelle={option.libelle}
                        />
                    </Choix>
                ))}
            </GroupeChoix>
            <Rangee legende="Après « Vérifier »">
                <GroupeChoix libelle="Réponses corrigées" className="w-full">
                    {apres.map((option) => (
                        <Choix
                            key={option.lettre}
                            lettre={option.lettre}
                            etat={option.etat}
                        >
                            {option.texte}
                        </Choix>
                    ))}
                </GroupeChoix>
            </Rangee>
        </Bloc>
    );
}

function Statuts() {
    return (
        <Bloc titre="Statuts">
            <Rangee legende="Badges">
                <Badge>Brouillon</Badge>
                <Badge variant="indice">En relecture</Badge>
                <Badge variant="juste">Publié</Badge>
                <Badge variant="faux">Renvoyé</Badge>
                <Badge variant="nimba">Nouveau</Badge>
                <Badge variant="soleil">7 jours</Badge>
            </Rangee>
        </Bloc>
    );
}

function Navigation() {
    return (
        <Bloc titre="Navigation">
            <Tabs defaultValue="profil">
                <TabsList>
                    <TabsTrigger value="profil">Profil</TabsTrigger>
                    <TabsTrigger value="mot-de-passe">Mot de passe</TabsTrigger>
                    <TabsTrigger value="numero">Numéro</TabsTrigger>
                </TabsList>
                <TabsContent value="profil" className="text-ink-600">
                    Ton prénom et ton pseudo.
                </TabsContent>
                <TabsContent value="mot-de-passe" className="text-ink-600">
                    Change ton mot de passe.
                </TabsContent>
                <TabsContent value="numero" className="text-ink-600">
                    Change ton numéro de téléphone.
                </TabsContent>
            </Tabs>
            <Pagination
                page={3}
                derniere={12}
                lien={(page) => `/dev/composants?page=${page}`}
            />
        </Bloc>
    );
}

function Retours() {
    const confirmer = useConfirmer();
    const [reponse, setReponse] = useState<string>('—');

    return (
        <Bloc titre="Retours">
            <Rangee legende="Notifications">
                <Button
                    variant="outline"
                    onClick={() => toast.success('Réponse enregistrée.')}
                >
                    Notification de succès
                </Button>
                <Button
                    variant="outline"
                    ton="danger"
                    onClick={() =>
                        toast.error('Pas de connexion. Ta réponse est gardée.')
                    }
                >
                    Notification d'erreur
                </Button>
            </Rangee>
            <Rangee legende="Dialogue, confirmation, feuille">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">Ouvrir un dialogue</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Cet écran demande une connexion
                            </DialogTitle>
                            <DialogDescription>
                                Tu restes ici. Reviens quand le réseau est là.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button>Compris</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button
                    variant="outline"
                    ton="danger"
                    onClick={async () => {
                        const accepte = await confirmer({
                            titre: 'Abandonner cette réponse ?',
                            message: 'Elle ne sera pas envoyée.',
                            action: 'Abandonner',
                            ton: 'danger',
                        });
                        setReponse(accepte ? 'abandonnée' : 'gardée');
                    }}
                >
                    Demander confirmation
                </Button>
                <Feuille>
                    <FeuilleDeclencheur asChild>
                        <Button variant="outline" ton="nimba">
                            Voir le corrigé
                        </Button>
                    </FeuilleDeclencheur>
                    <FeuilleContenu
                        titre="Corrigé pas à pas"
                        description="Bac SE · Probabilités · EXEMPLE"
                        pied={
                            <FeuilleFermer asChild>
                                <Button className="w-full">Continuer</Button>
                            </FeuilleFermer>
                        }
                    >
                        <ol className="grid list-decimal gap-3 pl-5 text-lecture">
                            <li>
                                On applique la formule des probabilités
                                composées :{' '}
                                <Formule latex="P(A \cap B) = P(A) \times P(B \mid A)" />
                                .
                            </li>
                            <li>
                                <Formule latex="P(A \cap B) = 0{,}4 \times 0{,}3 = 0{,}12" />
                                .
                            </li>
                        </ol>
                    </FeuilleContenu>
                </Feuille>
            </Rangee>
            <p className="text-aide text-ink-600">
                Réponse à la confirmation : {reponse}
            </p>
        </Bloc>
    );
}

function Donnees() {
    return (
        <Bloc titre="Données, états vides, formules">
            <div className="grid gap-4 md:grid-cols-3">
                <ZoneDonnee etat="chargement" onReessayer={() => {}}>
                    {null}
                </ZoneDonnee>
                <ZoneDonnee etat="echec" onReessayer={() => {}}>
                    {null}
                </ZoneDonnee>
                <ZoneDonnee etat="pret" onReessayer={() => {}}>
                    <p className="text-interface">
                        Données prêtes : 12 séances.
                    </p>
                </ZoneDonnee>
            </div>
            <EtatVide
                illustration={BookOpen}
                titre="Aucun examen blanc pour l'instant"
                message="Passe ton premier : 45 min, Maths BEPC."
                action={<Button>Passer l'examen blanc</Button>}
            />
            <Formule
                bloc
                latex="\int_0^1 x^2 \, dx = \left[ \frac{x^3}{3} \right]_0^1 = \frac{1}{3}"
            />
            <Formule
                bloc
                latex="S_n = u_0 + u_1 + u_2 + u_3 + u_4 + u_5 + u_6 + u_7 + u_8 + u_9 + u_{10} + u_{11} + u_{12} + u_{13} = \sum_{k=0}^{13} u_k"
            />
            <p className="text-aide text-ink-600">
                Formule mal écrite (rendue sans casser l'écran) :{' '}
                <Formule latex="\frac{1}{" />
            </p>
        </Bloc>
    );
}
