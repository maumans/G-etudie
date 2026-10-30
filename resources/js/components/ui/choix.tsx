import { cva } from "class-variance-authority"
import { Check, X } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * État d'une option de QCM. Avant vérification : `neutre` ou `selectionne`.
 * Après : `juste` (choisie et juste), `faux` (choisie et fausse),
 * `bonne_reponse` (juste mais pas choisie), `ecartee` (ni choisie ni juste).
 */
type EtatChoix =
  | "neutre"
  | "selectionne"
  | "juste"
  | "faux"
  | "bonne_reponse"
  | "ecartee"

const choixVariants = cva(
  "group/choix relative flex min-h-14 w-full items-center gap-3 rounded-controle border-2 bg-card px-3 py-2.5 text-left text-lecture text-ink-900 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default",
  {
    variants: {
      etat: {
        neutre:
          "border-input hover:bg-nimba-600/[0.06] dark:hover:bg-nimba-500/15",
        selectionne:
          "border-nimba-600 bg-nimba-600/[0.12] dark:border-nimba-300 dark:bg-nimba-500/25",
        juste:
          "border-juste-600 bg-juste-600/[0.10] dark:border-juste-400 dark:bg-juste-400/15",
        faux: "border-faux-600 bg-faux-600/[0.08] dark:border-faux-400 dark:bg-faux-400/15",
        bonne_reponse:
          "border-dashed border-juste-600 dark:border-juste-400",
        ecartee: "border-border opacity-70",
      },
    },
  }
)

const pastilleVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-titre text-sm font-semibold",
  {
    variants: {
      etat: {
        neutre: "border-ink-400 text-ink-600",
        selectionne: "border-nimba-600 bg-nimba-600 text-white dark:border-nimba-300 dark:bg-nimba-300 dark:text-[#0e1220]",
        juste: "border-juste-600 bg-juste-600 text-white dark:border-juste-400 dark:bg-juste-400 dark:text-[#0e1220]",
        faux: "border-faux-600 bg-faux-600 text-white dark:border-faux-400 dark:bg-faux-400 dark:text-[#0e1220]",
        bonne_reponse: "border-juste-600 text-juste-700 dark:border-juste-400 dark:text-juste-400",
        ecartee: "border-ink-400 text-ink-600",
      },
    },
  }
)

/** Le verdict n'est jamais porté par la couleur seule : icône + mot + couleur. */
const VERDICTS: Partial<
  Record<EtatChoix, { mot: string; icone: typeof Check; classe: string }>
> = {
  juste: {
    mot: "Juste",
    icone: Check,
    classe: "text-juste-700 dark:text-juste-400",
  },
  faux: {
    mot: "Pas encore",
    icone: X,
    classe: "text-faux-600 dark:text-faux-400",
  },
  bonne_reponse: {
    mot: "Bonne réponse",
    icone: Check,
    classe: "text-juste-700 dark:text-juste-400",
  },
}

/**
 * Option de QCM (DESIGN.md § 11) : cible ≥ 56 px, lettre dans une pastille,
 * sélection par bordure + teinte d'opacité. Une seule réponse : rôle `radio`
 * dans un `GroupeChoix` ; plusieurs : rôle `checkbox`.
 */
function Choix({
  lettre,
  etat = "neutre",
  multiple = false,
  onChoisir,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onClick"> & {
  lettre: string
  etat?: EtatChoix
  multiple?: boolean
  onChoisir?: () => void
}) {
  const verifie = !["neutre", "selectionne"].includes(etat)
  const coche = ["selectionne", "juste", "faux"].includes(etat)
  const verdict = VERDICTS[etat]
  const id = React.useId()
  // Nom lu : « A, <contenu>, Juste ». Une formule seule doit porter son
  // `libelle` (voir Formule) : le MathML ne donne pas de nom à un bouton.
  const nom = [`${id}-lettre`, `${id}-contenu`, verdict ? `${id}-verdict` : null]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={coche}
      aria-labelledby={nom}
      disabled={verifie}
      onClick={onChoisir}
      data-slot="choix"
      data-etat={etat}
      className={cn(choixVariants({ etat }), className)}
      {...props}
    >
      <span id={`${id}-lettre`} aria-hidden className={pastilleVariants({ etat })}>
        {lettre}
      </span>
      <span id={`${id}-contenu`} className="min-w-0 flex-1">
        {children}
      </span>
      {verdict && (
        <span
          id={`${id}-verdict`}
          className={cn(
            "flex shrink-0 items-center gap-1 text-aide font-semibold",
            verdict.classe
          )}
        >
          <verdict.icone aria-hidden className="size-4" strokeWidth={3} />
          {verdict.mot}
        </span>
      )}
    </button>
  )
}

function GroupeChoix({
  libelle,
  multiple = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { libelle: string; multiple?: boolean }) {
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label={libelle}
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

export { Choix, GroupeChoix, type EtatChoix }
