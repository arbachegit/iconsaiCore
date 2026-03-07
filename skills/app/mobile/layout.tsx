import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'IconsAI Skills Navigator — Mobile',
  description: 'Skills Navigator mobile — 44 Skills de Governança e IA.',
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
