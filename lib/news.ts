import { CUSTOM_NEWS, getTeam, type Team } from "./league"

export type NewsArticle = {
  id: string
  headline: string
  body: string
  team: Team | null
  author: string | null
  generatedAt: string
}

/** How many of the most recent stories show on the homepage. Everything
 * beyond this is still in the full archive on /news. "Most recent" means
 * bottom-to-top order in data/news.csv — just append new stories at the
 * end of the file, no need to insert rows at the top. */
export const HOMEPAGE_NEWS_LIMIT = 5

/** The full archive — every story in news.csv, newest (last row) first. */
export function getAllNewsArticles(): NewsArticle[] {
  return CUSTOM_NEWS.filter((n) => n.headline && n.body)
    .map((n, i) => ({
      id: `custom-${i}`,
      headline: n.headline,
      body: n.body,
      team: n.teamSlug ? (getTeam(n.teamSlug) ?? null) : null,
      author: n.author,
      generatedAt: n.date,
    }))
    .reverse()
}

/** Just the most recent stories, for the homepage News section. */
export function getHomepageNewsArticles(): NewsArticle[] {
  return getAllNewsArticles().slice(0, HOMEPAGE_NEWS_LIMIT)
}

/** Splits a body into paragraphs on blank lines / line breaks, for
 * articles typed with real newlines in news.csv. If the text was pasted
 * into the spreadsheet as one unbroken line, this just returns it as a
 * single paragraph — there's no line-break information left to recover. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

const CORRECTION_PREFIX = /^CORRECTION:\s*/i

/** A body whose last paragraph starts with "CORRECTION:" is a story the
 * reporter went back and amended — the article page peels that paragraph
 * off and renders it as a set-off note under the piece instead of as
 * another body paragraph. It's still part of `body` everywhere else, so
 * the homepage/archive previews and the archive's text search keep working
 * without knowing about the convention. */
export function splitCorrection(body: string): { body: string; correction: string | null } {
  const paragraphs = splitParagraphs(body)
  const last = paragraphs.at(-1)
  if (paragraphs.length < 2 || !last || !CORRECTION_PREFIX.test(last)) {
    return { body, correction: null }
  }
  return { body: paragraphs.slice(0, -1).join("\n\n"), correction: last.replace(CORRECTION_PREFIX, "") }
}
