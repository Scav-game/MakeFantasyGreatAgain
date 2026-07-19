const LINKS = [
  { label: "Teams", href: "#teams" },
  { label: "Standings", href: "#standings" },
  { label: "Clinch Scenarios", href: "#clinch" },
  { label: "Championship Odds", href: "#odds" },
  { label: "Record Comparison", href: "#comparison" },
  { label: "News", href: "#news" },
]

export function SubNav() {
  return (
    <nav className="sticky top-[72px] z-40 border-b border-gold/20 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 md:px-6">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-md px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
