import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { TEAMS, getTeam } from "@/lib/league"
import { TeamNav } from "@/components/team/team-nav"
import { TeamHero } from "@/components/team/team-hero"
import { TeamSidebar } from "@/components/team/team-sidebar"
import { ScheduleStrip } from "@/components/team/schedule-strip"
import { TeamDetail } from "@/components/team/team-detail"

export function generateStaticParams() {
  return TEAMS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const team = getTeam(slug)
  if (!team) return { title: "Team Not Found — MFGA" }
  return {
    title: `${team.name} — MFGA`,
    description: `${team.name}: ${team.tagline} Official team page in the MFGA fantasy football league. ${team.stadium.name}, ${team.stadium.city}.`,
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const team = getTeam(slug)
  if (!team) notFound()

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${team.colors.light} 0%, #f7f2e7 55%)`,
      }}
    >
      <TeamNav team={team} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Hero + Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <TeamHero team={team} />
          <TeamSidebar team={team} />
        </div>

        {/* Schedule strip */}
        <div className="mt-6">
          <ScheduleStrip team={team} />
        </div>

        {/* Below the fold */}
        <div className="mt-12">
          <TeamDetail team={team} />
        </div>
      </main>

      <footer
        className="border-t"
        style={{ borderColor: `${team.colors.accent}22`, backgroundColor: `${team.colors.light}cc` }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center md:flex-row md:px-6 md:text-left">
          <div>
            <p
              className="font-display text-sm font-bold uppercase tracking-widest"
              style={{ color: team.colors.dark }}
            >
              {team.name}
            </p>
            <p className="text-xs" style={{ color: `${team.colors.dark}99` }}>
              {team.stadium.name} · {team.stadium.city}
            </p>
          </div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-gold">
            MFGA — Make Fantasy Great Again
          </p>
          <Link
            href="/"
            className="font-display text-xs font-semibold uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100"
            style={{ color: team.colors.dark }}
          >
            ← All Teams
          </Link>
        </div>
      </footer>
    </div>
  )
}
