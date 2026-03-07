import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catalogo de Skills | IconsAI',
  description:
    'Catalogo de skills renderizado no servidor a partir do repositorio iconsaiConfig.',
  icons: {
    icon: [
      { url: '/skills/icon.svg', type: 'image/svg+xml' },
      { url: '/skills/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/skills/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/skills/icon.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
