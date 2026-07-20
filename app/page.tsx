import Link from "next/link"
import type { Division } from "@/lib/league"
import { TEAMS, getStandings } from "@/lib/league"
import { TeamLogo } from "@/components/team/team-logo"
import { assetPath } from "@/lib/asset-path"
import { HeroSection } from "@/components/home/hero-section"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { SubNav } from "@/components/home/sub-nav"
import { ClinchSection } from "@/components/home/clinch-section"
import { OddsSection } from "@/components/home/odds-section"
import { ComparisonSection } from "@/components/home/comparison-section"
import { NewsSection } from "@/components/home/news-section"

function TeamCard({ slug }: { slug: string }) {
  const team = TEAMS.find((t) => t.slug === slug)!
  return (
    <Link
      href={`/team/${team.slug}`}
      className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-xl border transition-transform hover:-translate-y-1"
      style={{ borderColor: `${team.colors.accent}33` }}
    >
      <img
        src={assetPath(team.hero || "/placeholder.svg")}
        alt={`${team.name} team hero`}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg, ${team.colors.dark} 5%, ${team.colors.dark}66 45%, transparent 80%)`,
        }}
      />
      <div className="relative flex items-center gap-3 p-4">
        <TeamLogo team={team} size="md" />
        <div className="min-w-0">
          <p
            className="truncate font-display text-lg font-bold uppercase leading-tight"
            style={{ color: team.colors.light }}
          >
            {team.name}
          </p>
          <p className="truncate text-xs text-white/70">
            {team.record.wins}-{team.record.losses} · {team.stadium.city}
          </p>
        </div>
      </div>
    </Link>
  )
}

function StandingsTable({ division }: { division: Division }) {
  const rows = getStandings().filter((t) => t.division === division)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold">
          {division} Division
        </h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Team</th>
            <th className="px-2 py-2 text-center font-medium">Rec</th>
            <th className="px-4 py-2 text-right font-medium">PF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.slug} className="border-t border-border/60 transition-colors hover:bg-white/[0.03]">
              <td className="px-4 py-2.5 font-display font-semibold text-muted-foreground">
                {t.divisionRank}
              </td>
              <td className="px-2 py-2.5">
                <Link href={`/team/${t.slug}`} className="flex items-center gap-2.5 hover:underline">
                  <TeamLogo team={t} size="sm" />
                  <span className="font-medium text-foreground">{t.name}</span>
                </Link>
              </td>
              <td className="px-2 py-2.5 text-center text-foreground">
                {t.record.wins}-{t.record.losses}
              </td>
              <td className="px-4 py-2.5 text-right font-display font-semibold text-foreground">
                {t.pointsFor.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LeagueHome() {
  const east = TEAMS.filter((t) => t.division === "East")
  const west = TEAMS.filter((t) => t.division === "West")

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <SubNav />

      <HeroSection />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        {/* Intro */}
        <section className="mb-12 max-w-3xl">
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance text-foreground md:text-7xl">
            Make <span className="text-gold">Fantasy</span> Great Again
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            2026 Season
          </p>
        </section>

        {/* Team grid */}
        <section id="teams" className="mb-16 scroll-mt-24">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide text-foreground">
            Franchises
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...east, ...west].map((t) => (
              <TeamCard key={t.slug} slug={t.slug} />
            ))}
          </div>
        </section>

        {/* Standings */}
        <section id="standings" className="mb-16 scroll-mt-24">
          <h2 className="mb-5 font-display text-2xl font-bold uppercase tracking-wide text-foreground">
            Standings
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <StandingsTable division="East" />
            <StandingsTable division="West" />
          </div>
        </section>

        <div className="mb-16">
          <ClinchSection />
        </div>

        <div className="mb-16">
          <OddsSection />
        </div>

        <div className="mb-16">
          <ComparisonSection />
        </div>

        <NewsSection />
      </main>

      <SiteFooter />
    </div>
  )
}
