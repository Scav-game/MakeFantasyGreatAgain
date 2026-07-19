import type { MerchItem, Team } from "@/lib/league"
import { getInitials } from "./team-logo"

/* Lightweight CSS product mockups so every team gets consistent, on-brand merch. */

function JerseyMock({ team }: { team: Team }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path
        d="M30 18 L20 26 L14 40 L24 46 L26 40 L26 84 L74 84 L74 40 L76 46 L86 40 L80 26 L70 18 L60 22 Q50 30 40 22 Z"
        fill={team.colors.primary}
        stroke={team.colors.accent}
        strokeWidth="1.5"
      />
      <path d="M40 22 Q50 30 60 22 L57 18 Q50 24 43 18 Z" fill={team.colors.dark} />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="16"
        fill={team.colors.light}
      >
        {getInitials(team.name)}
      </text>
      <text
        x="50"
        y="76"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="20"
        fill={team.colors.accent}
      >
        1
      </text>
    </svg>
  )
}

function HatMock({ team }: { team: Team }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path
        d="M18 60 Q50 30 82 60 Q50 52 18 60 Z"
        fill={team.colors.primary}
        stroke={team.colors.accent}
        strokeWidth="1.5"
      />
      <path d="M14 60 Q50 66 86 60 L88 66 Q50 74 12 66 Z" fill={team.colors.dark} />
      <circle cx="50" cy="50" r="9" fill={team.colors.dark} />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="9"
        fill={team.colors.accent}
      >
        {getInitials(team.name)}
      </text>
    </svg>
  )
}

function HoodieMock({ team }: { team: Team }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path
        d="M28 24 L18 32 L12 48 L22 54 L24 48 L24 86 L76 86 L76 48 L78 54 L88 48 L82 32 L72 24 L62 28 Q50 34 38 28 Z"
        fill={team.colors.primary}
        stroke={team.colors.accent}
        strokeWidth="1.5"
      />
      <path d="M38 28 Q50 40 62 28 L62 22 Q50 30 38 22 Z" fill={team.colors.dark} />
      <rect x="36" y="60" width="28" height="14" rx="3" fill={team.colors.dark} opacity="0.6" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="11"
        fill={team.colors.light}
      >
        {getInitials(team.name)}
      </text>
    </svg>
  )
}

export function MerchCard({ item, team }: { item: MerchItem; team: Team }) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-lg border transition-transform hover:-translate-y-1"
      style={{ borderColor: `${team.colors.accent}33`, backgroundColor: `${team.colors.dark}80` }}
    >
      <div
        className="flex aspect-square items-center justify-center p-4"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${team.colors.primary}22, transparent 70%)`,
        }}
      >
        {item.type === "jersey" && <JerseyMock team={team} />}
        {item.type === "hat" && <HatMock team={team} />}
        {item.type === "hoodie" && <HoodieMock team={team} />}
      </div>
      <div className="border-t px-3 py-2" style={{ borderColor: `${team.colors.accent}22` }}>
        <p className="truncate font-display text-xs font-semibold uppercase tracking-wide text-white">
          {item.name}
        </p>
        <p className="text-[11px] capitalize text-white/50">{item.type}</p>
      </div>
    </div>
  )
}
