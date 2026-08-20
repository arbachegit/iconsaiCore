import { useEffect, useState } from 'react'

import { buildSkillsApiUrl } from '@/lib/client/skills-api-url'
import { skillDocResponseSchema } from '@/lib/validation/skill-doc'

interface UseSkillDocResult {
  doc: string | null
  loading: boolean
}

const cache = new Map<string, string>()

export function useSkillDoc(skillId: string | null): UseSkillDocResult {
  const [doc, setDoc] = useState<string | null>(skillId ? cache.get(skillId) ?? null : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!skillId) {
      setDoc(null)
      setLoading(false)
      return
    }

    const cached = cache.get(skillId)
    setDoc(cached ?? null)
    if (cached) {
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setLoading(true)

    fetch(buildSkillsApiUrl(`/api/skills/${encodeURIComponent(skillId)}/doc`), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        const result = skillDocResponseSchema.safeParse(await response.json())
        return result.success ? result.data : null
      })
      .then((data) => {
        if (cancelled) return
        const content = data?.doc ?? null
        if (content) cache.set(skillId, content)
        setDoc(content)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (!cancelled) setDoc(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [skillId])

  return { doc, loading }
}
