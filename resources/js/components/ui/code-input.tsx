import { REGEXP_ONLY_DIGITS } from "input-otp"

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

/**
 * Code à 4 chiffres (code local de profil) ou 6 chiffres (code SMS) : une case
 * par chiffre, collage accepté, avance automatique, clavier numérique, et
 * remplissage par le SMS reçu (`autocomplete="one-time-code"`).
 */
function CodeInput({
  longueur = 6,
  valeur,
  onValeur,
  onComplet,
  id,
  name,
  disabled,
  autoFocus,
  "aria-describedby": decritPar,
  "aria-invalid": invalide,
  "aria-label": libelle,
}: {
  longueur?: 4 | 6
  valeur?: string
  onValeur?: (valeur: string) => void
  onComplet?: (valeur: string) => void
  id?: string
  name?: string
  disabled?: boolean
  autoFocus?: boolean
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-label"?: string
}) {
  const estInvalide = invalide === true || invalide === "true"

  return (
    <InputOTP
      id={id}
      name={name}
      maxLength={longueur}
      value={valeur}
      onChange={onValeur}
      onComplete={onComplet}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      aria-describedby={decritPar}
      aria-invalid={estInvalide || undefined}
      aria-label={libelle}
      containerClassName="w-full"
    >
      {/* Cases fluides plafonnées à 48 px : le code ne déborde jamais de sa
          colonne (une grille de champs à deux colonnes, ou 360 px). */}
      <InputOTPGroup
        className={cn(
          "grid w-full",
          longueur === 6
            ? "grid-cols-[repeat(6,minmax(0,3rem))]"
            : "grid-cols-[repeat(4,minmax(0,3rem))]"
        )}
      >
        {Array.from({ length: longueur }, (_, index) => (
          <InputOTPSlot key={index} index={index} invalide={estInvalide} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

export { CodeInput }
