import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Classes partagées par tout ce qui ressemble à un champ (Input, Textarea,
 * TelephoneInput, cases de code) : fond blanc, filet ink-400 (≥ 3:1, le
 * contour du champ est ce qui le désigne), ombre fine, anneau doux de
 * l'accent au focus, rouge si invalide.
 */
const CHAMP_BASE =
  "rounded-controle border border-input bg-card text-ink-900 shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-ink-500 hover:border-ink-500 focus-visible:border-nimba-600 focus-visible:ring-4 focus-visible:ring-nimba-600/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-faux-600 aria-invalid:ring-faux-600/15 dark:bg-relief/40 dark:focus-visible:border-nimba-300 dark:focus-visible:ring-nimba-300/20 dark:aria-invalid:border-faux-400"

/** La même chose pour un conteneur qui porte le focus de son champ interne. */
const CHAMP_CONTENEUR =
  "rounded-controle border border-input bg-card shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-ink-500 focus-within:border-nimba-600 focus-within:ring-4 focus-within:ring-nimba-600/15 has-[input[aria-invalid=true]]:border-faux-600 dark:bg-relief/40 dark:focus-within:border-nimba-300 dark:focus-within:ring-nimba-300/20 dark:has-[input[aria-invalid=true]]:border-faux-400"

/**
 * Champ de saisie Ardoise : même hauteur que les boutons de son habillage
 * (44 px sur mobile, 40 px à partir de 640 px ; 36 px au back-office). Texte
 * à 16 px sur mobile — en dessous, iPhone zoome sur le champ au toucher — et
 * 14 px au-delà. Libellé et erreur : composant `Champ`.
 */
const inputVariants = cva(
  cn(
    CHAMP_BASE,
    "flex w-full min-w-0 px-3 selection:bg-nimba-600 selection:text-white file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium"
  ),
  {
    variants: {
      taille: {
        normale: "h-11 text-base sm:h-10 sm:text-interface",
        compacte: "h-9 text-interface",
      },
    },
    defaultVariants: {
      taille: "normale",
    },
  }
)

function Input({
  className,
  type,
  taille,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ taille }), className)}
      {...props}
    />
  )
}

export { CHAMP_BASE, CHAMP_CONTENEUR, Input, inputVariants }
