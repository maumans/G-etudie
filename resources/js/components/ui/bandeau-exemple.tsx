import { FlaskConical } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Sur tout contenu `est_exemple` (DESIGN.md § 6.7) : on ne doit jamais
 * pouvoir prendre une capture d'écran de démonstration pour un vrai sujet.
 */
function BandeauExemple({ className }: { className?: string }) {
  return (
    <div
      role="note"
      data-slot="bandeau-exemple"
      className={cn(
        "hachures-exemple flex items-center gap-2 rounded-controle border-2 border-soleil-400 bg-card px-3 py-2 text-aide font-semibold tracking-wide text-ink-900 uppercase",
        className
      )}
    >
      <FlaskConical aria-hidden className="size-4 shrink-0" />
      Exemple — contenu fictif
    </div>
  )
}

export { BandeauExemple }
