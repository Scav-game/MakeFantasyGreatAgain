"use client"

import { useEffect, useState } from "react"
import { getTweetArticles } from "@/lib/news"
import { AuthorAvatar } from "@/components/history/author-avatar"

const ROTATE_MS = 6000

export function NewsTicker() {
  const tweets = getTweetArticles()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (tweets.length < 2 || paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % tweets.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [tweets.length, paused])

  if (tweets.length === 0) return null

  const tweet = tweets[index % tweets.length]

  return (
    <div
      className="mb-12 flex items-center gap-4 overflow-hidden rounded-xl border border-gold/30 bg-card/60 px-5 py-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="shrink-0 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-widest text-gold">
        Tweets
      </span>
      <div className="relative h-9 flex-1 overflow-hidden">
        {tweets.map((t, i) => (
          <div
            key={t.id}
            className="absolute inset-0 flex items-center gap-3 transition-all duration-500 ease-out"
            style={{
              opacity: i === index ? 1 : 0,
              transform: `translateX(${i === index ? 0 : i < index ? -24 : 24}px)`,
              pointerEvents: i === index ? "auto" : "none",
            }}
            aria-hidden={i !== index}
          >
            {t.author && <AuthorAvatar name={t.author} size="sm" />}
            <p className="min-w-0 truncate text-sm text-foreground">
              {t.author && <span className="font-display font-semibold text-gold">{t.author}: </span>}
              {t.body}
            </p>
          </div>
        ))}
      </div>
      {tweets.length > 1 && (
        <div className="flex shrink-0 items-center gap-1.5">
          {tweets.map((t, i) => (
            <button
              key={t.id}
              aria-label={`Show tweet ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i === index ? "#D4A017" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
