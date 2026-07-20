export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/50 bg-gold/10 font-display text-lg font-bold text-gold">
            M
          </span>
          <div>
            <p className="font-display text-lg font-bold uppercase leading-none tracking-wide text-foreground">
              MFGA
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Make Fantasy Great Again</p>
          </div>
        </div>
        <span className="hidden font-display text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">
          2026 Season · 14 Teams
        </span>
      </div>
    </header>
  )
}
