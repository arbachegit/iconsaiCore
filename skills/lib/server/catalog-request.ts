import 'server-only'

export type RequestSearchParams = Record<string, string | string[] | undefined>

export function serializeRequestSearchParams(searchParams: RequestSearchParams): string {
  const serialized = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) serialized.append(key, item)
    } else if (typeof value === 'string') {
      serialized.set(key, value)
    }
  }

  const query = serialized.toString()
  return query ? `?${query}` : ''
}
