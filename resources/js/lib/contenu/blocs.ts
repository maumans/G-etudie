/**
 * Format des blocs d'un contenu (HORS_LIGNE.md A.4) : jumeau de
 * `App\Support\BlocsContenu`. Les deux acceptent et refusent exactement les
 * mêmes documents (`tests/fixtures/blocs.json`). Les messages sont les mêmes.
 *
 * Le format est le JSON de l'éditeur (TipTap / ProseMirror), réduit à une
 * liste fermée de nœuds ; `ContenuBlocs` l'affiche sans charger l'éditeur.
 */

export type Marque = { type: 'bold' | 'italic' };

export type NoeudEnLigne =
    | { type: 'text'; text: string; marks?: Marque[] }
    | { type: 'hardBreak' }
    | { type: 'formule'; attrs: { latex: string } };

export type Paragraphe = { type: 'paragraph'; content?: NoeudEnLigne[] };

export type ElementDeListe = {
    type: 'listItem';
    content: (Paragraphe | Liste)[];
};

export type Liste =
    | { type: 'bulletList'; content: ElementDeListe[] }
    | {
          type: 'orderedList';
          attrs?: { start?: number; type?: null };
          content: ElementDeListe[];
      };

export type GenreEncadre = 'a_retenir' | 'methode' | 'exemple' | 'piege';

export type BlocSimple =
    | Paragraphe
    | { type: 'heading'; attrs: { level: 2 | 3 }; content?: NoeudEnLigne[] }
    | Liste
    | { type: 'formuleBloc'; attrs: { latex: string } };

export type Encadre = {
    type: 'encadre';
    attrs: { genre: GenreEncadre };
    content: BlocSimple[];
};

export type Bloc = BlocSimple | Encadre;

export type DocumentBlocs = { type: 'doc'; content?: Bloc[] };

export const GENRES_ENCADRE: GenreEncadre[] = [
    'a_retenir',
    'methode',
    'exemple',
    'piege',
];

export const LONGUEUR_MAX_LATEX = 1000;
export const POIDS_MAX_OCTETS = 100_000;
export const PROFONDEUR_MAX = 8;

const BLOCS = [
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'formuleBloc',
    'encadre',
];
const EN_LIGNE = ['text', 'hardBreak', 'formule'];
const MARQUES = ['bold', 'italic'];

type Objet = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Objet {
    return (
        typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
    );
}

/** Document vide, celui d'une leçon qu'on vient de créer. */
export function documentVide(): DocumentBlocs {
    return { type: 'doc', content: [] };
}

/** `null` si le document est valide, sinon la première raison du refus. */
export function erreurBlocs(doc: unknown): string | null {
    if (!estObjet(doc) || doc.type !== 'doc') {
        return 'Le contenu doit être un document.';
    }

    if (
        new TextEncoder().encode(JSON.stringify(doc)).length > POIDS_MAX_OCTETS
    ) {
        return 'Le contenu est trop long (100 Ko au plus).';
    }

    if (Object.keys(doc).some((cle) => !['type', 'content'].includes(cle))) {
        return 'Le document porte une propriété inconnue.';
    }

    return enfants(doc.content ?? [], BLOCS, 1, 'Le document');
}

export function estDocumentValide(doc: unknown): doc is DocumentBlocs {
    return erreurBlocs(doc) === null;
}

/** Chiffres d'un document (mêmes règles que `BlocsContenu::resume`). */
export function resumeBlocs(doc: DocumentBlocs): {
    mots: number;
    formules: number;
    encadres: number;
} {
    const resume = { mots: 0, formules: 0, encadres: 0 };

    const parcourir = (noeud: Objet) => {
        if (noeud.type === 'text' && typeof noeud.text === 'string') {
            resume.mots += noeud.text
                .trim()
                .split(/\s+/u)
                .filter(Boolean).length;
        } else if (noeud.type === 'formule' || noeud.type === 'formuleBloc') {
            resume.formules++;
        } else if (noeud.type === 'encadre') {
            resume.encadres++;
        }

        if (Array.isArray(noeud.content)) {
            noeud.content.filter(estObjet).forEach(parcourir);
        }
    };

    parcourir(doc as Objet);

    return resume;
}

function enfants(
    contenu: unknown,
    permis: string[],
    profondeur: number,
    parent: string,
): string | null {
    if (!Array.isArray(contenu)) {
        return `${parent} a un contenu mal formé.`;
    }

    if (profondeur > PROFONDEUR_MAX) {
        return 'Le contenu est trop imbriqué.';
    }

    for (const noeud of contenu) {
        if (!estObjet(noeud) || typeof noeud.type !== 'string') {
            return `${parent} contient un élément sans type.`;
        }

        if (!permis.includes(noeud.type)) {
            return `${parent} ne peut pas contenir « ${noeud.type} ».`;
        }

        const erreur = verifierNoeud(noeud, profondeur);

        if (erreur !== null) {
            return erreur;
        }
    }

    return null;
}

function verifierNoeud(noeud: Objet, profondeur: number): string | null {
    switch (noeud.type) {
        case 'paragraph':
            return (
                cles(noeud, ['content']) ??
                enfants(
                    noeud.content ?? [],
                    EN_LIGNE,
                    profondeur + 1,
                    'Un paragraphe',
                )
            );
        case 'heading':
            return (
                cles(noeud, ['attrs', 'content']) ??
                attributs(
                    noeud,
                    { level: (v) => v === 2 || v === 3 },
                    'Un titre est de niveau 2 ou 3.',
                ) ??
                enfants(
                    noeud.content ?? [],
                    EN_LIGNE,
                    profondeur + 1,
                    'Un titre',
                )
            );
        case 'bulletList':
            return (
                cles(noeud, ['content']) ??
                enfantsNonVides(noeud, ['listItem'], profondeur, 'Une liste')
            );
        case 'orderedList':
            return (
                cles(noeud, ['attrs', 'content']) ??
                attributs(
                    noeud,
                    {
                        start: (v) =>
                            Number.isInteger(v) &&
                            (v as number) >= 1 &&
                            (v as number) <= 999,
                        type: (v) => v === null,
                    },
                    'Une liste numérotée commence à 1 ou plus.',
                    true,
                ) ??
                enfantsNonVides(noeud, ['listItem'], profondeur, 'Une liste')
            );
        case 'listItem':
            return (
                cles(noeud, ['content']) ?? elementDeListe(noeud, profondeur)
            );
        case 'formule':
        case 'formuleBloc':
            return cles(noeud, ['attrs']) ?? latex(noeud);
        case 'encadre':
            return (
                cles(noeud, ['attrs', 'content']) ??
                attributs(
                    noeud,
                    {
                        genre: (v) =>
                            GENRES_ENCADRE.includes(v as GenreEncadre),
                    },
                    "Genre d'encadré inconnu.",
                ) ??
                enfantsNonVides(
                    noeud,
                    BLOCS.filter((type) => type !== 'encadre'),
                    profondeur,
                    'Un encadré',
                )
            );
        case 'text':
            return cles(noeud, ['text', 'marks']) ?? texte(noeud);
        case 'hardBreak':
            return cles(noeud, []);
        default:
            return `Élément inconnu « ${String(noeud.type)} ».`;
    }
}

function cles(noeud: Objet, permises: string[]): string | null {
    const inconnues = Object.keys(noeud).filter(
        (cle) => cle !== 'type' && !permises.includes(cle),
    );

    return inconnues.length === 0
        ? null
        : `« ${String(noeud.type)} » porte une propriété inconnue.`;
}

function attributs(
    noeud: Objet,
    regles: Record<string, (valeur: unknown) => boolean>,
    message: string,
    facultatifs = false,
): string | null {
    const attrs = noeud.attrs ?? (facultatifs ? {} : null);

    if (!estObjet(attrs)) {
        return message;
    }

    if (Object.keys(attrs).some((cle) => !(cle in regles))) {
        return message;
    }

    for (const [cle, regle] of Object.entries(regles)) {
        if (!(cle in attrs)) {
            if (facultatifs) {
                continue;
            }

            return message;
        }

        if (!regle(attrs[cle])) {
            return message;
        }
    }

    return null;
}

function elementDeListe(noeud: Objet, profondeur: number): string | null {
    const contenu = noeud.content;

    if (
        !Array.isArray(contenu) ||
        contenu.length === 0 ||
        !estObjet(contenu[0]) ||
        contenu[0].type !== 'paragraph'
    ) {
        return 'Un élément de liste commence par un paragraphe.';
    }

    return enfants(
        contenu,
        ['paragraph', 'bulletList', 'orderedList'],
        profondeur + 1,
        'Un élément de liste',
    );
}

function enfantsNonVides(
    noeud: Objet,
    permis: string[],
    profondeur: number,
    parent: string,
): string | null {
    if (!Array.isArray(noeud.content) || noeud.content.length === 0) {
        return `${parent} ne peut pas être vide.`;
    }

    return enfants(noeud.content, permis, profondeur + 1, parent);
}

function latex(noeud: Objet): string | null {
    const erreur = attributs(
        noeud,
        { latex: (v) => typeof v === 'string' },
        'Une formule a besoin de son code LaTeX.',
    );

    if (erreur !== null) {
        return erreur;
    }

    const code = (noeud.attrs as { latex: string }).latex;

    if (code.trim() === '') {
        return 'Une formule est vide.';
    }

    return [...code].length > LONGUEUR_MAX_LATEX
        ? 'Une formule est trop longue (1 000 caractères au plus).'
        : null;
}

function texte(noeud: Objet): string | null {
    if (typeof noeud.text !== 'string' || noeud.text === '') {
        return 'Un texte est vide.';
    }

    const marques = noeud.marks ?? [];

    if (!Array.isArray(marques)) {
        return 'Mise en forme mal formée.';
    }

    for (const marque of marques) {
        if (
            !estObjet(marque) ||
            Object.keys(marque).some((cle) => cle !== 'type') ||
            !MARQUES.includes(marque.type as string)
        ) {
            return "Seuls le gras et l'italique sont permis.";
        }
    }

    return null;
}
