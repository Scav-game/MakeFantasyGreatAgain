"use client"

import { useState } from "react"
import {
  getMatchupScore,
  getMatchupTeams,
  getPredictor,
  isLoneWolf,
  isPredictionCorrect,
  type Matchup,
} from "@/lib/predictions"
import { TeamLogo } from "@/components/team/team-logo"
import { PredictionBox } from "./prediction-box"

function TeamSide({
  team,
  record,
  align,
  winner,
}: {
  team: ReturnType<typeof getMatchupTeams>["away"]
  record: string
  align: "left" | "right"
  winner: boolean
}) {
  if (!team) return null
  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <TeamLogo team={team} size="md" />
      <div className="min-w-0">
        <p
          className="truncate font-display text-sm font-bold uppercase tracking-wide"
          style={{ color: winner ? "#D4A017" : undefined }}
        >
          <span className={winner ? "" : "text-foreground"}>{team.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">{record}</p>
      </div>
    </div>
  )
}

export function MatchupCard({ week, matchup }: { week: number; matchup: Matchup }) {
  const [expanded, setExpanded] = useState(false)
  const { away, home } = getMatchupTeams(matchup)
  const score = getMatchupScore(week, matchup)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 transition-colors hover:border-gold/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <TeamSide team={away} record={matchup.awayRecord} align="left" winner={matchup.winner === matchup.away} />

        <div className="flex shrink-0 flex-col items-center px-2">
          {score ? (
            <span className="font-display text-sm font-bold text-foreground">
              {score.awayScore.toFixed(1)} – {score.homeScore.toFixed(1)}
            </span>
          ) : (
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">at</span>
          )}
          <span
            className="mt-1 text-xs text-muted-foreground transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▸
          </span>
        </div>

        <TeamSide team={home} record={matchup.homeRecord} align="right" winner={matchup.winner === matchup.home} />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 p-4 sm:grid-cols-4 lg:grid-cols-8">
            {matchup.predictions.map((prediction) => {
              const predictor = getPredictor(prediction.predictorId)
              if (!predictor) return null
              return (
                <PredictionBox
                  key={prediction.predictorId}
                  predictor={predictor}
                  pick={prediction.pick}
                  correct={isPredictionCorrect(matchup, prediction)}
                  loneWolf={isLoneWolf(matchup, prediction.predictorId)}
                />
              )
            })}
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-border/40 px-4 pb-4 pt-3 sm:grid-cols-2">
            {matchup.predictions.map((prediction) => {
              const predictor = getPredictor(prediction.predictorId)
              if (!predictor) return null
              return (
                <p key={prediction.predictorId} className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold" style={{ color: predictor.accentColor }}>
                    {predictor.shortName}:
                  </span>{" "}
                  {prediction.reasoning}
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
