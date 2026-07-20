import { assetPath } from "@/lib/asset-path"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// Only authors with a file here get a real photo; everyone else falls back
// to an initials badge until a matching
// /public/Images/Reporters/<slug>.<ext> exists. Add an entry (slugified
// name -> extension) whenever a new reporter avatar is dropped in.
const AUTHOR_AVATAR_EXTENSION: Record<string, string> = {
  "rick-the-hammer-dalton": "png",
  "maya-chen": "png",
  "deshawn-showtime-harris": "png",
  "claire-westbrook": "png",
  "tommy-t-bone-mancini": "png",
  "valentina-rojas": "png",
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
}

export function AuthorAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const slug = slugify(name)
  const ext = AUTHOR_AVATAR_EXTENSION[slug]

  if (ext) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-gold/40 bg-card ${SIZES[size]}`}
      >
        <img
          src={assetPath(`/Images/Reporters/${slug}.${ext}`)}
          alt={`${name} profile photo`}
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-gold/50 bg-gold/10 font-display font-bold text-gold ${SIZES[size]}`}
    >
      {getInitials(name)}
    </span>
  )
}
