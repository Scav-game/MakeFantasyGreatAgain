import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A winning percentage the way a standings page writes it: three decimals,
 * and no leading zero below 1.000 — `1.000`, `.538`, `.000`.
 *
 * Takes a fraction between 0 and 1, not an already-multiplied percentage.
 */
export function formatWinPct(fraction: number): string {
  const fixed = fraction.toFixed(3)
  return fixed.startsWith("0") ? fixed.slice(1) : fixed
}
