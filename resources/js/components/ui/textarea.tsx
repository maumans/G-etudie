import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full min-w-0 rounded-controle border border-input bg-card px-3.5 py-3 text-base leading-relaxed text-ink-900 shadow-carte transition-colors outline-none placeholder:text-ink-600 focus-visible:border-nimba-600 focus-visible:ring-[3px] focus-visible:ring-nimba-600/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-faux-600 aria-invalid:ring-faux-600/20 dark:focus-visible:border-nimba-300 dark:focus-visible:ring-nimba-300/30 dark:aria-invalid:border-faux-400",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
