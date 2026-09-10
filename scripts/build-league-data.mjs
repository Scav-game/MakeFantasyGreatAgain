// Reads the human-edited CSVs in /data and compiles them into
// lib/generated/league-data.json, which lib/league.ts imports as plain
// static data (safe to bundle into both server and client code — no
// filesystem access happens outside this script). Run automatically before
// `next dev` / `next build` via the predev/prebuild npm scripts.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs"
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

function readCsvRecords(filename, { optional = false } = {}) {
  const filePath = path.join(DATA_DIR, filename)
  if (optional && !existsSync(filePath)) return []
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
// In-progress week scoring, written by scripts/sync-live-scores.js. Optional:
// with the file absent everything behaves as though the week hasn't started.
const liveScoresCsv = readCsvRecords("live-scores.csv", { optional: true })

/**
 * Live points for a team, by week. Only weeks whose schedule row has no final
 * result are kept, so once a real score is entered the live figure for that
 * week drops out on its own and can never be counted twice.
 */
function livePointsByWeek(slug, schedule) {
  const unfinished = new Set(schedule.filter((g) => !g.result).map((g) => g.week))
  const byWeek = new Map()
  for (const row of liveScoresCsv) {
    if (row.teamSlug !== slug) continue
    const week = Number(row.week)
    const points = Number(row.points)
    if (!Number.isFinite(week) || !Number.isFinite(points)) continue
    if (!unfinished.has(week)) continue
    byWeek.set(week, points)
  }
  return byWeek
}

const TOTAL_WEEKS = 14

const ROSTER_POSITION_ORDER = ["QB", "RB", "WR", "TE", "D/ST", "K"]
function posRank(pos) {
  const i = ROSTER_POSITION_ORDER.indexOf(pos)
  return i === -1 ? ROSTER_POSITION_ORDER.length : i
}

function computeCurrentWeek(scheduleRows) {
  const weeks = [...new Set(scheduleRows.map((r) => Number(r.week)))].sort((a, b) => a - b)
  for (const week of weeks) {
    // BYE rows never get scores, so they must not count toward "is this week
    // complete" — otherwise CURRENT_WEEK sticks on the first week containing a
    // bye (week 5 in the 2026 schedule) and the season never advances.
    const gamesThisWeek = scheduleRows.filter(
      (r) => Number(r.week) === week && r.opponent.trim().toUpperCase() !== "BYE",
    )
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

  // Points for includes the week in progress so the standings have something
  // to sort on mid-week. Wins, losses and CURRENT_WEEK deliberately do not —
  // an unfinished game has no winner, and treating it as one would fabricate
  // records. `livePointsFor` is reported separately so the UI can say which
  // part of the total isn't final yet.
  const livePoints = livePointsByWeek(t.slug, schedule)
  const livePointsFor =
    Math.round([...livePoints.values()].reduce((s, v) => s + v, 0) * 10) / 10
  const finalPointsFor = Math.round(played.reduce((s, g) => s + g.result.teamScore, 0) * 10) / 10
  const pointsFor = Math.round((finalPointsFor + livePointsFor) * 10) / 10
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

  const roster = { active: [], ir: [] }
  for (const p of rostersCsv.filter((r) => r.teamSlug === t.slug)) {
    if (!p.name) continue
    const player = { name: p.name, pos: p.pos, nflTeam: p.nflTeam, points: Number(p.points) }
    if (p.pos === "IR") roster.ir.push(player)
    else roster.active.push(player)
  }
  roster.active.sort((a, b) => posRank(a.pos) - posRank(b.pos) || a.name.localeCompare(b.name))
  roster.ir.sort((a, b) => a.name.localeCompare(b.name))

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
    livePointsFor,
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

// ---------------------------------------------------------------------------
// Prediction weeks
//
// Every data/predictions/week-*.json file is picked up automatically, so
// dropping in a newly generated week needs no code change. The on-disk shape
// (a top-level "picks" object keyed by predictor id, as written by
// scripts/generate-predictions.js) is flattened here into the per-matchup
// "predictions" array that lib/predictions.ts and the components expect.
// ---------------------------------------------------------------------------
const PREDICTIONS_DIR = path.join(DATA_DIR, "predictions")

function readPredictors() {
  const file = path.join(PREDICTIONS_DIR, "predictors.json")
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, "utf8"))
}

function compilePredictionWeeks() {
  if (!existsSync(PREDICTIONS_DIR)) return []
  const predictorOrder = readPredictors().map((p) => p.id)

  const weekFiles = readdirSync(PREDICTIONS_DIR)
    .filter((f) => /^week-\d+\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

  return weekFiles.map((filename) => {
    const raw = JSON.parse(readFileSync(path.join(PREDICTIONS_DIR, filename), "utf8"))
    const picksByPredictor = raw.picks ?? {}

    // Predictors appear in predictors.json order first (so the prediction row
    // reads the same on every matchup), then any id present in the file but
    // not in predictors.json, so nothing is silently dropped.
    const ids = [
      ...predictorOrder.filter((id) => picksByPredictor[id]),
      ...Object.keys(picksByPredictor).filter((id) => !predictorOrder.includes(id)),
    ]

    const matchups = (raw.matchups ?? []).map((m) => {
      const predictions = []
      for (const id of ids) {
        const entry = picksByPredictor[id]
        const pick = entry?.picks?.[m.id]
        if (!pick) continue
        predictions.push({
          predictorId: id,
          pick,
          reasoning: entry?.reasoning?.[m.id] ?? "",
        })
      }
      return {
        id: m.id,
        away: m.away,
        home: m.home,
        awayRecord: m.awayRecord ?? "0-0",
        homeRecord: m.homeRecord ?? "0-0",
        winner: m.winner ?? null,
        predictions,
      }
    })

    return {
      week: Number(raw.week),
      status: raw.status === "complete" ? "complete" : "pending",
      matchups,
    }
  })
}

const PREDICTION_WEEKS = compilePredictionWeeks()

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  path.join(OUT_DIR, "league-data.json"),
  JSON.stringify({ CURRENT_WEEK, TEAMS, CUSTOM_NEWS, PAST_TEAMS }, null, 2),
)

writeFileSync(path.join(OUT_DIR, "prediction-weeks.json"), JSON.stringify(PREDICTION_WEEKS, null, 2))

console.log(
  `Built lib/generated/prediction-weeks.json - ${PREDICTION_WEEKS.length} prediction week(s)`,
)

console.log(
  `Built lib/generated/league-data.json — ${TEAMS.length} teams, CURRENT_WEEK=${CURRENT_WEEK}, ${CUSTOM_NEWS.length} custom news stories, ${PAST_TEAMS.length} past teams`,
)
