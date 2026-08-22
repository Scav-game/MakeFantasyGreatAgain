"use client"

import { useState } from "react"
import { PREDICTORS, isPredictionCorrect, type PredictionWeek } from "@/lib/predictions"
import { MatchupCard } from "./matchup-card"

function weekSummary(week: PredictionWeek): string {
  return PREDICTORS.map((predictor) => {
    let correct = 0
    let total = 0
    for (const matchup of week.matchups) {
      const prediction = matchup.predictions.find((p) => p.predictorId === predictor.id)
      if (!prediction) continue
      const result = isPredictionCorrect(matchup, prediction)
      if (result === null) continue
      total += 1
      if (result) correct += 1
    }
    return `${predictor.shortName}: ${correct}/${total}`
  }).join(" | ")
}

export function PastWeekSection({ week }: { week: PredictionWeek }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-col gap-1.5 p-4 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
          Week {week.week}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{weekSummary(week)}</span>
          <span
            className="shrink-0 text-xs transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▸
          </span>
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-border/60 p-4">
            {week.matchups.map((matchup) => (
              <MatchupCard key={matchup.id} week={week.week} matchup={matchup} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
