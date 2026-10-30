import { cn } from "@/lib/utils"

/**
 * Progression en segments (DESIGN.md § 11) : la barre en tirets des
 * références, une pastille par part de 5 %. La couleur vient de la matière
 * (`MATIERES[cle].plein`) ou de l'accent par défaut.
 */
function ProgressionSegments({
  valeur,
  libelle,
  segments = 20,
  couleur = "bg-nimba-500 dark:bg-nimba-400",
  className,
}: {
  /** De 0 à 100. */
  valeur: number
  /** Nom lu par les lecteurs d'écran : « Mathématiques ». */
  libelle: string
  segments?: number
  couleur?: string
  className?: string
}) {
  const borne = Math.min(100, Math.max(0, valeur))
  const pleins = Math.round((borne / 100) * segments)

  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(borne)}
      data-slot="progression"
      className={cn("flex h-1.5 gap-[3px]", className)}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-full flex-1 rounded-full",
            index < pleins ? couleur : "bg-ink-400/20"
          )}
        />
      ))}
    </div>
  )
}

/** Barre continue, fine : progression d'une leçon, d'un défi. */
function ProgressionBarre({
  valeur,
  libelle,
  couleur = "bg-nimba-500 dark:bg-nimba-400",
  className,
}: {
  valeur: number
  libelle: string
  couleur?: string
  className?: string
}) {
  const borne = Math.min(100, Math.max(0, valeur))

  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(borne)}
      data-slot="progression"
      className={cn("h-1.5 overflow-hidden rounded-full bg-ink-400/20", className)}
    >
      <div
        className={cn("h-full rounded-full", couleur)}
        style={{ width: `${borne}%` }}
      />
    </div>
  )
}

export { ProgressionBarre, ProgressionSegments }
