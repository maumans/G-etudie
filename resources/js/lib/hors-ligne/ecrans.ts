/**
 * Liste blanche des écrans gardés hors ligne (HORS_LIGNE.md A.3.1, A.3.7),
 * partagée à chaque page par `hors_ligne_pages` (config/hors_ligne.php).
 *
 * Préfixes comparés **par segment** : « /lecons » couvre « /lecons/12 », pas
 * « /lecons-admin » ; un « $ » final borne le préfixe (« /annales$ » = la
 * liste seulement).
 *
 * ⚠ Copie conforme de `estEcranGarde` dans resources/service-worker/sw.js :
 * tests/js/hors-ligne/ecrans.test.ts vérifie que les deux répondent pareil.
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */
export function estEcranGarde(chemin: string, pages: string[]): boolean {
    const cible = chemin.split(/[?#]/)[0].split('/').filter(Boolean);

    return pages.some((motif) => {
        const borne = motif.endsWith('$');
        const prefixe = (borne ? motif.slice(0, -1) : motif)
            .split('/')
            .filter(Boolean);

        if (
            borne
                ? cible.length !== prefixe.length
                : cible.length < prefixe.length
        ) {
            return false;
        }

        return prefixe.every((segment, rang) => segment === cible[rang]);
    });
}
