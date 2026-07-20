"use client"

import { useState } from "react"
import Link from "next/link"
import { TeamLogo } from "@/components/team/team-logo"
import { getHistoryStats, type HistoryStatsRow } from "@/lib/history-stats"

type ColumnKey =
  | "team"
  | "yearJoined"
  | "wins"
  | "winPct"
  | "totalPointsFor"
  | "pointsPerYear"
  | "playoffAppearances"
  | "playoffWins"
  | "championships"

const COLUMNS: { key: ColumnKey; label: string; align: "left" | "right" }[] = [
  { key: "team", label: "Team", align: "left" },
  { key: "yearJoined", label: "Joined", align: "right" },
  { key: "wins", label: "Record", align: "right" },
  { key: "winPct", label: "Win %", align: "right" },
  { key: "totalPointsFor", label: "Total PF", align: "right" },
  { key: "pointsPerYear", label: "PF / Year", align: "right" },
  { key: "playoffAppearances", label: "Playoff Apps", align: "right" },
  { key: "playoffWins", label: "Playoff Wins", align: "right" },
  { key: "championships", label: "Titles", align: "right" },
]

function sortValue(row: HistoryStatsRow, key: ColumnKey): number | string {
  switch (key) {
    case "team":
      return row.team.name
    default:
      return row[key]
  }
}

export function HistoryTable() {
  const rows = getHistoryStats()
  const [sortKey, setSortKey] = useState<ColumnKey>("championships")
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  function handleSort(key: ColumnKey) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setDir("desc")
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, sortKey)
    const bv = sortValue(b, sortKey)
    const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number)
    return dir === "asc" ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {COLUMNS.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.align === "right" ? "text-right" : ""}`}>
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-gold ${
                    sortKey === col.key ? "text-gold" : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.team.slug} className="border-t border-border/60 transition-colors hover:bg-white/[0.03]">
              <td className="px-4 py-3">
                <Link href={`/team/${row.team.slug}`} className="flex items-center gap-2.5 hover:underline">
                  <TeamLogo team={row.team} size="sm" />
                  <span className="font-medium text-foreground">{row.team.name}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-foreground">{row.yearJoined}</td>
              <td className="px-4 py-3 text-right text-foreground">
                {row.wins}-{row.losses}
              </td>
              <td className="px-4 py-3 text-right font-display font-semibold text-foreground">
                {(row.winPct * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right text-foreground">{row.totalPointsFor.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-foreground">{row.pointsPerYear.toFixed(1)}</td>
              <td className="px-4 py-3 text-right text-foreground">{row.playoffAppearances}</td>
              <td className="px-4 py-3 text-right text-foreground">{row.playoffWins}</td>
              <td
                className="px-4 py-3 text-right font-display font-semibold"
                style={{ color: row.championships > 0 ? "#D4A017" : undefined }}
              >
                {row.championships}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
