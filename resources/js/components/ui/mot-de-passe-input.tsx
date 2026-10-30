import { Eye, EyeOff } from "lucide-react"
import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Mot de passe avec un bouton pour l'afficher : sur un petit écran, sans
 * confirmation en double, voir ce qu'on tape évite les fautes de frappe.
 */
function MotDePasseInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div data-slot="mot-de-passe-input" className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((precedent) => !precedent)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-controle text-ink-600 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {visible ? (
          <EyeOff aria-hidden className="size-5" />
        ) : (
          <Eye aria-hidden className="size-5" />
        )}
      </button>
    </div>
  )
}

export { MotDePasseInput }
