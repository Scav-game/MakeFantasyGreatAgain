import Link from "next/link"
import type { Team } from "@/lib/league"
import { TeamLogo } from "./team-logo"

const NAV_LINKS = ["HOME", "TEAM", "SCHEDULE", "NEWS"]
const HISTORY_LINK = { label: "HISTORY", href: "/history" }

export function TeamNav({ team }: { team: Team }) {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: `${team.colors.dark}f2`,
        borderColor: `${team.colors.accent}33`,
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href={`/team/${team.slug}`} className="flex items-center gap-3">
          <TeamLogo team={team} size="sm" />
          <span
            className="font-display text-base font-bold uppercase leading-none tracking-wide md:text-lg"
            style={{ color: team.colors.light }}
          >
            {team.name}
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link}
              href={link === "HOME" ? `/team/${team.slug}` : `/team/${team.slug}#${link.toLowerCase()}`}
              className="font-display text-sm font-medium uppercase tracking-widest text-white/70 transition-colors hover:text-white"
            >
              {link}
            </Link>
          ))}
          <Link
            href={HISTORY_LINK.href}
            className="font-display text-sm font-medium uppercase tracking-widest text-white/70 transition-colors hover:text-white"
          >
            {HISTORY_LINK.label}
          </Link>
        </div>

        <Link
          href="/"
          className="font-display text-xs font-semibold uppercase tracking-widest text-gold transition-opacity hover:opacity-80"
        >
          MFGA League
        </Link>
      </nav>
    </header>
  )
}
