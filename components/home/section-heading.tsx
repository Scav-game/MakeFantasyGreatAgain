export function SectionHeading({ id, title }: { id?: string; title: string }) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-24 items-center gap-3">
      <span className="h-6 w-1 rounded-full bg-gold" />
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground md:text-3xl">
        {title}
      </h2>
    </div>
  )
}
