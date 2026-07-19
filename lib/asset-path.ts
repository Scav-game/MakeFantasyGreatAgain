// Keep in sync with `basePath` in next.config.mjs — basePath is active in
// both `next dev` and the production export, so this must not be
// environment-conditional. Next.js only rewrites asset URLs automatically
// for next/link, next/image and next/script — raw <img src> / CSS url()
// references to files in /public need this applied by hand so they resolve
// correctly both locally and once served from
// https://<user>.github.io/MakeFantasyGreatAgain/.
export const BASE_PATH = "/MakeFantasyGreatAgain"

export function assetPath(path: string): string {
  return `${BASE_PATH}${path}`
}
