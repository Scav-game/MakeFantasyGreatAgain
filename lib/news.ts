import { CURRENT_WEEK, CUSTOM_NEWS, TEAMS, getStandings, getTeam, type Team } from "./league"

export type NewsArticle = {
  id: string
  headline: string
  body: string
  team: Team | null
  generatedAt: string
  isCustom?: boolean
}

function generatedTimestamp(offsetMinutes: number): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - offsetMinutes)
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function weekRecap(recapWeek: number): NewsArticle | null {
  type Row = { team: Team; opp: Team | undefined; teamScore: number; oppScore: number; margin: number }
  const rows: Row[] = []
  for (const team of TEAMS) {
    const game = team.schedule.find((g) => g.week === recapWeek)
    if (!game?.result) continue
    rows.push({
      team,
      opp: getTeam(game.opponent),
      teamScore: game.result.teamScore,
      oppScore: game.result.oppScore,
      margin: game.result.teamScore - game.result.oppScore,
    })
  }
  if (rows.length === 0) return null

  const blowout = rows.reduce((a, b) => (Math.abs(b.margin) > Math.abs(a.margin) ? b : a))
  const closest = rows.reduce((a, b) => (Math.abs(b.margin) < Math.abs(a.margin) ? b : a))
  const highScorer = rows.reduce((a, b) => (b.teamScore > a.teamScore ? b : a))

  const blowoutOppName = blowout.opp?.name ?? "their opponent"
  const body = [
    blowout.margin >= 0
      ? `${blowout.team.name} put up the week's biggest statement, winning by ${blowout.margin.toFixed(1)} points over ${blowoutOppName}.`
      : `${blowoutOppName} delivered the week's biggest beatdown, handing ${blowout.team.name} a ${Math.abs(blowout.margin).toFixed(1)}-point loss.`,
    `The nail-biter belonged to ${closest.team.name}, decided by just ${Math.abs(closest.margin).toFixed(1)} points against ${closest.opp?.name ?? "their opponent"}.`,
    `${highScorer.team.name} torched the scoreboard with a league-best ${highScorer.teamScore.toFixed(1)} points on the week.`,
  ].join(" ")

  return {
    id: `week-${recapWeek}-recap`,
    headline: `Week ${recapWeek} Recap`,
    body,
    team: blowout.team,
    generatedAt: generatedTimestamp(60),
  }
}

function winStreakArticle(): NewsArticle | null {
  let best: { team: Team; count: number } | null = null
  for (const team of TEAMS) {
    const match = /^W(\d+)$/.exec(team.streak)
    if (!match) continue
    const count = Number(match[1])
    if (!best || count > best.count) best = { team, count }
  }
  if (!best || best.count < 2) return null

  return {
    id: "win-streak",
    headline: `${best.team.name} Riding ${best.count}-Game Win Streak`,
    body: `Nobody in the league is hotter right now than ${best.team.name}, winners of ${best.count} straight. At ${best.team.record.wins}-${best.team.record.losses} with ${best.team.pointsFor.toFixed(1)} points for, they've turned ${best.team.stadium.name} into the last place opposing coordinators want to visit.`,
    team: best.team,
    generatedAt: generatedTimestamp(95),
  }
}

function tradeBlockArticle(): NewsArticle {
  const mostPoints = [...TEAMS].sort((a, b) => b.pointsFor - a.pointsFor)[0]
  return {
    id: "trade-block-watch",
    headline: "Trade Block Watch",
    body: `With Week ${CURRENT_WEEK} underway, front offices around the league are reportedly working the phones. Rumblings point to bench depth and bye-week fill-ins as the going rate, with contenders looking to buy and rebuilding rosters looking to sell. ${mostPoints.name}'s front office in particular is said to be fielding calls, unwilling to let a hot start go to waste.`,
    team: mostPoints,
    generatedAt: generatedTimestamp(140),
  }
}

function playoffBubbleArticle(): NewsArticle | null {
  const standings = getStandings()
  const bubbleTeams = standings.filter((t) => t.divisionRank === 4)
  if (bubbleTeams.length === 0) return null
  const bubble = bubbleTeams.reduce((a, b) => (b.record.wins > a.record.wins ? b : a))

  return {
    id: "playoff-bubble",
    headline: `${bubble.name} Fighting for Playoff Life`,
    body: `Sitting fourth in the ${bubble.division} at ${bubble.record.wins}-${bubble.record.losses}, ${bubble.name} are on the outside looking in with the playoff cutoff just one spot away. Every remaining game is close to a must-win if they want to crash the top three and keep their season alive.`,
    team: bubble,
    generatedAt: generatedTimestamp(180),
  }
}

function powerRankingsArticle(): NewsArticle {
  const ranked = [...TEAMS].sort((a, b) => b.pointsFor - a.pointsFor)
  const [first, second, third] = ranked
  return {
    id: "power-rankings",
    headline: `Power Rankings: ${first.name} Holds the Crown`,
    body: `Through Week ${CURRENT_WEEK - 1}, ${first.name} sits atop the league power rankings with ${first.pointsFor.toFixed(1)} points for and a ${first.record.wins}-${first.record.losses} record. ${second.name} (${second.pointsFor.toFixed(1)} PF) and ${third.name} (${third.pointsFor.toFixed(1)} PF) round out the top three, but the gap at the top remains thin enough that a single bad week could reshuffle the whole board.`,
    team: first,
    generatedAt: generatedTimestamp(220),
  }
}

function rivalryAlertArticle(): NewsArticle | null {
  type Matchup = { team: Team; opp: Team; combinedWins: number }
  const matchups: Matchup[] = []
  for (const team of TEAMS) {
    const game = team.schedule.find((g) => g.week === CURRENT_WEEK)
    if (!game) continue
    const opp = getTeam(game.opponent)
    if (!opp) continue
    matchups.push({ team, opp, combinedWins: team.record.wins + opp.record.wins })
  }
  if (matchups.length === 0) return null
  const top = matchups.reduce((a, b) => (b.combinedWins > a.combinedWins ? b : a))

  return {
    id: "rivalry-alert",
    headline: `Rivalry Alert: ${top.team.name} vs ${top.opp.name} in Week ${CURRENT_WEEK}`,
    body: `The marquee matchup of Week ${CURRENT_WEEK} pits ${top.team.name} (${top.team.record.wins}-${top.team.record.losses}) against ${top.opp.name} (${top.opp.record.wins}-${top.opp.record.losses}). With a combined ${top.combinedWins} wins between them, this is the game the rest of the league will be watching.`,
    team: top.team,
    generatedAt: generatedTimestamp(30),
  }
}

function customNewsArticles(): NewsArticle[] {
  return CUSTOM_NEWS.filter((n) => n.headline && n.body).map((n, i) => ({
    id: `custom-${i}`,
    headline: n.headline,
    body: n.body,
    team: n.teamSlug ? (getTeam(n.teamSlug) ?? null) : null,
    generatedAt: n.date,
    isCustom: true,
  }))
}

export function generateNewsArticles(): NewsArticle[] {
  const recapWeek = CURRENT_WEEK - 1
  const generated = [
    weekRecap(recapWeek),
    winStreakArticle(),
    tradeBlockArticle(),
    playoffBubbleArticle(),
    powerRankingsArticle(),
    rivalryAlertArticle(),
  ].filter((a): a is NewsArticle => a !== null)

  return [...customNewsArticles(), ...generated]
}
