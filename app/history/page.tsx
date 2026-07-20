import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { SectionHeading } from "@/components/home/section-heading"
import { HistoryTable } from "@/components/history/history-table"
import { NewsArchive } from "@/components/history/news-archive"

export const metadata: Metadata = {
  title: "League History — MFGA",
  description: "All-time franchise history and a searchable archive of every MFGA league news story.",
}

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section className="mb-12 max-w-3xl">
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance text-foreground md:text-6xl">
            League <span className="text-gold">History</span>
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Every franchise&apos;s all-time record, and every story the league has ever run.
          </p>
        </section>

        <section id="archive" className="mb-16">
          <SectionHeading title="News Archive" />
          <NewsArchive />
        </section>

        <section id="stats">
          <SectionHeading title="Franchise History" />
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
            Click any column to sort — best (or worst) team by any stat, at a glance.
          </p>
          <HistoryTable />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
