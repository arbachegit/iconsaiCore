import { NextRequest, NextResponse } from 'next/server'

import { SKILL_DOCS } from '@/data/skill-docs'
import { getSkillDocument } from '@/lib/github/skills'
import { getClientIdentifier, isRateLimited } from '@/lib/server/rate-limit'
import { safeErrorName } from '@/lib/server/safe-log'
import { skillIdSchema } from '@/lib/validation/skill-id'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isRateLimited(getClientIdentifier(request), {
    scope: 'skill-doc',
    limit: 60,
    windowMs: 60_000,
  })) {
    return NextResponse.json(
      { doc: null, error: 'Muitas consultas em sequência.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  const routeParams = skillIdSchema.safeParse((await params).id)
  if (!routeParams.success) {
    return NextResponse.json({ doc: null, error: 'Identificador de skill inválido.' }, { status: 400 })
  }

  const id = routeParams.data
  try {
    const remoteDoc = await getSkillDocument(id)
    if (remoteDoc) {
      return NextResponse.json({ doc: remoteDoc, source: 'global-mirror' })
    }
  } catch (error) {
    console.warn('[skills-doc] global mirror unavailable, using build snapshot', {
      skillId: id,
      reason: safeErrorName(error),
    })
  }

  if (!Object.hasOwn(SKILL_DOCS, id)) return NextResponse.json({ doc: null }, { status: 404 })

  const doc = SKILL_DOCS[id]

  if (typeof doc !== 'string' || !doc) {
    return NextResponse.json({ doc: null }, { status: 404 })
  }

  return NextResponse.json({ doc, source: 'build-snapshot' })
}
