"use client"

import { useMemo, useState } from "react"
import { getAllNewsArticles } from "@/lib/news"
import { TeamLogo } from "@/components/team/team-logo"
import { AuthorAvatar } from "./author-avatar"
import { Highlight } from "./highlight"

export function NewsArchive() {
  const articles = getAllNewsArticles()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return articles
    return articles.filter(
      (a) =>
        a.headline.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.team?.name.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q),
    )
  }, [articles, query])

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search news articles…"
        className="w-full rounded-lg border border-border bg-card/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
          <p className="text-muted-foreground">No articles match &ldquo;{query}&rdquo;.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((article) => (
            <article
              key={article.id}
              className="rounded-xl border border-border bg-card/60 p-5 pl-6"
              style={{ borderLeftColor: article.team?.colors.accent ?? "#D4A017", borderLeftWidth: 4 }}
            >
              <div className="flex items-start gap-4">
                {article.author ? (
                  <AuthorAvatar name={article.author} size="sm" />
                ) : article.team ? (
                  <TeamLogo team={article.team} size="sm" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gold/50 bg-gold/10 font-display text-xs font-bold text-gold">
                    M
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground">
                      <Highlight text={article.headline} query={query} />
                    </h3>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {article.generatedAt}
                    </span>
                  </div>
                  {article.author && (
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gold/70">
                      By <Highlight text={article.author} query={query} />
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <Highlight text={article.body} query={query} />
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
