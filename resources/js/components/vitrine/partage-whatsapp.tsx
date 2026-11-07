import { Check, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { lienWhatsapp } from '@/lib/vitrine';

/**
 * Partager une page publique (lot 8) : WhatsApp d'abord, le canal de
 * diffusion principal (PLAN M1) ; la carte affichée sous le lien vient des
 * balises Open Graph du serveur. Le menu de partage du téléphone quand il
 * existe, sinon « Copier le lien ».
 */
export function PartageWhatsapp({
    texte,
    url,
    className,
}: {
    texte: string;
    url: string;
    className?: string;
}) {
    const [menuNatif, setMenuNatif] = useState(false);
    const [copie, setCopie] = useState(false);

    useEffect(() => {
        setMenuNatif(typeof navigator.share === 'function');
    }, []);

    async function partagerAutrement() {
        if (menuNatif) {
            await navigator.share({ text: texte, url }).catch(() => undefined);

            return;
        }

        await navigator.clipboard?.writeText(url).catch(() => undefined);
        setCopie(true);
        window.setTimeout(() => setCopie(false), 2500);
    }

    return (
        <section
            aria-labelledby="titre-partage"
            className={cn(
                'grid gap-3 rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            <h2 id="titre-partage" className="text-[0.9375rem] font-semibold">
                Réviser à plusieurs
            </h2>
            <p className="text-aide text-ink-600">
                Envoyez ce sujet à votre groupe de classe.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button asChild variant="doux">
                    <a
                        href={lienWhatsapp(texte, url)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <IconeWhatsapp />
                        Partager sur WhatsApp
                    </a>
                </Button>
                <Button
                    variant="outline"
                    onClick={() => void partagerAutrement()}
                >
                    {copie ? (
                        <Check aria-hidden />
                    ) : menuNatif ? (
                        <Share2 aria-hidden />
                    ) : (
                        <Link2 aria-hidden />
                    )}
                    {copie
                        ? 'Lien copié'
                        : menuNatif
                          ? 'Autre application'
                          : 'Copier le lien'}
                </Button>
            </div>
        </section>
    );
}

/** La bulle de WhatsApp, dessinée au trait (pas de logo de marque en couleur). */
function IconeWhatsapp() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3.5 20.5 4.8 16.7A8.5 8.5 0 1 1 8 19.6Z" />
            <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z" />
        </svg>
    );
}
