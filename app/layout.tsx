import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/components/session-provider'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import { IOSInstallPrompt } from '@/components/ios-install-prompt'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const BASE_URL = 'https://elementz.fun'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Elementz',
    template: '%s | Elementz',
  },
  description: 'Merge 2 elements to create a new one, endlessly. A free browser game with hundreds of combinations to discover.',
  keywords: ['elementz', 'element game', 'merge game', 'alchemy game', 'combination game', 'little alchemy', 'puzzle game'],
  authors: [{ name: 'Eugène Garcia', url: 'https://eugenegarcia.life' }],
  creator: 'Eugène Garcia',
  generator: 'Next.js',
  manifest: '/manifest.json',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    title: 'Elementz',
    description: 'Merge 2 elements to create a new one, endlessly',
    siteName: 'Elementz',
    images: [
      {
        url: '/opengraph.png',
        width: 1200,
        height: 630,
        alt: 'Elementz — Merge 2 elements to create a new one, endlessly',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elementz',
    description: 'Merge 2 elements to create a new one, endlessly',
    images: ['/opengraph.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Elementz',
    startupImage: '/opengraph.png',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
            <Analytics />
            <ServiceWorkerRegistrar />
            <IOSInstallPrompt />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
