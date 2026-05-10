---
name: skill-superadmin-consumer-pattern
description: Como apps IconsAI consomem o cookie super-admin do Identity Hub V2. Pattern canônico pra middleware + lib que valida JWT HS256 emitido pelo Scraping em /superadmin/login, sem nunca falar direto com o banco rzgkw. Aplica a qualquer app que precise gateiar acesso super-admin (xray, discovery, click, etc).
type: integracao
tags: [auth, sso, identity-hub, super-admin, jwt, middleware]
---

# skill-superadmin-consumer-pattern

## Quando aplicar

Quando um app IconsAI precisar gateiar rotas/APIs por super-admin. Em particular:

- App novo no ecossistema (qualquer subdomínio `*.iconsai.ai`)
- Migrar app existente que tinha auth super-admin própria pro fluxo canônico V2
- Code review de PR que adiciona auth no middleware de um app

## Contexto

Desde 2026-05-10, super-admin do ecossistema autentica **exclusivamente** em `https://scraping.iconsai.ai/superadmin/login` (CPF + SMS OTP via Infobip + 2FA opt-in via TOTP). O Scraping emite JWT HS256 setado em cookie `iconsai_superadmin_jwt` com `Domain=.iconsai.ai`.

**Regra rígida CLAUDE.md global §5+§16:**
- Apps consumidores **NUNCA** falam direto com o banco `rzgkwuqvhpvqmjegckih`
- Apps consumidores **NUNCA** emitem JWT super-admin próprio
- Apps consumidores **APENAS** validam o JWT recebido via cookie

Pattern de banco isolado preserva blast radius: se app é comprometido, atacante vê dados do app, não o cadastro de super-admins.

## Arquitetura

```
[Browser]
    │
    │ 1. acessa app.iconsai.ai/admin/...
    │ middleware do app: cookie iconsai_superadmin_jwt? não → redirect /login
    │
    ├──→ app.iconsai.ai/login
    │    Server Component que faz redirect:
    │    https://scraping.iconsai.ai/superadmin/login?next=https://app.iconsai.ai/admin/...
    │
    ├──→ scraping.iconsai.ai/superadmin/login
    │    User entra CPF → SMS OTP → (2FA opcional) → JWT emitido
    │    Set-Cookie: iconsai_superadmin_jwt=<JWT>; Domain=.iconsai.ai; HttpOnly; Secure
    │    window.location.href = next
    │
    └──→ app.iconsai.ai/admin/... (com cookie!)
         middleware do app: verifySuperAdminJwt(token) → libera
```

## O que copiar do xray

Reference implementation em `iconsaiXray` branch `feat/superadmin-via-scraping` (PR #2).

### 1. lib/superadmin-jwt.ts

```ts
import { jwtVerify, type JWTPayload } from 'jose'

export const SUPERADMIN_COOKIE_JWT = 'iconsai_superadmin_jwt'
const ISSUER = 'iconsai-superadmin'
const AUDIENCE = 'superadmin'
const ENCODER = new TextEncoder()

export interface SuperAdminClaims extends JWTPayload {
  sub: string
  cpf_masked: string
  phone_masked: string
  email: string | null
  name: string | null
  is_super_admin: true
  two_factor_mode: 'off' | 'totp' | 'sms_email'
}

function getSecret(): Uint8Array {
  const secret = process.env.SUPERADMIN_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SUPERADMIN_JWT_SECRET ausente ou curto demais')
  }
  return ENCODER.encode(secret)
}

export async function verifySuperAdminJwt(token: string): Promise<SuperAdminClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER, audience: AUDIENCE })
  if (typeof payload.sub !== 'string') throw new Error('superadmin jwt: missing sub')
  if (payload.is_super_admin !== true) throw new Error('superadmin jwt: missing is_super_admin claim')
  return payload as SuperAdminClaims
}
```

### 2. middleware.ts (Next.js)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminJwt, SUPERADMIN_COOKIE_JWT } from '@/lib/superadmin-jwt'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isApi = path.startsWith('/api/')

  // Públicas (passam direto): /login, /api/health, etc.
  if (isPublic(path)) return NextResponse.next()

  const token = req.cookies.get(SUPERADMIN_COOKIE_JWT)?.value
  if (token) {
    try {
      const claims = await verifySuperAdminJwt(token)
      const headers = new Headers(req.headers)
      headers.set('x-iconsai-user-id', claims.sub)
      headers.set('x-iconsai-app', '<seu-app>')
      return NextResponse.next({ request: { headers } })
    } catch {
      // JWT inválido/expirado — fall through pra redirect
    }
  }

  if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', path + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|public/).*)'] }
```

### 3. app/login/page.tsx (Server Component)

```tsx
import { redirect } from 'next/navigation'

const SCRAPING_LOGIN = 'https://scraping.iconsai.ai/superadmin/login'

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const sp = await searchParams
  const target = new URL(SCRAPING_LOGIN)
  const next = sp.next || '/admin/dashboard'
  const absoluteNext = next.startsWith('http')
    ? next
    : `https://<seu-app>.iconsai.ai${next.startsWith('/') ? '' : '/'}${next}`
  target.searchParams.set('next', absoluteNext)
  if (sp.reason) target.searchParams.set('reason', sp.reason)
  redirect(target.toString())
}
```

## Setup necessário

### GitHub Secret

```bash
# Mesmo valor que está em iconsaiScraping/SUPERADMIN_JWT_SECRET
gh secret set SUPERADMIN_JWT_SECRET --repo <org>/<seu-app> < path-to-secret
```

### Workflow de deploy

Adicionar `SUPERADMIN_JWT_SECRET` na propagação de env vars pro droplet (mesmo padrão que outras vars do projeto).

### Dependência

```bash
npm install jose
```

`jose` é a lib canônica IconsAI pra JWT HS256/EdDSA — não usar `jsonwebtoken` (lib mais antiga, sem suporte WebCrypto).

## Anti-patterns

- ❌ **Falar direto com banco rzgkw** — apenas o Scraping fala
- ❌ **Emitir JWT super-admin no app** — apenas o Scraping emite
- ❌ **Validar JWT sem issuer/audience check** — qualquer JWT HS256 valido seria aceito (impersonation)
- ❌ **Cookie domain só do app** — precisa ser `.iconsai.ai` (cross-subdomain SSO)
- ❌ **Storage do CPF/phone no app** — eles vêm mascarados no JWT (`cpf_masked`, `phone_masked`)
- ❌ **Reaproveitar cookie de user comum** (`iconsai_jwt` do Identity Hub V1 user) — canais isolados
- ❌ **Confiar no claim `is_super_admin` sem verificar JWT** — sempre `verifySuperAdminJwt()` antes

## Como testar end-to-end

1. Logar em `https://scraping.iconsai.ai/superadmin/login` com seu CPF
2. Inserir SMS OTP → cookie setado no domain `.iconsai.ai`
3. Acessar `https://<seu-app>.iconsai.ai/admin/<rota-protegida>` direto (sem passar por login)
4. Esperado: middleware lê cookie, valida JWT, libera a rota
5. Validar `getCookie('iconsai_superadmin_jwt')` no DevTools → Domain deve ser `.iconsai.ai`

## Logout

App **não** tem endpoint de logout próprio. Logout = chamar `POST https://scraping.iconsai.ai/api/superadmin/logout` (limpa cookie no domain `.iconsai.ai`).

Pattern recomendado no app:
```tsx
async function logout() {
  await fetch('https://scraping.iconsai.ai/api/superadmin/logout', {
    method: 'POST',
    credentials: 'include',
  })
  window.location.href = '/login'  // redireciona pro Scraping
}
```

## Referências

- Spec V2: `iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md` §5.3
- Reference impl: `iconsaiXray/lib/superadmin-jwt.ts` + `iconsaiXray/middleware.ts` (PR #2)
- CLAUDE.md global §5+§16

## Skills relacionadas

- `/skill-supabase-secret-validation` — setar SUPERADMIN_JWT_SECRET corretamente
- `/skill-identity-onboarding` — fluxo de signup user comum (V2 fase 2)
- `/skill-cors-headers-security` — headers de segurança em login pages
- `/skill-authz-policy-audit` — RLS continua valendo no banco mesmo com super-admin app-level
