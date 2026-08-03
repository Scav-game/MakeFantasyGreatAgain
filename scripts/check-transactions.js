// Fetches recent ESPN transactions (since the last roster sync), and for
// each genuine add/drop/trade, appends a short auto-generated "Transaction
// Wire" story to data/news.csv under intern reporter Jake "The Wire" Russo.
// Run with `npm run transactions`, normally right after `npm run sync`.
//
// Real transaction data has more noise than you'd expect from ESPN's docs:
// - status can be CANCELED / FAILED_INVALIDPLAYERSOURCE / EXECUTED / missing
//   — only EXECUTED represents something that actually happened.
// - top-level `type` includes FUTURE_ROSTER, ROSTER, DRAFT, and several
//   TRADE_* meta-events (proposal/accept/uphold/decline) that carry no
//   player-movement items themselves — only WAIVER, FREEAGENT, and items
//   with item-level type "TRADE" represent real roster moves worth
//   reporting on.
const fs = require("fs")
const path = require("path")

const LEAGUE_ID = 73732697
const SEASON = 2026
const TRANSACTIONS_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?view=mTransactions2`
const TEAMS_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?view=mTeam`
const PLAYERS_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/players?view=players_wl`

const NEWS_CSV = path.join(__dirname, "..", "data", "news.csv")
const LAST_SYNC_FILE = path.join(__dirname, "..", "last-sync.json")
const TRANSACTION_LOG_FILE = path.join(__dirname, "..", "transaction-log.json")

const POSITION_MAP = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" }
const NFL_TEAMS = {
  0: "FA",
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
  9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA",
  16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI",
  23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR",
  30: "JAX", 33: "BAL", 34: "HOU",
}

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

// Team display names as used on the site (data/teams.csv), for Jake's copy.
const TEAM_DISPLAY_NAMES = {
  "pakistan-bombers": "Pakistan Bombers",
  "pluto-shraazinatorz": "Pluto Shraazinatorz",
  "nabers-in-paris": "Nabers In Paris",
  "mount-olympus": "Mount Olympus Yogurt Dressing",
  "the-watermark": "The Watermark",
  "doobs-agency": "Doob's Agency",
  "englewood-ninjas": "Englewood Ninjas",
  "vile-horrendous": "The Vile Horrendous",
  "i-heart-gingers": "I Heart Gingers",
  "amon-ra-dawgin": "Amon Ra Dawgin",
  "fort-bragg": "Fort Bragg Confederates",
  "chicago-zestiest": "Chicago Zestiest Man",
  "vancouver-panties": "VancouverPantiesDeJarome",
  beer: "Pavel Dorofeyev",
}

function slugForTeamName(name) {
  const lower = (name || "").toLowerCase()
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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`ESPN API error ${res.status} for ${url}: ${await res.text()}`)
  return res.json()
}

function readLastSync() {
  if (!fs.existsSync(LAST_SYNC_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(LAST_SYNC_FILE, "utf8")).syncedAt ?? null
  } catch {
    return null
  }
}

function readTransactionLog() {
  if (!fs.existsSync(TRANSACTION_LOG_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(TRANSACTION_LOG_FILE, "utf8"))
  } catch {
    return []
  }
}

/** Cutoff for "new since last check" comes from this script's own log, not
 * sync-espn.js's last-sync.json — that file only updates when the roster
 * *content* changes, so a transaction that nets out to no diff (an add
 * immediately reversed by a drop) would never advance it, causing already-
 * reported transactions to be re-reported on the next run. Falls back to
 * last-sync.json only to bootstrap the very first run, before any log
 * entries exist. */
function determineCutoffMs(log) {
  const logTimestamps = log.map((e) => e.sourceTimestamp).filter((t) => typeof t === "number")
  if (logTimestamps.length > 0) return Math.max(...logTimestamps)
  const lastSync = readLastSync()
  return lastSync ? new Date(lastSync).getTime() : null
}

const WAIVER_TEMPLATES = [
  (p) => `WIRE: ${p.team} claims ${p.player} (${p.pos}, ${p.nfl}) off waivers. Roster spot well spent if you ask me.`,
  (p) => `WAIVER ALERT: ${p.player} (${p.nfl} ${p.pos}) is heading to ${p.team}. Interesting pickup.`,
  (p) => `Off the wire: ${p.team} adds ${p.player} from ${p.nfl}. Could be a sneaky good move.`,
  (p) => `CLAIMED: ${p.player} (${p.pos}, ${p.nfl}) lands with ${p.team}. The wire never sleeps.`,
]
const FREEAGENT_TEMPLATES = [
  (p) => `FA SIGNING: ${p.team} scoops up ${p.player} (${p.pos}, ${p.nfl}) from free agency. First come first served.`,
  (p) => `Free agent ${p.player} (${p.nfl} ${p.pos}) signs with ${p.team}. Quick hands on the wire.`,
  (p) => `PICKUP: ${p.team} grabs ${p.player} (${p.pos}, ${p.nfl}) as a free agent. Smart or desperate? Time will tell.`,
]
const DROP_TEMPLATES = [
  (p) => `RELEASED: ${p.team} drops ${p.player} (${p.pos}, ${p.nfl}). Tough break.`,
  (p) => `CUT: ${p.player} (${p.nfl} ${p.pos}) released by ${p.team}. Someone else's treasure now.`,
  (p) => `${p.team} parts ways with ${p.player} (${p.pos}, ${p.nfl}). End of the road.`,
]
const TRADE_TEMPLATES = [
  (t) => `TRADE ALERT: ${t.team1} sends ${t.players1} to ${t.team2} for ${t.players2}. Big move.`,
  (t) => `BREAKING: ${t.team1} and ${t.team2} complete a trade. ${t.players1} head to ${t.team2}, ${t.players2} go to ${t.team1}. The phones are ringing.`,
  (t) => `DEAL DONE: ${t.team1} trades ${t.players1} to ${t.team2} in exchange for ${t.players2}. This league never stops.`,
]

function playerInfo(playerMap, playerId) {
  const p = playerMap.get(playerId)
  if (!p) return { name: `Player #${playerId}`, pos: "?", nfl: "FA" }
  const isDst = p.defaultPositionId === 16
  return {
    name: p.fullName,
    pos: POSITION_MAP[p.defaultPositionId] || "?",
    nfl: isDst ? NFL_TEAMS[p.proTeamId] ?? "FA" : NFL_TEAMS[p.proTeamId] ?? "FA",
  }
}

function buildTweets(transactions, teamSlugById, playerMap) {
  const tweets = [] // { team, headline, body, author }
  const AUTHOR = 'Jake "The Wire" Russo'

  for (const tx of transactions) {
    if (tx.status !== "EXECUTED") continue
    const items = tx.items ?? []

    if (tx.type === "WAIVER" || tx.type === "FREEAGENT") {
      for (const item of items) {
        if (item.type !== "ADD" && item.type !== "DROP") continue
        const teamId = item.type === "ADD" ? item.toTeamId : item.fromTeamId
        const slug = teamSlugById.get(teamId)
        if (!slug) continue
        const info = playerInfo(playerMap, item.playerId)
        const ctx = { team: TEAM_DISPLAY_NAMES[slug] ?? slug, player: info.name, pos: info.pos, nfl: info.nfl }
        const template =
          item.type === "DROP" ? pick(DROP_TEMPLATES) : pick(tx.type === "WAIVER" ? WAIVER_TEMPLATES : FREEAGENT_TEMPLATES)
        tweets.push({ team: slug, body: template(ctx), sourceTimestamp: tx.proposedDate })
      }
    } else if (items.some((i) => i.type === "TRADE")) {
      const tradeItems = items.filter((i) => i.type === "TRADE")
      const byTeam = new Map() // teamId -> [playerNames]
      for (const item of tradeItems) {
        const info = playerInfo(playerMap, item.playerId)
        const list = byTeam.get(item.toTeamId) ?? []
        list.push(info.name)
        byTeam.set(item.toTeamId, list)
      }
      const teamIds = [...byTeam.keys()]
      if (teamIds.length !== 2) continue // only handle straightforward two-team trades
      const slugs = teamIds.map((id) => teamSlugById.get(id)).filter(Boolean)
      if (slugs.length !== 2) continue
      const [teamA, teamB] = slugs.sort() // alphabetical, matches spec's "first team alphabetically" rule
      const [idA, idB] = teamIds[0] && teamSlugById.get(teamIds[0]) === teamA ? teamIds : [teamIds[1], teamIds[0]]
      const ctx = {
        team1: TEAM_DISPLAY_NAMES[teamA] ?? teamA,
        team2: TEAM_DISPLAY_NAMES[teamB] ?? teamB,
        players1: byTeam.get(idA).join(" + "),
        players2: byTeam.get(idB).join(" + "),
      }
      tweets.push({ team: teamA, body: pick(TRADE_TEMPLATES)(ctx), sourceTimestamp: tx.proposedDate })
    }
  }

  return tweets.map((t) => ({ ...t, headline: "Transaction Wire", author: AUTHOR }))
}

function todayFormatted() {
  const d = new Date()
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function appendToNewsCsv(tweets) {
  const rows = tweets.map((t) =>
    [todayFormatted(), t.headline, t.body, t.team, t.author].map(csvField).join(","),
  )
  fs.appendFileSync(NEWS_CSV, rows.join("\n") + "\n")
}

async function main() {
  const log = readTransactionLog()
  const sinceMs = determineCutoffMs(log)

  console.log(
    `Fetching transactions for league ${LEAGUE_ID}${sinceMs ? ` since ${new Date(sinceMs).toISOString()}` : " (no cutoff available — run sync first)"}...`,
  )
  if (sinceMs === null) {
    console.log("No transaction-log.json or last-sync.json found. Run `npm run sync` first so there's a cutoff timestamp.")
    return
  }

  let txData, teamData, playerData
  try {
    ;[txData, teamData, playerData] = await Promise.all([
      fetchJson(TRANSACTIONS_URL),
      fetchJson(TEAMS_URL),
      // Without an x-fantasy-filter header ESPN silently caps this to a
      // top-50 "notable players" list instead of the full pool. The filter
      // value here doesn't actually need to match anything real — its mere
      // presence is what unlocks the full ~11.5k player dataset.
      fetchJson(PLAYERS_URL, { "x-fantasy-filter": '{"players":{"limit":20000}}' }),
    ])
  } catch (err) {
    console.error("Failed to fetch ESPN data:", err.message)
    process.exitCode = 1
    return
  }

  const teamSlugById = new Map()
  for (const team of teamData.teams ?? []) {
    const slug = slugForTeamName(team.name)
    if (slug) teamSlugById.set(team.id, slug)
  }

  const playerMap = new Map()
  for (const p of Array.isArray(playerData) ? playerData : []) {
    playerMap.set(p.id, p)
  }

  const recentTransactions = (txData.transactions ?? []).filter((t) => (t.proposedDate ?? 0) > sinceMs)
  console.log(`${recentTransactions.length} transaction(s) since last sync.`)

  const tweets = buildTweets(recentTransactions, teamSlugById, playerMap)

  if (tweets.length === 0) {
    console.log("No reportable transactions (adds/drops/trades) — nothing to write.")
    return
  }

  appendToNewsCsv(tweets)

  const now = new Date().toISOString()
  for (const t of tweets) log.push({ timestamp: now, team: t.team, body: t.body, sourceTimestamp: t.sourceTimestamp })
  fs.writeFileSync(TRANSACTION_LOG_FILE, JSON.stringify(log, null, 2) + "\n")

  console.log(`Appended ${tweets.length} Jake "The Wire" Russo tweet(s) to data/news.csv:`)
  for (const t of tweets) console.log(`  [${t.team}] ${t.body}`)
}

main()
