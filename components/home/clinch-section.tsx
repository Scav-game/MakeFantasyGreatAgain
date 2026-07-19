import { describeClinchStatus, getClinchStatuses, isSecured, type ClinchStatus } from "@/lib/clinch"
import { TeamLogo } from "@/components/team/team-logo"
import { SectionHeading } from "./section-heading"

function ClinchCard({ status }: { status: ClinchStatus }) {
  const { team } = status
  const secured = isSecured(status)

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 pl-6"
      style={{ borderLeftColor: team.colors.accent, borderLeftWidth: 4 }}
    >
      <div className="flex items-start gap-4">
        <TeamLogo team={team} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              {team.name}
            </p>
            {secured && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: "#D4A01722", color: "#D4A017" }}
              >
                ✓ Clinched
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {describeClinchStatus(status)}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ClinchSection() {
  const statuses = getClinchStatuses()

  return (
    <section id="clinch" className="scroll-mt-24">
      <SectionHeading title="Paths to Clinch" />
      {statuses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
          <p className="text-muted-foreground">
            No teams have clinched yet. Check back as the season progresses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <ClinchCard key={`${status.team.slug}-${status.kind}`} status={status} />
          ))}
        </div>
      )}
    </section>
  )
}
