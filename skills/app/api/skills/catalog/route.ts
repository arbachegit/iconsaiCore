import { NextResponse } from 'next/server'

import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { computeSkillsHash, getContentHash } from '@/lib/github/skills'

export const dynamic = 'force-dynamic'

/** Read-only catalog contract for same-session consumers such as Tools. */
export async function GET() {
  const [{ skills, source }, remoteVersion] = await Promise.all([
    fetchSkillsWithFallback(),
    getContentHash(false).catch(() => null),
  ])

  return NextResponse.json(
    {
      skills,
      source,
      contentHash: remoteVersion?.hash || computeSkillsHash(skills),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
