import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Statut (DESIGN.md § 11) : petite pilule de 20 px, sans contour — une forme
 * qu'on ne prend pas pour un bouton (rayon 10 px, 40 px de haut). Fond en
 * opacité (lisible dans les deux thèmes), libellé en nuance 700 / 300.
 */
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-badge px-2 text-meta font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutre: "bg-ink-600/[0.08] text-ink-600 dark:bg-ink-400/20 dark:text-ink-600",
        nimba:
          "bg-nimba-600/[0.10] text-nimba-700 dark:bg-nimba-300/15 dark:text-nimba-300",
        soleil: "bg-soleil-400 text-soleil-900",
        juste:
          "bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400",
        faux: "bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400",
        indice:
          "bg-indice-400/25 text-indice-700 dark:bg-indice-400/15 dark:text-indice-400",
      },
    },
    defaultVariants: {
      variant: "neutre",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
