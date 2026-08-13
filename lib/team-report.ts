// Some long-form news articles (e.g. "The September 9th Roster Report") are
// written as a per-team breakdown: an intro, a "JUMP TO YOUR TEAM:" line,
// then one all-caps heading + paragraph per team, then a closing section.
// This turns that plain-text shape into structured sections so the article
// page can render a real jump-to-team nav instead of a flat paragraph.

export type TeamReportSection = {
  id: string
  heading: string
  paragraph: string
}

export type ParsedTeamReport = {
  intro: string[]
  nav: { label: string; id: string }[]
  sections: TeamReportSection[]
  conclusion: { heading: string; paragraph: string } | null
}

const JUMP_MARKER = "JUMP TO YOUR TEAM:"

// Order matches how these reports list teams, and each id matches that
// team's slug in data/teams.csv so the nav links land on real team pages'
// sibling anchors within this article.
const TEAM_REPORT_NAV: { label: string; id: string }[] = [
  { label: "Pakistan Bombers", id: "pakistan-bombers" },
  { label: "Pluto Shraazinatorz", id: "pluto-shraazinatorz" },
  { label: "Nabers In Paris", id: "nabers-in-paris" },
  { label: "Mount Olympus", id: "mount-olympus" },
  { label: "The Watermark", id: "the-watermark" },
  { label: "Doob's Agency", id: "doobs-agency" },
  { label: "Englewood Ninjas", id: "englewood-ninjas" },
  { label: "The Vile Horrendous", id: "vile-horrendous" },
  { label: "I Heart Gingers", id: "i-heart-gingers" },
  { label: "Amon Ra Dawgin", id: "amon-ra-dawgin" },
  { label: "Fort Bragg", id: "fort-bragg" },
  { label: "Chicago Zestiest Man", id: "chicago-zestiest" },
  { label: "VancouverPantiesDeJarome", id: "vancouver-panties" },
  { label: "Beer/Pavel Dorofeyev", id: "beer" },
]

export function isTeamReport(body: string): boolean {
  return body.includes(JUMP_MARKER)
}

// Every section heading in these reports follows "<TEAM> (<N> players) -
// NEED LEVEL: <LEVEL>", plus one closing "THE BOTTOM LINE:" heading. That
// marker is a more reliable split signal than "fully capitalized," since
// the team headings themselves contain a lowercase "players".
function isHeadingLine(line: string): boolean {
  return line.includes("- NEED LEVEL:") || line === "THE BOTTOM LINE:"
}

export function parseTeamReport(body: string): ParsedTeamReport {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith(JUMP_MARKER))

  const intro: string[] = []
  const sections: TeamReportSection[] = []
  let conclusion: { heading: string; paragraph: string } | null = null
  let currentHeading: string | null = null
  let currentParagraphLines: string[] = []

  const flush = () => {
    if (currentHeading === null) return
    const paragraph = currentParagraphLines.join(" ")
    if (currentHeading === "THE BOTTOM LINE:") {
      conclusion = { heading: currentHeading, paragraph }
    } else {
      const nav = TEAM_REPORT_NAV[sections.length]
      sections.push({ id: nav?.id ?? `section-${sections.length}`, heading: currentHeading, paragraph })
    }
  }

  for (const line of lines) {
    if (isHeadingLine(line)) {
      flush()
      currentHeading = line
      currentParagraphLines = []
    } else if (currentHeading === null) {
      intro.push(line)
    } else {
      currentParagraphLines.push(line)
    }
  }
  flush()

  return { intro, nav: TEAM_REPORT_NAV, sections, conclusion }
}
