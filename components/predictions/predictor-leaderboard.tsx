"use client"

import { useState } from "react"
import { getTeam } from "@/lib/league"
import {
  getPredictorWeeklyStats,
  isLoneWolf,
  type LeaderboardRow,
  type PredictionWeek,
} from "@/lib/predictions"
import { TeamLogo } from "@/components/team/team-logo"
import { PredictorAvatar } from "./predictor-avatar"

function PredictorCard({
  row,
  expanded,
  onToggle,
  currentWeek,
}: {
  row: LeaderboardRow
  expanded: boolean
  onToggle: () => void
  currentWeek: PredictionWeek | undefined
}) {
  const { predictor } = row
  const weeklyStats = getPredictorWeeklyStats(predictor.id)
  const currentWeekPicks = currentWeek?.matchups
    .map((matchup) => {
      const prediction = matchup.predictions.find((p) => p.predictorId === predictor.id)
      if (!prediction) return null
      const team = getTeam(prediction.pick)
      if (!team) return null
      return { team, loneWolf: isLoneWolf(matchup, predictor.id) }
    })
    .filter((x): x is { team: NonNullable<ReturnType<typeof getTeam>>; loneWolf: boolean } => x !== null)

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card/60 transition-colors hover:border-gold/30"
      style={{ borderLeftColor: predictor.accentColor, borderLeftWidth: 4 }}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold"
          style={
            row.rank === 1
              ? { backgroundColor: "#D4A017", color: "#0a0a0a" }
              : { backgroundColor: "#ffffff14", color: "#ffffff99" }
          }
        >
          {row.rank}
        </span>
        <PredictorAvatar predictor={predictor} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight text-foreground">{predictor.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.correctPicks}-{row.incorrectPicks} ({row.winPercentage.toFixed(1)}%)
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold text-gold">{row.totalPoints} pts</p>
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{predictor.description}</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Wk</th>
                    <th className="px-1 py-2 text-center font-medium">Picks</th>
                    <th className="px-1 py-2 text-center font-medium">Pts</th>
                    <th className="px-1 py-2 text-center font-medium">Perf</th>
                    <th className="px-1 py-2 text-center font-medium">Wolf</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats.map((stat) => (
                    <tr key={stat.week} className="border-t border-border/40">
                      <td className="px-2 py-2 font-display font-semibold text-foreground">{stat.week}</td>
                      <td className="px-1 py-2 text-center text-foreground">
                        {stat.status === "complete" ? `${stat.correct}/${stat.total}` : "-"}
                      </td>
                      <td className="px-1 py-2 text-center font-semibold text-gold">
                        {stat.status === "complete" ? stat.points : "-"}
                      </td>
                      <td className="px-1 py-2 text-center">{stat.perfect ? "✓" : ""}</td>
                      <td className="px-1 py-2 text-center">{stat.loneWolfPicks > 0 ? `🐺${stat.loneWolfPicks}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentWeekPicks && currentWeekPicks.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Week {currentWeek?.week} picks
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentWeekPicks.map(({ team, loneWolf }) => (
                    <span
                      key={team.slug}
                      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-black/20 px-2 py-1 text-xs text-foreground"
                    >
                      <TeamLogo team={team} size="sm" />
                      {team.name}
                      {loneWolf && <span title="Lone wolf pick">🐺</span>}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PredictorLeaderboard({
  rows,
  currentWeek,
}: {
  rows: LeaderboardRow[]
  currentWeek: PredictionWeek | undefined
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <PredictorCard
          key={row.predictor.id}
          row={row}
          expanded={expandedId === row.predictor.id}
          onToggle={() => setExpandedId((id) => (id === row.predictor.id ? null : row.predictor.id))}
          currentWeek={currentWeek}
        />
      ))}
    </div>
  )
}
