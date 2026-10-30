import { cn } from "@/lib/utils"

/**
 * Bloc d'attente. La pulsation ne démarre qu'après 400 ms : une attente plus
 * courte ne mérite pas d'animation (DESIGN.md § 5).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-controle bg-ink-400/15 [animation-delay:400ms]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
