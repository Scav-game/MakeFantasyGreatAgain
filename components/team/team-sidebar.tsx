import type { Team } from "@/lib/league"
import { getNextGame, getTeam, getDivisionRank } from "@/lib/league"
import { TeamLogo } from "./team-logo"

function Card({
  team,
  title,
  children,
}: {
  team: Team
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border bg-card p-5"
      style={{ borderColor: `${team.colors.accent}2e` }}
    >
      <h2
        className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em]"
        style={{ color: team.colors.accent }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function NextGameCard({ team }: { team: Team }) {
  const game = getNextGame(team)
  if (!game) return null
  const opp = getTeam(game.opponent)
  if (!opp) return null

  return (
    <Card team={team} title="Next Game">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo team={team} size="md" />
          <span className="max-w-[84px] font-display text-xs font-semibold uppercase leading-tight text-foreground">
            {team.name}
          </span>
        </div>
        <span className="font-display text-2xl font-bold text-muted-foreground">VS</span>
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo team={opp} size="md" />
          <span className="max-w-[84px] font-display text-xs font-semibold uppercase leading-tight text-foreground">
            {opp.name}
          </span>
        </div>
      </div>
      <div
        className="mt-4 rounded-lg border px-3 py-2 text-center"
        style={{ borderColor: `${team.colors.accent}22` }}
      >
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          Week {game.week} · {game.date}
        </p>
        <p className="text-xs text-muted-foreground">
          {game.time} · {game.home ? team.stadium.city : (opp.stadium.city)}
        </p>
      </div>
    </Card>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-black/[0.03] px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`font-display text-lg font-bold ${!accent ? "text-foreground" : ""}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function StandingsCard({ team }: { team: Team }) {
  const divRank = getDivisionRank(team.slug)
  return (
    <Card team={team} title="Standings & Stats">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Record" value={`${team.record.wins}-${team.record.losses}`} accent={team.colors.accent} />
        <Stat label="Streak" value={team.streak} />
        <Stat label="Points For" value={team.pointsFor.toFixed(1)} />
        <Stat label="Points Against" value={team.pointsAgainst.toFixed(1)} />
      </div>
      <div
        className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2"
        style={{ borderColor: `${team.colors.accent}33` }}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {team.division} Division Rank
        </span>
        <span className="font-display text-xl font-bold" style={{ color: team.colors.accent }}>
          #{divRank}
        </span>
      </div>
    </Card>
  )
}

function HistoryRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`font-display text-base font-bold ${!accent ? "text-foreground" : ""}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function TeamHistoryCard({ team }: { team: Team }) {
  const { history } = team
  return (
    <Card team={team} title="Team History">
      <div className="flex flex-col">
        <HistoryRow label="Year Joined" value={String(history.yearJoined)} />
        <HistoryRow
          label="All-Time Record"
          value={`${history.allTimeRecord.wins}-${history.allTimeRecord.losses}`}
          accent={team.colors.accent}
        />
        <HistoryRow label="Total Points For" value={history.totalPointsFor.toLocaleString()} />
        <HistoryRow label="Playoff Appearances" value={String(history.playoffAppearances)} />
        <HistoryRow
          label="Championships"
          value={String(history.championships)}
          accent={history.championships > 0 ? team.colors.accent : undefined}
        />
      </div>
    </Card>
  )
}

export function TeamSidebar({ team }: { team: Team }) {
  return (
    <aside className="flex flex-col gap-4">
      <NextGameCard team={team} />
      <StandingsCard team={team} />
      <TeamHistoryCard team={team} />
    </aside>
  )
}
