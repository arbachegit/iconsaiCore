import { createHmac, timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { getSkillsWebhookSecret } from '@/lib/github/env'
import { getAllSkills } from '@/lib/github/skills'
import type { SkillsSyncPayload } from '@/lib/github/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizePayload(payload: unknown): SkillsSyncPayload | null {
  if (!isRecord(payload)) {
    return null
  }

  const repositoryValue = payload.repository
  let repository: SkillsSyncPayload['repository']

  if (typeof repositoryValue === 'string') {
    repository = repositoryValue
  } else if (isRecord(repositoryValue)) {
    repository = {
      name: typeof repositoryValue.name === 'string' ? repositoryValue.name : undefined,
      full_name:
        typeof repositoryValue.full_name === 'string' ? repositoryValue.full_name : undefined,
    }
  }

  const changedFiles = Array.isArray(payload.changed_files)
    ? payload.changed_files.filter((item): item is string => typeof item === 'string')
    : undefined

  return {
    repository,
    sha: typeof payload.sha === 'string' ? payload.sha : undefined,
    ref: typeof payload.ref === 'string' ? payload.ref : undefined,
    changed_files: changedFiles,
    timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : undefined,
  }
}

function verifyGitHubSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false
  }

  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

/** Health check — used by the webhook status button in the UI */
export async function GET() {
  const checks: Record<string, string> = {}
  let ok = true

  // 1. Check webhook secret
  try {
    const secret = getSkillsWebhookSecret()
    checks.secret = secret.length > 0 ? 'ok' : 'empty'
    if (checks.secret !== 'ok') ok = false
  } catch {
    checks.secret = 'missing'
    ok = false
  }

  // 2. Check GitHub API connectivity + skill count
  try {
    const skills = await getAllSkills()
    checks.github = 'ok'
    checks.skillCount = String(skills.length)
    if (skills.length === 0) {
      checks.github = 'empty'
      ok = false
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
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const secret = getSkillsWebhookSecret()
  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyGitHubSignature(body, signature, secret)) {
    console.warn('[skills-sync] unauthorized webhook attempt')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let payload: SkillsSyncPayload | null

  try {
    payload = sanitizePayload(JSON.parse(body))
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
