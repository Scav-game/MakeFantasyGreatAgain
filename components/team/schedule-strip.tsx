import type { Team } from "@/lib/league"
import { CURRENT_WEEK, getTeam } from "@/lib/league"
import { TeamLogo } from "./team-logo"

export function ScheduleStrip({ team }: { team: Team }) {
  const upcoming = team.schedule.filter((g) => g.week >= CURRENT_WEEK).slice(0, 5)

  return (
    <section
      className="rounded-xl border bg-card"
      style={{ borderColor: `${team.colors.accent}2e` }}
    >
      <div className="flex items-center justify-between px-5 py-3">
        <h2
          className="font-display text-sm font-bold uppercase tracking-[0.2em]"
          style={{ color: team.colors.accent }}
        >
          Schedule
        </h2>
        <a
          href="#schedule"
          className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          View Full Schedule →
        </a>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-3 md:grid-cols-5 md:divide-y-0">
        {upcoming.map((game) => {
          const opp = getTeam(game.opponent)
          if (!opp) return null
          return (
            <div key={game.week} className="flex items-center gap-3 px-4 py-4">
              <TeamLogo team={opp} size="sm" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Wk {game.week} · {game.home ? "vs" : "@"}
                </p>
                <p className="truncate font-display text-xs font-semibold uppercase text-foreground">
                  {opp.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{game.date}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
