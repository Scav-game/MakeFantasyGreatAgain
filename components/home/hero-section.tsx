import { assetPath } from "@/lib/asset-path"

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[450px] flex-col items-center justify-center overflow-hidden bg-cover px-4 text-center"
      style={{
        backgroundImage: `url("${encodeURI(assetPath("/Images/heros/MFGA Home hero.png"))}")`,
        backgroundPosition: "center 20%",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(0deg, #0a0a0a 0%, rgba(10,10,10,0.35) 10%, rgba(10,10,10,0) 28%)",
        }}
      />
    </section>
  )
}
