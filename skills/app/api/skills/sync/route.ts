import { createHmac, timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { getSkillsWebhookSecret } from '@/lib/github/env'
import { getContentHash } from '@/lib/github/skills'
import {
  normalizeSkillsSyncPayload,
  skillsSyncQuerySchema,
  skillsWebhookSignatureSchema,
} from '@/lib/github/sync-schema'
import type { SkillsSyncPayload } from '@/lib/github/types'

function verifyGitHubSignature(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

/** Health check — used by polling and the webhook status button in the UI */
export async function GET(request: NextRequest) {
  const query = skillsSyncQuerySchema.safeParse({
    currentHash: request.nextUrl.searchParams.get('current_hash') ?? undefined,
  })
  if (!query.success) {
    return NextResponse.json({ ok: false, error: 'Invalid content hash.' }, { status: 400 })
  }

  const checks: Record<string, string> = {}
  let ok = true
  let revalidated = false

  // 1. Check webhook secret
  try {
    const secret = getSkillsWebhookSecret()
    checks.secret = secret.length > 0 ? 'ok' : 'empty'
    if (checks.secret !== 'ok') ok = false
  } catch {
    checks.secret = 'missing'
    ok = false
  }

  // 2. Check GitHub API connectivity + skill count (lightweight, cache-busting)
  try {
    const remote = await getContentHash(true)
    checks.github = 'ok'
    checks.skillCount = String(remote.count)
    checks.contentHash = remote.hash
    if (remote.count === 0) {
      checks.github = 'empty'
      ok = false
    }
    if (query.data.currentHash && query.data.currentHash !== remote.hash) {
      revalidateTag('skills')
      revalidatePath('/')
      revalidated = true
    }
  } catch (error) {
    checks.github = 'unreachable'
    checks.skillCount = '0'
    checks.error = error instanceof Error ? error.message : 'unknown'
    ok = false
  }

  return NextResponse.json({
    ok,
    checks,
    revalidated,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  if (body.length > 2_000_000) {
    return NextResponse.json({ ok: false, error: 'Payload too large.' }, { status: 413 })
  }

  const signature = skillsWebhookSignatureSchema.safeParse(
    request.headers.get('x-hub-signature-256'),
  )
  if (!signature.success) {
    console.warn('[skills-sync] webhook signature missing or invalid')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let secret: string
  try {
    secret = getSkillsWebhookSecret()
  } catch {
    console.error('[skills-sync] webhook secret is not configured')
    return NextResponse.json({ ok: false, error: 'Webhook unavailable.' }, { status: 503 })
  }

  if (!verifyGitHubSignature(body, signature.data, secret)) {
    console.warn('[skills-sync] unauthorized webhook attempt')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let payload: SkillsSyncPayload | null

  try {
    payload = normalizeSkillsSyncPayload(JSON.parse(body))
  } catch (error) {
    console.warn('[skills-sync] invalid JSON payload', error)
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }

  try {
    revalidateTag('skills')
    revalidatePath('/')

    console.info('[skills-sync] revalidated skills page', {
      repository:
        typeof payload.repository === 'string' ? payload.repository : payload.repository?.full_name,
      sha: payload.sha,
      ref: payload.ref,
      changedFiles: payload.changed_files?.length ?? 0,
      timestamp: payload.timestamp,
    })

    return NextResponse.json({
      ok: true,
      revalidated: true,
      changedFilesCount: payload.changed_files?.length ?? 0,
    })
  } catch (error) {
    console.error('[skills-sync] failed to revalidate skills page', error)
    return NextResponse.json({ ok: false, error: 'Failed to revalidate' }, { status: 500 })
  }
}
