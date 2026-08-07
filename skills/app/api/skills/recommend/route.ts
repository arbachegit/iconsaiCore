import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { fetchSkillsWithFallback } from '@/lib/github/fetch-skills'
import { recommendSkills } from '@/lib/recommendation/service'
import {
  recommendationRequestSchema,
  recommendationResponseSchema,
} from '@/lib/recommendation/schema'

export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 6
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getClientIdentifier(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const current = rateLimitStore.get(identifier)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX_REQUESTS
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const clientIdentifier = getClientIdentifier(request)

  if (isRateLimited(clientIdentifier)) {
    return NextResponse.json(
      { error: 'Muitas consultas em sequência. Aguarde um minuto.', requestId },
      { status: 429 },
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
      reason: error instanceof Error ? error.name : 'unknown',
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
