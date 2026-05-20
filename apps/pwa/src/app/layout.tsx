import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/lib/providers'
import { ServiceWorkerRegister } from '@/lib/sw-register'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Scan&Go',
  description: 'Marca tu asistencia con un escaneo.',
  applicationName: 'Scan&Go',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scan&Go',
  },
}

// `themeColor` y viewport van por export separado en Next 14+/16
// (deprecaron el slot dentro de `metadata`).
export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
