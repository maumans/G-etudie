import * as React from "react"

import { CHAMP_BASE } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        CHAMP_BASE,
        "flex min-h-28 w-full min-w-0 px-3 py-2.5 text-base leading-relaxed sm:text-interface",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
