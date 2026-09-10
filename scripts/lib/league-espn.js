// Shared helpers for the prediction scripts: pulls live league state from the
// league's public ESPN API, reads the schedule out of data/schedule.csv, and
// handles the data/predictions/week-N.json files.
//
// Uses Node's built-in fetch (Node 18+), so there is no HTTP dependency here,
// matching scripts/sync-espn.js.
const fs = require("fs")
const path = require("path")

const LEAGUE_ID = 73732697
const SEASON = 2026
const ROOT = path.join(__dirname, "..", "..")
const DATA_DIR = path.join(ROOT, "data")
const PREDICTIONS_DIR = path.join(DATA_DIR, "predictions")

function espnUrl(views, params = {}) {
  const query = [
    ...views.map((v) => `view=${v}`),
    ...Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
  ].join("&")
  return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?${query}`
}

const POSITION_MAP = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" }
const IR_LINEUP_SLOT_ID = 21

// ESPN team IDs are stable even when an owner renames their team for a joke
// (for example "Nabers In Paris" briefly became "Starving Ethiopians"), so
// match on the id first and fall back to name keywords.
const TEAM_ID_SLUG = {
  1: "pakistan-bombers",
  2: "pluto-shraazinatorz",
  3: "nabers-in-paris",
  4: "mount-olympus",
  5: "the-watermark",
  6: "doobs-agency",
  7: "englewood-ninjas",
  8: "vile-horrendous",
  9: "i-heart-gingers",
  10: "amon-ra-dawgin",
  11: "fort-bragg",
  12: "chicago-zestiest",
  13: "vancouver-panties",
  14: "beer",
}

const TEAM_SLUG_KEYWORDS = [
  ["pakistan", "pakistan-bombers"],
  ["pluto", "pluto-shraazinatorz"],
  ["nabers", "nabers-in-paris"],
  ["ethiopian", "nabers-in-paris"],
  ["olympus", "mount-olympus"],
  ["watermark", "the-watermark"],
  ["doob", "doobs-agency"],
  ["englewood", "englewood-ninjas"],
  ["vile", "vile-horrendous"],
  ["ginger", "i-heart-gingers"],
  ["amon", "amon-ra-dawgin"],
  ["bragg", "fort-bragg"],
  ["zestiest", "chicago-zestiest"],
  ["vancouver", "vancouver-panties"],
  ["pavel", "beer"],
  ["dorofeyev", "beer"],
  ["beer", "beer"],
]

function espnTeamName(team) {
  if (team.name) return team.name
  return [team.location, team.nickname].filter(Boolean).join(" ")
}

function slugForEspnTeam(team) {
  if (TEAM_ID_SLUG[team.id]) return TEAM_ID_SLUG[team.id]
  const lower = espnTeamName(team).toLowerCase()
  for (const [keyword, slug] of TEAM_SLUG_KEYWORDS) {
    if (lower.includes(keyword)) return slug
  }
  return null
}

// --------------------------------------------------------------------------
// CSV
// --------------------------------------------------------------------------

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
  const rows = parseCsv(fs.readFileSync(path.join(DATA_DIR, filename), "utf8"))
  const header = rows[0]
  return rows.slice(1).map((row) => {
    const record = {}
    header.forEach((key, i) => {
      record[key.trim()] = (row[i] ?? "").trim()
    })
    return record
  })
}

/** slug -> display name, from data/teams.csv. */
function readTeamNames() {
  const names = {}
  for (const t of readCsvRecords("teams.csv")) names[t.slug] = t.name
  return names
}

/**
 * Matchups for a week, taken from data/schedule.csv. Each game appears twice
 * there (once per team), so the row with home="yes" decides who hosts and the
 * pair is emitted once.
 */
function getWeekMatchups(week) {
  const rows = readCsvRecords("schedule.csv").filter((r) => Number(r.week) === Number(week))
  const matchups = []
  const seen = new Set()

  for (const row of rows) {
    const isHome = row.home.toLowerCase() === "yes" || row.home.toLowerCase() === "true"
    if (!isHome) continue
    const home = row.slug
    const away = row.opponent
    const id = `${away}-vs-${home}`
    if (seen.has(id)) continue
    seen.add(id)
    matchups.push({ id, away, home })
  }

  return matchups
}

// --------------------------------------------------------------------------
// ESPN
// --------------------------------------------------------------------------

async function fetchEspn(views, params) {
  const res = await fetch(espnUrl(views, params), { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`ESPN API error ${res.status} for views ${views.join(",")}`)
  return res.json()
}

function rosterFor(team) {
  const players = []
  for (const entry of team.roster?.entries ?? []) {
    const player = entry.playerPoolEntry?.player
    if (!player) continue
    const pos = entry.lineupSlotId === IR_LINEUP_SLOT_ID ? "IR" : POSITION_MAP[player.defaultPositionId] || "?"
    players.push({ name: player.fullName, pos })
  }
  return players
}

/**
 * Per-team live state keyed by slug: roster, record, and the points they put
 * up in each completed week.
 */
async function fetchLeagueState() {
  const state = { source: "espn", teams: {}, transactions: [] }

  const [core, matchup] = await Promise.all([
    fetchEspn(["mRoster", "mTeam"]),
    fetchEspn(["mMatchup", "mMatchupScore"]),
  ])

  for (const team of core.teams ?? []) {
    const slug = slugForEspnTeam(team)
    if (!slug) {
      console.warn(`  ! could not map ESPN team "${espnTeamName(team)}" (id ${team.id}) to a slug`)
      continue
    }
    const overall = team.record?.overall ?? {}
    state.teams[slug] = {
      espnId: team.id,
      espnName: espnTeamName(team),
      wins: overall.wins ?? 0,
      losses: overall.losses ?? 0,
      ties: overall.ties ?? 0,
      pointsFor: Math.round((overall.pointsFor ?? 0) * 10) / 10,
      roster: rosterFor(team),
      weeklyScores: [],
    }
  }

  const slugByEspnId = {}
  for (const [slug, team] of Object.entries(state.teams)) slugByEspnId[team.espnId] = slug

  for (const game of matchup.schedule ?? []) {
    const week = game.matchupPeriodId
    for (const side of ["home", "away"]) {
      const entry = game[side]
      if (!entry) continue
      const slug = slugByEspnId[entry.teamId]
      if (!slug) continue
      // winner "UNDECIDED" means the game has not been settled yet.
      if (game.winner && game.winner !== "UNDECIDED" && typeof entry.totalPoints === "number") {
        state.teams[slug].weeklyScores.push({ week, points: Math.round(entry.totalPoints * 10) / 10 })
      }
    }
  }

  for (const team of Object.values(state.teams)) {
    team.weeklyScores.sort((a, b) => a.week - b.week)
  }

  try {
    const tx = await fetchEspn(["mTransactions2"])
    for (const t of tx.transactions ?? []) {
      const slug = slugByEspnId[t.teamId]
      if (!slug) continue
      const detail = (t.items ?? []).map((i) => `${i.type ?? "MOVE"} player ${i.playerId ?? "?"}`).join(", ")
      state.transactions.push({
        team: slug,
        type: t.type ?? "UNKNOWN",
        date: t.proposedDate ? new Date(t.proposedDate).toISOString().slice(0, 10) : null,
        detail,
      })
    }
    state.transactions = state.transactions.slice(-25)
  } catch (err) {
    console.warn(`  ! transactions view unavailable (${err.message}); continuing without it`)
  }

  return state
}

/** Rosters/records from the committed CSVs, used when ESPN is unreachable. */
function localLeagueState() {
  const state = { source: "local-csv", teams: {}, transactions: [] }

  for (const t of readCsvRecords("teams.csv")) {
    state.teams[t.slug] = {
      espnId: null,
      espnName: t.name,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      roster: [],
      weeklyScores: [],
    }
  }

  for (const r of readCsvRecords("rosters.csv")) {
    if (!r.name || !state.teams[r.teamSlug]) continue
    state.teams[r.teamSlug].roster.push({ name: r.name, pos: r.pos })
  }

  for (const row of readCsvRecords("schedule.csv")) {
    const team = state.teams[row.slug]
    if (!team || row.teamScore === "" || row.oppScore === "") continue
    const teamScore = Number(row.teamScore)
    const oppScore = Number(row.oppScore)
    team.weeklyScores.push({ week: Number(row.week), points: teamScore })
    team.pointsFor = Math.round((team.pointsFor + teamScore) * 10) / 10
    if (teamScore >= oppScore) team.wins += 1
    else team.losses += 1
  }

  for (const team of Object.values(state.teams)) {
    team.weeklyScores.sort((a, b) => a.week - b.week)
  }

  return state
}

/** Live ESPN state, falling back to the committed CSVs on any failure. */
async function loadLeagueState() {
  try {
    console.log("Pulling live league state from ESPN...")
    const state = await fetchLeagueState()
    const teamCount = Object.keys(state.teams).length
    if (teamCount === 0) throw new Error("ESPN returned no teams")
    console.log(`  ok - ${teamCount} teams, ${state.transactions.length} recent transactions`)
    return state
  } catch (err) {
    console.warn(`ESPN pull failed (${err.message}). Falling back to local CSV data.`)
    return localLeagueState()
  }
}

/**
 * Final scores for a week, keyed by slug. Prefers ESPN; falls back to any
 * scores already filled in on data/schedule.csv.
 */
async function fetchWeekResults(week) {
  try {
    const data = await fetchEspn(["mMatchup", "mMatchupScore", "mTeam"])
    const slugByEspnId = {}
    for (const team of data.teams ?? []) {
      const slug = slugForEspnTeam(team)
      if (slug) slugByEspnId[team.id] = slug
    }

    const scores = {}
    for (const game of data.schedule ?? []) {
      if (game.matchupPeriodId !== Number(week)) continue
      if (!game.winner || game.winner === "UNDECIDED") continue
      for (const side of ["home", "away"]) {
        const entry = game[side]
        if (!entry) continue
        const slug = slugByEspnId[entry.teamId]
        if (slug && typeof entry.totalPoints === "number") {
          scores[slug] = Math.round(entry.totalPoints * 10) / 10
        }
      }
    }
    if (Object.keys(scores).length > 0) return { source: "espn", scores }
    console.warn(`ESPN has no settled results for week ${week} yet.`)
  } catch (err) {
    console.warn(`ESPN results pull failed (${err.message}). Trying data/schedule.csv.`)
  }

  const scores = {}
  for (const row of readCsvRecords("schedule.csv")) {
    if (Number(row.week) !== Number(week) || row.teamScore === "") continue
    scores[row.slug] = Number(row.teamScore)
  }
  return { source: "local-csv", scores }
}

// --------------------------------------------------------------------------
// Week files and env
// --------------------------------------------------------------------------

function weekFilePath(week) {
  return path.join(PREDICTIONS_DIR, `week-${week}.json`)
}

function readPredictors() {
  return JSON.parse(fs.readFileSync(path.join(PREDICTIONS_DIR, "predictors.json"), "utf8"))
}

function readWeekFile(week) {
  const file = weekFilePath(week)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function writeWeekFile(week, payload) {
  fs.mkdirSync(PREDICTIONS_DIR, { recursive: true })
  fs.writeFileSync(weekFilePath(week), JSON.stringify(payload, null, 2) + "\n")
  return weekFilePath(week)
}

/** Every week file, oldest first. Used to build the standings blurb. */
function readAllWeekFiles() {
  if (!fs.existsSync(PREDICTIONS_DIR)) return []
  return fs
    .readdirSync(PREDICTIONS_DIR)
    .filter((f) => /^week-\d+\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PREDICTIONS_DIR, f), "utf8")))
}

/**
 * Minimal .env.local reader so local runs pick up ANTHROPIC_API_KEY without
 * pulling in dotenv. Existing environment variables always win, which is what
 * GitHub Actions needs.
 */
function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local")
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseWeekArg(argv) {
  const arg = argv.find((a) => a.startsWith("--week="))
  if (!arg) return null
  const week = Number(arg.split("=")[1])
  return Number.isInteger(week) && week > 0 ? week : null
}

module.exports = {
  LEAGUE_ID,
  SEASON,
  IR_LINEUP_SLOT_ID,
  slugForEspnTeam,
  PREDICTIONS_DIR,
  fetchEspn,
  fetchWeekResults,
  getWeekMatchups,
  loadEnvLocal,
  loadLeagueState,
  parseWeekArg,
  readAllWeekFiles,
  readPredictors,
  readTeamNames,
  readWeekFile,
  weekFilePath,
  writeWeekFile,
}
