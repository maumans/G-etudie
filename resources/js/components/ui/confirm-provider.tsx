import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type OptionsConfirmation = {
  titre: string
  message?: React.ReactNode
  /** Libellé du bouton qui confirme : dire ce qu'il fait (« Supprimer le compte »). */
  action: string
  /** `danger` : bouton rouge, pour ce qui ne se défait pas. */
  ton?: "normal" | "danger"
  annuler?: string
}

type Demande = OptionsConfirmation & { repondre: (accepte: boolean) => void }

const ContexteConfirmation = React.createContext<
  ((options: OptionsConfirmation) => Promise<boolean>) | null
>(null)

/**
 * Toute confirmation passe par `confirmer()` (DESIGN.md § 11), jamais par
 * `window.confirm()` : même allure partout, texte en français, focus piégé.
 *
 *   const confirmer = useConfirmer()
 *   if (await confirmer({ titre: "Abandonner cette réponse ?", action: "Abandonner", ton: "danger" })) { … }
 */
function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [demande, setDemande] = React.useState<Demande | null>(null)

  const confirmer = React.useCallback(
    (options: OptionsConfirmation) =>
      new Promise<boolean>((resoudre) => {
        setDemande({ ...options, repondre: resoudre })
      }),
    []
  )

  function conclure(accepte: boolean) {
    demande?.repondre(accepte)
    setDemande(null)
  }

  return (
    <ContexteConfirmation.Provider value={confirmer}>
      {children}
      <Dialog
        open={demande !== null}
        onOpenChange={(ouvert) => {
          if (!ouvert) {
            conclure(false)
          }
        }}
      >
        <DialogContent
          role="alertdialog"
          fermable={false}
          {...(demande?.message ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader className="pr-0">
            <DialogTitle>{demande?.titre}</DialogTitle>
            {demande?.message && (
              <DialogDescription>{demande.message}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => conclure(false)}>
              {demande?.annuler ?? "Annuler"}
            </Button>
            <Button
              variant={demande?.ton === "danger" ? "destructive" : "default"}
              onClick={() => conclure(true)}
            >
              {demande?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContexteConfirmation.Provider>
  )
}

function useConfirmer() {
  const confirmer = React.useContext(ContexteConfirmation)

  if (confirmer === null) {
    throw new Error("useConfirmer() doit être appelé sous <ConfirmProvider>.")
  }

  return confirmer
}

export { ConfirmProvider, useConfirmer, type OptionsConfirmation }
