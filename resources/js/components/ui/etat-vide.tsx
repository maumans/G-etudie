import { Inbox, type LucideIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * État vide (DESIGN.md § 8) : illustration + phrase + **une action**. Un écran
 * vide sans rien à faire est une impasse ; l'action est donc obligatoire.
 *
 * L'illustration est une icône dans un disque en attendant les SVG originaux
 * commandés à un illustrateur.
 */
function EtatVide({
  illustration: Illustration = Inbox,
  titre,
  message,
  action,
  className,
}: {
  illustration?: LucideIcon
  titre: string
  message?: React.ReactNode
  action: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="etat-vide"
      className={cn(
        "flex flex-col items-center gap-4 rounded-carte border border-dashed border-ink-400/60 px-6 py-10 text-center",
        className
      )}
    >
      <div
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-nimba-600/[0.10] text-nimba-700 dark:bg-nimba-500/20 dark:text-nimba-300"
      >
        <Illustration className="size-8" strokeWidth={1.75} />
      </div>
      <div className="grid max-w-sm gap-1.5">
        <p className="font-titre text-titre-carte font-semibold text-ink-900">{titre}</p>
        {message && <p className="text-interface text-ink-600">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export { EtatVide }
