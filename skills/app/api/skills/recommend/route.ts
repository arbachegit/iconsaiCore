import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { recommendSkills } from '@/lib/recommendation/service'
import {
  recommendationRequestSchema,
  recommendationResponseSchema,
} from '@/lib/recommendation/schema'
import { getClientIdentifier, isRateLimited } from '@/lib/server/rate-limit'
import { safeErrorName } from '@/lib/server/safe-log'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const clientIdentifier = getClientIdentifier(request)

  if (isRateLimited(clientIdentifier, {
    scope: 'skill-recommendation',
    limit: 6,
    windowMs: 60_000,
  })) {
    return NextResponse.json(
      { error: 'Muitas consultas em sequência. Aguarde um minuto.', requestId },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Corpo JSON inválido.', requestId },
      { status: 400 },
    )
  }

  const input = recommendationRequestSchema.safeParse(body)
  if (!input.success) {
    return NextResponse.json(
      {
        error: input.error.issues[0]?.message || 'Situação inválida.',
        requestId,
      },
      { status: 400 },
    )
  }

  try {
    const { skills } = await fetchSkillsWithFallback()
    const recommendation = await recommendSkills(skills, input.data.situation, requestId)
    const response = recommendationResponseSchema.parse(recommendation)
    return NextResponse.json(response)
  } catch (error) {
    console.error('[skills-advisor] recommendation failed', {
      requestId,
      reason: safeErrorName(error),
    })
    return NextResponse.json(
      {
        error: 'Não foi possível consultar o orientador agora. Tente novamente em instantes.',
        requestId,
      },
      { status: 503 },
    )
  }
}
