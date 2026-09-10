"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_LINKS = [
  { label: "Teams", href: "#teams", kind: "anchor" as const },
  { label: "Standings", href: "#standings", kind: "anchor" as const },
  { label: "News", href: "/news", kind: "page" as const },
  { label: "Predictions", href: "/predictions", kind: "page" as const },
  { label: "Clinch Scenarios", href: "#clinch", kind: "anchor" as const },
  { label: "Championship Odds", href: "#odds", kind: "anchor" as const },
  { label: "Record Comparison", href: "#comparison", kind: "anchor" as const },
  { label: "History", href: "/history", kind: "page" as const },
]

const linkClassName =
  "whitespace-nowrap rounded-md px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold"

/**
 * The section links here are anchors into the homepage. This nav also renders
 * on /predictions, where a bare "#odds" resolves to /predictions#odds — a
 * target that doesn't exist on that page, so the tab looked dead. Off the
 * homepage those links become "/#odds" so they route home and then scroll.
 *
 * On the homepage itself they stay bare anchors, which keeps the native
 * same-page scroll rather than pushing a navigation for every section click.
 */
export function SubNav() {
  const pathname = usePathname()
  const onHomepage = pathname === "/"

  return (
    <nav className="sticky top-[72px] z-40 border-b border-gold/20 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 md:px-6">
        {NAV_LINKS.map((link) => {
          if (link.kind === "anchor" && onHomepage) {
            return (
              <a key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </a>
            )
          }
          const href = link.kind === "anchor" ? `/${link.href}` : link.href
          return (
            <Link key={link.href} href={href} className={linkClassName}>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
