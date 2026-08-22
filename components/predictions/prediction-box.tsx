import type { Predictor } from "@/lib/predictions"
import { getTeam } from "@/lib/league"
import { TeamLogo } from "@/components/team/team-logo"
import { cn } from "@/lib/utils"

function WolfBadge({ correct }: { correct: boolean | null }) {
  const style =
    correct === true
      ? { borderColor: "#D4A017", backgroundColor: "#D4A01733", color: "#D4A017" }
      : correct === false
        ? { borderColor: "#ffffff33", backgroundColor: "#ffffff1a", color: "#ffffff88" }
        : { borderColor: "#ffffff40", backgroundColor: "#00000066", color: "#ffffffcc" }

  return (
    <span
      title="Lone wolf pick"
      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] leading-none"
      style={style}
    >
      🐺
    </span>
  )
}

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

  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-lg border-2 transition-colors", borderClass)}>
      {loneWolf && <WolfBadge correct={correct} />}

      <div className="bg-black/50 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white/80">
        {predictor.shortName}
      </div>

      <div className="flex flex-1 items-center justify-center py-3" style={{ backgroundColor: team.colors.primary }}>
        <TeamLogo team={team} size="sm" />
      </div>

      <div
        className="flex h-5 items-center justify-center text-xs font-bold"
        style={{
          backgroundColor: correct === true ? "#4CAF50" : correct === false ? "#F44336" : "transparent",
          color: "white",
        }}
      >
        {correct === true ? "✓" : correct === false ? "✕" : null}
      </div>
    </div>
  )
}
