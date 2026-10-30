import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Statut (DESIGN.md § 11) : petit rectangle plein à coins de 6 px, sans
 * contour ni icône — une forme qu'on ne prend pas pour un bouton. Fond en
 * opacité (lisible dans les deux thèmes), libellé en nuance 700 / 400.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-badge px-2 py-0.5 text-meta font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutre: "bg-ink-600/[0.12] text-ink-900 dark:bg-ink-400/25",
        nimba:
          "bg-nimba-600/[0.12] text-nimba-700 dark:bg-nimba-500/25 dark:text-nimba-300",
        soleil: "bg-soleil-400 text-ink-900 dark:text-[#141a2e]",
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
