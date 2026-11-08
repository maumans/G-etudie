import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { Marque } from '@/components/marque';
import { Button } from '@/components/ui/button';

type Props = {
    lot: {
        libelle: string;
        formule: { nom: string; duree: string };
        revendeur: string | null;
    };
    codes: string[];
    prix: string;
};

/**
 * La planche de cartes d'un lot de codes prépayés (lot 9), à imprimer sur
 * A4 (dix cartes par page). Toujours en clair : c'est du papier (`clair`).
 */
export default function ImpressionCodes({ lot, codes, prix }: Props) {
    return (
        <>
            <Head title={`Cartes · ${lot.libelle}`} />
            <main className="clair min-h-dvh bg-white p-6 text-ink-900 print:p-0">
                <div className="mx-auto mb-6 flex max-w-[190mm] flex-wrap items-center justify-between gap-3 print:hidden">
                    <p className="text-interface text-ink-600">
                        {codes.length} cartes · {lot.libelle}
                    </p>
                    <Button onClick={() => window.print()}>
                        <Printer aria-hidden />
                        Imprimer
                    </Button>
                </div>
                <ul className="mx-auto grid max-w-[190mm] grid-cols-2 gap-[4mm]">
                    {codes.map((code) => (
                        <li
                            key={code}
                            className="grid h-[52mm] break-inside-avoid content-between rounded-[10px] border border-dashed border-ink-400 p-[5mm]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <Marque />
                                <span className="text-right text-meta text-ink-600">
                                    {lot.formule.nom}
                                    <br />
                                    {lot.formule.duree} · {prix}
                                </span>
                            </div>
                            <p className="text-center text-[1.375rem] font-bold tracking-[0.14em] font-data">
                                {code}
                            </p>
                            <p className="text-meta text-ink-600">
                                Ouvre N’karamögö › Mon abonnement › « J’ai un
                                code ». Un code ne sert qu’une fois.
                            </p>
                        </li>
                    ))}
                </ul>
            </main>
        </>
    );
}
