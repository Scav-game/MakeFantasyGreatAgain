/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  basePath: '/MakeFantasyGreatAgain',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
