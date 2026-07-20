"use client"

import { useState } from "react"
import {
  getLuckiest,
  getScheduleComparisons,
  getUnluckiest,
  type TeamScheduleComparison,
} from "@/lib/schedule-comparison"
import { TeamLogo } from "@/components/team/team-logo"
import { SectionHeading } from "./section-heading"

function fmt(wins: number, losses: number): string {
  return `${wins}-${losses}`
}

function ComparisonRow({
  comparison,
  luck,
}: {
  comparison: TeamScheduleComparison
  luck: "luckiest" | "unluckiest" | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { team, actual, best, worst, bySchedule } = comparison

  return (
    <>
      <tr
        className="cursor-pointer border-t border-border/60 transition-colors hover:bg-black/[0.03]"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className="text-xs text-muted-foreground transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              ▸
            </span>
            <TeamLogo team={team} size="sm" />
            <span className="font-medium text-foreground underline-offset-2 hover:underline">
              {team.name}
            </span>
            {luck === "luckiest" && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-gold">
                Luckiest
              </span>
            )}
            {luck === "unluckiest" && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-red-400">
                Unluckiest
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-center font-display font-semibold text-foreground">
          {fmt(actual.wins, actual.losses)}
        </td>
        <td className="px-3 py-3 text-center">
          <span className="font-display font-semibold text-emerald-400">{fmt(best.wins, best.losses)}</span>
          <span className="ml-1.5 text-xs text-muted-foreground">via {best.scheduleTeam.name}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="font-display font-semibold text-red-400">{fmt(worst.wins, worst.losses)}</span>
          <span className="ml-1.5 text-xs text-muted-foreground">via {worst.scheduleTeam.name}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border/40 bg-black/[0.02]">
          <td colSpan={4} className="px-4 py-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              {team.name}&apos;s record against every schedule
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {bySchedule.map((r) => (
                <div
                  key={r.scheduleTeam.slug}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo team={r.scheduleTeam} size="sm" />
                    <span className="truncate text-xs text-muted-foreground">{r.scheduleTeam.name}</span>
                  </div>
                  <span className="font-display text-sm font-semibold text-foreground">
                    {fmt(r.wins, r.losses)}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function ComparisonSection() {
  const comparisons = getScheduleComparisons()
  const luckiest = getLuckiest(comparisons)
  const unluckiest = getUnluckiest(comparisons)

  return (
    <section id="comparison" className="scroll-mt-24">
      <SectionHeading title="Record With Another Team's Schedule" />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Each team&apos;s actual weekly scores, checked against every other team&apos;s opponents.
        Click a team to see their record against all fourteen schedules.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-3 py-3 text-center font-medium">Actual Record</th>
              <th className="px-3 py-3 text-center font-medium">Best Possible</th>
              <th className="px-3 py-3 text-center font-medium">Worst Possible</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => (
              <ComparisonRow
                key={c.team.slug}
                comparison={c}
                luck={
                  c.team.slug === luckiest.team.slug
                    ? "luckiest"
                    : c.team.slug === unluckiest.team.slug
                      ? "unluckiest"
                      : null
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
