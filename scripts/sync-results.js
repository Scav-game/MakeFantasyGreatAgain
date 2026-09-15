// Fills in the final scores on data/schedule.csv from ESPN.
//
//   node scripts/sync-results.js            # every settled week
//   node scripts/sync-results.js --week=1   # just one week
//   node scripts/sync-results.js --force    # also rewrite scores already there
//
// Why this exists: schedule.csv's teamScore/oppScore columns are the single
// source of truth for the current season's records and points for. The build
// (scripts/build-league-data.mjs) only counts a game once BOTH are filled in,
// so until a week's finals land here every page shows the week as unplayed —
// standings, team pages, the championship odds, the schedule comparison and
// the all-time history table all read from the same compiled data.
//
// Only weeks ESPN has actually settled (winner != UNDECIDED) are written, so
// running this mid-week can't bake in a result that isn't final. Live points
// for the week in progress are a separate concern — see sync-live-scores.js.
const fs = require("fs")
const path = require("path")
const { fetchEspn, parseWeekArg, slugForEspnTeam } = require("./lib/league-espn")

const SCHEDULE_CSV = path.join(__dirname, "..", "data", "schedule.csv")

/** Settled finals from ESPN as `slug|week` -> points, at ESPN's own precision. */
async function fetchSettledScores() {
  const data = await fetchEspn(["mMatchup", "mMatchupScore", "mTeam"])

  const slugByEspnId = {}
  for (const team of data.teams ?? []) {
    const slug = slugForEspnTeam(team)
    if (slug) slugByEspnId[team.id] = slug
  }

  const scores = new Map()
  const weeks = new Set()
  for (const game of data.schedule ?? []) {
    if (!game.winner || game.winner === "UNDECIDED") continue
    for (const side of ["home", "away"]) {
      const entry = game[side]
      if (!entry) continue
      const slug = slugByEspnId[entry.teamId]
      if (!slug || typeof entry.totalPoints !== "number") continue
      scores.set(`${slug}|${game.matchupPeriodId}`, Math.round(entry.totalPoints * 100) / 100)
      weeks.add(game.matchupPeriodId)
    }
  }
  return { scores, weeks }
}

async function main() {
  const onlyWeek = parseWeekArg(process.argv)
  const force = process.argv.includes("--force")

  let settled
  try {
    settled = await fetchSettledScores()
  } catch (err) {
    console.error("Failed to fetch ESPN results:", err.message)
    process.exitCode = 1
    return
  }

  const { scores, weeks } = settled
  if (scores.size === 0) {
    console.error("ESPN has no settled results yet — leaving data/schedule.csv alone.")
    process.exitCode = 1
    return
  }

  const weekList = [...weeks].sort((a, b) => a - b)
  console.log(`ESPN has settled results for week(s): ${weekList.join(", ")}`)

  const lines = fs.readFileSync(SCHEDULE_CSV, "utf8").split(/\r?\n/)
  const header = lines[0].split(",").map((h) => h.trim())
  const col = (name) => header.indexOf(name)
  const iSlug = col("slug")
  const iWeek = col("week")
  const iOpp = col("opponent")
  const iTeam = col("teamScore")
  const iOppScore = col("oppScore")
  if ([iSlug, iWeek, iOpp, iTeam, iOppScore].some((i) => i === -1)) {
    console.error("data/schedule.csv is missing one of the expected columns.")
    process.exitCode = 1
    return
  }

  let filled = 0
  let skipped = 0
  const touchedWeeks = new Set()

  const out = lines.map((line, n) => {
    if (n === 0 || line.trim() === "") return line
    const cells = line.split(",")
    const slug = cells[iSlug].trim()
    const week = Number(cells[iWeek])
    const opponent = cells[iOpp].trim()

    if (onlyWeek && week !== onlyWeek) return line
    if (!opponent || opponent.toUpperCase() === "BYE") return line
    if (!force && cells[iTeam].trim() !== "" && cells[iOppScore].trim() !== "") {
      skipped++
      return line
    }

    const mine = scores.get(`${slug}|${week}`)
    const theirs = scores.get(`${opponent}|${week}`)
    if (!Number.isFinite(mine) || !Number.isFinite(theirs)) return line

    cells[iTeam] = String(mine)
    cells[iOppScore] = String(theirs)
    filled++
    touchedWeeks.add(week)
    console.log(`  week ${week}: ${slug} ${mine} vs ${opponent} ${theirs}`)
    return cells.join(",")
  })

  if (filled === 0) {
    console.log(`\nNothing to fill (${skipped} row(s) already had final scores).`)
    return
  }

  fs.writeFileSync(SCHEDULE_CSV, out.join("\n"))
  console.log(
    `\nWrote data/schedule.csv — ${filled} row(s) across week(s) ${[...touchedWeeks].sort((a, b) => a - b).join(", ")}${
      skipped ? `, ${skipped} already final` : ""
    }.`,
  )
  console.log("Run `npm run build:data` to push this through to every page.")
}

main()
