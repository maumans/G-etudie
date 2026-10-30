import { ChevronDown } from "lucide-react"
import * as React from "react"

import { CHAMP_BASE } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Liste déroulante native, habillée comme un champ (`CHAMP_BASE`) : le
 * sélecteur du téléphone s'ouvre, accessible et sans bibliothèque. Libellé
 * et erreur : composant `Champ`.
 */
function ListeDeroulante({
  className,
  taille = "normale",
  children,
  ...props
}: React.ComponentProps<"select"> & { taille?: "normale" | "compacte" }) {
  return (
    <div className="relative">
      <select
        data-slot="liste-deroulante"
        className={cn(
          CHAMP_BASE,
          "w-full min-w-0 appearance-none pr-9 pl-3",
          taille === "compacte"
            ? "h-9 text-interface"
            : "h-11 text-base sm:h-10 sm:text-interface",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500"
      />
    </div>
  )
}

export { ListeDeroulante }
