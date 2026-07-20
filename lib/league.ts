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
  championships: number
}

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
  pointsFor: number
  pointsAgainst: number
  streak: string
  roster: { starters: Player[]; bench: Player[] }
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
}
export const CUSTOM_NEWS: CustomNewsRow[] = leagueData.CUSTOM_NEWS as CustomNewsRow[]

export function getTeam(slug: string): Team | undefined {
  return TEAMS.find((t) => t.slug === slug)
}

export function getTeamName(slug: string): string {
  return getTeam(slug)?.name ?? slug
}

export type StandingRow = Team & { rank: number; divisionRank: number }

export function getStandings(): StandingRow[] {
  const sorted = [...TEAMS].sort((a, b) => {
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins
    return b.pointsFor - a.pointsFor
  })
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
