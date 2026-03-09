'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 60_000
const INITIAL_DELAY_MS = 15_000

interface PollingState {
  hasNew: boolean
  remoteCount: number | null
}

export function useNewSkillsPolling(renderedCount: number, renderedHash: string) {
  const [state, setState] = useState<PollingState>({ hasNew: false, remoteCount: null })
  const [dismissed, setDismissed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/skills/api/skills/sync', { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json()
      const remoteCount = Number(data.checks?.skillCount ?? 0)
      const remoteHash = typeof data.checks?.contentHash === 'string' ? data.checks.contentHash : ''

      if (remoteCount > 0 && (remoteCount !== renderedCount || (remoteHash && remoteHash !== renderedHash))) {
        setState({ hasNew: true, remoteCount })
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
    }
  }, [check])

  const dismiss = useCallback(() => setDismissed(true), [])
  const refresh = useCallback(() => window.location.reload(), [])

  return {
    hasNewSkills: state.hasNew && !dismissed,
    remoteCount: state.remoteCount,
    dismiss,
    refresh,
  }
}
