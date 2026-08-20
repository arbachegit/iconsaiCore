import 'server-only'

import { isIP } from 'node:net'

import type { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  limit: number
  scope: string
  windowMs: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const MAX_RATE_LIMIT_ENTRIES = 10_000

function removeExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key)
  }
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  if (isIP(forwarded)) return forwarded
  if (isIP(realIp)) return realIp
  return 'unknown'
}

export function isRateLimited(identifier: string, options: RateLimitOptions): boolean {
  const now = Date.now()
  if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) removeExpiredEntries(now)

  const key = `${options.scope}:${identifier}`
  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES && !rateLimitStore.has(key)) return true
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs })
    return false
  }

  current.count += 1
  return current.count > options.limit
}
