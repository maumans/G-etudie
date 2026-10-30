import { CircleAlert, RotateCw } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * État d'une donnée chargée à part (prop optionnelle Inertia). Jamais
 * `undefined` : il voudrait dire à la fois « pas demandée », « en cours » et
 * « échec », et l'écran tournerait sans fin (CLAUDE.md § 4).
 */
type EtatDonnee = "chargement" | "echec" | "pret"

/**
 * Enveloppe une donnée chargée à part : squelette pendant le chargement,
 * message + « Réessayer » + « Recharger la page » en cas d'échec ; jamais un
 * indicateur qui tourne sans fin.
 */
function ZoneDonnee({
  etat,
  onReessayer,
  squelette,
  messageEchec = "Ces informations n'ont pas pu être chargées.",
  className,
  children,
}: {
  etat: EtatDonnee
  onReessayer: () => void
  squelette?: React.ReactNode
  messageEchec?: string
  className?: string
  children: React.ReactNode
}) {
  if (etat === "chargement") {
    return (
      <div aria-busy="true" className={className}>
        <span className="sr-only" role="status">
          Chargement…
        </span>
        {squelette ?? (
          <div aria-hidden className="grid gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        )}
      </div>
    )
  }

  if (etat === "echec") {
    return (
      <div
        role="alert"
        data-slot="zone-donnee"
        className={cn(
          "flex min-w-0 flex-col items-start gap-4 rounded-carte border border-faux-600/30 bg-faux-600/[0.06] p-4 dark:border-faux-400/30 dark:bg-faux-400/10",
          className
        )}
      >
        <p className="flex items-start gap-2 text-interface font-medium text-ink-900">
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-faux-600 dark:text-faux-400"
          />
          {messageEchec}
        </p>
        {/* Les libellés passent à la ligne dans une colonne étroite plutôt
            que de sortir du cadre. */}
        <div className="flex max-w-full flex-wrap gap-3">
          <Button
            variant="outline"
            ton="nimba"
            onClick={onReessayer}
            className="h-auto min-h-10 max-w-full py-2 whitespace-normal"
          >
            <RotateCw aria-hidden />
            Réessayer
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="h-auto min-h-10 max-w-full py-2 whitespace-normal"
          >
            Recharger la page
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export { ZoneDonnee, type EtatDonnee }
