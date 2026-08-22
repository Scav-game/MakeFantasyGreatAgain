import type { PredictionWeek } from "@/lib/predictions"
import { MatchupCard } from "./matchup-card"

export function CurrentWeekSection({ week }: { week: PredictionWeek }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-gold" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-gold md:text-3xl">
          Week {week.week} Predictions
        </h2>
      </div>
      {week.status === "pending" && (
        <p className="mb-5 text-sm italic text-muted-foreground">(Picks are in, awaiting results)</p>
      )}
      {week.status === "complete" && <div className="mb-5" />}

      <div className="flex flex-col gap-3">
        {week.matchups.map((matchup) => (
          <MatchupCard key={matchup.id} week={week.week} matchup={matchup} />
        ))}
      </div>
    </section>
  )
}
