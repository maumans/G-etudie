import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bouton Ardoise (DESIGN.md § 11). Deux axes :
 * - `variant` = intensité : `default` (plein nimba, l'action dominante),
 *   `succes` (plein vert, l'action qui conclut), `destructive` (plein rouge,
 *   toujours confirmé), `outline`, `ghost` ;
 * - `ton` (sur `outline` et `ghost`) = famille : `neutre`, `nimba`, `danger`.
 * Hauteurs : 48 px côté élève (`normale`), 40 px au back-office (`compacte`).
 * Icône seule : `aria-label` obligatoire, icône en `aria-hidden`.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-controle font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-nimba-600 text-white shadow-carte hover:bg-nimba-700 active:bg-nimba-800",
        succes:
          "bg-juste-600 text-white shadow-carte hover:bg-juste-700",
        destructive:
          "bg-faux-600 text-white shadow-carte hover:bg-faux-700",
        outline: "border bg-card shadow-carte",
        ghost: "bg-transparent",
      },
      ton: {
        neutre: "",
        nimba: "",
        danger: "",
      },
      taille: {
        normale: "h-12 px-5 text-interface",
        compacte: "h-10 px-4 text-interface",
        petite: "h-9 rounded-[10px] px-3 text-aide",
        icone: "size-12",
        "icone-compacte": "size-10",
      },
    },
    compoundVariants: [
      {
        variant: ["outline", "ghost"],
        ton: "neutre",
        className:
          "text-ink-900 hover:bg-nimba-600/[0.08] dark:hover:bg-nimba-500/20",
      },
      {
        variant: ["outline", "ghost"],
        ton: "nimba",
        className:
          "text-nimba-700 hover:bg-nimba-600/[0.12] dark:text-nimba-300 dark:hover:bg-nimba-500/25",
      },
      {
        variant: ["outline", "ghost"],
        ton: "danger",
        className:
          "text-faux-600 hover:bg-faux-600/[0.10] dark:text-faux-400 dark:hover:bg-faux-400/15",
      },
      // Bordure d'un outline : ≥ 3:1 sur la carte, sinon le bouton disparaît.
      { variant: "outline", ton: "neutre", className: "border-ink-400" },
      {
        variant: "outline",
        ton: "nimba",
        className: "border-nimba-600 dark:border-nimba-300",
      },
      {
        variant: "outline",
        ton: "danger",
        className: "border-faux-600 dark:border-faux-400",
      },
    ],
    defaultVariants: {
      variant: "default",
      ton: "neutre",
      taille: "normale",
    },
  }
)

function Button({
  className,
  variant,
  ton,
  taille,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, ton, taille, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
