import type { Predictor } from "@/lib/predictions"
import { getTeam } from "@/lib/league"
import { TeamLogo } from "@/components/team/team-logo"
import { cn } from "@/lib/utils"

const TEXT_SHADOW = { textShadow: "0 1px 3px rgba(0,0,0,0.85)" }

export function PredictionBox({
  predictor,
  pick,
  correct,
  loneWolf,
}: {
  predictor: Predictor
  pick: string
  correct: boolean | null
  loneWolf: boolean
}) {
  const team = getTeam(pick)
  if (!team) return null

  const borderClass =
    correct === true ? "border-emerald-500/70" : correct === false ? "border-red-500/60" : "border-white/10"
  const overlayColor = correct === true ? "#4CAF5026" : correct === false ? "#F4433626" : "transparent"

  return (
    <div
      title={loneWolf ? "Lone wolf pick" : undefined}
      className={cn(
        "relative flex min-h-[116px] flex-col items-center justify-between overflow-hidden rounded-lg border-2 p-1.5 transition-colors",
        borderClass,
        loneWolf && "ring-2 ring-[#D4A017]",
      )}
      style={{ backgroundColor: team.colors.primary }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: overlayColor }} />

      <span
        className="relative text-center text-[10px] font-semibold uppercase tracking-wide text-white"
        style={TEXT_SHADOW}
      >
        {predictor.shortName}
      </span>

      <div className="relative flex flex-1 items-center justify-center py-1.5">
        <TeamLogo team={team} size="lg" />
      </div>

      <span
        className="relative flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: correct === true ? "#4CAF50" : correct === false ? "#F44336" : "transparent" }}
      >
        {correct === true ? "✓" : correct === false ? "✕" : null}
      </span>
    </div>
  )
}
