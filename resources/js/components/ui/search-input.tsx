import { Search, X } from "lucide-react"
import * as React from "react"

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
        className="pointer-events-none absolute left-3.5 size-5 text-ink-600"
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
        className="h-12 w-full min-w-0 rounded-controle border border-input bg-card pr-12 pl-11 text-base text-ink-900 shadow-carte outline-none placeholder:text-ink-600 focus-visible:border-nimba-600 focus-visible:ring-[3px] focus-visible:ring-nimba-600/25 dark:focus-visible:border-nimba-300 dark:focus-visible:ring-nimba-300/30 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {valeur !== "" && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={vider}
          className="absolute right-1 flex size-10 items-center justify-center rounded-[10px] text-ink-600 hover:bg-nimba-600/[0.08] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-nimba-500/20"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
