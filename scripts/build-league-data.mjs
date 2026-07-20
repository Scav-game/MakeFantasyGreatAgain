// Reads the human-edited CSVs in /data and compiles them into
// lib/generated/league-data.json, which lib/league.ts imports as plain
// static data (safe to bundle into both server and client code — no
// filesystem access happens outside this script). Run automatically before
// `next dev` / `next build` via the predev/prebuild npm scripts.
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const OUT_DIR = path.join(ROOT, "lib", "generated")

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""))
}

function readCsvRecords(filename) {
  const filePath = path.join(DATA_DIR, filename)
  const text = readFileSync(filePath, "utf8")
  const rows = parseCsv(text)
  const header = rows[0]
  return rows.slice(1).map((row) => {
    const record = {}
    header.forEach((key, i) => {
      record[key.trim()] = (row[i] ?? "").trim()
    })
    return record
  })
}

const teamsCsv = readCsvRecords("teams.csv")
const scheduleCsv = readCsvRecords("schedule.csv")
const rostersCsv = readCsvRecords("rosters.csv")
const draftPicksCsv = readCsvRecords("draft-picks.csv")
const historyCsv = readCsvRecords("history.csv")
const newsCsv = readCsvRecords("news.csv")
const pastTeamsCsv = readCsvRecords("past-teams.csv")

const TOTAL_WEEKS = 14

function computeCurrentWeek(scheduleRows) {
  const weeks = [...new Set(scheduleRows.map((r) => Number(r.week)))].sort((a, b) => a - b)
  for (const week of weeks) {
    const gamesThisWeek = scheduleRows.filter((r) => Number(r.week) === week)
    const complete = gamesThisWeek.every((r) => r.teamScore !== "" && r.oppScore !== "")
    if (!complete) return week
  }
  return weeks.length > 0 ? Math.min(weeks[weeks.length - 1], TOTAL_WEEKS) : 1
}

const CURRENT_WEEK = computeCurrentWeek(scheduleCsv)

const TEAMS = teamsCsv.map((t) => {
  const schedule = scheduleCsv
    .filter((r) => r.slug === t.slug)
    .sort((a, b) => Number(a.week) - Number(b.week))
    .map((r) => {
      const game = {
        week: Number(r.week),
        opponent: r.opponent,
        date: r.date,
        ...(r.time ? { time: r.time } : {}),
        home: r.home.toLowerCase() === "yes" || r.home.toLowerCase() === "true",
      }
      if (r.teamScore !== "" && r.oppScore !== "") {
        const teamScore = Number(r.teamScore)
        const oppScore = Number(r.oppScore)
        game.result = { outcome: teamScore >= oppScore ? "W" : "L", teamScore, oppScore }
      }
      return game
    })

  const played = schedule.filter((g) => g.result)
  const wins = played.filter((g) => g.result.outcome === "W").length
  const losses = played.filter((g) => g.result.outcome === "L").length
  const pointsFor = Math.round(played.reduce((s, g) => s + g.result.teamScore, 0) * 10) / 10
  const pointsAgainst = Math.round(played.reduce((s, g) => s + g.result.oppScore, 0) * 10) / 10

  let streak = "—"
  if (played.length) {
    const lastOutcome = played[played.length - 1].result.outcome
    let count = 0
    for (let i = played.length - 1; i >= 0; i--) {
      if (played[i].result.outcome === lastOutcome) count++
      else break
    }
    streak = `${lastOutcome}${count}`
  }

  const roster = { starters: [], bench: [] }
  for (const p of rostersCsv.filter((r) => r.teamSlug === t.slug)) {
    const player = { name: p.name, pos: p.pos, nflTeam: p.nflTeam, points: Number(p.points) }
    if (p.group === "starter") roster.starters.push(player)
    else roster.bench.push(player)
  }

  const draftPicks = draftPicksCsv
    .filter((d) => d.teamSlug === t.slug)
    .map((d) => ({ year: Number(d.year), round: d.round, origin: d.origin }))

  const historyRow = historyCsv.find((h) => h.slug === t.slug)
  const history = historyRow
    ? {
        yearJoined: Number(historyRow.yearJoined),
        allTimeRecord: { wins: Number(historyRow.allTimeWins), losses: Number(historyRow.allTimeLosses) },
        totalPointsFor: Number(historyRow.totalPointsFor),
        playoffAppearances: Number(historyRow.playoffAppearances),
        playoffWins: Number(historyRow.playoffWins || 0),
        championships: Number(historyRow.championships),
      }
    : {
        yearJoined: 2018,
        allTimeRecord: { wins: 0, losses: 0 },
        totalPointsFor: 0,
        playoffAppearances: 0,
        playoffWins: 0,
        championships: 0,
      }

  return {
    slug: t.slug,
    name: t.name,
    nameLines: [t.nameLine1, t.nameLine2],
    accentLine: Number(t.accentLine),
    division: t.division,
    tagline: t.tagline,
    theme: t.theme,
    stadium: { name: t.stadiumName, city: t.stadiumCity },
    hero: t.hero,
    colors: { primary: t.colorPrimary, accent: t.colorAccent, dark: t.colorDark, light: t.colorLight },
    record: { wins, losses },
    pointsFor,
    pointsAgainst,
    streak,
    roster,
    draftPicks,
    schedule,
    history,
  }
})

const CUSTOM_NEWS = newsCsv.map((n) => ({
  date: n.date,
  headline: n.headline,
  body: n.body,
  teamSlug: n.team || null,
  author: n.author || null,
}))

const PAST_TEAMS = pastTeamsCsv
  .filter((p) => p.slug && p.name)
  .map((p) => ({
    slug: p.slug,
    name: p.name,
    hero: p.hero,
    colors: { primary: p.colorPrimary, accent: p.colorAccent, dark: p.colorDark, light: p.colorLight },
    yearJoined: Number(p.yearJoined),
    yearLeft: Number(p.yearLeft),
    allTimeRecord: { wins: Number(p.allTimeWins || 0), losses: Number(p.allTimeLosses || 0) },
    totalPointsFor: Number(p.totalPointsFor || 0),
    playoffAppearances: Number(p.playoffAppearances || 0),
    playoffWins: Number(p.playoffWins || 0),
    championships: Number(p.championships || 0),
  }))

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  path.join(OUT_DIR, "league-data.json"),
  JSON.stringify({ CURRENT_WEEK, TEAMS, CUSTOM_NEWS, PAST_TEAMS }, null, 2),
)

console.log(
  `Built lib/generated/league-data.json — ${TEAMS.length} teams, CURRENT_WEEK=${CURRENT_WEEK}, ${CUSTOM_NEWS.length} custom news stories, ${PAST_TEAMS.length} past teams`,
)
