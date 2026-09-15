import { CURRENT_SEASON_YEAR, TEAMS, type Team } from "./league"

export type HistoryStatsRow = {
  team: Team
  yearJoined: number
  wins: number
  losses: number
  winPct: number
  totalPointsFor: number
  seasons: number
  pointsPerYear: number
  playoffAppearances: number
  playoffWins: number
  championships: number
}

export type AllTimeTotals = {
  wins: number
  losses: number
  winPct: number
  totalPointsFor: number
}

/**
 * A franchise's all-time record and points, current season included.
 *
 * data/history.csv holds completed seasons only — it is not rewritten week to
 * week as this season plays out. So all-time is those totals plus whatever has
 * been settled this year, which keeps every all-time figure in step with the
 * standings instead of trailing a season behind.
 *
 * Only finished games count, on both halves: `record` already excludes the
 * week in progress, and subtracting `livePointsFor` drops the in-progress
 * portion of `pointsFor` the same way. An unfinished week has no result to
 * add to an all-time record.
 *
 * Shared so the /history table and the team page sidebar can never drift
 * apart — they showed different all-time records when each did this itself.
 */
export function getAllTimeTotals(team: Team): AllTimeTotals {
  const { history } = team
  const wins = history.allTimeRecord.wins + team.record.wins
  const losses = history.allTimeRecord.losses + team.record.losses
  const finalPointsThisSeason = team.pointsFor - team.livePointsFor
  const totalGames = wins + losses
  return {
    wins,
    losses,
    winPct: totalGames > 0 ? wins / totalGames : 0,
    totalPointsFor: Math.round((history.totalPointsFor + finalPointsThisSeason) * 100) / 100,
  }
}

export function getHistoryStats(): HistoryStatsRow[] {
  return TEAMS.map((team) => {
    const { history } = team
    const seasons = Math.max(1, CURRENT_SEASON_YEAR - history.yearJoined + 1)
    const { wins, losses, winPct, totalPointsFor } = getAllTimeTotals(team)

    return {
      team,
      yearJoined: history.yearJoined,
      wins,
      losses,
      winPct,
      totalPointsFor,
      seasons,
      pointsPerYear: totalPointsFor / seasons,
      playoffAppearances: history.playoffAppearances,
      playoffWins: history.playoffWins,
      championships: history.championships,
    }
  })
}
