import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Bouton Ardoise (DESIGN.md § 11), angles de 10 px, graisse 500. Deux axes :
 * - `variant` = intensité : `default` (plein mandarine, l'action dominante),
 *   `encre` (plein noir : l'action forte sans couleur, ou la seconde action
 *   d'un héros), `doux` (teinte mandarine), `succes` (plein vert, l'action
 *   qui conclut), `destructive` (plein framboise, toujours confirmé),
 *   `outline` (blanc, filet), `ghost` ;
 * - `ton` (sur `outline` et `ghost`) = famille : `neutre`, `nimba`, `danger`.
 * Hauteurs : 44 px sur mobile, 40 px à partir de 640 px (`normale`) ; 44 px
 * partout pour un appel de héros (`grande`) ; 36 px en barre d'outils
 * (`compacte`). Un bouton reste sobre : pas de halo, pas de pastille de
 * flèche ; la taille et la couleur suffisent à le hiérarchiser.
 * Icône seule : `aria-label` obligatoire, icône en `aria-hidden`.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-controle font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-nimba-600 text-white shadow-bouton hover:bg-nimba-700",
        encre:
          "bg-ink-900 text-craie-50 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(30_24_20/0.2)] hover:bg-ink-900/88",
        doux: "bg-nimba-500/[0.12] text-nimba-700 hover:bg-nimba-500/[0.18] dark:bg-nimba-400/15 dark:text-nimba-300 dark:hover:bg-nimba-400/20",
        succes: "bg-juste-600 text-white shadow-bouton hover:bg-juste-700",
        destructive: "bg-faux-600 text-white shadow-bouton hover:bg-faux-700",
        outline: "border bg-card shadow-xs dark:bg-relief/50",
        ghost: "bg-transparent",
      },
      ton: {
        neutre: "",
        nimba: "",
        danger: "",
      },
      taille: {
        normale: "h-11 px-4 text-interface sm:h-10",
        grande: "h-11 px-5 text-[0.9375rem]",
        compacte: "h-9 px-3.5 text-interface",
        petite: "h-8 px-3 text-aide rounded-[8px]",
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
          "text-nimba-700 hover:bg-nimba-500/[0.08] dark:text-nimba-400 dark:hover:bg-nimba-400/10",
      },
      {
        variant: ["outline", "ghost"],
        ton: "danger",
        className:
          "text-faux-600 hover:bg-faux-600/[0.08] dark:text-faux-400 dark:hover:bg-faux-400/10",
      },
      // Filet d'un outline : discret. Le libellé identifie le bouton ; le
      // filet, l'ombre et le fond blanc le détachent de la page.
      {
        variant: "outline",
        ton: "neutre",
        className: "border-contour hover:border-ink-400/70",
      },
      {
        variant: "outline",
        ton: "nimba",
        className: "border-nimba-500/40 dark:border-nimba-400/40",
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
