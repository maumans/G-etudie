import { CalendarDays } from "lucide-react"
import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Le champ date natif n'ouvre son calendrier que sur un minuscule glyphe,
 * invisible sur certains thèmes et absent de Firefox : ce composant le
 * masque, affiche sa propre icône, et ouvre le calendrier au clic sur tout le
 * champ (`showPicker()`, repli sur le focus). Hauteur standard forcée.
 */
function DateInput({
  className,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const champ = React.useRef<HTMLInputElement>(null)

  function ouvrirCalendrier() {
    const element = champ.current

    if (!element || element.disabled || element.readOnly) {
      return
    }

    try {
      element.showPicker()
    } catch {
      element.focus()
    }
  }

  return (
    <div data-slot="date-input" className={cn("relative", className)}>
      <Input
        ref={champ}
        type="date"
        onClick={(evenement) => {
          onClick?.(evenement)
          ouvrirCalendrier()
        }}
        className="cursor-pointer appearance-none pr-10 font-data [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left"
        {...props}
      />
      <CalendarDays
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500"
      />
    </div>
  )
}

export { DateInput }
