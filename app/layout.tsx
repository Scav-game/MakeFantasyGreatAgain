import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Oswald, Inter } from 'next/font/google'
import { assetPath } from '@/lib/asset-path'
import './globals.css'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'MFGA — Make Fantasy Great Again',
  description:
    'The official league hub for MFGA, a 14-team fantasy football franchise experience. Team pages, schedules, rosters, and standings.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: assetPath('/icon-light-32x32.png'),
        media: '(prefers-color-scheme: light)',
      },
      {
        url: assetPath('/icon-dark-32x32.png'),
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: assetPath('/icon.svg'),
        type: 'image/svg+xml',
      },
    ],
    apple: assetPath('/apple-icon.png'),
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${oswald.variable} ${inter.variable} bg-background`}>
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
