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
    </section>
  )
}
