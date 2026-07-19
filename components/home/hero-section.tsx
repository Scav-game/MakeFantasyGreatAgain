import { assetPath } from "@/lib/asset-path"

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[450px] flex-col items-center justify-center overflow-hidden bg-cover bg-center px-4 text-center"
      style={{ backgroundImage: `url("${encodeURI(assetPath("/Images/heros/MFGA Home hero.png"))}")` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, #0a0a0a 0%, rgba(10,10,10,0.4) 50%, rgba(10,10,10,0.6) 100%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <h1
          className="font-display text-7xl font-bold uppercase leading-none tracking-tight md:text-9xl"
          style={{ color: "#D4A017" }}
        >
          MFGA
        </h1>
        <p className="mt-4 font-display text-xl font-bold uppercase tracking-[0.15em] text-white md:text-3xl">
          Make Fantasy Great Again
        </p>
        <p className="mt-3 font-display text-sm uppercase tracking-[0.3em] text-white/70 md:text-base">
          2026 Season
        </p>
      </div>
    </section>
  )
}
