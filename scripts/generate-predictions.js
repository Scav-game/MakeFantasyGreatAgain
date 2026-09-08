// Generates the 8 predictors' picks for a given week and writes
// data/predictions/week-N.json.
//
//   node scripts/generate-predictions.js --week=1
//
// Needs ANTHROPIC_API_KEY, read from the environment or from .env.local for
// local runs. Live roster/record/transaction data is pulled fresh from ESPN
// right before generating; nothing here reads a stale snapshot.
//
// Marcus Whitfield is always generated last, because his prompt includes what
// the other seven picked so he can hunt lone wolf bonuses.
const Anthropic = require("@anthropic-ai/sdk")
const {
  getWeekMatchups,
  loadEnvLocal,
  loadLeagueState,
  parseWeekArg,
  readAllWeekFiles,
  readPredictors,
  readTeamNames,
  writeWeekFile,
} = require("./lib/league-espn")

const MODEL = "claude-sonnet-4-6"
const MAX_TOKENS = 4000
const DELAY_MS = 1000
const STRATEGIC_PREDICTOR_ID = "marcus-whitfield"

// Scoring, kept in step with lib/predictions.ts so the prompts describe the
// competition the predictors are actually being scored on.
const POINTS_PER_CORRECT = 1
const LONE_WOLF_BONUS = 3
const PERFECT_WEEK_BONUS = 5

// Methodology given to each predictor, on top of the biography in
// data/predictions/predictors.json.
const METHODOLOGY = {
  "gerald-manning":
    "You are a 62-year-old retired actuary. You only trust numbers. Pick whichever team has the stronger projected point total based on their roster strength. You are conservative and pick favorites. Never factor in narratives or gut feelings. You want to win this competition through consistent accuracy.",
  "rico-delgado":
    "You are a 29-year-old contrarian sports radio personality. You believe picking all favorites loses competitions because everyone else does it. Pick 2-3 upsets this week. Target the games where the underdog has a real chance. You win by getting lone wolf bonuses when your upset picks hit.",
  "earl-hutchinson":
    "You are a 71-year-old retired high school football coach. You trust the eye test. Teams with strong running backs and veteran quarterbacks win games. You do not care about spreadsheets or analytics. Pick the team that is tougher and more physical. Favor proven rosters over young flashy ones.",
  "priya-nair":
    "You are a 26-year-old data science grad student. You believe momentum is everything. If a team is on a hot streak pick them. If a team just lost pick against them. Early in the season with no results yet, use roster strength as a proxy for power rankings. As the season goes on, lean heavily on recent performance and trends.",
  "vinny-esposito":
    "You are a 45-year-old math teacher. Break each matchup into 5 positional battles: QB vs QB, RB room vs RB room, WR room vs WR room, TE vs TE, D/ST vs D/ST. Whichever team wins 3 or more of those 5 battles wins the game. Be specific about which positions you think each team wins.",
  "sandy-kowalski":
    "You are a 54-year-old former event planner. You pick based on situations. Is a team coming off a bye? Is this a revenge game? A letdown spot after a big win? A must-win game? Factor in scheduling context and emotional situations more than raw talent.",
  "marcus-whitfield":
    "You are a 38-year-old poker player from Las Vegas. You see this as a game theory problem. You will be shown what the other 7 predictors picked. Go with the majority on the obvious games. On 1-2 close matchups, strategically pick the opposite of the crowd to hunt lone wolf bonuses. If you are behind in the standings, be more aggressive. If you are leading, play it safe.",
  "destiny-carter":
    "You are a 31-year-old yoga instructor from Sedona. You pick based on vibes, karma, and team narratives. Which team has better energy right now? Which team just made a bold move and is riding high? Which team has been embarrassed and is due for a bounce back? Ignore statistics. Trust the universe.",
}

function recordOf(team) {
  if (!team) return "0-0"
  return team.ties ? `${team.wins}-${team.losses}-${team.ties}` : `${team.wins}-${team.losses}`
}

function rosterBlock(team) {
  if (!team || team.roster.length === 0) return "    (roster unavailable)"
  const byPos = {}
  for (const p of team.roster) {
    if (p.pos === "IR") continue
    byPos[p.pos] = byPos[p.pos] ?? []
    byPos[p.pos].push(p.name)
  }
  const order = ["QB", "RB", "WR", "TE", "D/ST", "K"]
  return order
    .filter((pos) => byPos[pos])
    .map((pos) => `    ${pos}: ${byPos[pos].join(", ")}`)
    .join("\n")
}

function recentScoresBlock(team) {
  if (!team || team.weeklyScores.length === 0) return "no games played yet"
  return team.weeklyScores
    .slice(-4)
    .map((s) => `wk${s.week}: ${s.points}`)
    .join(", ")
}

/** The matchup dossier every predictor sees, built from live ESPN data. */
function buildMatchupBrief(matchups, state, teamNames) {
  return matchups
    .map((m, i) => {
      const away = state.teams[m.away]
      const home = state.teams[m.home]
      return [
        `MATCHUP ${i + 1} - id: "${m.id}"`,
        `  AWAY: ${teamNames[m.away] ?? m.away} (slug: ${m.away}) record ${recordOf(away)}, points for ${away?.pointsFor ?? 0}`,
        `  Recent scores: ${recentScoresBlock(away)}`,
        `  Roster:`,
        rosterBlock(away),
        `  HOME: ${teamNames[m.home] ?? m.home} (slug: ${m.home}) record ${recordOf(home)}, points for ${home?.pointsFor ?? 0}`,
        `  Recent scores: ${recentScoresBlock(home)}`,
        `  Roster:`,
        rosterBlock(home),
      ].join("\n")
    })
    .join("\n\n")
}

function transactionsBlock(state, teamNames) {
  if (state.transactions.length === 0) return "No recent transactions reported."
  return state.transactions
    .map((t) => `  ${t.date ?? "recent"} - ${teamNames[t.team] ?? t.team}: ${t.type}${t.detail ? ` (${t.detail})` : ""}`)
    .join("\n")
}

/**
 * Prediction-competition standings from every completed week file so far.
 * Mirrors the scoring in lib/predictions.ts.
 */
function buildStandings(predictors, week) {
  const weeks = readAllWeekFiles().filter((w) => Number(w.week) < Number(week) && w.status === "complete")
  if (weeks.length === 0) return null

  const totals = {}
  for (const p of predictors) totals[p.id] = { points: 0, correct: 0, total: 0 }

  for (const w of weeks) {
    const perPredictorWeek = {}
    for (const m of w.matchups ?? []) {
      if (!m.winner) continue
      const picksForMatchup = []
      for (const [id, entry] of Object.entries(w.picks ?? {})) {
        const pick = entry?.picks?.[m.id]
        if (pick) picksForMatchup.push({ id, pick })
      }
      for (const { id, pick } of picksForMatchup) {
        if (!totals[id]) continue
        const loneWolf = picksForMatchup.filter((p) => p.pick === pick).length === 1
        perPredictorWeek[id] = perPredictorWeek[id] ?? { correct: 0, total: 0 }
        perPredictorWeek[id].total += 1
        totals[id].total += 1
        if (pick === m.winner) {
          perPredictorWeek[id].correct += 1
          totals[id].correct += 1
          totals[id].points += POINTS_PER_CORRECT
          if (loneWolf) totals[id].points += LONE_WOLF_BONUS
        }
      }
    }
    for (const [id, wk] of Object.entries(perPredictorWeek)) {
      if (wk.total > 0 && wk.correct === wk.total) totals[id].points += PERFECT_WEEK_BONUS
    }
  }

  const rows = predictors
    .map((p) => ({ name: p.shortName, ...totals[p.id] }))
    .sort((a, b) => b.points - a.points)
    .map((r, i) => `  ${i + 1}. ${r.name}: ${r.points} pts (${r.correct}-${r.total - r.correct})`)

  return rows.join("\n")
}

function buildPrompt({ predictor, week, matchups, brief, transactions, standings, otherPicks, teamNames }) {
  const validIds = matchups.map((m) => `"${m.id}"`).join(", ")
  const parts = [
    `You are ${predictor.name}, age ${predictor.age}, ${predictor.title}.`,
    predictor.description,
    "",
    `YOUR METHODOLOGY: ${METHODOLOGY[predictor.id]}`,
    "",
    `You are picking the winner of all ${matchups.length} matchups in Week ${week} of the MFGA fantasy football league.`,
    "",
    "THE COMPETITION: You are competing against 7 other predictors and you want to win.",
    `Scoring is ${POINTS_PER_CORRECT} point per correct pick, plus ${LONE_WOLF_BONUS} bonus points for a correct lone wolf pick (you were the only one of the 8 to pick that winner), plus ${PERFECT_WEEK_BONUS} bonus points for getting every game in the week right.`,
    "",
    "THIS WEEK'S MATCHUPS, WITH LIVE ROSTERS AND RECORDS:",
    brief,
    "",
    "RECENT LEAGUE TRANSACTIONS:",
    transactions,
  ]

  if (standings) {
    parts.push("", "CURRENT PREDICTION COMPETITION STANDINGS:", standings)
  }

  if (otherPicks) {
    parts.push(
      "",
      "WHAT THE OTHER 7 PREDICTORS PICKED THIS WEEK (you are picking last and can see this):",
      otherPicks,
    )
  }

  parts.push(
    "",
    "Respond with ONLY a JSON object and no other text, no markdown fences, no preamble. Use exactly this shape:",
    '{"picks": {"<matchup-id>": "<winning-team-slug>"}, "reasoning": {"<matchup-id>": "<1-2 sentence explanation in your voice>"}}',
    "",
    `Every one of these matchup ids must appear in both "picks" and "reasoning": ${validIds}.`,
    "Each pick must be one of the two team slugs listed for that matchup. Do not use em dashes anywhere in your reasoning.",
  )

  return parts.join("\n")
}

/**
 * Pulls the JSON object out of a model response even if it arrives wrapped in
 * prose or a markdown fence, by scanning for the first balanced brace pair.
 */
function extractJson(text) {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through to brace scanning
  }

  const start = trimmed.indexOf("{")
  if (start === -1) throw new Error("no JSON object found in response")

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === "\\") escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === "{") depth += 1
    else if (c === "}") {
      depth -= 1
      if (depth === 0) return JSON.parse(trimmed.slice(start, i + 1))
    }
  }
  throw new Error("JSON object in response is not balanced (response may have been truncated)")
}

/** Rejects picks for unknown matchups or teams that are not in the game. */
function validatePicks(parsed, matchups, predictorName) {
  const picks = {}
  const reasoning = {}
  const problems = []

  for (const m of matchups) {
    const pick = parsed?.picks?.[m.id]
    if (!pick) {
      problems.push(`missing pick for ${m.id}`)
      continue
    }
    if (pick !== m.away && pick !== m.home) {
      problems.push(`pick "${pick}" for ${m.id} is not ${m.away} or ${m.home}`)
      continue
    }
    picks[m.id] = pick
    const why = parsed?.reasoning?.[m.id]
    reasoning[m.id] = typeof why === "string" && why.trim() ? why.trim().replace(/—/g, "-") : ""
  }

  if (problems.length > 0) {
    throw new Error(`${predictorName}: ${problems.join("; ")}`)
  }

  return { picks, reasoning }
}

function summarizeOtherPicks(results, matchups, predictors, teamNames) {
  const byId = {}
  for (const p of predictors) byId[p.id] = p

  return matchups
    .map((m) => {
      const votes = []
      for (const [id, result] of Object.entries(results)) {
        const pick = result.picks[m.id]
        if (pick) votes.push(`${byId[id]?.shortName ?? id} -> ${teamNames[pick] ?? pick}`)
      }
      const tally = {}
      for (const [, result] of Object.entries(results)) {
        const pick = result.picks[m.id]
        if (pick) tally[pick] = (tally[pick] ?? 0) + 1
      }
      const tallyText = Object.entries(tally)
        .map(([slug, n]) => `${teamNames[slug] ?? slug}: ${n}`)
        .join(", ")
      return `  ${m.id}\n    votes: ${votes.join(", ")}\n    tally: ${tallyText}`
    })
    .join("\n")
}

async function askPredictor(client, prompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  })

  if (response.stop_reason === "max_tokens") {
    throw new Error("response hit the max_tokens limit before finishing")
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")

  if (!text.trim()) throw new Error(`empty response (stop_reason: ${response.stop_reason})`)
  return text
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  loadEnvLocal()

  const week = parseWeekArg(process.argv)
  if (!week) {
    console.error("Usage: node scripts/generate-predictions.js --week=N")
    process.exitCode = 1
    return
  }

  // --dry-run builds the prompts and prints the first one without calling the
  // API or writing a week file. Useful for checking what the predictors see.
  const dryRun = process.argv.includes("--dry-run")

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.")
    console.error("Put it in .env.local as ANTHROPIC_API_KEY=sk-ant-... for local runs,")
    console.error("or add it as a GitHub Actions secret for the workflow.")
    console.error("Run with --dry-run to preview the prompts without calling the API.")
    process.exitCode = 1
    return
  }

  const matchups = getWeekMatchups(week)
  if (matchups.length === 0) {
    console.error(`No week ${week} matchups found in data/schedule.csv.`)
    process.exitCode = 1
    return
  }
  console.log(`Week ${week}: ${matchups.length} matchups`)

  const teamNames = readTeamNames()
  const state = await loadLeagueState()
  const predictors = readPredictors()

  const brief = buildMatchupBrief(matchups, state, teamNames)
  const transactions = transactionsBlock(state, teamNames)
  const standings = buildStandings(predictors, week)

  // Everyone except the strategic predictor first, then him last with the
  // others' picks in hand.
  const first = predictors.filter((p) => p.id !== STRATEGIC_PREDICTOR_ID)
  const last = predictors.filter((p) => p.id === STRATEGIC_PREDICTOR_ID)

  if (dryRun) {
    for (const predictor of [...first, ...last]) {
      const prompt = buildPrompt({
        predictor,
        week,
        matchups,
        brief,
        transactions,
        standings,
        otherPicks: null,
        teamNames,
      })
      console.log(`  ${predictor.shortName}: prompt is ${prompt.length} chars`)
    }
    const sample = buildPrompt({
      predictor: predictors[0],
      week,
      matchups,
      brief,
      transactions,
      standings,
      otherPicks: null,
      teamNames,
    })
    console.log(`\n----- sample prompt (${predictors[0].shortName}) -----\n${sample}`)
    console.log("\n(dry run, nothing written and no API calls made)")
    return
  }

  const client = new Anthropic()
  const results = {}
  const failures = []

  for (const [index, predictor] of [...first, ...last].entries()) {
    const isLast = predictor.id === STRATEGIC_PREDICTOR_ID
    const otherPicks =
      isLast && Object.keys(results).length > 0
        ? summarizeOtherPicks(results, matchups, predictors, teamNames)
        : null

    const prompt = buildPrompt({
      predictor,
      week,
      matchups,
      brief,
      transactions,
      standings,
      otherPicks,
      teamNames,
    })

    process.stdout.write(`  [${index + 1}/${predictors.length}] ${predictor.shortName}... `)
    try {
      const text = await askPredictor(client, prompt)
      const parsed = extractJson(text)
      results[predictor.id] = validatePicks(parsed, matchups, predictor.shortName)
      const summary = matchups.map((m) => results[predictor.id].picks[m.id].slice(0, 10)).join(" ")
      console.log(`ok (${summary})`)
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failures.push(`${predictor.shortName}: ${err.message}`)
    }

    if (index < predictors.length - 1) await sleep(DELAY_MS)
  }

  if (Object.keys(results).length === 0) {
    console.error("\nEvery predictor failed. Not writing a week file.")
    if (failures.length) console.error(failures.map((f) => `  - ${f}`).join("\n"))
    process.exitCode = 1
    return
  }

  const payload = {
    week,
    status: "pending",
    generatedAt: new Date().toISOString(),
    dataSource: state.source,
    matchups: matchups.map((m) => ({
      id: m.id,
      away: m.away,
      home: m.home,
      awayRecord: recordOf(state.teams[m.away]),
      homeRecord: recordOf(state.teams[m.home]),
      winner: null,
    })),
    picks: {},
  }

  // Written in predictors.json order regardless of generation order.
  for (const predictor of predictors) {
    const result = results[predictor.id]
    if (!result) continue
    payload.picks[predictor.id] = {
      predictorId: predictor.id,
      picks: result.picks,
      reasoning: result.reasoning,
      correct: null,
      loneWolf: null,
    }
  }

  const file = writeWeekFile(week, payload)
  console.log(`\nWrote ${file}`)
  console.log(`  ${Object.keys(payload.picks).length} of ${predictors.length} predictors, status pending`)
  if (failures.length > 0) {
    console.warn(`  ${failures.length} predictor(s) failed and were left out:`)
    console.warn(failures.map((f) => `    - ${f}`).join("\n"))
  }
  console.log("Run `npm run build:data` (or any build) to surface it on /predictions.")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
