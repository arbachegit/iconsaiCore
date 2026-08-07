import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Libre_Baskerville, Plus_Jakarta_Sans } from 'next/font/google'

import FloatingLogo from '@/components/FloatingLogo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-logo',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-logo-i',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Catálogo de Skills | IconsAI',
  description:
    'Atlas operacional das skills canônicas do ecossistema IconsAI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable} ${plusJakartaSans.variable} ${libreBaskerville.variable}`}>
      <body>
        {children}
        <FloatingLogo />
      </body>
    </html>
  )
}
