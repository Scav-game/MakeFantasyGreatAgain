import Link from "next/link"
import type { Team } from "@/lib/league"
import { assetPath } from "@/lib/asset-path"

export function TeamHero({ team }: { team: Team }) {
  const [lineA, lineB] = team.nameLines
  const accentColor = team.colors.accent
  const lightColor = team.colors.light

  return (
    <section
      className="relative overflow-hidden rounded-xl border"
      style={{ borderColor: `${accentColor}33` }}
    >
      {/* Background hero image */}
      <img
        src={assetPath(team.hero || "/placeholder.svg")}
        alt={`${team.name} hero — a player in team uniform posed dramatically`}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Cinematic gradient overlays keyed to team color */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${team.colors.dark}f2 0%, ${team.colors.dark}cc 32%, ${team.colors.dark}33 62%, transparent 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg, ${team.colors.dark}e6 0%, transparent 45%)`,
        }}
      />

      {/* Content */}
      <div className="relative flex min-h-[420px] flex-col justify-end p-6 md:min-h-[560px] md:p-10 lg:min-h-[600px]">
        <span
          className="mb-3 inline-flex w-fit items-center rounded-full border px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ borderColor: `${accentColor}66`, color: accentColor }}
        >
          {team.division} Division · {team.theme}
        </span>

        <h1 className="font-display font-bold uppercase leading-[0.85] tracking-tight text-balance">
          <span
            className="block text-5xl md:text-7xl lg:text-8xl"
            style={{ color: team.accentLine === 0 ? accentColor : lightColor }}
          >
            {lineA}
          </span>
          <span
            className="block text-4xl md:text-6xl lg:text-7xl"
            style={{ color: team.accentLine === 1 ? accentColor : lightColor }}
          >
            {lineB}
          </span>
        </h1>

        <p
          className="mt-4 max-w-md text-pretty text-base font-medium md:text-lg"
          style={{ color: `${lightColor}dd` }}
        >
          {team.tagline}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="#team"
            className="inline-flex items-center rounded-md px-6 py-3 font-display text-sm font-bold uppercase tracking-widest shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: accentColor, color: team.colors.dark }}
          >
            View Team
          </Link>
          <Link
            href="#schedule"
            className="inline-flex items-center rounded-md border px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
            style={{ borderColor: `${lightColor}55` }}
          >
            View Schedule
          </Link>
        </div>

        <p className="mt-6 font-display text-xs uppercase tracking-[0.2em] text-white/60">
          {team.stadium.name} · {team.stadium.city}
        </p>
      </div>
    </section>
  )
}
