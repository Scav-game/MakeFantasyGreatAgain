import { CURRENT_WEEK, TEAMS, type Division, type Team } from "./league"

const TOTAL_WEEKS = 14
const PLAYOFF_SPOTS_PER_DIVISION = 3

export type ClinchStatus =
  | { kind: "division"; team: Team }
  | { kind: "clinched"; team: Team }
  | { kind: "win-this-week"; team: Team }
  | { kind: "win-and-loss"; team: Team; rival: Team }

function remainingGames(): number {
  return Math.max(0, TOTAL_WEEKS - CURRENT_WEEK + 1)
}

/**
 * A team's "floor" is the fewest wins they can possibly finish with (they
 * lose every remaining game). A team's "ceiling" is the most wins they can
 * possibly finish with (they win every remaining game). Comparing these
 * bounds — rather than simulating actual matchups — is what lets us say a
 * spot is clinched *no matter what happens* the rest of the season.
 */
function floor(team: Team): number {
  return team.record.wins
}

function ceiling(team: Team, extraLockedLoss = false): number {
  const remaining = remainingGames()
  const usable = extraLockedLoss ? Math.max(0, remaining - 1) : remaining
  return team.record.wins + usable
}

function countThreats(target: Team, rivals: Team[], targetFloor: number, dropped: Set<string>): Team[] {
  return rivals.filter((r) => ceiling(r, dropped.has(r.slug)) >= targetFloor)
}

export function getClinchStatuses(): ClinchStatus[] {
  const statuses: ClinchStatus[] = []
  const divisions: Division[] = ["East", "West"]

  for (const division of divisions) {
    const teams = TEAMS.filter((t) => t.division === division)

    for (const team of teams) {
      const rivals = teams.filter((t) => t.slug !== team.slug)

      // Division title: guaranteed to finish strictly ahead of every rival's ceiling.
      const rivalCeilings = rivals.map((r) => ceiling(r))
      if (floor(team) > Math.max(0, ...rivalCeilings)) {
        statuses.push({ kind: "division", team })
        continue
      }

      // Already-clinched playoff berth: fewer than 3 rivals could possibly catch the floor.
      const threatsNow = countThreats(team, rivals, floor(team), new Set())
      if (threatsNow.length < PLAYOFF_SPOTS_PER_DIVISION) {
        statuses.push({ kind: "clinched", team })
        continue
      }

      if (remainingGames() === 0) continue

      // Scenario: team wins this week, nothing else needs to happen.
      const floorIfWin = floor(team) + 1
      const threatsIfWin = countThreats(team, rivals, floorIfWin, new Set())
      if (threatsIfWin.length < PLAYOFF_SPOTS_PER_DIVISION) {
        statuses.push({ kind: "win-this-week", team })
        continue
      }

      // Scenario: team wins this week AND one specific rival loses this week,
      // knocking that rival's ceiling down by one game.
      const sortedThreats = [...threatsIfWin].sort((a, b) => ceiling(a) - ceiling(b))
      for (const rival of sortedThreats) {
        const dropped = new Set([rival.slug])
        const threatsAfterDrop = countThreats(team, rivals, floorIfWin, dropped)
        if (threatsAfterDrop.length < PLAYOFF_SPOTS_PER_DIVISION) {
          statuses.push({ kind: "win-and-loss", team, rival })
          break
        }
      }
    }
  }

  const order: Record<ClinchStatus["kind"], number> = {
    division: 0,
    clinched: 1,
    "win-this-week": 2,
    "win-and-loss": 3,
  }
  return statuses.sort((a, b) => order[a.kind] - order[b.kind])
}

export function describeClinchStatus(status: ClinchStatus): string {
  switch (status.kind) {
    case "division":
      return `${status.team.name} have clinched the ${status.team.division} division.`
    case "clinched":
      return `${status.team.name} have clinched a playoff berth.`
    case "win-this-week":
      return `${status.team.name} clinch a playoff berth with a WIN this week.`
    case "win-and-loss":
      return `${status.team.name} clinch a playoff berth with a WIN + ${status.rival.name} LOSS this week.`
  }
}

export function isSecured(status: ClinchStatus): boolean {
  return status.kind === "division" || status.kind === "clinched"
}
