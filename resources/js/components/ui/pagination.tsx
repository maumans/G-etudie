import { Link } from "@inertiajs/react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Pages affichées : la première, la dernière, la courante et ses voisines. */
export function pagesAffichees(page: number, derniere: number): (number | "…")[] {
  const pages = new Set([1, derniere, page - 1, page, page + 1])
  const triees = [...pages].filter((n) => n >= 1 && n <= derniere).sort((a, b) => a - b)
  const resultat: (number | "…")[] = []

  triees.forEach((n, i) => {
    if (i > 0 && n - triees[i - 1] > 1) {
      resultat.push("…")
    }

    resultat.push(n)
  })

  return resultat
}

/**
 * Pagination en français, construite en composant (jamais à partir des
 * libellés HTML du paginateur Laravel). Les liens gardent la position de
 * défilement et ne créent pas d'entrée d'historique par page.
 */
function Pagination({
  page,
  derniere,
  lien,
  className,
}: {
  page: number
  derniere: number
  /** Adresse d'une page (avec les filtres en cours). */
  lien: (page: number) => string
  className?: string
}) {
  if (derniere <= 1) {
    return null
  }

  const classeFleche = cn(
    buttonVariants({ variant: "outline", taille: "compacte" }),
    "w-12 gap-1 px-0 sm:w-auto sm:px-3"
  )

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between gap-2", className)}>
      {page > 1 ? (
        <Link href={lien(page - 1)} preserveScroll prefetch rel="prev" className={classeFleche}>
          <ChevronLeft aria-hidden />
          <span className="sr-only sm:not-sr-only">Précédent</span>
        </Link>
      ) : (
        <span aria-hidden className={cn(classeFleche, "invisible")}>
          <ChevronLeft />
          <span className="sr-only sm:not-sr-only">Précédent</span>
        </span>
      )}

      <p className="text-aide text-ink-600 sm:hidden">
        Page <span className="font-data">{page}</span> sur{" "}
        <span className="font-data">{derniere}</span>
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {pagesAffichees(page, derniere).map((n, i) =>
          n === "…" ? (
            <li key={`ellipse-${i}`} aria-hidden className="px-2 text-ink-600">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={lien(n)}
                preserveScroll
                prefetch
                aria-current={n === page ? "page" : undefined}
                aria-label={`Page ${n}`}
                className={cn(
                  buttonVariants({
                    variant: n === page ? "default" : "ghost",
                    taille: "icone-compacte",
                  }),
                  "font-data"
                )}
              >
                {n}
              </Link>
            </li>
          )
        )}
      </ul>

      {page < derniere ? (
        <Link href={lien(page + 1)} preserveScroll prefetch rel="next" className={classeFleche}>
          <span className="sr-only sm:not-sr-only">Suivant</span>
          <ChevronRight aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(classeFleche, "invisible")}>
          <span className="sr-only sm:not-sr-only">Suivant</span>
          <ChevronRight />
        </span>
      )}
    </nav>
  )
}

export { Pagination }
