"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "mfga:news-hide-transactions"

/**
 * Whether the Transaction Wire feed is hidden, shared by the homepage News
 * section and the /news archive so flipping it in one place carries to the
 * other and survives a reload.
 *
 * The initial state is always `false` so the first client render matches what
 * the server rendered; the stored preference is applied in an effect straight
 * afterwards. Reading localStorage during render instead would produce a
 * hydration mismatch for anyone who had the toggle on.
 */
export function useHideTransactions(): [boolean, (next: boolean) => void] {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setHidden(true)
    } catch {
      // Private mode or blocked site data — the default is fine.
    }
  }, [])

  const update = useCallback((next: boolean) => {
    setHidden(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Preference just won't persist; the toggle still works this session.
    }
  }, [])

  return [hidden, update]
}

const baseButton =
  "rounded-md px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"

/** Segmented All / Stories control. `counts` label each option. */
export function NewsFilterToggle({
  hidden,
  onChange,
  counts,
}: {
  hidden: boolean
  onChange: (next: boolean) => void
  counts?: { all: number; stories: number }
}) {
  return (
    <div
      role="group"
      aria-label="Filter league news"
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card/60 p-0.5"
    >
      <button
        type="button"
        aria-pressed={!hidden}
        onClick={() => onChange(false)}
        className={`${baseButton} ${
          hidden ? "text-muted-foreground hover:text-foreground" : "bg-gold/15 text-gold"
        }`}
      >
        All{counts ? ` ${counts.all}` : ""}
      </button>
      <button
        type="button"
        aria-pressed={hidden}
        onClick={() => onChange(true)}
        className={`${baseButton} ${
          hidden ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Stories{counts ? ` ${counts.stories}` : ""}
      </button>
    </div>
  )
}
