import type { Division, Team } from "./league"

/**
 * Playoff clinch / elimination scenarios.
 *
 * Format (commissioner + ESPN settings): the top 4 in each 7-team division make
 * the playoffs. Within a division, teams are ordered by wins, then head-to-head
 * record among the tied teams (a mini round-robin inside the tie group, the
 * same way getStandings() breaks ties), then points for.
 *
 * This is exact, not a floor/ceiling estimate. For a given team it asks:
 *
 *   "Is there ANY way the rest of the season can play out that leaves this
 *    team outside the top 4?"
 *
 * If no such path exists, the spot is clinched. Elimination is the mirror
 * question: "is there ANY path that puts this team in the top 4?".
 *
 * How the search stays small enough to be exact:
 *
 * - The team being checked loses every remaining game (clinch check) or wins
 *   every remaining game (elimination check). Losing can never improve a
 *   team's finish, so that is always its worst / best case.
 * - Every remaining game between two division rivals is enumerated outright,
 *   because those games decide both win totals and head-to-head.
 * - Cross-division games only add a win to one side of the division and never
 *   touch head-to-head, so each rival just gets a range of possible extra wins
 *   (0 up to its cross-division games left) instead of 2^n branches.
 * - With those fixed, each rival either finishes above, below, or level with
 *   the team; every combination of "who ends up level" is tried and the tie
 *   group is resolved by head-to-head.
 * - A tie that head-to-head can't separate falls to points for, which nobody
 *   can know in advance, so it goes against the team when checking a clinch
 *   and for the team when checking elimination. Clinches are never claimed on
 *   a points-for coin flip.
 *
 * "This week" scenarios then try every combination of the week's results for
 * games involving the division (2^7 at most), run the check on each, and boil
 * the combinations that clinch down to the shortest set of conditions, so a
 * path like "win + every other contender loses" shows up the same way as a
 * simple "win and you're in".
 *
 * Pass `asOfWeek` to replay any past week: results from that week onward are
 * ignored and the scenarios are the ones that existed going into it.
 */

const PLAYOFF_SPOTS_PER_DIVISION = 4
const DIVISIONS: Division[] = ["East", "West"]
/** Cap on paths printed per goal; the rest are summarised as "other combinations". */
const MAX_PATHS = 4

export type ClinchCondition = { week: number; winner: string; loser: string }
export type ClinchPath = ClinchCondition[]
export type ClinchGoal = "top-seed" | "berth" | "elimination"

export type ClinchStatus =
  | { kind: "top-seed"; team: Team }
  | { kind: "clinched"; team: Team }
  | { kind: "eliminated"; team: Team }
  | { kind: "scenario"; team: Team; goal: ClinchGoal; paths: ClinchPath[]; morePaths: boolean }

export type ClinchReport = {
  /** The week whose results the scenarios are about. */
  week: number
  statuses: ClinchStatus[]
}

type OpenGame = { week: number; a: string; b: string; ia: number; ib: number }

type DivisionState = {
  teams: Team[]
  index: Map<string, number>
  /** Wins from decided games. */
  wins: number[]
  /** beat[i][j]: i has beaten j in a decided game. */
  beat: boolean[][]
  /** Undecided games involving at least one division team. */
  open: OpenGame[]
}

type Mode = "clinch" | "alive"

function buildDivisionState(teams: Team[], division: Division, asOfWeek: number): DivisionState {
  const divTeams = teams.filter((t) => t.division === division)
  const index = new Map(divTeams.map((t, i) => [t.slug, i]))
  const known = new Set(teams.map((t) => t.slug))
  const n = divTeams.length
  const wins = new Array<number>(n).fill(0)
  const beat = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const open: OpenGame[] = []
  const seen = new Set<string>()

  for (const team of divTeams) {
    for (const game of team.schedule) {
      if (!known.has(game.opponent)) continue // BYE or placeholder
      const [a, b] = [team.slug, game.opponent].sort()
      const key = `${game.week}|${a}|${b}`
      if (seen.has(key)) continue
      seen.add(key)

      const ia = index.get(a) ?? -1
      const ib = index.get(b) ?? -1
      if (game.result && game.week < asOfWeek) {
        const winner = game.result.outcome === "W" ? team.slug : game.opponent
        const iw = index.get(winner) ?? -1
        const il = winner === a ? ib : ia
        if (iw >= 0) wins[iw]++
        if (iw >= 0 && il >= 0) beat[iw][il] = true
      } else {
        open.push({ week: game.week, a, b, ia, ib })
      }
    }
  }

  open.sort((x, y) => x.week - y.week || x.a.localeCompare(y.a))
  return { teams: divTeams, index, wins, beat, open }
}

/**
 * clinch mode: true when team `t` is guaranteed a top-`spots` finish.
 * alive mode:  true when team `t` can still reach a top-`spots` finish.
 * `assumed` fixes the winner of some open games (this week's scenario).
 */
function check(state: DivisionState, t: number, spots: number, mode: Mode, assumed: Map<OpenGame, string>): boolean {
  const n = state.teams.length
  const wins = state.wins.slice()
  const beat = state.beat.map((row) => row.slice())
  const cross = new Array<number>(n).fill(0)
  const intra: [number, number][] = []

  const record = (w: number, l: number) => {
    if (w >= 0) wins[w]++
    if (w >= 0 && l >= 0) beat[w][l] = true
  }

  for (const g of state.open) {
    const fixed = assumed.get(g)
    if (fixed !== undefined) {
      if (fixed === g.a) record(g.ia, g.ib)
      else record(g.ib, g.ia)
      continue
    }
    if (g.ia === t || g.ib === t) {
      const other = g.ia === t ? g.ib : g.ia
      if (mode === "alive") record(t, other)
      else record(other, t)
      continue
    }
    if (g.ia >= 0 && g.ib >= 0) intra.push([g.ia, g.ib])
    else cross[g.ia >= 0 ? g.ia : g.ib]++
  }

  // Try the most likely counterexample first so the common case exits on the
  // first leaf: when hunting a non-clinch, the stronger rival wins; when
  // hunting a path in, the weaker rival wins.
  const potential = (i: number) => wins[i] + cross[i]
  for (const pair of intra) {
    const [x, y] = pair
    const xFirst = mode === "clinch" ? potential(x) >= potential(y) : potential(x) <= potential(y)
    if (!xFirst) pair.reverse()
  }

  const rivals = [...Array(n).keys()].filter((i) => i !== t)

  // Leaf: every division game is decided, rivals still hold a range of
  // cross-division wins. Returns true when the leaf answers the question
  // (a counterexample for clinch mode, a way in for alive mode).
  const leaf = (): boolean => {
    const wT = wins[t]
    const tieable = rivals.filter((r) => wins[r] <= wT && wins[r] + cross[r] >= wT)

    for (let mask = 0; mask < 1 << tieable.length; mask++) {
      const group = [t]
      for (let k = 0; k < tieable.length; k++) if (mask & (1 << k)) group.push(tieable[k])
      const inGroup = new Set(group)

      let ahead = 0
      let valid = true
      for (const r of rivals) {
        if (inGroup.has(r)) continue
        const canAbove = wins[r] + cross[r] > wT
        const canBelow = wins[r] < wT
        if (mode === "clinch") {
          if (canAbove) ahead++
          else if (!canBelow) valid = false
        } else if (!canBelow) {
          if (canAbove) ahead++
          else valid = false
        }
      }
      if (!valid) continue

      const groupWins = (x: number) => group.reduce((s, y) => s + (y !== x && beat[x][y] ? 1 : 0), 0)
      const gT = groupWins(t)
      for (const m of group) {
        if (m === t) continue
        const gm = groupWins(m)
        // Level on head-to-head goes to points for: against the team when
        // proving a clinch, for the team when proving it's still alive.
        if (mode === "clinch" ? gm >= gT : gm > gT) ahead++
      }

      if (mode === "clinch" ? ahead >= spots : ahead < spots) return true
    }
    return false
  }

  const search = (k: number): boolean => {
    if (k === intra.length) return leaf()
    for (const [w, l] of [intra[k], [intra[k][1], intra[k][0]]]) {
      wins[w]++
      beat[w][l] = true
      const found = search(k + 1)
      wins[w]--
      beat[w][l] = false
      if (found) return true
    }
    return false
  }

  const found = search(0)
  return mode === "clinch" ? !found : found
}

/**
 * Shortest sets of results that guarantee `truth` is true, as a small cover of
 * the true rows of the truth table (prime implicants, greedily chosen).
 */
function minimalPaths(truth: boolean[], vars: number): { picks: [number, number][][]; more: boolean } {
  const full = (1 << vars) - 1
  const implicants: { care: number; value: number; size: number }[] = []

  const popcount = (x: number) => {
    let c = 0
    while (x) {
      c += x & 1
      x >>= 1
    }
    return c
  }

  const careMasks = [...Array(1 << vars).keys()].sort((x, y) => popcount(x) - popcount(y))
  for (const care of careMasks) {
    for (let value = 0; value <= full; value++) {
      if ((value & ~care) !== 0) continue
      // Skip if a smaller implicant already covers this cube.
      if (implicants.some((p) => (p.care & care) === p.care && (value & p.care) === p.value)) continue
      let all = true
      for (let m = 0; m <= full && all; m++) if ((m & care) === value && !truth[m]) all = false
      if (all) implicants.push({ care, value, size: popcount(care) })
    }
  }

  const uncovered = new Set([...Array(1 << vars).keys()].filter((m) => truth[m]))
  const chosen: typeof implicants = []
  while (uncovered.size > 0) {
    let best = implicants[0]
    let bestCount = -1
    for (const p of implicants) {
      let count = 0
      for (const m of uncovered) if ((m & p.care) === p.value) count++
      if (count > bestCount || (count === bestCount && p.size < best.size)) {
        best = p
        bestCount = count
      }
    }
    chosen.push(best)
    for (const m of [...uncovered]) if ((m & best.care) === best.value) uncovered.delete(m)
  }

  chosen.sort((x, y) => x.size - y.size)
  const picks = chosen.slice(0, MAX_PATHS).map((p) => {
    const out: [number, number][] = []
    for (let v = 0; v < vars; v++) if (p.care & (1 << v)) out.push([v, (p.value >> v) & 1])
    return out
  })
  return { picks, more: chosen.length > MAX_PATHS }
}

function analyzeDivision(teams: Team[], division: Division, week: number): ClinchStatus[] {
  const state = buildDivisionState(teams, division, week)
  const weekGames = state.open.filter((g) => g.week === week)
  const vars = weekGames.length
  const statuses: ClinchStatus[] = []
  const none = new Map<OpenGame, string>()

  const assumptionsFor = (mask: number) => {
    const assumed = new Map<OpenGame, string>()
    weekGames.forEach((g, v) => assumed.set(g, mask & (1 << v) ? g.b : g.a))
    return assumed
  }

  const toPath = (lits: [number, number][]): ClinchPath =>
    lits.map(([v, bit]) => {
      const g = weekGames[v]
      return bit ? { week: g.week, winner: g.b, loser: g.a } : { week: g.week, winner: g.a, loser: g.b }
    })

  const scenario = (team: Team, goal: ClinchGoal, predicate: (assumed: Map<OpenGame, string>) => boolean) => {
    if (vars === 0) return
    const truth = [...Array(1 << vars).keys()].map((m) => predicate(assumptionsFor(m)))
    if (!truth.some(Boolean)) return
    const { picks, more } = minimalPaths(truth, vars)
    statuses.push({ kind: "scenario", team, goal, paths: picks.map(toPath), morePaths: more })
  }

  state.teams.forEach((team, t) => {
    if (check(state, t, 1, "clinch", none)) {
      statuses.push({ kind: "top-seed", team })
      return
    }

    const berth = check(state, t, PLAYOFF_SPOTS_PER_DIVISION, "clinch", none)
    if (berth) statuses.push({ kind: "clinched", team })

    if (!check(state, t, PLAYOFF_SPOTS_PER_DIVISION, "alive", none)) {
      statuses.push({ kind: "eliminated", team })
      return
    }

    // The top seed is only worth a scenario line once it's actually in reach.
    if (check(state, t, 1, "alive", none)) {
      scenario(team, "top-seed", (a) => check(state, t, 1, "clinch", a))
    }
    if (!berth) {
      scenario(team, "berth", (a) => check(state, t, PLAYOFF_SPOTS_PER_DIVISION, "clinch", a))
      scenario(team, "elimination", (a) => !check(state, t, PLAYOFF_SPOTS_PER_DIVISION, "alive", a))
    }
  })

  return statuses
}

function statusRank(status: ClinchStatus): number {
  if (status.kind === "scenario") return { "top-seed": 2, berth: 3, elimination: 4 }[status.goal]
  return { "top-seed": 0, clinched: 1, eliminated: 5 }[status.kind]
}

/**
 * Every clinch / elimination status and scenario for the week `asOfWeek`,
 * using only results from before that week.
 */
export function analyzeClinch(teams: Team[], asOfWeek: number): ClinchReport {
  const statuses = DIVISIONS.flatMap((d) => analyzeDivision(teams, d, asOfWeek))
  return { week: asOfWeek, statuses: statuses.sort((a, b) => statusRank(a) - statusRank(b)) }
}

function joinPlus(parts: string[]): string {
  return parts.join(" + ")
}

export function describeClinchStatus(status: ClinchStatus, teams: Team[]): string {
  const { team } = status
  const nameOf = (slug: string) => teams.find((t) => t.slug === slug)?.name ?? slug

  switch (status.kind) {
    case "top-seed":
      return `${team.name} have clinched the #1 seed in the ${team.division}.`
    case "clinched":
      return `${team.name} have clinched a playoff berth.`
    case "eliminated":
      return `${team.name} have been eliminated from playoff contention.`
    case "scenario": {
      const phrase = (c: ClinchCondition) => {
        if (c.winner === team.slug) return "a WIN"
        if (c.loser === team.slug) return "a LOSS"
        const winnerInDivision = teams.find((t) => t.slug === c.winner)?.division === team.division
        const loserInDivision = teams.find((t) => t.slug === c.loser)?.division === team.division
        // A game between two division rivals matters for both sides, so name
        // both; otherwise name just the side that lives in this division.
        if (winnerInDivision && loserInDivision) return `${nameOf(c.winner)} beat ${nameOf(c.loser)}`
        return loserInDivision ? `${nameOf(c.loser)} loss` : `${nameOf(c.winner)} win`
      }
      const own = (c: ClinchCondition) => (c.winner === team.slug || c.loser === team.slug ? 0 : 1)
      const paths = status.paths.map((p) => joinPlus([...p].sort((x, y) => own(x) - own(y)).map(phrase)))
      const verb =
        status.goal === "elimination"
          ? "are eliminated"
          : status.goal === "top-seed"
            ? `clinch the #1 seed in the ${team.division}`
            : "clinch a playoff berth"
      const tail = status.morePaths ? ", or other combinations" : ""
      return `${team.name} ${verb} with ${paths.join(", or ")}${tail} this week.`
    }
  }
}

export function isSecured(status: ClinchStatus): boolean {
  return status.kind === "top-seed" || status.kind === "clinched"
}
