import { useEffect, useState } from 'react'

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
      return
    }

    const cached = cache.get(skillId)
    if (cached) {
      setDoc(cached)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/skills/api/skills/${encodeURIComponent(skillId)}/doc`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const content = data?.doc ?? null
        if (content) cache.set(skillId, content)
        setDoc(content)
      })
      .catch(() => {
        if (!cancelled) setDoc(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [skillId])

  return { doc, loading }
}
