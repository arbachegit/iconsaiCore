const COURSE_TOKEN_PARAM = 'course_token'

export function buildSkillsApiUrl(path: string): string {
  if (typeof window === 'undefined') return path

  const url = new URL(path, window.location.origin)
  const courseToken = new URLSearchParams(window.location.search).get(COURSE_TOKEN_PARAM)?.trim()

  if (courseToken) {
    url.searchParams.set(COURSE_TOKEN_PARAM, courseToken)
  }

  return `${url.pathname}${url.search}`
}
