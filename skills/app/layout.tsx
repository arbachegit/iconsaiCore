import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catálogo de Skills | IconsAI',
  description:
    'Catálogo de skills renderizado no servidor a partir do repositório iconsaiConfig.',
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
      <body>
        {children}
        {/* Floating Logo — Regra de Ouro (IMUTAVEL) */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="floating-logo" href="#" onClick={undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/skills/favicon-float.png" alt="IconsAI" />
        </a>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector('.floating-logo')?.addEventListener('click',function(e){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})})`,
          }}
        />
      </body>
    </html>
  )
}
