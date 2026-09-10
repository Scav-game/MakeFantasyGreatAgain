// Writes data/live-scores.csv: what each team's starting lineup has scored in
// the week that is currently in progress.
//
// Why this exists: pointsFor in the standings is summed from schedule.csv, and
// a row there only counts once BOTH final scores are filled in. That is the
// right rule — filling a week in early would mark it complete, advance
// CURRENT_WEEK, and bake in W/L results that aren't settled. But it also means
// that mid-week every team sits at 0.0 points for and the standings have no
// tiebreaker to sort on.
//
// So live points ride alongside the schedule instead of inside it. The build
// adds a live row to a team's pointsFor only while that team's schedule row for
// that week has no result, so the moment a real final score is entered the live
// value is ignored automatically. Records and CURRENT_WEEK never see it.
//
// ESPN's own team-level totals (team.points, matchup.totalPoints) stay 0.0
// until the scoring period locks, so they're useless here. Per-player
// appliedStatTotal is live, so the total is summed from the players actually
// started — bench and IR excluded, which is the whole point.
//
// Run with `npm run sync:live`, optionally `-- --week=3`.
const fs = require("fs")
const path = require("path")
const {
  IR_LINEUP_SLOT_ID,
  LEAGUE_ID,
  SEASON,
  fetchEspn,
  parseWeekArg,
  slugForEspnTeam,
} = require("./lib/league-espn")

const LIVE_SCORES_CSV = path.join(__dirname, "..", "data", "live-scores.csv")

const BENCH_LINEUP_SLOT_ID = 20
const BENCHED = new Set([BENCH_LINEUP_SLOT_ID, IR_LINEUP_SLOT_ID])

function csvField(v) {
  v = String(v ?? "")
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

/** Points scored by the players a manager actually started. */
function startedTotal(team) {
  let total = 0
  for (const entry of team.roster?.entries ?? []) {
    if (BENCHED.has(entry.lineupSlotId)) continue
    total += entry.playerPoolEntry?.appliedStatTotal ?? 0
  }
  return Math.round(total * 100) / 100
}

async function main() {
  const requested = parseWeekArg(process.argv)
  console.log(`Fetching league ${LEAGUE_ID} (season ${SEASON}) from ESPN...`)

  let league
  try {
    // A first call without a scoring period tells us which week ESPN considers
    // live; asking for the wrong period returns projections, not real points.
    const status = await fetchEspn(["mTeam"])
    const week = requested ?? status.scoringPeriodId
    if (!Number.isInteger(week) || week < 1) {
      console.error(`Could not determine the current scoring period (got ${week}).`)
      process.exitCode = 1
      return
    }
    league = await fetchEspn(["mRoster", "mTeam"], { scoringPeriodId: week })
    league.__week = week
  } catch (err) {
    console.error("Failed to fetch ESPN league data:", err.message)
    process.exitCode = 1
    return
  }

  const week = league.__week
  const rows = []
  const unmatched = []
  for (const team of league.teams ?? []) {
    const slug = slugForEspnTeam(team)
    if (!slug) {
      unmatched.push(team.name)
      continue
    }
    rows.push({ teamSlug: slug, week, points: startedTotal(team) })
  }

  if (unmatched.length > 0) {
    console.warn("Could not match these ESPN team names to a slug:", unmatched)
  }
  if (rows.length === 0) {
    console.error("ESPN returned no roster data — not overwriting live-scores.csv.")
    process.exitCode = 1
    return
  }

  rows.sort((a, b) => a.teamSlug.localeCompare(b.teamSlug))
  const csv =
    ["teamSlug,week,points"]
      .concat(rows.map((r) => [r.teamSlug, r.week, r.points].map(csvField).join(",")))
      .join("\n") + "\n"
  fs.writeFileSync(LIVE_SCORES_CSV, csv)

  const total = rows.reduce((s, r) => s + r.points, 0)
  console.log(`Updated data/live-scores.csv — week ${week}, ${rows.length} teams, ${total.toFixed(2)} points total:`)
  for (const r of [...rows].sort((a, b) => b.points - a.points)) {
    console.log(`  ${r.points.toFixed(2).padStart(7)}  ${r.teamSlug}`)
  }
}

main()
