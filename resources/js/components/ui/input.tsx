import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Champ de saisie Ardoise : même hauteur que les boutons de son habillage
 * (48 px élève, 40 px back-office). Texte à 16 px : en dessous, iPhone zoome
 * sur le champ au toucher. Libellé et erreur : composant `Champ`.
 */
const inputVariants = cva(
  "flex w-full min-w-0 rounded-controle border border-input bg-card px-3.5 text-base text-ink-900 shadow-carte transition-colors outline-none selection:bg-nimba-600 selection:text-white placeholder:text-ink-600 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-nimba-600 focus-visible:ring-[3px] focus-visible:ring-nimba-600/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-faux-600 aria-invalid:ring-faux-600/20 dark:focus-visible:border-nimba-300 dark:focus-visible:ring-nimba-300/30 dark:aria-invalid:border-faux-400",
  {
    variants: {
      taille: {
        normale: "h-12",
        compacte: "h-10 text-interface",
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

export { Input, inputVariants }
