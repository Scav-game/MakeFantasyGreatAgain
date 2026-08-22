import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { SubNav } from "@/components/home/sub-nav"
import { SectionHeading } from "@/components/home/section-heading"
import { PredictorLeaderboard } from "@/components/predictions/predictor-leaderboard"
import { CurrentWeekSection } from "@/components/predictions/current-week-section"
import { PastWeekSection } from "@/components/predictions/past-week-section"
import { computeLeaderboard, getCurrentWeek, getPastWeeks } from "@/lib/predictions"

export const metadata: Metadata = {
  title: "Predictions — MFGA",
  description: "Eight self-appointed experts predict every MFGA matchup. Nobody asked them to do this.",
}

export default function PredictionsPage() {
  const leaderboard = computeLeaderboard()
  const currentWeek = getCurrentWeek()
  const pastWeeks = getPastWeeks()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <SubNav />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <section className="mb-12 max-w-3xl">
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance text-foreground md:text-6xl">
            <span className="text-gold">Predictions</span> Desk
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Eight self-appointed experts pick every matchup, every week. Nobody asked them to do this.
          </p>
        </section>

        <section className="mb-16">
          <SectionHeading title="Predictor Leaderboard" />
          <PredictorLeaderboard rows={leaderboard} currentWeek={currentWeek} />
        </section>

        {currentWeek ? (
          <div className="mb-16">
            <CurrentWeekSection week={currentWeek} />
          </div>
        ) : (
          <section className="mb-16">
            <p className="text-sm text-muted-foreground">
              Week 1 predictions will be posted Wednesday, September 3rd.
            </p>
          </section>
        )}

        {pastWeeks.length > 0 && (
          <section>
            <SectionHeading title="Past Weeks" />
            <div className="flex flex-col gap-3">
              {pastWeeks.map((week) => (
                <PastWeekSection key={week.week} week={week} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
