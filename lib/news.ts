import { CUSTOM_NEWS, getTeam, type Team } from "./league"

export type NewsArticle = {
  id: string
  headline: string
  body: string
  team: Team | null
  generatedAt: string
}

export function generateNewsArticles(): NewsArticle[] {
  return CUSTOM_NEWS.filter((n) => n.headline && n.body).map((n, i) => ({
    id: `custom-${i}`,
    headline: n.headline,
    body: n.body,
    team: n.teamSlug ? (getTeam(n.teamSlug) ?? null) : null,
    generatedAt: n.date,
  }))
}
