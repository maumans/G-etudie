import { Inbox, type LucideIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * État vide (DESIGN.md § 8) : illustration + phrase + **une action**. Un écran
 * vide sans rien à faire est une impasse ; l'action est donc obligatoire.
 *
 * L'illustration est une icône dans une tuile en attendant les SVG originaux
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
        "flex flex-col items-center gap-5 rounded-carte border bg-card px-6 py-12 text-center shadow-carte",
        className
      )}
    >
      <div
        aria-hidden
        className="relative flex size-12 items-center justify-center rounded-[14px] bg-nimba-600/[0.10] text-nimba-700 ring-1 ring-nimba-600/15 ring-inset dark:bg-nimba-300/10 dark:text-nimba-300 dark:ring-nimba-300/20"
      >
        <Illustration className="size-6" strokeWidth={1.75} />
      </div>
      <div className="grid max-w-sm gap-1">
        <p className="text-titre-carte font-semibold text-ink-900">
          {titre}
        </p>
        {message && <p className="text-interface text-ink-600">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export { EtatVide }
