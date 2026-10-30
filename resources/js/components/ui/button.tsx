import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bouton Ardoise (DESIGN.md § 11). Deux axes :
 * - `variant` = intensité : `default` (plein nimba, l'action dominante),
 *   `doux` (teinte nimba : l'action secondaire qui reste invitante),
 *   `succes` (plein vert, l'action qui conclut), `destructive` (plein rouge,
 *   toujours confirmé), `outline`, `ghost` ;
 * - `ton` (sur `outline` et `ghost`) = famille : `neutre`, `nimba`, `danger`.
 * Hauteurs : 44 px sur mobile, 40 px à partir de 640 px (`normale`) ; 48 px
 * pour un appel de héros (`grande`) ; 36 px en barre d'outils (`compacte`).
 * Icône seule : `aria-label` obligatoire, icône en `aria-hidden`.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-controle font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-nimba-600 text-white shadow-bouton hover:bg-nimba-700 dark:hover:bg-nimba-500",
        doux: "bg-nimba-600/[0.10] text-nimba-700 hover:bg-nimba-600/[0.16] dark:bg-nimba-300/15 dark:text-nimba-300 dark:hover:bg-nimba-300/20",
        succes: "bg-juste-600 text-white shadow-bouton hover:bg-juste-700",
        destructive: "bg-faux-600 text-white shadow-bouton hover:bg-faux-700",
        outline: "border bg-card shadow-xs dark:bg-relief/40",
        ghost: "bg-transparent",
      },
      ton: {
        neutre: "",
        nimba: "",
        danger: "",
      },
      taille: {
        normale: "h-11 px-4 text-interface sm:h-10",
        grande: "h-12 px-6 text-[0.9375rem]",
        compacte: "h-9 px-3.5 text-interface",
        petite: "h-8 rounded-[8px] px-3 text-aide",
        icone: "size-11 sm:size-10",
        "icone-compacte": "size-9",
      },
    },
    compoundVariants: [
      {
        variant: ["outline", "ghost"],
        ton: "neutre",
        className: "text-ink-900 hover:bg-craie-100",
      },
      {
        variant: ["outline", "ghost"],
        ton: "nimba",
        className:
          "text-nimba-700 hover:bg-nimba-600/[0.08] dark:text-nimba-300 dark:hover:bg-nimba-300/10",
      },
      {
        variant: ["outline", "ghost"],
        ton: "danger",
        className:
          "text-faux-600 hover:bg-faux-600/[0.08] dark:text-faux-400 dark:hover:bg-faux-400/10",
      },
      // Bordure d'un outline : discrète. Le libellé identifie le bouton ; la
      // bordure, l'ombre et le fond blanc le détachent de la page.
      {
        variant: "outline",
        ton: "neutre",
        className: "border-contour hover:border-ink-400/60",
      },
      {
        variant: "outline",
        ton: "nimba",
        className: "border-nimba-600/35 dark:border-nimba-300/35",
      },
      {
        variant: "outline",
        ton: "danger",
        className: "border-faux-600/35 dark:border-faux-400/35",
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
