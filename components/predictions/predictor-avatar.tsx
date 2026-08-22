import type { Predictor } from "@/lib/predictions"
import { assetPath } from "@/lib/asset-path"

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// Only predictors with a file here get a real portrait; everyone else falls
// back to an initials badge in their accent color until a matching
// /public/Images/Predictors/<id>.<ext> exists.
const PREDICTOR_AVATAR_EXTENSION: Record<string, string> = {}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-[50px] w-[50px] text-sm",
}

export function PredictorAvatar({ predictor, size = "md" }: { predictor: Predictor; size?: "sm" | "md" }) {
  const ext = PREDICTOR_AVATAR_EXTENSION[predictor.id]

  if (ext) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${SIZES[size]}`}
        style={{ borderColor: predictor.accentColor }}
      >
        <img
          src={assetPath(`/Images/Predictors/${predictor.id}.${ext}`)}
          alt={`${predictor.name} portrait`}
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-display font-bold ${SIZES[size]}`}
      style={{ borderColor: predictor.accentColor, backgroundColor: `${predictor.accentColor}22`, color: predictor.accentColor }}
    >
      {getInitials(predictor.shortName)}
    </span>
  )
}
