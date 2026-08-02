import Link from "next/link"

const NAV_LINKS = [
  { label: "Teams", href: "#teams", kind: "anchor" as const },
  { label: "Standings", href: "#standings", kind: "anchor" as const },
  { label: "News", href: "/news", kind: "page" as const },
  { label: "Clinch Scenarios", href: "#clinch", kind: "anchor" as const },
  { label: "Championship Odds", href: "#odds", kind: "anchor" as const },
  { label: "Record Comparison", href: "#comparison", kind: "anchor" as const },
  { label: "History", href: "/history", kind: "page" as const },
]

const linkClassName =
  "whitespace-nowrap rounded-md px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold"

export function SubNav() {
  return (
    <nav className="sticky top-[72px] z-40 border-b border-gold/20 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 md:px-6">
        {NAV_LINKS.map((link) =>
          link.kind === "page" ? (
            <Link key={link.href} href={link.href} className={linkClassName}>
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} className={linkClassName}>
              {link.label}
            </a>
          ),
        )}
      </div>
    </nav>
  )
}
