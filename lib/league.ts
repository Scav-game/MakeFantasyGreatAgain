export type Division = "East" | "West"

export type MerchItem = {
  name: string
  type: "jersey" | "hat" | "hoodie"
}

export type Player = {
  name: string
  pos: string
  nflTeam: string
  points: number
}

export type Game = {
  week: number
  opponent: string // slug
  date: string
  time: string
  home: boolean
  result?: {
    outcome: "W" | "L"
    teamScore: number
    oppScore: number
  }
}

export type DraftPick = {
  year: number
  round: string
  origin: string
}

export type TeamHistory = {
  yearJoined: number
  allTimeRecord: { wins: number; losses: number }
  totalPointsFor: number
  playoffAppearances: number
  championships: number
}

export type Team = {
  slug: string
  name: string
  nameLines: [string, string]
  /** which of the two name lines uses the accent color (0 or 1) */
  accentLine: 0 | 1
  division: Division
  tagline: string
  theme: string
  stadium: { name: string; city: string }
  hero: string
  colors: {
    primary: string
    accent: string
    dark: string
    light: string
  }
  merch: MerchItem[]
  record: { wins: number; losses: number }
  pointsFor: number
  pointsAgainst: number
  streak: string
  roster: { starters: Player[]; bench: Player[] }
  draftPicks: DraftPick[]
  schedule: Game[]
  history: TeamHistory
}

export const CURRENT_WEEK = 8
export const SEASON_START = new Date("2026-09-07T00:00:00Z")

/* ---------- deterministic pseudo-random helpers ---------- */

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

/* ---------- player name pools ---------- */

const FIRST_NAMES = [
  "Marcus", "DeShawn", "Tyler", "Jaylen", "Cooper", "Amari", "Brock", "Devon",
  "Trey", "Xavier", "Isaiah", "Malik", "Grant", "Roman", "Kaden", "Silas",
  "Dominic", "Rashad", "Colton", "Emmitt", "Bo", "Kingsley", "Zion", "Cade",
  "Rocco", "Nassir", "Dexter", "Hollis", "Vince", "Odell",
]

const LAST_NAMES = [
  "Freeman", "Holloway", "Vance", "Sturridge", "Okafor", "Delgado", "Barnes",
  "Whitlock", "Castellano", "Rhodes", "Petrov", "Yoon", "Abara", "Sinclair",
  "Mancini", "Bautista", "Kingsley", "Fontaine", "Wallace", "Drummond",
  "Ferris", "Nakamura", "Osei", "Beauchamp", "Voss", "Calloway", "Ridley",
  "Amaya", "Boone", "Cervantes",
]

const NFL_TEAMS = [
  "SF", "DAL", "KC", "PHI", "BUF", "MIA", "DET", "BAL", "CIN", "MIN",
  "LAR", "GB", "SEA", "HOU", "NYJ", "JAX", "CLE", "PIT", "ATL", "LV",
]

const STARTER_POSITIONS = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "K", "DEF"]
const BENCH_POSITIONS = ["QB", "RB", "WR", "WR", "TE", "K"]

function makePlayer(rand: () => number, pos: string): Player {
  const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
  const nflTeam = NFL_TEAMS[Math.floor(rand() * NFL_TEAMS.length)]
  let name = `${first} ${last}`
  let points = 0
  if (pos === "DEF") {
    name = `${nflTeam} Defense`
    points = Math.round((60 + rand() * 90) * 10) / 10
  } else if (pos === "K") {
    points = Math.round((70 + rand() * 60) * 10) / 10
  } else if (pos === "QB") {
    points = Math.round((160 + rand() * 140) * 10) / 10
  } else {
    points = Math.round((80 + rand() * 180) * 10) / 10
  }
  return { name, pos, nflTeam, points }
}

function buildRoster(slug: string): { starters: Player[]; bench: Player[] } {
  const rand = mulberry32(seedFrom(slug + "-roster"))
  const starters = STARTER_POSITIONS.map((pos) => makePlayer(rand, pos))
  const bench = BENCH_POSITIONS.map((pos) => makePlayer(rand, pos))
  return { starters, bench }
}

function formatDate(week: number): string {
  const d = new Date(SEASON_START)
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

const KICK_TIMES = ["1:00 PM", "4:25 PM", "8:20 PM", "12:00 PM", "3:30 PM"]

function buildSchedule(slugs: string[], index: number): Game[] {
  const slug = slugs[index]
  const rand = mulberry32(seedFrom(slug + "-sched"))
  const games: Game[] = []
  for (let week = 1; week <= 14; week++) {
    let oppIndex = (index + week) % slugs.length
    if (oppIndex === index) oppIndex = (oppIndex + 1) % slugs.length
    const home = week % 2 === (index % 2)
    const game: Game = {
      week,
      opponent: slugs[oppIndex],
      date: formatDate(week),
      time: KICK_TIMES[week % KICK_TIMES.length],
      home,
    }
    if (week < CURRENT_WEEK) {
      const teamScore = Math.round((85 + rand() * 65) * 10) / 10
      const oppScore = Math.round((85 + rand() * 65) * 10) / 10
      game.result = {
        outcome: teamScore >= oppScore ? "W" : "L",
        teamScore,
        oppScore,
      }
    }
    games.push(game)
  }
  return games
}

/* ---------- base team definitions ---------- */

function buildDraftPicks(slug: string, index: number): DraftPick[] {
  const rand = mulberry32(seedFrom(slug + "-draft"))
  const rounds = ["1st Round", "2nd Round", "3rd Round", "4th Round"]
  const picks: DraftPick[] = []
  for (const year of [2026, 2027]) {
    const owned = rounds.filter(() => rand() > 0.35)
    const list = owned.length ? owned : [rounds[0]]
    for (const round of list) {
      const fromOwn = rand() > 0.7
      const originIndex = fromOwn ? index : Math.floor(rand() * SLUGS.length)
      picks.push({
        year,
        round,
        origin: fromOwn ? "Own" : BASE_TEAMS[originIndex].name,
      })
    }
  }
  return picks
}

const LEAGUE_FOUNDED = 2018

function buildHistory(slug: string): TeamHistory {
  const rand = mulberry32(seedFrom(slug + "-history"))
  const yearJoined = LEAGUE_FOUNDED + Math.floor(rand() * (2025 - LEAGUE_FOUNDED + 1))
  const seasons = 2025 - yearJoined + 1
  const gamesPerSeason = 14
  const totalGames = seasons * gamesPerSeason
  const winPct = 0.35 + rand() * 0.3
  const wins = Math.round(totalGames * winPct)
  const losses = totalGames - wins
  const totalPointsFor = Math.round((totalGames * (95 + rand() * 25)) * 10) / 10
  const playoffAppearances = Math.min(seasons, Math.round(seasons * (0.3 + rand() * 0.5)))
  const championships = Math.min(playoffAppearances, Math.floor(rand() * 3))
  return {
    yearJoined,
    allTimeRecord: { wins, losses },
    totalPointsFor,
    playoffAppearances,
    championships,
  }
}

type BaseTeam = Omit<
  Team,
  "roster" | "schedule" | "record" | "pointsFor" | "pointsAgainst" | "streak" | "draftPicks" | "history"
>

const BASE_TEAMS: BaseTeam[] = [
  {
    slug: "pakistan-bombers",
    name: "Pakistan Bombers",
    nameLines: ["PAKISTAN", "BOMBERS"],
    accentLine: 1,
    division: "East",
    tagline: "Dropping touchdowns. Taking names.",
    theme: "Military · Explosive · War Zone",
    stadium: { name: "Bomber Stadium", city: "Islamabad, Pakistan" },
    hero: "/teams/pakistan-bombers.png",
    colors: { primary: "#C62828", accent: "#D4A017", dark: "#170707", light: "#F5E9D0" },
    merch: [
      { name: "Home Red Jersey", type: "jersey" },
      { name: "Dynamite Snapback", type: "hat" },
      { name: "Stencil Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "nabers-in-paris",
    name: "Nabers in Paris",
    nameLines: ["NABERS", "IN PARIS"],
    accentLine: 1,
    division: "East",
    tagline: "Style. Speed. Statements.",
    theme: "Parisian Luxury · Haute Couture",
    stadium: { name: "Stade de Nabers", city: "Paris, France" },
    hero: "/teams/nabers-in-paris.png",
    colors: { primary: "#1A1A4E", accent: "#C0392B", dark: "#0A0A1F", light: "#EDE7DA" },
    merch: [
      { name: "Couture Navy Jersey", type: "jersey" },
      { name: "Eiffel Skyline Cap", type: "hat" },
      { name: "Maison Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "mount-olympus",
    name: "Mount Olympus Yogurt Dressing",
    nameLines: ["MOUNT OLYMPUS", "YOGURT DRESSING"],
    accentLine: 0,
    division: "East",
    tagline: "Where legends are forged.",
    theme: "Greek Mythology · Marble & Gold",
    stadium: { name: "The Pantheon Arena", city: "Mount Olympus, Greece" },
    hero: "/teams/mount-olympus.png",
    colors: { primary: "#EC5829", accent: "#D4A017", dark: "#161211", light: "#F3ECE2" },
    merch: [
      { name: "Olympian White Jersey", type: "jersey" },
      { name: "Laurel Wreath Cap", type: "hat" },
      { name: "Marble Texture Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "vile-horrendous",
    name: "The Vile Horrendous",
    nameLines: ["THE VILE", "HORRENDOUS"],
    accentLine: 1,
    division: "East",
    tagline: "Fear has a new name.",
    theme: "Gothic Horror · Haunted Castle",
    stadium: { name: "The Dungeon", city: "Shadowmoor" },
    hero: "/teams/vile-horrendous.png",
    colors: { primary: "#1C75BC", accent: "#BE2026", dark: "#080810", light: "#DCE4EF" },
    merch: [
      { name: "Castle Crest Jersey", type: "jersey" },
      { name: "Red-Stitch Cap", type: "hat" },
      { name: "Fraktur Gothic Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "fort-bragg",
    name: "Fort Bragg Confederates",
    nameLines: ["FORT BRAGG", "CONFEDERATES"],
    accentLine: 1,
    division: "East",
    tagline: "Strength through discipline.",
    theme: "Military Base · Tactical · Army",
    stadium: { name: "Bragg Field", city: "Fayetteville, NC" },
    hero: "/teams/fort-bragg.png",
    colors: { primary: "#A26F64", accent: "#D4A017", dark: "#14100D", light: "#E8DFCE" },
    merch: [
      { name: "Camo Field Jersey", type: "jersey" },
      { name: "Olive Drab Cap", type: "hat" },
      { name: "Stencil Corps Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "chicago-zestiest",
    name: "Chicago Zestiest Man",
    nameLines: ["CHICAGO", "ZESTIEST MAN"],
    accentLine: 1,
    division: "East",
    tagline: "Bringing the zest since 2026.",
    theme: "Fun · Colorful · Chicago Vibes",
    stadium: { name: "Zest Field", city: "Chicago, IL" },
    hero: "/teams/chicago-zestiest.png",
    colors: { primary: "#42A5F5", accent: "#F48FB1", dark: "#0B1524", light: "#EAF4FE" },
    merch: [
      { name: "Zest Blue Jersey", type: "jersey" },
      { name: "Cartoon Logo Snapback", type: "hat" },
      { name: "Skyline Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "beer",
    name: "Beer",
    nameLines: ["BEER", "BREWING CO."],
    accentLine: 1,
    division: "East",
    tagline: "Crafted with care. Served cold.",
    theme: "Craft Brewery · Rustic Pub",
    stadium: { name: "The Brewery", city: "Milwaukee, WI" },
    hero: "/teams/beer.png",
    colors: { primary: "#BCBEC0", accent: "#D4A017", dark: "#151210", light: "#EFEBE4" },
    merch: [
      { name: "Silver Serif Jersey", type: "jersey" },
      { name: "Leather Mug Cap", type: "hat" },
      { name: "Brewery Henley Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "pluto-shraazinatorz",
    name: "Pluto Shraazinatorz",
    nameLines: ["PLUTO", "SHRAAZINATORZ"],
    accentLine: 1,
    division: "West",
    tagline: "Beyond the edge of known space.",
    theme: "Deep Space · Sci-Fi Station",
    stadium: { name: "Shraaz Station", city: "Pluto Orbital" },
    hero: "/teams/pluto-shraazinatorz.png",
    colors: { primary: "#00A14B", accent: "#EEC42C", dark: "#08110B", light: "#E4F5E9" },
    merch: [
      { name: "Circuit Black Jersey", type: "jersey" },
      { name: "Gold Visor Cap", type: "hat" },
      { name: "Star Map Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "the-watermark",
    name: "The Watermark",
    nameLines: ["THE", "WATERMARK"],
    accentLine: 1,
    division: "West",
    tagline: "Leave your mark. Make them remember.",
    theme: "Fire · Water · Elemental Energy",
    stadium: { name: "Tidal Arena", city: "Watermark Bay, CA" },
    hero: "/teams/the-watermark.png",
    colors: { primary: "#ED2246", accent: "#F15E60", dark: "#120A0C", light: "#F6E2E5" },
    merch: [
      { name: "Flame Fade Jersey", type: "jersey" },
      { name: "Ember Icon Cap", type: "hat" },
      { name: "Gradient Blaze Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "doobs-agency",
    name: "Doob's Agency",
    nameLines: ["DOOB'S", "AGENCY"],
    accentLine: 0,
    division: "West",
    tagline: "Intelligence wins championships.",
    theme: "Spy · Secret Agent · Classified",
    stadium: { name: "The Compound", city: "Location: CLASSIFIED" },
    hero: "/teams/doobs-agency.png",
    colors: { primary: "#29ABE2", accent: "#AC620E", dark: "#0A0F14", light: "#E1F0F8" },
    merch: [
      { name: "Classified Charcoal Jersey", type: "jersey" },
      { name: "Leather DA Cap", type: "hat" },
      { name: "Tactical Stencil Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "englewood-ninjas",
    name: "Englewood Ninjas",
    nameLines: ["ENGLEWOOD", "NINJAS"],
    accentLine: 1,
    division: "West",
    tagline: "We don't play fair. We strike.",
    theme: "Martial Arts · Ninja · Stealth",
    stadium: { name: "Shadow Dojo", city: "Englewood, IL" },
    hero: "/teams/englewood-ninjas.png",
    colors: { primary: "#FAAF42", accent: "#C7EAFB", dark: "#0C0D0F", light: "#F5EAD4" },
    merch: [
      { name: "Shuriken Black Jersey", type: "jersey" },
      { name: "Gold Emblem Cap", type: "hat" },
      { name: "Kanji Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "i-heart-gingers",
    name: "I Heart Gingers",
    nameLines: ["I \u2665", "GINGERS"],
    accentLine: 1,
    division: "West",
    tagline: "Red hair, don't care.",
    theme: "Irish Warmth · Pub Culture",
    stadium: { name: "Ginger Field", city: "Dublin, Ireland" },
    hero: "/teams/i-heart-gingers.png",
    colors: { primary: "#FF7043", accent: "#D4A017", dark: "#140C08", light: "#F5E8DA" },
    merch: [
      { name: "Celtic Knot Jersey", type: "jersey" },
      { name: "Tweed Flat Cap", type: "hat" },
      { name: "Handwritten Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "amon-ra-dawgin",
    name: "Amon Ra Dawgin",
    nameLines: ["AMON RA", "DAWGIN"],
    accentLine: 1,
    division: "West",
    tagline: "Loyalty. Discipline. Dominance.",
    theme: "Ancient Egypt · Pharaoh · Sun God",
    stadium: { name: "Temple of Ra", city: "Giza, Egypt" },
    hero: "/teams/amon-ra-dawgin.png",
    colors: { primary: "#E9BC52", accent: "#8A5A2B", dark: "#120C05", light: "#F5EAD0" },
    merch: [
      { name: "Hieroglyph Jersey", type: "jersey" },
      { name: "Cobra Snapback", type: "hat" },
      { name: "Pyramid Hoodie", type: "hoodie" },
    ],
  },
  {
    slug: "vancouver-panties",
    name: "VancouverPantiesDeJarome",
    nameLines: ["VANCOUVER", "PANTIES DE JAROME"],
    accentLine: 1,
    division: "West",
    tagline: "We exist. We compete. We win.",
    theme: "WWII Propaganda · Retro Americana",
    stadium: { name: "Liberty Stadium", city: "Vancouver, BC" },
    hero: "/teams/vancouver-panties.png",
    colors: { primary: "#1E3A5A", accent: "#C62828", dark: "#0A1018", light: "#EDE5D6" },
    merch: [
      { name: "Star & Stripe Jersey", type: "jersey" },
      { name: "VPDJ Military Cap", type: "hat" },
      { name: "We Exist Hoodie", type: "hoodie" },
    ],
  },
]

const SLUGS = BASE_TEAMS.map((t) => t.slug)

export const TEAMS: Team[] = BASE_TEAMS.map((base, index) => {
  const schedule = buildSchedule(SLUGS, index)
  const played = schedule.filter((g) => g.result)
  const wins = played.filter((g) => g.result!.outcome === "W").length
  const losses = played.filter((g) => g.result!.outcome === "L").length
  const pointsFor = Math.round(played.reduce((s, g) => s + g.result!.teamScore, 0) * 10) / 10
  const pointsAgainst = Math.round(played.reduce((s, g) => s + g.result!.oppScore, 0) * 10) / 10

  // streak from most recent games
  let streak = "—"
  if (played.length) {
    const lastOutcome = played[played.length - 1].result!.outcome
    let count = 0
    for (let i = played.length - 1; i >= 0; i--) {
      if (played[i].result!.outcome === lastOutcome) count++
      else break
    }
    streak = `${lastOutcome}${count}`
  }

  return {
    ...base,
    roster: buildRoster(base.slug),
    schedule,
    draftPicks: buildDraftPicks(base.slug, index),
    history: buildHistory(base.slug),
    record: { wins, losses },
    pointsFor,
    pointsAgainst,
    streak,
  }
})

export function getTeam(slug: string): Team | undefined {
  return TEAMS.find((t) => t.slug === slug)
}

export function getTeamName(slug: string): string {
  return getTeam(slug)?.name ?? slug
}

export type StandingRow = Team & { rank: number; divisionRank: number }

export function getStandings(): StandingRow[] {
  const sorted = [...TEAMS].sort((a, b) => {
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins
    return b.pointsFor - a.pointsFor
  })
  const divCounters: Record<Division, number> = { East: 0, West: 0 }
  return sorted.map((t, i) => {
    divCounters[t.division] += 1
    return { ...t, rank: i + 1, divisionRank: divCounters[t.division] }
  })
}

export function getDivisionRank(slug: string): number {
  return getStandings().find((t) => t.slug === slug)?.divisionRank ?? 0
}

export function getNextGame(team: Team): Game | undefined {
  return team.schedule.find((g) => g.week === CURRENT_WEEK) ?? team.schedule.find((g) => !g.result)
}
