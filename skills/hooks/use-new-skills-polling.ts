'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildSkillsApiUrl } from '@/lib/client/skills-api-url'
import { skillsSyncHealthResponseSchema } from '@/lib/github/sync-schema'

const POLL_INTERVAL_MS = 60_000
const INITIAL_DELAY_MS = 15_000

interface PollingState {
  hasNew: boolean
  remoteCount: number | null
}

export function useNewSkillsPolling(renderedCount: number, renderedHash: string) {
  const [state, setState] = useState<PollingState>({ hasNew: false, remoteCount: null })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reloadScheduledRef = useRef(false)

  const check = useCallback(async () => {
    try {
      const endpoint = buildSkillsApiUrl('/skills/api/skills/sync')
      const url = new URL(endpoint, window.location.origin)
      if (/^[a-f0-9]{12}$/.test(renderedHash)) {
        url.searchParams.set('current_hash', renderedHash)
      }

      const res = await fetch(`${url.pathname}${url.search}`, { cache: 'no-store' })
      if (!res.ok) return

      const payload = skillsSyncHealthResponseSchema.safeParse(await res.json())
      if (!payload.success) return

      const remoteCount = Number(payload.data.checks.skillCount)
      const remoteHash = payload.data.checks.contentHash ?? ''

      if (remoteCount > 0 && (remoteCount !== renderedCount || (remoteHash && remoteHash !== renderedHash))) {
        setState({ hasNew: true, remoteCount })
        if (!reloadScheduledRef.current) {
          reloadScheduledRef.current = true
          reloadTimeoutRef.current = setTimeout(() => window.location.reload(), 1_200)
        }
      } else {
        setState({ hasNew: false, remoteCount })
      }
    } catch {
      // Silently ignore — network errors don't affect the UI
    }
  }, [renderedCount, renderedHash])

  useEffect(() => {
    const timeout = setTimeout(check, INITIAL_DELAY_MS)
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS)

    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current)
    }
  }, [check])

  const refresh = useCallback(() => window.location.reload(), [])

  return {
    hasNewSkills: state.hasNew,
    remoteCount: state.remoteCount,
    refresh,
  }
}
