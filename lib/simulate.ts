import { CURRENT_WEEK, TEAMS, type Division, type Team } from "./league"

const TOTAL_WEEKS = 14
const SIM_COUNT = 10000

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

export type TeamOdds = {
  team: Team
  playoffPct: number
  divisionPct: number
  championshipPct: number
}

function gamesPlayed(): number {
  return Math.max(0, CURRENT_WEEK - 1)
}

function remainingGames(): number {
  return Math.max(0, TOTAL_WEEKS - CURRENT_WEEK + 1)
}

/** Laplace-smoothed win rate so 0-7 or 7-0 teams don't collapse to a 0% or 100% coin flip. */
function strength(wins: number, games: number): number {
  return (wins + 1) / (games + 2)
}

function pickWinner(rand: () => number, a: Team, aWins: number, b: Team, bWins: number): Team {
  const sa = strength(aWins, TOTAL_WEEKS)
  const sb = strength(bWins, TOTAL_WEEKS)
  return rand() < sa / (sa + sb) ? a : b
}

export function simulateChampionshipOdds(): TeamOdds[] {
  const rand = mulberry32(seedFrom("mfga-championship-odds-2026"))
  const played = gamesPlayed()
  const remaining = remainingGames()

  const playoffCount = new Map<string, number>()
  const divisionCount = new Map<string, number>()
  const championCount = new Map<string, number>()
  for (const t of TEAMS) {
    playoffCount.set(t.slug, 0)
    divisionCount.set(t.slug, 0)
    championCount.set(t.slug, 0)
  }

  const divisions: Division[] = ["East", "West"]

  for (let sim = 0; sim < SIM_COUNT; sim++) {
    const finalWins = new Map<string, number>()
    for (const t of TEAMS) {
      const p = strength(t.record.wins, played)
      let wins = t.record.wins
      for (let g = 0; g < remaining; g++) {
        if (rand() < p) wins++
      }
      finalWins.set(t.slug, wins)
    }

    const playoffTeams: Team[] = []
    for (const division of divisions) {
      const standings = TEAMS.filter((t) => t.division === division).sort((a, b) => {
        const diff = finalWins.get(b.slug)! - finalWins.get(a.slug)!
        if (diff !== 0) return diff
        return b.pointsFor - a.pointsFor
      })
      standings.slice(0, 3).forEach((t, i) => {
        playoffCount.set(t.slug, playoffCount.get(t.slug)! + 1)
        playoffTeams.push(t)
        if (i === 0) divisionCount.set(t.slug, divisionCount.get(t.slug)! + 1)
      })
    }

    // Seed the 6 playoff teams 1-6 by simulated final wins (tiebreak: pointsFor).
    const seeded = [...playoffTeams].sort((a, b) => {
      const diff = finalWins.get(b.slug)! - finalWins.get(a.slug)!
      if (diff !== 0) return diff
      return b.pointsFor - a.pointsFor
    })
    const [s1, s2, s3, s4, s5, s6] = seeded

    const r1a = pickWinner(rand, s4, finalWins.get(s4.slug)!, s5, finalWins.get(s5.slug)!)
    const r1b = pickWinner(rand, s3, finalWins.get(s3.slug)!, s6, finalWins.get(s6.slug)!)
    const semiA = pickWinner(rand, s1, finalWins.get(s1.slug)!, r1a, finalWins.get(r1a.slug)!)
    const semiB = pickWinner(rand, s2, finalWins.get(s2.slug)!, r1b, finalWins.get(r1b.slug)!)
    const champion = pickWinner(rand, semiA, finalWins.get(semiA.slug)!, semiB, finalWins.get(semiB.slug)!)
    championCount.set(champion.slug, championCount.get(champion.slug)! + 1)
  }

  const odds: TeamOdds[] = TEAMS.map((team) => ({
    team,
    playoffPct: (playoffCount.get(team.slug)! / SIM_COUNT) * 100,
    divisionPct: (divisionCount.get(team.slug)! / SIM_COUNT) * 100,
    championshipPct: (championCount.get(team.slug)! / SIM_COUNT) * 100,
  }))

  return odds.sort((a, b) => b.championshipPct - a.championshipPct)
}
