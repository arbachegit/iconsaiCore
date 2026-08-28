import { NextRequest, NextResponse } from 'next/server'

const ACCESS_COOKIE = 'skills_tools_access'
const CANONICAL_SESSION_COOKIE = 'iconsai_superadmin_jwt'
const COURSE_TOKEN_PARAM = 'course_token'
const COURSE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,4096}\.[A-Za-z0-9_-]{16,256}$/
const VERIFY_TIMEOUT_MS = 5_000

// Authorization policy:
// - GET/HEAD / and /mobile*: authenticated by a Tools course token.
// - /api/*: authenticated by the same Tools token cookie.
// - POST /api/skills/sync: service:HMAC; the route validates the GitHub signature.
// - build metadata and immutable assets do not match this middleware and are public.
const SERVICE_ROUTES = new Set(['POST /api/skills/sync'])
const PUBLIC_CATALOG_ROUTE = 'GET /api/skills/catalog'

interface ToolsRuntimeConfig {
  verifyUrl: URL
  entryUrl: URL
  publicUrl: URL
  courseSlug: string
}

function parseHttpsUrl(rawValue: string | undefined): URL | null {
  if (!rawValue) return null
  try {
    const url = new URL(rawValue)
    const isLocalDevelopment = url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    return url.protocol === 'https:' || isLocalDevelopment ? url : null
  } catch {
    return null
  }
}

function getRuntimeConfig(): ToolsRuntimeConfig | null {
  const verifyUrl = parseHttpsUrl(process.env.SKILLS_TOOLS_VERIFY_URL)
  const entryUrl = parseHttpsUrl(process.env.SKILLS_TOOLS_ENTRY_URL)
  const publicUrl = parseHttpsUrl(process.env.SKILLS_PUBLIC_URL)
  const courseSlug = process.env.SKILLS_TOOLS_COURSE_SLUG?.trim()

  if (!verifyUrl || !entryUrl || !publicUrl || !courseSlug || !/^[a-z0-9-]{1,64}$/.test(courseSlug)) {
    return null
  }

  return { verifyUrl, entryUrl, publicUrl, courseSlug }
}

function tokenMaxAge(token: string): number {
  try {
    const payload = token.split('.')[0]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(token.split('.')[0].length / 4) * 4, '=')
    const expiresAt = Date.parse(JSON.parse(atob(payload)).expires_at)
    const remainingSeconds = Math.floor((expiresAt - Date.now()) / 1_000)
    return Math.max(1, Math.min(remainingSeconds, 86_400))
  } catch {
    return 1
  }
}

async function verifyToolsToken(
  token: string,
  request: NextRequest,
  config: ToolsRuntimeConfig,
): Promise<boolean> {
  if (!COURSE_TOKEN_PATTERN.test(token)) return false

  const verifyUrl = new URL(config.verifyUrl)
  verifyUrl.searchParams.set(COURSE_TOKEN_PARAM, token)

  try {
    const response = await fetch(verifyUrl, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      headers: {
        accept: 'text/plain',
        'user-agent': request.headers.get('user-agent') ?? 'iconsai-skills-middleware',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      },
    })

    return response.status === 200
      && response.headers.get('x-tools-course-slug') === config.courseSlug
      && response.headers.get('x-tools-scope') === 'course_access'
  } catch {
    return false
  }
}

async function verifyCanonicalSession(
  request: NextRequest,
  config: ToolsRuntimeConfig,
): Promise<boolean> {
  const session = request.cookies.get(CANONICAL_SESSION_COOKIE)?.value
  if (!session) return false

  try {
    const response = await fetch(config.verifyUrl, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      headers: {
        accept: 'text/plain',
        cookie: `${CANONICAL_SESSION_COOKIE}=${encodeURIComponent(session)}`,
        'user-agent': request.headers.get('user-agent') ?? 'iconsai-skills-middleware',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      },
    })

    return response.status === 200
      && response.headers.get('x-tools-auth') === 'valid-canonical-session'
      && response.headers.get('x-tools-scope') === 'superadmin'
  } catch {
    return false
  }
}

function unauthorized(request: NextRequest, config: ToolsRuntimeConfig | null): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: config ? 'Acesso exclusivo pela ferramenta Tools.' : 'Gate Tools indisponível.' },
      { status: config ? 401 : 503 },
    )
  }

  if (!config) {
    return new NextResponse('Gate Tools indisponível.', { status: 503 })
  }

  const response = NextResponse.redirect(config.entryUrl)
  response.cookies.delete(ACCESS_COOKIE)
  return response
}

export async function middleware(request: NextRequest) {
  if (`${request.method} ${request.nextUrl.pathname}` === PUBLIC_CATALOG_ROUTE) {
    return NextResponse.next()
  }

  if (SERVICE_ROUTES.has(`${request.method} ${request.nextUrl.pathname}`)) {
    return NextResponse.next()
  }

  const config = getRuntimeConfig()
  if (!config) return unauthorized(request, null)

  const queryToken = request.nextUrl.searchParams.get(COURSE_TOKEN_PARAM)?.trim() ?? ''
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value ?? ''
  const token = queryToken || cookieToken
  const isValid = token
    ? await verifyToolsToken(token, request, config)
    : await verifyCanonicalSession(request, config)

  if (!isValid) return unauthorized(request, config)

  if (queryToken) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.cookies.set(ACCESS_COOKIE, queryToken, {
      httpOnly: true,
      secure: config.publicUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenMaxAge(queryToken),
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/mobile/:path*', '/api/:path*'],
}
