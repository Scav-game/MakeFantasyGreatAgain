import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { NewsArchive } from "@/components/history/news-archive"

export const metadata: Metadata = {
  title: "News Archive — MFGA",
  description: "A searchable archive of every MFGA league news story.",
}

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section className="mb-12 max-w-3xl">
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance text-foreground md:text-6xl">
            News <span className="text-gold">Archive</span>
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Every story the league has ever run.
          </p>
        </section>

        <NewsArchive />
      </main>

      <SiteFooter />
    </div>
  )
}
