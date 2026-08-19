// Fetches current rosters from the league's public ESPN API and updates
// data/rosters.csv if anything changed. Run manually with `npm run sync`,
// or (once wired up) on a schedule via GitHub Actions.
//
// Uses Node's built-in fetch (Node 18+) — no extra HTTP dependency needed.
const fs = require("fs")
const path = require("path")

const LEAGUE_ID = 73732697
const SEASON = 2026
const ESPN_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?view=mRoster&view=mTeam`

const ROSTERS_CSV = path.join(__dirname, "..", "data", "rosters.csv")
const LAST_SYNC_FILE = path.join(__dirname, "..", "last-sync.json")

// Position on the roster the player is *drafted/rostered as* (defaultPositionId).
const POSITION_MAP = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" }
const ROSTER_POSITION_ORDER = ["QB", "RB", "WR", "TE", "D/ST", "K"]
const IR_LINEUP_SLOT_ID = 21

const NFL_TEAMS = {
  0: "FA",
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
  9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA",
  16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI",
  23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR",
  30: "JAX", 33: "BAL", 34: "HOU",
}

// ESPN team IDs are stable even when owners rename their team for a joke
// (e.g. "Nabers In Paris" briefly became "Starving Ethiopians"). Match on
// this first; keyword matching below is only a fallback for leagues/teams
// not in this map.
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

// Matched by substring against the ESPN team name (case-insensitive). Order
// matters only in that the first match wins — these are distinct enough
// that it shouldn't matter in practice.
const TEAM_SLUG_KEYWORDS = [
  ["pakistan", "pakistan-bombers"],
  ["pluto", "pluto-shraazinatorz"],
  ["nabers", "nabers-in-paris"],
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

function slugForTeamName(name) {
  const lower = name.toLowerCase()
  for (const [keyword, slug] of TEAM_SLUG_KEYWORDS) {
    if (lower.includes(keyword)) return slug
  }
  return null
}

function csvField(v) {
  v = String(v ?? "")
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function parseCsv(text) {
  const rows = []
  let row = [],
    field = "",
    inQuotes = false
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

function posRank(pos) {
  const i = ROSTER_POSITION_ORDER.indexOf(pos)
  return i === -1 ? ROSTER_POSITION_ORDER.length : i
}

async function fetchLeague() {
  const res = await fetch(ESPN_URL, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    throw new Error(`ESPN API error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

function buildRosterRows(league) {
  const rows = [] // { teamSlug, pos, name, nflTeam }
  const unmatchedTeams = []

  for (const team of league.teams ?? []) {
    const slug = TEAM_ID_SLUG[team.id] ?? slugForTeamName(team.name ?? "")
    if (!slug) {
      unmatchedTeams.push(team.name)
      continue
    }

    for (const entry of team.roster?.entries ?? []) {
      const player = entry.playerPoolEntry?.player
      if (!player) continue

      const pos = entry.lineupSlotId === IR_LINEUP_SLOT_ID ? "IR" : POSITION_MAP[player.defaultPositionId] || "?"
      const nflTeam = NFL_TEAMS[player.proTeamId] ?? "FA"

      rows.push({ teamSlug: slug, pos, name: player.fullName, nflTeam })
    }
  }

  if (unmatchedTeams.length > 0) {
    console.warn("Could not match these ESPN team names to a slug:", unmatchedTeams)
  }

  rows.sort((a, b) => {
    if (a.teamSlug !== b.teamSlug) return a.teamSlug.localeCompare(b.teamSlug)
    if (a.pos === "IR" || b.pos === "IR") {
      if (a.pos !== b.pos) return a.pos === "IR" ? 1 : -1 // IR sorts after active roster
    } else {
      const rankDiff = posRank(a.pos) - posRank(b.pos)
      if (rankDiff !== 0) return rankDiff
    }
    return a.name.localeCompare(b.name)
  })

  return rows
}

function toCsv(rows) {
  const header = "teamSlug,pos,name,nflTeam,points"
  const lines = rows.map((r) => [r.teamSlug, r.pos, r.name, r.nflTeam, ""].map(csvField).join(","))
  return [header, ...lines].join("\n") + "\n"
}

function readExistingRoster() {
  if (!fs.existsSync(ROSTERS_CSV)) return []
  const rows = parseCsv(fs.readFileSync(ROSTERS_CSV, "utf8"))
  const header = rows[0]
  return rows.slice(1).map((r) => {
    const rec = {}
    header.forEach((h, i) => (rec[h.trim()] = (r[i] ?? "").trim()))
    return rec
  })
}

/** Key used to detect additions/removals — ignores points, which changes
 * every week and isn't something this script manages. */
function rowKey(r) {
  return `${r.teamSlug}|${r.name}`
}

function diffRosters(existing, incoming) {
  const existingKeys = new Set(existing.map(rowKey))
  const incomingKeys = new Set(incoming.map(rowKey))
  const added = incoming.filter((r) => !existingKeys.has(rowKey(r)))
  const removed = existing.filter((r) => !incomingKeys.has(rowKey(r)))
  return { added, removed, changed: added.length > 0 || removed.length > 0 }
}

async function main() {
  console.log(`Fetching league ${LEAGUE_ID} (season ${SEASON}) from ESPN...`)

  let league
  try {
    league = await fetchLeague()
  } catch (err) {
    console.error("Failed to fetch ESPN league data:", err.message)
    process.exitCode = 1
    return
  }

  const incoming = buildRosterRows(league)
  if (incoming.length === 0) {
    console.error("ESPN returned no roster data — not overwriting rosters.csv.")
    process.exitCode = 1
    return
  }

  const existing = readExistingRoster()
  const { added, removed, changed } = diffRosters(existing, incoming)

  if (!changed) {
    console.log("No roster changes since last sync.")
    return
  }

  fs.writeFileSync(ROSTERS_CSV, toCsv(incoming))
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify({ syncedAt: new Date().toISOString() }, null, 2) + "\n")

  console.log(`Updated data/rosters.csv — ${added.length} added, ${removed.length} removed:`)
  for (const r of added) console.log(`  + ${r.teamSlug}: ${r.name} (${r.pos}, ${r.nflTeam})`)
  for (const r of removed) console.log(`  - ${r.teamSlug}: ${r.name} (${r.pos}, ${r.nflTeam})`)
}

main()
