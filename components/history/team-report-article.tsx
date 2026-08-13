import { parseTeamReport } from "@/lib/team-report"

/** Full render of a per-team "roster report" article: intro copy, then a
 * sticky jump-to-team nav, then one anchorable section per team, then the
 * closing "bottom line" section. See lib/team-report.ts for the parsing. */
export function TeamReportArticle({ body }: { body: string }) {
  const { intro, nav, sections, conclusion } = parseTeamReport(body)

  return (
    <div>
      {intro.map((paragraph, i) => (
        <p key={i} className="mb-4 text-base leading-relaxed text-muted-foreground">
          {paragraph}
        </p>
      ))}

      <nav
        aria-label="Jump to team"
        className="sticky top-[73px] z-30 -mx-4 mb-6 flex flex-wrap gap-x-4 gap-y-2 border-y border-gold/20 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6"
      >
        {nav.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold/80 transition-colors hover:text-gold"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="mb-6 scroll-mt-24">
          <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide text-foreground">
            {section.heading}
          </h3>
          <p className="text-base leading-relaxed text-muted-foreground">{section.paragraph}</p>
        </section>
      ))}

      {conclusion && (
        <section className="mb-2">
          <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide text-foreground">
            {conclusion.heading}
          </h3>
          <p className="text-base leading-relaxed text-muted-foreground">{conclusion.paragraph}</p>
        </section>
      )}
    </div>
  )
}
