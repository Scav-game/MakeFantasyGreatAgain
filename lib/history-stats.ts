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

export function getHistoryStats(): HistoryStatsRow[] {
  return TEAMS.map((team) => {
    const { history } = team
    const seasons = Math.max(1, CURRENT_SEASON_YEAR - history.yearJoined + 1)
    const { wins, losses } = history.allTimeRecord
    const totalGames = wins + losses
    return {
      team,
      yearJoined: history.yearJoined,
      wins,
      losses,
      winPct: totalGames > 0 ? wins / totalGames : 0,
      totalPointsFor: history.totalPointsFor,
      seasons,
      pointsPerYear: history.totalPointsFor / seasons,
      playoffAppearances: history.playoffAppearances,
      playoffWins: history.playoffWins,
      championships: history.championships,
    }
  })
}
