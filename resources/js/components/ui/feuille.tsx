import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { DialogOverlay } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Glissement vers le bas, en pixels, au-delà duquel la feuille se ferme. */
const SEUIL_FERMETURE_PX = 96

const Feuille = DialogPrimitive.Root
const FeuilleDeclencheur = DialogPrimitive.Trigger
const FeuilleFermer = DialogPrimitive.Close

/**
 * Feuille (DESIGN.md § 11) : monte du bas sur mobile (corrigé, filtres),
 * dialogue centré à partir de 768 px. Poignée, fermeture par glissement vers
 * le bas et par bouton, focus piégé (Radix).
 */
function FeuilleContenu({
  titre,
  description,
  pied,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  titre: React.ReactNode
  description?: React.ReactNode
  /** Zone collée en bas (bouton « Continuer »…). */
  pied?: React.ReactNode
}) {
  const [decalage, setDecalage] = React.useState(0)
  const depart = React.useRef<number | null>(null)
  const boutonFermer = React.useRef<HTMLButtonElement>(null)

  function finirGlissement() {
    if (depart.current !== null && decalage > SEUIL_FERMETURE_PX) {
      boutonFermer.current?.click()
    }

    depart.current = null
    setDecalage(0)
  }

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="feuille"
        {...(description ? {} : { "aria-describedby": undefined })}
        style={decalage > 0 ? { transform: `translateY(${decalage}px)` } : undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-feuille border-t bg-relief text-ink-900 shadow-flottant outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:border data-[state=closed]:md:slide-out-to-bottom-0 data-[state=closed]:md:zoom-out-95 data-[state=open]:md:slide-in-from-bottom-0 data-[state=open]:md:zoom-in-95",
          className
        )}
        {...props}
      >
        <div
          className="touch-none px-5 pt-2 pb-3 md:pt-5"
          onPointerDown={(evenement) => {
            depart.current = evenement.clientY
            evenement.currentTarget.setPointerCapture(evenement.pointerId)
          }}
          onPointerMove={(evenement) => {
            if (depart.current !== null) {
              setDecalage(Math.max(0, evenement.clientY - depart.current))
            }
          }}
          onPointerUp={finirGlissement}
          onPointerCancel={finirGlissement}
        >
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-400/50 md:hidden"
          />
          <div className="flex items-start gap-3">
            <div className="grid min-w-0 flex-1 gap-1">
              <DialogPrimitive.Title className="text-[1.0625rem] leading-snug font-semibold tracking-tight">
                {titre}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-interface text-ink-600">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              ref={boutonFermer}
              className="-mt-1.5 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-controle text-ink-500 transition-colors hover:bg-craie-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <XIcon aria-hidden className="size-4" />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {pied && (
          <div className="border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {pied}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Feuille, FeuilleContenu, FeuilleDeclencheur, FeuilleFermer }
