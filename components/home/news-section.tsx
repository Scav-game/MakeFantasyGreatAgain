import { generateNewsArticles } from "@/lib/news"
import { TeamLogo } from "@/components/team/team-logo"
import { SectionHeading } from "./section-heading"

export function NewsSection() {
  const articles = generateNewsArticles()

  return (
    <section id="news" className="scroll-mt-24">
      <SectionHeading title="League News" />
      <div className="flex flex-col gap-4">
        {articles.map((article) => (
          <article
            key={article.id}
            className="rounded-xl border border-border bg-card/60 p-5 pl-6"
            style={{ borderLeftColor: article.team?.colors.accent ?? "#D4A017", borderLeftWidth: 4 }}
          >
            <div className="flex items-start gap-4">
              {article.team ? (
                <TeamLogo team={article.team} size="sm" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gold/50 bg-gold/10 font-display text-xs font-bold text-gold">
                  M
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display text-base font-bold uppercase tracking-wide text-foreground">
                    {article.headline}
                  </h3>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {article.isCustom ? article.generatedAt : `Generated ${article.generatedAt}`}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{article.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
