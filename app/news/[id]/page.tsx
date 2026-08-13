import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { AuthorAvatar } from "@/components/history/author-avatar"
import { TeamLogo } from "@/components/team/team-logo"
import { TeamReportArticle } from "@/components/history/team-report-article"
import { getAllNewsArticles, splitParagraphs } from "@/lib/news"
import { isTeamReport } from "@/lib/team-report"

export function generateStaticParams() {
  return getAllNewsArticles().map((a) => ({ id: a.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const article = getAllNewsArticles().find((a) => a.id === id)
  if (!article) return { title: "Story Not Found — MFGA" }
  return {
    title: `${article.headline} — MFGA`,
    description: article.body.slice(0, 160),
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = getAllNewsArticles().find((a) => a.id === id)
  if (!article) notFound()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <article>
          <header className="mb-8">
            <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight text-balance text-foreground md:text-4xl">
              {article.headline}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              {article.author ? (
                <AuthorAvatar name={article.author} size="md" />
              ) : article.team ? (
                <TeamLogo team={article.team} size="md" />
              ) : null}
              <div>
                {article.author && (
                  <p className="text-sm font-semibold uppercase tracking-wider text-gold">By {article.author}</p>
                )}
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{article.generatedAt}</p>
              </div>
            </div>
          </header>

          {isTeamReport(article.body) ? (
            <TeamReportArticle body={article.body} />
          ) : (
            splitParagraphs(article.body).map((paragraph, i) => (
              <p key={i} className="mb-4 text-base leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
