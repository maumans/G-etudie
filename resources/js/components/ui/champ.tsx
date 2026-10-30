import { CircleAlert } from "lucide-react"
import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AttributsChamp = {
  id: string
  "aria-describedby"?: string
  "aria-invalid"?: true
}

/**
 * Libellé toujours visible (jamais un libellé-placeholder), aide et message
 * d'erreur sous le champ, reliés au contrôle par `aria-describedby`.
 *
 *   <Champ libelle="Prénom" erreur={errors.prenom}>
 *     {(attributs) => <Input {...attributs} name="prenom" />}
 *   </Champ>
 */
function Champ({
  libelle,
  aide,
  erreur,
  facultatif = false,
  className,
  children,
}: {
  libelle: React.ReactNode
  aide?: React.ReactNode
  erreur?: string
  facultatif?: boolean
  className?: string
  children: (attributs: AttributsChamp) => React.ReactNode
}) {
  const id = React.useId()
  const idAide = aide ? `${id}-aide` : undefined
  const idErreur = erreur ? `${id}-erreur` : undefined
  const decritPar = [idErreur, idAide].filter(Boolean).join(" ") || undefined

  return (
    // content-start : dans une rangée de champs, celui qui n'a pas d'aide ne
    // doit pas étirer son libellé pour s'aligner sur la hauteur du voisin.
    <div data-slot="champ" className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>
        {libelle}
        {facultatif && (
          <span className="ml-1.5 font-normal text-ink-500">(facultatif)</span>
        )}
      </Label>
      {children({
        id,
        "aria-describedby": decritPar,
        "aria-invalid": erreur ? true : undefined,
      })}
      {aide && (
        <p id={idAide} className="text-aide text-ink-500">
          {aide}
        </p>
      )}
      {erreur && (
        <p
          id={idErreur}
          className="flex items-start gap-1.5 text-aide text-faux-600 dark:text-faux-400"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {erreur}
        </p>
      )}
    </div>
  )
}

export { Champ, type AttributsChamp }
