/**
 * Un coût du tuteur, gardé en micro-dollars par le serveur
 * (`App\Services\Tuteur\Couts`), écrit en dollars : « 0,0071 $ » pour une
 * explication, « 12,40 $ » pour un mois. Assez de décimales pour qu'un
 * petit montant ne s'affiche jamais « 0,00 $ ».
 */
export function formaterDollars(microDollars: number): string {
    const dollars = microDollars / 1_000_000;
    const decimales =
        dollars === 0 ? 2 : dollars < 0.01 ? 4 : dollars < 1 ? 3 : 2;

    return `${dollars.toLocaleString('fr-FR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    })} $`;
}
