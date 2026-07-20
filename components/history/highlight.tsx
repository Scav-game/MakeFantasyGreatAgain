function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Wraps every case-insensitive match of `query` in `text` with a highlight,
 * the same way a browser's Ctrl+F find-in-page does. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>

  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-gold px-0.5 text-black">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
