import { CURRENT_WEEK, TEAMS, type Team } from "./league"

export type ScheduleResult = {
  scheduleTeam: Team
  wins: number
  losses: number
}

export type TeamScheduleComparison = {
  team: Team
  actual: { wins: number; losses: number }
  best: ScheduleResult
  worst: ScheduleResult
  /** actual wins minus the average wins across every possible schedule — positive means lucky. */
  luckDelta: number
  bySchedule: ScheduleResult[]
}

const PLAYED_WEEKS = Array.from({ length: Math.max(0, CURRENT_WEEK - 1) }, (_, i) => i + 1)

/**
 * What team `team`'s record would be had they kept their own weekly scores
 * but faced the opponents (and thus opposing scores) that `scheduleTeam`
 * actually faced each week.
 */
function recordAgainstSchedule(team: Team, scheduleTeam: Team): ScheduleResult {
  let wins = 0
  let losses = 0
  for (const week of PLAYED_WEEKS) {
    const own = team.schedule.find((g) => g.week === week)?.result
    const opp = scheduleTeam.schedule.find((g) => g.week === week)?.result
    if (!own || !opp) continue
    if (own.teamScore >= opp.oppScore) wins++
    else losses++
  }
  return { scheduleTeam, wins, losses }
}

export function getScheduleComparisons(): TeamScheduleComparison[] {
  return TEAMS.map((team) => {
    const bySchedule = TEAMS.map((scheduleTeam) => recordAgainstSchedule(team, scheduleTeam))

    const best = bySchedule.reduce((a, b) => (b.wins > a.wins ? b : a))
    const worst = bySchedule.reduce((a, b) => (b.wins < a.wins ? b : a))
    const avgWins = bySchedule.reduce((sum, r) => sum + r.wins, 0) / bySchedule.length

    return {
      team,
      actual: team.record,
      best,
      worst,
      luckDelta: team.record.wins - avgWins,
      bySchedule,
    }
  })
}

export function getLuckiest(comparisons: TeamScheduleComparison[]): TeamScheduleComparison {
  return comparisons.reduce((a, b) => (b.luckDelta > a.luckDelta ? b : a))
}

export function getUnluckiest(comparisons: TeamScheduleComparison[]): TeamScheduleComparison {
  return comparisons.reduce((a, b) => (b.luckDelta < a.luckDelta ? b : a))
}
