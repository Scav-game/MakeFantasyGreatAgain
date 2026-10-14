// Prints clinch / elimination scenarios for a week, using only results from
// before it. Same engine as the "Paths to Clinch" section on the home page.
//
//   node scripts/check-clinch.mjs            # the current week
//   node scripts/check-clinch.mjs --week=9   # replay going into week 9
//
// For a week that has already been played it also says what actually
// happened, by re-running the check with that week's results counted.
//
// Reads lib/generated/league-data.json, so run `npm run build:data` first if
// schedule.csv has changed.
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { analyzeClinch, describeClinchStatus, isSecured } from "../lib/clinch.ts"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const data = JSON.parse(fs.readFileSync(path.join(root, "lib", "generated", "league-data.json"), "utf8"))
const arg = process.argv.find((a) => a.startsWith("--week="))
const week = arg ? Number(arg.split("=")[1]) : data.CURRENT_WEEK

const report = analyzeClinch(data.TEAMS, week)
console.log(`Going into week ${week} (results from weeks 1-${week - 1} counted):`)
if (report.statuses.length === 0) console.log("  No clinch or elimination scenarios are possible.")
for (const status of report.statuses) console.log(`  - ${describeClinchStatus(status, data.TEAMS)}`)

const played = data.TEAMS.some((t) => t.schedule.some((g) => g.week === week && g.result))
if (played) {
  const before = new Set(report.statuses.filter((s) => s.kind !== "scenario").map((s) => `${s.team.slug}|${s.kind}`))
  const after = analyzeClinch(data.TEAMS, week + 1).statuses.filter((s) => s.kind !== "scenario")
  const fresh = after.filter((s) => !before.has(`${s.team.slug}|${s.kind}`))
  console.log(`\nAfter week ${week}'s results:`)
  if (fresh.length === 0) console.log("  Nobody clinched or was eliminated.")
  for (const s of fresh) console.log(`  ${isSecured(s) ? "+" : "x"} ${describeClinchStatus(s, data.TEAMS)}`)
}
