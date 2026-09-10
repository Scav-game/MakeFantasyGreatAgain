import { TEAMS, type Division, type Team } from "./league"

const SIM_COUNT = 10000
const PLAYOFF_SPOTS_PER_DIVISION = 4

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

/**
 * Week-to-week standard deviation of a single team's score, used until this
 * season has produced enough games to measure a team's own spread.
 *
 * This is the one hand-set number in the model. It can't be derived from what
 * the repo holds: history.csv keeps season totals only, and schedule.csv holds
 * just the current year, so there are no past game logs to measure. 27 points
 * on a ~108 mean is a normal spread for a 14-team PPR league. Lower it and
 * early-season odds sharpen; raise it and they flatten.
 */
const LEAGUE_SD_PRIOR = 27

/**
 * How many recent games feed a team's scoring average. Only this many of the
 * most recent count — not the whole season, and not prior seasons — so the
 * model tracks current form and a team that has turned things around isn't
 * held to how it looked in September.
 *
 * The trade-off is sensitivity: four games is a small sample, so the average
 * carries about ±13 points of sampling error and the odds will move noticeably
 * week to week. That uncertainty is fed into the sim through `meanError` rather
 * than ignored, so a four-week hot streak reads as "probably good" instead of
 * "certainly good". Widen the window to steady the numbers down.
 */
const RECENT_GAMES = 4

/** Same idea for the spread — a sample SD needs more games to mean anything. */
const SD_PRIOR_GAMES = 6

/**
 * Neutral scoring level before a single game has been played. It cannot affect
 * any result while it applies: games are decided by comparing two scores, and
 * at that point every team shares this exact number, so it cancels out.
 */
const OPENING_LEVEL = 108

// ---------------------------------------------------------------------------
// Deterministic RNG — the page shows the same numbers on every build.
// ---------------------------------------------------------------------------

function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One standard normal draw (Box-Muller). */
function gaussian(rand: () => number): number {
  let u = 0
  while (u === 0) u = rand() // log(0) guard
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

// ---------------------------------------------------------------------------
// Team scoring model
// ---------------------------------------------------------------------------

type TeamModel = {
  team: Team
  /** Best estimate of the team's per-week scoring average. */
  mean: number
  /** Week-to-week spread around that average. */
  sd: number
  /** Standard error on `mean` — how unsure we are of the team's true level. */
  meanError: number
}

/** Every score this team has posted this season, oldest first. */
function playedScores(team: Team): number[] {
  return team.schedule
    .filter((g) => g.result)
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((g) => g.result!.teamScore)
}

/**
 * The team's most recent games, up to `RECENT_GAMES`. Sorted above rather than
 * trusted, because taking the tail of the list is only "most recent" if the
 * list is actually in week order.
 */
function recentScores(team: Team): number[] {
  return playedScores(team).slice(-RECENT_GAMES)
}

/**
 * Each team's scoring distribution, built from its last few games only.
 *
 * Nothing older than that window is consulted — not earlier weeks of this
 * season, not previous seasons, not franchise history. A team is whatever it
 * has been scoring lately.
 */
function buildModels(): Map<string, TeamModel> {
  // Where a team with no games of its own starts. Averaging what the rest of
  // the league has actually scored beats inventing a number, and it matters
  // whenever a week is only partly entered — some teams holding scores while
  // others still have none.
  const leagueScores = TEAMS.flatMap(playedScores)
  const leagueLevel =
    leagueScores.length > 0
      ? leagueScores.reduce((s, v) => s + v, 0) / leagueScores.length
      : OPENING_LEVEL

  const models = new Map<string, TeamModel>()
  for (const t of TEAMS) {
    const window = recentScores(t)
    const n = window.length

    const mean = n > 0 ? window.reduce((s, v) => s + v, 0) / n : leagueLevel

    let sd = LEAGUE_SD_PRIOR
    if (n >= 2) {
      const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
      sd = (n * Math.sqrt(variance) + SD_PRIOR_GAMES * LEAGUE_SD_PRIOR) / (n + SD_PRIOR_GAMES)
    }

    models.set(t.slug, {
      team: t,
      mean,
      sd,
      // A four-game mean has real sampling error — roughly sd/2 at a full
      // window. Carrying it into the sim is what keeps a short hot streak from
      // being simulated as though the team were certainly that good.
      meanError: sd / Math.sqrt(Math.max(1, n)),
    })
  }
  return models
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

type Matchup = { week: number; a: string; b: string }
type Series = { wins: number; losses: number }

const SLUGS = new Set(TEAMS.map((t) => t.slug))

/**
 * Every real matchup still to be played, once each. Both teams carry their own
 * row in schedule.csv, so the pair is deduped; BYE rows aren't games.
 */
function remainingMatchups(): Matchup[] {
  const seen = new Set<string>()
  const out: Matchup[] = []
  for (const team of TEAMS) {
    for (const game of team.schedule) {
      if (game.result) continue
      const opponent = game.opponent.trim()
      if (!SLUGS.has(opponent)) continue // BYE, or a placeholder opponent
      const [a, b] = [team.slug, opponent].sort()
      const key = `${game.week}|${a}|${b}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ week: game.week, a, b })
    }
  }
  return out.sort((x, y) => x.week - y.week)
}

/** Head-to-head records from games that have actually been played. */
function playedHeadToHead(): Map<string, Map<string, Series>> {
  const h2h = new Map<string, Map<string, Series>>()
  for (const team of TEAMS) {
    const row = new Map<string, Series>()
    for (const game of team.schedule) {
      if (!game.result) continue
      const prev = row.get(game.opponent) ?? { wins: 0, losses: 0 }
      if (game.result.outcome === "W") prev.wins++
      else prev.losses++
      row.set(game.opponent, prev)
    }
    h2h.set(team.slug, row)
  }
  return h2h
}

function seriesAgainst(
  slug: string,
  opponents: Set<string>,
  h2h: Map<string, Map<string, Series>>,
): Series {
  let wins = 0
  let losses = 0
  for (const [opponent, series] of h2h.get(slug)!) {
    if (!opponents.has(opponent)) continue
    wins += series.wins
    losses += series.losses
  }
  return { wins, losses }
}

/**
 * Final-standings order inside one division, using the same chain as the real
 * standings in lib/league.ts: wins, then head-to-head among the tied teams,
 * then points for. Raw wins is safe here because every simulated season is
 * complete and every team plays the same 13 games.
 */
function sortFinalStandings(
  teams: Team[],
  wins: Map<string, number>,
  points: Map<string, number>,
  h2h: Map<string, Map<string, Series>>,
): Team[] {
  const groups = new Map<number, Team[]>()
  for (const t of teams) {
    const w = wins.get(t.slug)!
    const group = groups.get(w)
    if (group) group.push(t)
    else groups.set(w, [t])
  }

  const out: Team[] = []
  for (const w of [...groups.keys()].sort((a, b) => b - a)) {
    const tied = groups.get(w)!
    if (tied.length === 1) {
      out.push(tied[0])
      continue
    }
    const tiedSlugs = new Set(tied.map((t) => t.slug))
    out.push(
      ...[...tied].sort((a, b) => {
        const ra = seriesAgainst(a.slug, tiedSlugs, h2h)
        const rb = seriesAgainst(b.slug, tiedSlugs, h2h)
        const aGames = ra.wins + ra.losses
        const bGames = rb.wins + rb.losses
        if (aGames > 0 && bGames > 0) {
          const diff = rb.wins / bGames - ra.wins / aGames
          if (diff !== 0) return diff
        }
        return points.get(b.slug)! - points.get(a.slug)!
      }),
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export type TeamOdds = {
  team: Team
  playoffPct: number
  divisionPct: number
  championshipPct: number
  /** Mean simulated final win total. */
  projectedWins: number
  /** Mean simulated final points for. */
  projectedPointsFor: number
}

/**
 * Monte Carlo over the rest of the season.
 *
 * Each sim plays out every remaining matchup on the real schedule: both teams
 * draw a score from their own distribution and the higher score wins, so every
 * game produces exactly one winner and strength of schedule falls out of the
 * matchups themselves. Games already played are kept as they happened and only
 * the remainder is simulated.
 *
 * Those distributions come from each team's last few games only — see
 * `RECENT_GAMES`. Standings still carry the full season's record and points,
 * but how a team is expected to score from here is based on current form.
 *
 * The top four in each division make the playoffs, seeded by the same
 * tiebreakers the real standings use. The bracket is 1v4 and 2v3, winners meet
 * for the division, and the two division winners meet for the title — every
 * one of those games decided by the same score draw, not by record.
 */
export function simulateChampionshipOdds(): TeamOdds[] {
  const rand = mulberry32(seedFrom("mfga-championship-odds-2026"))
  const models = buildModels()
  const upcoming = remainingMatchups()
  const h2hBase = playedHeadToHead()
  const divisions: Division[] = ["East", "West"]

  const playoffCount = new Map<string, number>()
  const divisionCount = new Map<string, number>()
  const championCount = new Map<string, number>()
  const winsTotal = new Map<string, number>()
  const pointsTotal = new Map<string, number>()
  for (const t of TEAMS) {
    playoffCount.set(t.slug, 0)
    divisionCount.set(t.slug, 0)
    championCount.set(t.slug, 0)
    winsTotal.set(t.slug, 0)
    pointsTotal.set(t.slug, 0)
  }

  for (let sim = 0; sim < SIM_COUNT; sim++) {
    // Every sim commits to one "true" level per team, drawn from how confident
    // we are in that team's mean. Reusing the point estimate in every sim would
    // understate the spread of possible seasons — early on we genuinely don't
    // know who is good, and the odds should say so.
    const level = new Map<string, number>()
    for (const model of models.values()) {
      level.set(model.team.slug, model.mean + gaussian(rand) * model.meanError)
    }

    const scoreFor = (slug: string): number =>
      Math.max(0, level.get(slug)! + gaussian(rand) * models.get(slug)!.sd)

    const wins = new Map<string, number>()
    const points = new Map<string, number>()
    const h2h = new Map<string, Map<string, Series>>()
    for (const t of TEAMS) {
      wins.set(t.slug, t.record.wins)
      points.set(t.slug, t.pointsFor)
      const row = new Map<string, Series>()
      for (const [opponent, series] of h2hBase.get(t.slug)!) row.set(opponent, { ...series })
      h2h.set(t.slug, row)
    }

    const recordResult = (winner: string, loser: string) => {
      wins.set(winner, wins.get(winner)! + 1)
      const wRow = h2h.get(winner)!
      const lRow = h2h.get(loser)!
      const wSeries = wRow.get(loser) ?? { wins: 0, losses: 0 }
      const lSeries = lRow.get(winner) ?? { wins: 0, losses: 0 }
      wSeries.wins++
      lSeries.losses++
      wRow.set(loser, wSeries)
      lRow.set(winner, lSeries)
    }

    for (const game of upcoming) {
      const scoreA = scoreFor(game.a)
      const scoreB = scoreFor(game.b)
      points.set(game.a, points.get(game.a)! + scoreA)
      points.set(game.b, points.get(game.b)! + scoreB)
      const aWon = scoreA === scoreB ? rand() < 0.5 : scoreA > scoreB
      if (aWon) recordResult(game.a, game.b)
      else recordResult(game.b, game.a)
    }

    for (const t of TEAMS) {
      winsTotal.set(t.slug, winsTotal.get(t.slug)! + wins.get(t.slug)!)
      pointsTotal.set(t.slug, pointsTotal.get(t.slug)! + points.get(t.slug)!)
    }

    /** One playoff game, decided the same way a regular-season game is. */
    const playGame = (a: Team, b: Team): Team => {
      const scoreA = scoreFor(a.slug)
      const scoreB = scoreFor(b.slug)
      if (scoreA === scoreB) return rand() < 0.5 ? a : b
      return scoreA > scoreB ? a : b
    }

    const divisionChampions: Team[] = []
    for (const division of divisions) {
      const standings = sortFinalStandings(
        TEAMS.filter((t) => t.division === division),
        wins,
        points,
        h2h,
      )
      const seeds = standings.slice(0, PLAYOFF_SPOTS_PER_DIVISION)
      for (const t of seeds) playoffCount.set(t.slug, playoffCount.get(t.slug)! + 1)
      divisionCount.set(seeds[0].slug, divisionCount.get(seeds[0].slug)! + 1)

      const [d1, d2, d3, d4] = seeds
      const semiA = playGame(d1, d4)
      const semiB = playGame(d2, d3)
      divisionChampions.push(playGame(semiA, semiB))
    }

    const [eastChamp, westChamp] = divisionChampions
    const champion = playGame(eastChamp, westChamp)
    championCount.set(champion.slug, championCount.get(champion.slug)! + 1)
  }

  const odds: TeamOdds[] = TEAMS.map((team) => ({
    team,
    playoffPct: (playoffCount.get(team.slug)! / SIM_COUNT) * 100,
    divisionPct: (divisionCount.get(team.slug)! / SIM_COUNT) * 100,
    championshipPct: (championCount.get(team.slug)! / SIM_COUNT) * 100,
    projectedWins: winsTotal.get(team.slug)! / SIM_COUNT,
    projectedPointsFor: pointsTotal.get(team.slug)! / SIM_COUNT,
  }))

  return odds.sort((a, b) => b.championshipPct - a.championshipPct)
}
