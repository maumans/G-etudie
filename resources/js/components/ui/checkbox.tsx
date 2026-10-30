import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/** Case à cocher : 18 px, bordure ink-400 (≥ 3:1). L'envelopper dans son libellé pour une cible de 44 px. */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-[5px] border-[1.5px] border-input bg-card shadow-xs transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-faux-600 data-[state=checked]:border-nimba-600 data-[state=checked]:bg-nimba-600 data-[state=checked]:text-white dark:data-[state=checked]:border-nimba-500 dark:data-[state=checked]:bg-nimba-500 dark:aria-invalid:border-faux-400",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon aria-hidden className="size-3" strokeWidth={3.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
