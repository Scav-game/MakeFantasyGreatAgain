"use client"

import Link from "next/link"
import { TeamLogo } from "@/components/team/team-logo"
import { AuthorAvatar } from "@/components/history/author-avatar"
import { NewsFilterToggle, useHideTransactions } from "@/components/news/news-filter"
import type { NewsArticle } from "@/lib/news"

/**
 * The homepage News list and its All / Stories toggle.
 *
 * Both lists are built on the server and handed down already trimmed to the
 * five that show, so toggling swaps between two small arrays instead of
 * shipping the whole archive to the browser just to filter it.
 */
export function NewsFeed({
  all,
  stories,
  totals,
}: {
  all: NewsArticle[]
  stories: NewsArticle[]
  totals: { all: number; stories: number }
}) {
  const [hidden, setHidden] = useHideTransactions()
  const articles = hidden ? stories : all
  const hasMore = (hidden ? totals.stories : totals.all) > articles.length

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-gold" />
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground md:text-3xl">
            League News
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <NewsFilterToggle hidden={hidden} onChange={setHidden} counts={totals} />
          {hasMore && (
            <Link
              href="/news"
              className="font-display text-xs font-semibold uppercase tracking-widest text-gold/80 transition-colors hover:text-gold"
            >
              View Full Archive →
            </Link>
          )}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
          <p className="text-muted-foreground">No stories yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((article) => (
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
                      <Link href={`/news/${article.id}`} className="transition-colors hover:text-gold">
                        {article.headline}
                      </Link>
                    </h3>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {article.generatedAt}
                    </span>
                  </div>
                  {article.author && (
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gold/70">
                      By {article.author}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {article.body}
                  </p>
                  <Link
                    href={`/news/${article.id}`}
                    className="mt-1.5 inline-block text-xs font-semibold uppercase tracking-wider text-gold/70 transition-colors hover:text-gold"
                  >
                    Continue Reading →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
