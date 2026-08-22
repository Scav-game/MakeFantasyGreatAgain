import predictorsData from "@/data/predictions/predictors.json"
import week1 from "@/data/predictions/week-1.json"
import { getTeam } from "@/lib/league"

export type Predictor = {
  id: string
  name: string
  shortName: string
  age: number
  title: string
  description: string
  avatar: string
  accentColor: string
}

export type Prediction = {
  predictorId: string
  pick: string
  reasoning: string
}

export type Matchup = {
  id: string
  away: string
  home: string
  awayRecord: string
  homeRecord: string
  winner: string | null
  predictions: Prediction[]
}

export type PredictionWeekStatus = "pending" | "complete"

export type PredictionWeek = {
  week: number
  status: PredictionWeekStatus
  matchups: Matchup[]
}

export const PREDICTORS: Predictor[] = predictorsData as Predictor[]

/**
 * One entry per week-N.json file in data/predictions/. Add the new import
 * and push it here whenever a new week's predictions are generated, the
 * same "update this list by hand" pattern as the team logo/avatar extension
 * maps elsewhere in this codebase.
 */
export const PREDICTION_WEEKS: PredictionWeek[] = [week1 as PredictionWeek]

export function getPredictor(id: string): Predictor | undefined {
  return PREDICTORS.find((p) => p.id === id)
}

/** Weeks sorted most recent first. Index 0 is "the current week" whether it's pending or just completed. */
export function getWeeksDescending(): PredictionWeek[] {
  return [...PREDICTION_WEEKS].sort((a, b) => b.week - a.week)
}

export function getCurrentWeek(): PredictionWeek | undefined {
  return getWeeksDescending()[0]
}

export function getPastWeeks(): PredictionWeek[] {
  return getWeeksDescending().slice(1)
}

/** A pick is a lone wolf whenever it's the only vote for that team, win or lose, before or after the game. */
export function isLoneWolf(matchup: Matchup, predictorId: string): boolean {
  const pick = matchup.predictions.find((p) => p.predictorId === predictorId)?.pick
  if (!pick) return false
  return matchup.predictions.filter((p) => p.pick === pick).length === 1
}

/** null until the matchup has a winner. */
export function isPredictionCorrect(matchup: Matchup, prediction: Prediction): boolean | null {
  if (!matchup.winner) return null
  return prediction.pick === matchup.winner
}

const POINTS_PER_CORRECT = 1
const LONE_WOLF_BONUS = 2

export type LeaderboardRow = {
  predictor: Predictor
  rank: number
  totalPoints: number
  correctPicks: number
  incorrectPicks: number
  totalPicks: number
  winPercentage: number
  perfectWeeks: number
  loneWolfWins: number
  loneWolfAttempts: number
}

/**
 * Entirely derived from the week files. Nothing here is hand-maintained.
 * Only weeks marked "complete" count toward the standings; a "pending"
 * week's picks are visible on the page but don't score until results land.
 */
export function computeLeaderboard(): LeaderboardRow[] {
  const completeWeeks = PREDICTION_WEEKS.filter((w) => w.status === "complete")

  const rows: LeaderboardRow[] = PREDICTORS.map((predictor) => {
    let correctPicks = 0
    let totalPicks = 0
    let totalPoints = 0
    let perfectWeeks = 0
    let loneWolfWins = 0
    let loneWolfAttempts = 0

    for (const week of completeWeeks) {
      let weekCorrect = 0
      let weekTotal = 0

      for (const matchup of week.matchups) {
        const prediction = matchup.predictions.find((p) => p.predictorId === predictor.id)
        if (!prediction) continue

        const correct = isPredictionCorrect(matchup, prediction)
        if (correct === null) continue

        weekTotal += 1
        totalPicks += 1

        const loneWolf = isLoneWolf(matchup, predictor.id)
        if (loneWolf) loneWolfAttempts += 1

        if (correct) {
          weekCorrect += 1
          correctPicks += 1
          totalPoints += POINTS_PER_CORRECT
          if (loneWolf) {
            loneWolfWins += 1
            totalPoints += LONE_WOLF_BONUS
          }
        }
      }

      if (weekTotal > 0 && weekCorrect === weekTotal) perfectWeeks += 1
    }

    return {
      predictor,
      rank: 0,
      totalPoints,
      correctPicks,
      incorrectPicks: totalPicks - correctPicks,
      totalPicks,
      winPercentage: totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0,
      perfectWeeks,
      loneWolfWins,
      loneWolfAttempts,
    }
  })

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage
    return b.correctPicks - a.correctPicks
  })

  return rows.map((row, i) => ({ ...row, rank: i + 1 }))
}

export type PredictorWeekStat = {
  week: number
  status: PredictionWeekStatus
  correct: number
  total: number
  points: number
  perfect: boolean
  loneWolfPicks: number
}

export function getPredictorWeeklyStats(predictorId: string): PredictorWeekStat[] {
  return getWeeksDescending().map((week) => {
    let correct = 0
    let total = 0
    let points = 0
    let loneWolfPicks = 0

    for (const matchup of week.matchups) {
      const prediction = matchup.predictions.find((p) => p.predictorId === predictorId)
      if (!prediction) continue

      if (isLoneWolf(matchup, predictorId)) loneWolfPicks += 1

      const correctness = isPredictionCorrect(matchup, prediction)
      if (correctness === null) continue

      total += 1
      if (correctness) {
        correct += 1
        points += POINTS_PER_CORRECT
        if (isLoneWolf(matchup, predictorId)) points += LONE_WOLF_BONUS
      }
    }

    return {
      week: week.week,
      status: week.status,
      correct,
      total,
      points,
      perfect: week.status === "complete" && total > 0 && correct === total,
      loneWolfPicks,
    }
  })
}

export function getMatchupTeams(matchup: Matchup) {
  return { away: getTeam(matchup.away), home: getTeam(matchup.home) }
}

/** Pulls the actual final score from the team schedule data, if that game's been played. */
export function getMatchupScore(week: number, matchup: Matchup): { awayScore: number; homeScore: number } | null {
  const awayTeam = getTeam(matchup.away)
  const game = awayTeam?.schedule.find((g) => g.week === week && g.opponent === matchup.home)
  if (!game?.result) return null
  return { awayScore: game.result.teamScore, homeScore: game.result.oppScore }
}
