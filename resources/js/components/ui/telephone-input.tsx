import * as React from "react"

import {
  chiffresTelephone,
  formaterTelephone,
  INDICATIF,
} from "@/lib/telephone"
import { CHAMP_CONTENEUR } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Numéro guinéen : indicatif +224 fixe, 9 chiffres groupés à l'affichage
 * (« 622 12 34 56 »), clavier téléphonique. La valeur envoyée au serveur
 * (champ caché `name`, et `onValeur`) est normalisée : « +224622123456 ».
 * Le serveur valide : un numéro incomplet part tel quel et y est refusé.
 */
function TelephoneInput({
  name,
  valeur = "",
  onValeur,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  valeur?: string
  onValeur?: (valeur: string) => void
}) {
  const [chiffres, setChiffres] = React.useState(() =>
    chiffresTelephone(valeur).slice(0, 9)
  )
  const valeurNormalisee = chiffres ? `${INDICATIF}${chiffres}` : ""

  return (
    <div
      data-slot="telephone-input"
      className={cn(
        CHAMP_CONTENEUR,
        "flex h-11 w-full min-w-0 items-stretch overflow-hidden sm:h-10",
        className
      )}
    >
      <span
        aria-hidden
        className="flex items-center gap-1.5 border-r border-border bg-craie-50 pr-2.5 pl-3 font-data text-base text-ink-600 sm:text-interface dark:bg-transparent"
      >
        {INDICATIF}
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="6xx xx xx xx"
        value={formaterTelephone(chiffres)}
        onChange={(evenement) => {
          const nouveaux = chiffresTelephone(evenement.target.value).slice(0, 9)
          setChiffres(nouveaux)
          onValeur?.(nouveaux ? `${INDICATIF}${nouveaux}` : "")
        }}
        className="w-full min-w-0 bg-transparent px-3 font-data text-base text-ink-900 outline-none placeholder:text-ink-500 sm:text-interface"
        {...props}
      />
      {name && <input type="hidden" name={name} value={valeurNormalisee} />}
    </div>
  )
}

export { TelephoneInput }
