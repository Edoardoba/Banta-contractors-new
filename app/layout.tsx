import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Banta - Connetti con Professionisti',
  description: 'Trova professionisti affidabili in tutti i settori',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

