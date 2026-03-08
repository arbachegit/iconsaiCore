import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'IconsAI Skills Navigator — Mobile',
  description: 'Skills Navigator mobile — Catalogo de skills do ecossistema IconsAI.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function SkillsMobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
