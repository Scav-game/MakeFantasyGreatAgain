import type { Team } from "@/lib/league"
import { cn } from "@/lib/utils"
import { assetPath } from "@/lib/asset-path"

const SKIP_WORDS = new Set(["the", "in", "de", "of", "co", "and", "&"])

export function getInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()))
  if (words.length === 0) return name.slice(0, 2).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// Only teams with a file here get a real logo; everyone else falls back to
// an initials badge until a matching /public/Images/Logos/<slug>.<ext> exists.
const LOGO_EXTENSION: Record<string, string> = {
  "amon-ra-dawgin": "svg",
  beer: "svg",
  "chicago-zestiest": "png",
  "doobs-agency": "svg",
  "englewood-ninjas": "svg",
  "fort-bragg": "svg",
  "i-heart-gingers": "png",
  "mount-olympus": "svg",
  "nabers-in-paris": "svg",
  "pakistan-bombers": "png",
  "pluto-shraazinatorz": "svg",
  "the-watermark": "svg",
  "vancouver-panties": "png",
  "vile-horrendous": "svg",
}

type TeamLogoProps = {
  team: Pick<Team, "slug" | "name" | "colors">
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
}

export function TeamLogo({ team, size = "md", className }: TeamLogoProps) {
  const ext = LOGO_EXTENSION[team.slug]
  if (ext) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-inner",
          SIZES[size],
          className,
        )}
        style={{
          backgroundColor: team.colors.light,
          borderColor: team.colors.accent,
        }}
      >
        <img
          src={assetPath(`/Images/Logos/${team.slug}.${ext}`)}
          alt={`${team.name} logo`}
          className="h-[80%] w-[80%] object-contain"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold leading-none tracking-tight",
        "border shadow-inner",
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(145deg, ${team.colors.primary}, ${team.colors.dark})`,
        borderColor: team.colors.accent,
        color: team.colors.light,
      }}
    >
      {getInitials(team.name)}
    </span>
  )
}
