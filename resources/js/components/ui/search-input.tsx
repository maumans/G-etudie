import { Search, X } from "lucide-react"
import * as React from "react"

import { CHAMP_BASE } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Délai entre la dernière frappe et la recherche. */
export const DELAI_RECHERCHE_MS = 350

/**
 * Champ de recherche (DESIGN.md § 11) :
 * - la frappe met à jour le champ tout de suite ;
 * - `onRecherche` part 350 ms après la dernière frappe, tout de suite sur
 *   Entrée ;
 * - Échap et la croix vident le champ **et relancent la recherche à vide**
 *   (sinon la liste resterait filtrée sur un terme effacé) ;
 * - une valeur identique à la dernière recherche ne relance rien.
 * Sans `onRecherche`, c'est un simple champ contrôlé (`valeur`, `onValeur`).
 *
 * La page qui navigue écrit `{ ...filtres, recherche }` (jamais l'inverse) et
 * passe `preserveScroll` + `replace` (CLAUDE.md § 4).
 */
function SearchInput({
  valeur: valeurInitiale = "",
  onValeur,
  onRecherche,
  libelle = "Rechercher",
  placeholder = "Rechercher…",
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  valeur?: string
  onValeur?: (valeur: string) => void
  onRecherche?: (terme: string) => void
  libelle?: string
}) {
  const [valeur, setValeur] = React.useState(valeurInitiale)
  const derniereRecherche = React.useRef(valeurInitiale)
  const minuteur = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => annulerMinuteur(), [])

  function annulerMinuteur() {
    if (minuteur.current !== null) {
      clearTimeout(minuteur.current)
      minuteur.current = null
    }
  }

  function rechercher(terme: string) {
    annulerMinuteur()

    if (!onRecherche || terme === derniereRecherche.current) {
      return
    }

    derniereRecherche.current = terme
    onRecherche(terme)
  }

  function changer(nouvelle: string) {
    setValeur(nouvelle)
    onValeur?.(nouvelle)

    if (onRecherche) {
      annulerMinuteur()
      minuteur.current = setTimeout(() => rechercher(nouvelle), DELAI_RECHERCHE_MS)
    }
  }

  function vider() {
    setValeur("")
    onValeur?.("")
    rechercher("")
  }

  return (
    <div
      data-slot="search-input"
      className={cn("relative flex w-full items-center", className)}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 size-4 text-ink-500"
      />
      <input
        type="search"
        aria-label={libelle}
        placeholder={placeholder}
        value={valeur}
        onChange={(evenement) => changer(evenement.target.value)}
        onKeyDown={(evenement) => {
          if (evenement.key === "Enter") {
            evenement.preventDefault()
            rechercher(valeur)
          }

          if (evenement.key === "Escape" && valeur !== "") {
            evenement.preventDefault()
            vider()
          }
        }}
        className={cn(CHAMP_BASE, "h-11 w-full min-w-0 pr-11 pl-9.5 text-base sm:h-10 sm:text-interface [&::-webkit-search-cancel-button]:hidden")}
        {...props}
      />
      {valeur !== "" && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={vider}
          className="absolute right-1 flex size-9 items-center justify-center rounded-[8px] text-ink-500 hover:bg-craie-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring sm:size-8"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
