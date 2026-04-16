import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lil Lifeline',
  description: 'A simple daily check-in for people living alone',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}