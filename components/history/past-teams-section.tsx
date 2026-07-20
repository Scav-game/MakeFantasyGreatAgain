"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { PAST_TEAMS, type PastTeam } from "@/lib/league"
import { assetPath } from "@/lib/asset-path"

function PastTeamCard({ team, onSelect }: { team: PastTeam; onSelect: () => void }) {
  const colorVars = {
    "--team-accent": team.colors.accent,
    "--team-light": team.colors.light,
  } as CSSProperties

  return (
    <button
      type="button"
      onClick={onSelect}
      style={colorVars}
      className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-xl border border-white/15 text-left transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:[border-color:var(--team-accent)]"
    >
      <img
        src={assetPath(team.hero || "/placeholder.svg")}
        alt={`${team.name} team hero`}
        className="absolute inset-0 h-full w-full object-cover object-center grayscale transition-[filter,transform] duration-500 group-hover:scale-105 group-hover:grayscale-0"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg, ${team.colors.dark} 5%, ${team.colors.dark}66 45%, transparent 80%)`,
        }}
      />
      <div className="relative flex items-center gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold uppercase leading-tight text-white/90 transition-colors duration-300 group-hover:[color:var(--team-light)]">
            {team.name}
          </p>
          <p className="truncate text-xs text-white/60">
            {team.yearJoined}–{team.yearLeft}
          </p>
        </div>
      </div>
    </button>
  )
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-white/55">{label}</span>
      <span className="font-display text-base font-bold" style={{ color: accent ?? "#fff" }}>
        {value}
      </span>
    </div>
  )
}

function PastTeamModal({ team, onClose }: { team: PastTeam; onClose: () => void }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const totalGames = team.allTimeRecord.wins + team.allTimeRecord.losses
  const winPct = totalGames > 0 ? (team.allTimeRecord.wins / totalGames) * 100 : 0
  const seasons = Math.max(1, team.yearLeft - team.yearJoined + 1)

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 sm:flex-row ${
          entered ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        style={{ borderColor: `${team.colors.accent}66`, backgroundColor: team.colors.dark }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          ✕
        </button>

        {/* Full, uncropped image — always shown in color once you've clicked in */}
        <div className="flex items-center justify-center sm:w-1/2" style={{ backgroundColor: team.colors.dark }}>
          <img
            src={assetPath(team.hero || "/placeholder.svg")}
            alt={`${team.name} hero`}
            className="max-h-[40vh] w-full object-contain sm:max-h-[75vh] sm:w-full sm:flex-1"
          />
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-center p-6 sm:w-1/2">
          <p className="font-display text-2xl font-bold uppercase" style={{ color: team.colors.light }}>
            {team.name}
          </p>
          <p className="mb-4 text-xs uppercase tracking-wider" style={{ color: team.colors.accent }}>
            {team.yearJoined} – {team.yearLeft} · {seasons} season{seasons === 1 ? "" : "s"}
          </p>
          <div>
            <StatRow
              label="All-Time Record"
              value={`${team.allTimeRecord.wins}-${team.allTimeRecord.losses}`}
              accent={team.colors.accent}
            />
            <StatRow label="Win %" value={`${winPct.toFixed(1)}%`} />
            <StatRow label="Total Points For" value={team.totalPointsFor.toLocaleString()} />
            <StatRow label="Playoff Appearances" value={String(team.playoffAppearances)} />
            <StatRow label="Playoff Wins" value={String(team.playoffWins)} />
            <StatRow
              label="Championships"
              value={String(team.championships)}
              accent={team.championships > 0 ? team.colors.accent : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function PastTeamsSection() {
  const [selected, setSelected] = useState<PastTeam | null>(null)

  if (PAST_TEAMS.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
        <p className="text-muted-foreground">No past teams yet — check back as the league&apos;s history grows.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PAST_TEAMS.map((team) => (
          <PastTeamCard key={team.slug} team={team} onSelect={() => setSelected(team)} />
        ))}
      </div>
      {selected && <PastTeamModal team={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
