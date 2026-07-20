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
 * beyond this is still in the full archive on /history. "Most recent" means
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
