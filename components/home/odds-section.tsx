import { simulateChampionshipOdds } from "@/lib/simulate"
import { TeamLogo } from "@/components/team/team-logo"
import { SectionHeading } from "./section-heading"

function OddsBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const width = Math.max(pct, pct > 0 ? 1.5 : 0)
  return (
    <div className="flex items-center gap-3">
      <span className="w-[92px] shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-display text-xs font-semibold text-foreground">
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

export function OddsSection() {
  const odds = simulateChampionshipOdds()

  return (
    <section id="odds" className="scroll-mt-24">
      <SectionHeading title="Championship Odds" />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Based on 10,000 simulations of the remaining schedule, weighted by each team&apos;s current
        win rate, followed by a simulated playoff bracket.
      </p>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card/60">
        {odds.map(({ team, playoffPct, divisionPct, championshipPct }) => (
          <div key={team.slug} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex min-w-0 items-center gap-3 sm:w-48 sm:shrink-0">
              <TeamLogo team={team} size="sm" />
              <span className="truncate font-display text-sm font-semibold uppercase text-foreground">
                {team.name}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <OddsBar label="Playoffs" pct={playoffPct} color={`${team.colors.accent}55`} />
              <OddsBar label="Division" pct={divisionPct} color={`${team.colors.accent}99`} />
              <OddsBar label="Championship" pct={championshipPct} color={team.colors.accent} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
