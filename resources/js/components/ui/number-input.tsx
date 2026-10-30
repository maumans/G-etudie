import * as React from "react"

import { Input } from "@/components/ui/input"
import { ESPACE_INSECABLE, formaterNombre, lireNombre } from "@/lib/utils"

/** Regroupe les milliers de la partie entière saisie, garde le reste tel quel. */
function mettreEnForme(saisie: string, decimales: boolean): string {
  const propre = saisie.replace(/[^\d,.-]/g, "").replace(".", ",")
  const [entier, ...reste] = propre.split(",")
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE)

  return decimales && reste.length > 0 ? `${groupes},${reste.join("")}` : groupes
}

/**
 * Nombre saisi au clavier numérique, milliers séparés à l'affichage
 * (« 12 500 »), virgule décimale tolérée (et le point, corrigé en virgule).
 * `onValeur` reçoit le nombre, ou null pour une saisie vide.
 */
function NumberInput({
  valeur = null,
  onValeur,
  decimales = false,
  name,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  valeur?: number | null
  onValeur?: (valeur: number | null) => void
  decimales?: boolean
}) {
  const [texte, setTexte] = React.useState(() =>
    valeur === null ? "" : formaterNombre(valeur)
  )
  const nombre = lireNombre(texte)

  return (
    <>
      <Input
        type="text"
        inputMode={decimales ? "decimal" : "numeric"}
        value={texte}
        onChange={(evenement) => {
          const enForme = mettreEnForme(evenement.target.value, decimales)
          setTexte(enForme)
          onValeur?.(lireNombre(enForme))
        }}
        className="font-data"
        {...props}
      />
      {name && (
        <input type="hidden" name={name} value={nombre === null ? "" : String(nombre)} />
      )}
    </>
  )
}

export { NumberInput }
