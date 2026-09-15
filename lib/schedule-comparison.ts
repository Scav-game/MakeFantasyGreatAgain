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
  /**
   * True when every schedule in the league produces that same best record, so
   * naming one of them would imply it was special when it wasn't. Early in a
   * season most teams tie across all fourteen.
   */
  bestIsUniversal: boolean
  /** Record if they had played every other team every week. */
  allPlay: { wins: number; losses: number }
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
    const slot = scheduleTeam.schedule.find((g) => g.week === week)
    if (!own || !slot?.result) continue

    // Whoever filled that slot on `scheduleTeam`'s card is the opponent — except
    // when it was `team` themselves, because you cannot play yourself. In that
    // week `team` takes the schedule owner's place, so the opponent becomes the
    // owner. Reading oppScore blindly there compared a team's score against
    // itself, which `>=` scored as a guaranteed win: it was handing Fort Bragg
    // a 1-0 "best possible" via Englewood in the very week Englewood beat them.
    const oppScore = slot.opponent === team.slug ? slot.result.teamScore : slot.result.oppScore

    if (own.teamScore >= oppScore) wins++
    else losses++
  }
  return { scheduleTeam, wins, losses }
}

/**
 * Record if they had played every other team every week: one game against all
 * thirteen rivals per week, so the week's top scorer goes 13-0 and the bottom
 * one 0-13. This is schedule luck stripped out entirely — pure "did you score
 * more points than the other guy" over and over.
 *
 * Ties count as a win, matching how every other record on the site treats
 * teamScore >= oppScore.
 */
function allPlayRecord(team: Team): { wins: number; losses: number } {
  let wins = 0
  let losses = 0
  for (const week of PLAYED_WEEKS) {
    const own = team.schedule.find((g) => g.week === week)?.result
    if (!own) continue
    for (const other of TEAMS) {
      if (other.slug === team.slug) continue
      const theirs = other.schedule.find((g) => g.week === week)?.result
      if (!theirs) continue
      if (own.teamScore >= theirs.teamScore) wins++
      else losses++
    }
  }
  return { wins, losses }
}

/**
 * Every team's comparison, ordered by their all-play record - best first, so
 * the table reads as a ranking of who has actually outscored the league rather
 * than league file order.
 *
 * Sorted on win percentage rather than raw wins so a team coming off a bye,
 * who has played fewer all-play games, is not pushed down for it. Ties break on
 * wins and then points for.
 */
export function getScheduleComparisons(): TeamScheduleComparison[] {
  const comparisons = TEAMS.map((team) => {
    const bySchedule = TEAMS.map((scheduleTeam) => recordAgainstSchedule(team, scheduleTeam))

    const best = bySchedule.reduce((a, b) => (b.wins > a.wins ? b : a))
    const avgWins = bySchedule.reduce((sum, r) => sum + r.wins, 0) / bySchedule.length

    return {
      team,
      actual: team.record,
      best,
      bestIsUniversal: bySchedule.every((r) => r.wins === best.wins),
      allPlay: allPlayRecord(team),
      luckDelta: team.record.wins - avgWins,
      bySchedule,
    }
  })

  const winPct = (r: { wins: number; losses: number }) => {
    const games = r.wins + r.losses
    return games > 0 ? r.wins / games : 0
  }

  return comparisons.sort(
    (a, b) =>
      winPct(b.allPlay) - winPct(a.allPlay) ||
      b.allPlay.wins - a.allPlay.wins ||
      b.team.pointsFor - a.team.pointsFor,
  )
}

export function getLuckiest(comparisons: TeamScheduleComparison[]): TeamScheduleComparison {
  return comparisons.reduce((a, b) => (b.luckDelta > a.luckDelta ? b : a))
}

export function getUnluckiest(comparisons: TeamScheduleComparison[]): TeamScheduleComparison {
  return comparisons.reduce((a, b) => (b.luckDelta < a.luckDelta ? b : a))
}
