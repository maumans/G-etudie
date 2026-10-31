import { FlaskConical } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Sur tout contenu `est_exemple` (DESIGN.md § 6.7) : on ne doit jamais
 * pouvoir prendre une capture d'écran de démonstration pour un vrai sujet.
 * Une ligne de la famille des bandeaux (teinte soleil en opacité), marquée
 * par le cachet « Exemple » en soleil plein — visible sans crier.
 */
function BandeauExemple({ className }: { className?: string }) {
  return (
    <div
      role="note"
      data-slot="bandeau-exemple"
      className={cn(
        "flex items-center gap-2.5 rounded-controle bg-soleil-400/[0.16] py-2 pr-3 pl-2 text-aide text-ink-600 dark:bg-soleil-400/[0.09]",
        className
      )}
    >
      <Badge variant="soleil">
        <FlaskConical aria-hidden />
        Exemple
      </Badge>
      {/* Une seule ligne à 360 px : la fin de la phrase attend 640 px. */}
      <p className="min-w-0">
        Contenu fictif
        <span className="max-sm:hidden">, créé pour la démonstration</span>.
      </p>
    </div>
  )
}

export { BandeauExemple }
