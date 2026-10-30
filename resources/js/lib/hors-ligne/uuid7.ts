/**
 * Identifiants créés sur l'appareil : UUID v7 (HORS_LIGNE.md A.3.5), jamais
 * v4. Horodatage en millisecondes sur 48 bits, version 7, puis un compteur
 * de 12 bits **monotone** dans une même milliseconde : deux gestes rapides
 * restent ordonnés, et l'ordre des identifiants est l'ordre des gestes.
 * Une horloge qui recule ne casse pas l'ordre : on garde la dernière
 * milliseconde vue. Jumeau serveur : App\Support\Uuid7.
 */

const MOTIF =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function estUuid7(valeur: string): boolean {
    return MOTIF.test(valeur);
}

type Aleatoire = (taille: number) => Uint8Array;

const aleatoireNavigateur: Aleatoire = (taille) =>
    crypto.getRandomValues(new Uint8Array(taille));

export function creerGenerateurUuid7(
    maintenant: () => number = () => Date.now(),
    aleatoire: Aleatoire = aleatoireNavigateur,
): () => string {
    let derniereMs = -1;
    let compteur = 0;

    // Départ du compteur au hasard dans sa moitié basse : il reste de la
    // place pour 2 048 gestes dans la même milliseconde.
    const compteurDeDepart = () => {
        const [fort, faible] = aleatoire(2);

        return ((fort << 8) | faible) & 0x7ff;
    };

    return () => {
        let ms = maintenant();

        if (ms <= derniereMs) {
            ms = derniereMs;
            compteur += 1;

            if (compteur > 0xfff) {
                ms += 1;
                compteur = compteurDeDepart();
            }
        } else {
            compteur = compteurDeDepart();
        }

        derniereMs = ms;

        const octets = new Uint8Array(16);
        let reste = ms;

        for (let rang = 5; rang >= 0; rang -= 1) {
            octets[rang] = reste % 256;
            reste = Math.floor(reste / 256);
        }

        const hasard = aleatoire(8);
        octets[6] = 0x70 | (compteur >> 8);
        octets[7] = compteur & 0xff;
        octets[8] = 0x80 | (hasard[0] & 0x3f);
        octets.set(hasard.subarray(1, 8), 9);

        const hex = Array.from(octets, (octet) =>
            octet.toString(16).padStart(2, '0'),
        ).join('');

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };
}

export const uuid7 = creerGenerateurUuid7();
