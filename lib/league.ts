import leagueData from "./generated/league-data.json"

export type Division = "East" | "West"

export type Player = {
  name: string
  pos: string
  nflTeam: string
  points: number
}

export type Game = {
  week: number
  opponent: string // slug
  date: string
  time?: string
  home: boolean
  result?: {
    outcome: "W" | "L"
    teamScore: number
    oppScore: number
  }
}

export type DraftPick = {
  year: number
  round: string
  origin: string
}

export type TeamHistory = {
  yearJoined: number
  allTimeRecord: { wins: number; losses: number }
  totalPointsFor: number
  playoffAppearances: number
  playoffWins: number
  championships: number
}

/** Season year used for "points per year" — bump this each offseason. */
export const CURRENT_SEASON_YEAR = 2026

export type Team = {
  slug: string
  name: string
  nameLines: [string, string]
  /** which of the two name lines uses the accent color (0 or 1) */
  accentLine: 0 | 1
  division: Division
  tagline: string
  theme: string
  stadium: { name: string; city: string }
  hero: string
  colors: {
    primary: string
    accent: string
    dark: string
    light: string
  }
  record: { wins: number; losses: number }
  /** Final points from completed games plus anything scored in the week
   * currently in progress. */
  pointsFor: number
  /** The in-progress portion of `pointsFor` — 0 once the week is final. */
  livePointsFor: number
  pointsAgainst: number
  streak: string
  roster: { active: Player[]; ir: Player[] }
  draftPicks: DraftPick[]
  schedule: Game[]
  history: TeamHistory
}

/**
 * All league data is sourced from the CSVs in /data, compiled by
 * scripts/build-league-data.mjs into lib/generated/league-data.json.
 * Edit the CSVs and run `npm run build:data` (or `npm run dev` / `npm run
 * build`, which do it automatically) to refresh the site.
 */
export const CURRENT_WEEK: number = leagueData.CURRENT_WEEK
export const TEAMS: Team[] = leagueData.TEAMS as Team[]

export type CustomNewsRow = {
  date: string
  headline: string
  body: string
  teamSlug: string | null
  author: string | null
}
export const CUSTOM_NEWS: CustomNewsRow[] = leagueData.CUSTOM_NEWS as CustomNewsRow[]

export type PastTeam = {
  slug: string
  name: string
  hero: string
  colors: {
    primary: string
    accent: string
    dark: string
    light: string
  }
  yearJoined: number
  yearLeft: number
  allTimeRecord: { wins: number; losses: number }
  totalPointsFor: number
  playoffAppearances: number
  playoffWins: number
  championships: number
}
export const PAST_TEAMS: PastTeam[] = leagueData.PAST_TEAMS as PastTeam[]

export function getTeam(slug: string): Team | undefined {
  return TEAMS.find((t) => t.slug === slug)
}

export function getTeamName(slug: string): string {
  return getTeam(slug)?.name ?? slug
}

export type StandingRow = Team & { rank: number; divisionRank: number }

/** Win percentage, and .000 for a team that hasn't played yet. Percentage
 * rather than raw wins because every team gets one bye, and those byes fall in
 * different weeks (5, 6, 10, 11, 13, 14), so mid-season two teams can be a
 * game apart in games played through no fault of their own. */
function winPct(wins: number, losses: number): number {
  const games = wins + losses
  return games === 0 ? 0 : wins / games
}

/** A team's record in the games it has actually played against `opponents`.
 * BYE rows and unplayed weeks carry no result, so they never count. */
function recordAgainst(team: Team, opponents: Set<string>): { wins: number; losses: number } {
  let wins = 0
  let losses = 0
  for (const game of team.schedule) {
    if (!game.result || !opponents.has(game.opponent)) continue
    if (game.result.outcome === "W") wins++
    else losses++
  }
  return { wins, losses }
}

/**
 * Standings order: win percentage, then head-to-head record among the tied
 * teams, then points for.
 *
 * Head-to-head is resolved as a mini round-robin *within* each tie group
 * rather than as a pairwise comparison inside the sort. Pairwise head-to-head
 * is not transitive once three or more teams are level (A beats B, B beats C,
 * C beats A), and feeding a non-transitive comparator to Array.sort produces
 * an order that depends on the sort's internal pivot choices — different
 * answers for the same data. Grouping first avoids that entirely.
 *
 * Head-to-head only breaks a tie when both teams have actually played someone
 * in the group; otherwise a team that hasn't yet faced any of its co-leaders
 * would be ranked as though it had lost to them. In that case the tie falls
 * straight through to points for.
 */
export function getStandings(): StandingRow[] {
  const groups = new Map<number, Team[]>()
  for (const team of TEAMS) {
    const pct = winPct(team.record.wins, team.record.losses)
    const group = groups.get(pct)
    if (group) group.push(team)
    else groups.set(pct, [team])
  }

  const sorted: Team[] = []
  for (const pct of [...groups.keys()].sort((a, b) => b - a)) {
    const tied = groups.get(pct)!
    if (tied.length === 1) {
      sorted.push(tied[0])
      continue
    }
    const tiedSlugs = new Set(tied.map((t) => t.slug))
    sorted.push(
      ...[...tied].sort((a, b) => {
        const ra = recordAgainst(a, tiedSlugs)
        const rb = recordAgainst(b, tiedSlugs)
        const aPlayed = ra.wins + ra.losses > 0
        const bPlayed = rb.wins + rb.losses > 0
        if (aPlayed && bPlayed) {
          const diff = winPct(rb.wins, rb.losses) - winPct(ra.wins, ra.losses)
          if (diff !== 0) return diff
        }
        return b.pointsFor - a.pointsFor
      }),
    )
  }

  const divCounters: Record<Division, number> = { East: 0, West: 0 }
  return sorted.map((t, i) => {
    divCounters[t.division] += 1
    return { ...t, rank: i + 1, divisionRank: divCounters[t.division] }
  })
}

export function getDivisionRank(slug: string): number {
  return getStandings().find((t) => t.slug === slug)?.divisionRank ?? 0
}

export function getNextGame(team: Team): Game | undefined {
  return team.schedule.find((g) => g.week === CURRENT_WEEK) ?? team.schedule.find((g) => !g.result)
}
