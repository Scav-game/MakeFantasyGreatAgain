import type { Player, Team } from "@/lib/league"
import { CURRENT_WEEK, getTeam } from "@/lib/league"
import { TeamLogo } from "./team-logo"

function SectionHeading({ team, id, label }: { team: Team; id: string; label: string }) {
  return (
    <div id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full" style={{ backgroundColor: team.colors.accent }} />
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground md:text-3xl">
          {label}
        </h2>
      </div>
    </div>
  )
}

function RosterTable({ team, players, title }: { team: Team; players: Player[]; title: string }) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card"
      style={{ borderColor: `${team.colors.accent}2e` }}
    >
      <div
        className="px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em]"
        style={{ color: team.colors.accent, borderBottom: `1px solid ${team.colors.accent}22` }}
      >
        {title}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-2 font-medium">Pos</th>
            <th className="px-2 py-2 font-medium">Player</th>
            <th className="px-2 py-2 font-medium">NFL</th>
            <th className="px-5 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={`${p.name}-${i}`} className="border-t border-border">
              <td className="px-5 py-2.5">
                <span
                  className="inline-flex min-w-9 justify-center rounded px-1.5 py-0.5 font-display text-[11px] font-bold uppercase"
                  style={{ backgroundColor: `${team.colors.primary}33`, color: team.colors.dark }}
                >
                  {p.pos}
                </span>
              </td>
              <td className="px-2 py-2.5 font-medium text-foreground">{p.name}</td>
              <td className="px-2 py-2.5 text-muted-foreground">{p.nflTeam}</td>
              <td className="px-5 py-2.5 text-right font-display font-semibold text-foreground">
                {p.points.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FullSchedule({ team }: { team: Team }) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card"
      style={{ borderColor: `${team.colors.accent}2e` }}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Wk</th>
            <th className="px-2 py-2.5 font-medium">Opponent</th>
            <th className="px-2 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {team.schedule.map((game) => {
            const opp = getTeam(game.opponent)
            const isCurrent = game.week === CURRENT_WEEK
            return (
              <tr
                key={game.week}
                className="border-t border-border"
                style={isCurrent ? { backgroundColor: `${team.colors.accent}14` } : undefined}
              >
                <td className="px-4 py-2.5 font-display font-semibold text-muted-foreground">{game.week}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    {opp && <TeamLogo team={opp} size="sm" />}
                    <span className="font-medium text-foreground">
                      <span className="text-muted-foreground">{game.home ? "vs " : "@ "}</span>
                      {opp?.name ?? game.opponent}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-muted-foreground">{game.date}</td>
                <td className="px-4 py-2.5 text-right">
                  {game.result ? (
                    <span
                      className="font-display font-semibold"
                      style={{
                        color: game.result.outcome === "W" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {game.result.outcome} {game.result.teamScore.toFixed(1)}–
                      {game.result.oppScore.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {game.time}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DraftPicks({ team }: { team: Team }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {team.draftPicks.map((pick, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border bg-card px-5 py-4"
          style={{ borderColor: `${team.colors.accent}2e` }}
        >
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {pick.year} · {pick.round}
            </p>
            <p className="text-xs text-muted-foreground">Origin: {pick.origin}</p>
          </div>
          <span className="font-display text-2xl font-bold" style={{ color: team.colors.accent }}>
            {pick.year}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TeamDetail({ team }: { team: Team }) {
  return (
    <div className="flex flex-col gap-12">
      <section id="team" className="scroll-mt-20 flex flex-col gap-6">
        <SectionHeading team={team} id="roster" label="Roster" />
        <div className="grid gap-6 lg:grid-cols-2">
          <RosterTable team={team} players={team.roster.starters} title="Starters" />
          <RosterTable team={team} players={team.roster.bench} title="Bench" />
        </div>
      </section>

      <section id="schedule" className="scroll-mt-20 flex flex-col gap-6">
        <SectionHeading team={team} id="full-schedule" label="Full Schedule" />
        <FullSchedule team={team} />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading team={team} id="draft" label="Draft Capital" />
        <DraftPicks team={team} />
      </section>
    </div>
  )
}
