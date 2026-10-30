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
        "hachures-exemple flex items-center gap-2 rounded-controle border border-soleil-500 bg-card px-3 py-1.5 text-meta font-semibold tracking-wider text-ink-900 uppercase",
        className
      )}
    >
      <FlaskConical aria-hidden className="size-3.5 shrink-0" />
      Exemple — contenu fictif
    </div>
  )
}

export { BandeauExemple }
