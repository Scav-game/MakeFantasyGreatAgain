// Scores a week of predictions against the real ESPN results.
//
//   node scripts/score-predictions.js --week=1
//
// Fills in each matchup's winner, marks every pick correct or incorrect,
// flags the lone wolf picks, and flips the week from "pending" to "complete".
// Needs no API key; ESPN's read endpoint is public for this league.
const {
  fetchWeekResults,
  getWeekMatchups,
  parseWeekArg,
  readPredictors,
  readWeekFile,
  weekFilePath,
  writeWeekFile,
} = require("./lib/league-espn")

const POINTS_PER_CORRECT = 1
const LONE_WOLF_BONUS = 3
const PERFECT_WEEK_BONUS = 5

async function main() {
  const week = parseWeekArg(process.argv)
  if (!week) {
    console.error("Usage: node scripts/score-predictions.js --week=N")
    process.exitCode = 1
    return
  }

  const weekFile = readWeekFile(week)
  if (!weekFile) {
    console.error(`No ${weekFilePath(week)} to score. Generate the week first.`)
    process.exitCode = 1
    return
  }

  const predictors = readPredictors()
  const { source, scores } = await fetchWeekResults(week)
  console.log(`Week ${week} results from ${source}: ${Object.keys(scores).length} team scores`)

  // Fall back to the schedule if the week file predates a schedule change.
  const matchups = weekFile.matchups?.length ? weekFile.matchups : getWeekMatchups(week)

  let settled = 0
  const unsettled = []

  for (const matchup of matchups) {
    const awayScore = scores[matchup.away]
    const homeScore = scores[matchup.home]

    if (typeof awayScore !== "number" || typeof homeScore !== "number") {
      matchup.winner = matchup.winner ?? null
      unsettled.push(matchup.id)
      continue
    }

    // A tie goes to the home team, matching how the site's league data treats
    // teamScore >= oppScore as a win.
    matchup.winner = awayScore > homeScore ? matchup.away : matchup.home
    matchup.awayScore = awayScore
    matchup.homeScore = homeScore
    settled += 1

    console.log(
      `  ${matchup.away} ${awayScore} at ${matchup.home} ${homeScore} -> ${matchup.winner}`,
    )
  }

  // Per-matchup vote tally, so a lone wolf is the only predictor on that team.
  const votesByMatchup = {}
  for (const matchup of matchups) {
    const tally = {}
    for (const entry of Object.values(weekFile.picks ?? {})) {
      const pick = entry?.picks?.[matchup.id]
      if (pick) tally[pick] = (tally[pick] ?? 0) + 1
    }
    votesByMatchup[matchup.id] = tally
  }

  const totals = {}

  for (const predictor of predictors) {
    const entry = weekFile.picks?.[predictor.id]
    if (!entry) continue

    const correct = {}
    const loneWolf = {}
    let points = 0
    let right = 0
    let scoredCount = 0
    let loneWolfWins = 0

    for (const matchup of matchups) {
      const pick = entry.picks?.[matchup.id]
      if (!pick) continue

      const isLoneWolf = votesByMatchup[matchup.id][pick] === 1
      loneWolf[matchup.id] = isLoneWolf

      if (!matchup.winner) {
        correct[matchup.id] = null
        continue
      }

      const isCorrect = pick === matchup.winner
      correct[matchup.id] = isCorrect
      scoredCount += 1

      if (isCorrect) {
        right += 1
        points += POINTS_PER_CORRECT
        if (isLoneWolf) {
          points += LONE_WOLF_BONUS
          loneWolfWins += 1
        }
      }
    }

    const perfect = scoredCount > 0 && right === scoredCount && unsettled.length === 0
    if (perfect) points += PERFECT_WEEK_BONUS

    entry.correct = correct
    entry.loneWolf = loneWolf

    totals[predictor.id] = { name: predictor.shortName, right, scoredCount, points, perfect, loneWolfWins }
  }

  weekFile.matchups = matchups
  weekFile.status = unsettled.length === 0 && settled > 0 ? "complete" : "pending"
  weekFile.scoredAt = new Date().toISOString()

  const file = writeWeekFile(week, weekFile)

  console.log(`\nWrote ${file} (status: ${weekFile.status})`)

  const ranked = Object.values(totals).sort((a, b) => b.points - a.points || b.right - a.right)
  for (const [i, row] of ranked.entries()) {
    const flags = [row.perfect ? "PERFECT WEEK" : null, row.loneWolfWins ? `${row.loneWolfWins} lone wolf` : null]
      .filter(Boolean)
      .join(", ")
    console.log(
      `  ${i + 1}. ${row.name}: ${row.right}/${row.scoredCount} for ${row.points} pts${flags ? ` (${flags})` : ""}`,
    )
  }

  if (unsettled.length > 0) {
    console.warn(
      `\n${unsettled.length} matchup(s) have no final score yet, so the week stays pending: ${unsettled.join(", ")}`,
    )
    console.warn("Re-run this script once ESPN has settled them.")
  } else {
    console.log("\nRun `npm run build:data` (or any build) to update the leaderboard on /predictions.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
