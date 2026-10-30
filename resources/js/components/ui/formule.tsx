import katex from "katex"
import "katex/dist/katex.min.css"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Formule LaTeX rendue par KaTeX, avec MathML pour les lecteurs d'écran.
 * Une formule trop large défile horizontalement dans son cadre (jamais de
 * débordement de la page) ; le cadre devient alors atteignable au clavier.
 * Une erreur de syntaxe s'affiche en rouge à la place de la formule, sans
 * casser l'écran.
 *
 * `libelle` : la formule dite en toutes lettres (« P de A inter B égale
 * 0,12 »). Obligatoire quand la formule est tout le contenu d'un contrôle
 * (option de QCM) : le nom d'un bouton ne se calcule pas à partir du MathML.
 *
 * KaTeX (et ses polices) ne sont chargés que par les pages qui l'utilisent.
 */
function Formule({
  latex,
  bloc = false,
  libelle,
  className,
}: {
  latex: string
  /** Formule centrée sur sa ligne (mode « display »). */
  bloc?: boolean
  libelle?: string
  className?: string
}) {
  const cadre = React.useRef<HTMLElement>(null)
  const [defile, setDefile] = React.useState(false)

  const html = React.useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: bloc,
        output: "htmlAndMathml",
        throwOnError: false,
        errorColor: "var(--destructive)",
        strict: "ignore",
      }),
    [latex, bloc]
  )

  React.useEffect(() => {
    const element = cadre.current

    if (!element || typeof ResizeObserver === "undefined") {
      return
    }

    // Le contenu s'élargit après coup (CSS de KaTeX chargé avec la page,
    // polices) sans que le cadre change de taille : observer les deux.
    const mesurer = () => setDefile(element.scrollWidth > element.clientWidth + 1)
    const observateur = new ResizeObserver(mesurer)
    mesurer()
    observateur.observe(element)

    const contenu = element.querySelector(".katex-html")

    if (contenu) {
      observateur.observe(contenu)
    }

    void document.fonts?.ready.then(mesurer)

    return () => observateur.disconnect()
  }, [html])

  const Element = bloc ? "div" : "span"
  const rendu = libelle ? (
    <span aria-hidden dangerouslySetInnerHTML={{ __html: html }} />
  ) : null

  return (
    <Element
      ref={cadre as React.Ref<HTMLDivElement & HTMLSpanElement>}
      data-slot="formule"
      role={libelle ? "img" : undefined}
      aria-label={libelle}
      tabIndex={defile ? 0 : undefined}
      className={cn(
        "max-w-full overflow-x-auto overflow-y-hidden",
        bloc ? "block py-1" : "inline-block align-middle",
        className
      )}
      {...(rendu ? {} : { dangerouslySetInnerHTML: { __html: html } })}
    >
      {rendu}
    </Element>
  )
}

export { Formule }
