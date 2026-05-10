---
name: skill-identity-onboarding
description: Padrão canônico do Identity Hub V2 do ecossistema IconsAI. Define como apps integram com o hub centralizado de identidade (login + signup + 2FA), separação de canais usuário comum vs super-admin, contratos de JWT/cookie, fluxo de redirect cross-app, e algoritmo de identity resolution (correlação CPF + email + telefone + IP + dim_pessoas + Idwall + Gemini). Use quando o usuário mencionar "identity hub", "onboarding", "signup", "login centralizado", "super-admin", "OTP", "2FA TOTP", "validação CPF", "redirect login", "JWT iconsai", "cookie .iconsai.ai".
version: 1.0
language: pt-BR
strict_mode: true
owner: Fernando
fase: integracao
tags: [identity, onboarding, jwt, cookie, otp, 2fa, totp, sso, super-admin, lgpd, idwall, gemini]
status: design-stage
updated: 2026-05-09
---

# SKILL — Identity Hub V2 (onboarding canônico)

> **Status:** design aprovado em 2026-05-09. Implementação em fases (ver `iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md`). Esta skill documenta os contratos que apps consumidores precisam respeitar.

---

## 0. PRINCÍPIO NUCLEAR

**Identidade é centralizada no Scraping. Apps são consumidores.** Apps NUNCA implementam OTP, signup, lookup CPF, ou validação de identidade direto. Tudo passa por endpoints `/api/identity/*` (usuário comum) e `/api/superadmin/*` (super-admin) hospedados em `iconsaiScraping`.

Apps gateiam acesso lendo cookies httpOnly de Domain=.iconsai.ai e validando JWTs locais (zero round-trip por request).

---

## 1. DOIS CANAIS, BANCOS SEPARADOS

| | Usuário comum | Super-admin |
|---|---|---|
| Banco Supabase | Scraping `redivrmeajmktenwshmn` | iconsai-superadmin `rzgkwuqvhpvqmjegckih` |
| Tabela cadastro | `public.users` (Scraping) | `public.super_admins` (rzgkw) |
| Cookie | `iconsai_jwt` | `iconsai_superadmin_jwt` |
| Refresh cookie | `iconsai_refresh` | `iconsai_superadmin_refresh` |
| JWT issuer | `iconsai-identity` | `iconsai-superadmin` |
| JWT audience | app-slug ou `iconsai` | `superadmin` |
| Domain cookie | `.iconsai.ai` (SSO cross-app) | `.iconsai.ai` (SSO cross-app) |
| Login first factor | CPF + SMS OTP (Infobip) | CPF + SMS OTP (Infobip) |
| 2FA opt-in | TOTP (otplib) ou email OTP (Resend) | TOTP (otplib) ou email OTP (Resend) |
| Privilégio | controlado por `app_grants` + permissions | `is_super_admin: true` libera tudo na aplicação |

**Regra rígida (CLAUDE.md global §5+§16):** super-admin NUNCA autentica via Identity Hub do Scraping. Canais isolados.

---

## 2. CONTRATO DE GATEAMENTO EM APPS

Middleware do app deve seguir esta ordem:

```typescript
// pseudo-código
async function middleware(req) {
  const path = req.url.pathname

  // Rotas públicas (login, health, webhooks com secret próprio)
  if (isPublic(path)) return next()

  // 1) Tenta cookie super-admin primeiro (privilégio máximo)
  const superToken = req.cookies.get('iconsai_superadmin_jwt')
  if (superToken) {
    const claims = await verifyJwt(superToken, 'superadmin')
    if (claims?.is_super_admin === true) {
      injectHeaders(req, { 
        'x-iconsai-user-id': claims.sub,
        'x-iconsai-app': appSlug,
        'x-iconsai-is-super-admin': 'true',
      })
      return next()
    }
  }

  // 2) Tenta cookie usuário comum
  const userToken = req.cookies.get('iconsai_jwt')
  if (userToken) {
    const claims = await verifyJwt(userToken, appSlug)
    if (claims?.apps?.includes(appSlug)) {
      injectHeaders(req, {
        'x-iconsai-user-id': claims.sub,
        'x-iconsai-email': claims.email,
        'x-iconsai-app': appSlug,
        'x-iconsai-perms': claims.permissions[appSlug]?.join(','),
      })
      return next()
    }
  }

  // 3) Sem auth → redirect login
  if (path.startsWith('/api/')) {
    return json({ error: 'unauthorized' }, 401)
  }
  return redirect(`https://scraping.iconsai.ai/identity/login?next=${absoluteUrl(req)}`)
}
```

**App deve consumir, nunca emitir JWTs próprios. Nunca reaproveitar claims de Identity Hub para super-admin.** Se super-admin precisa privilégio especial, leia `is_super_admin` no claim — não tente derivar de outras fontes.

---

## 3. JWT SHAPE (canônico)

### 3.1 Usuário comum

```json
{
  "iss": "iconsai-identity",
  "aud": "xray",
  "sub": 42,
  "email": "fernando@example.com",
  "name": "Fernando Arbache",
  "phone_e164": "+5511999999999",
  "dim_pessoa_id": "uuid-...",
  "dim_empresa_id": "uuid-...",
  "apps": ["xray", "discovery", "tools"],
  "permissions": {
    "xray": ["admin"],
    "discovery": ["read"]
  },
  "two_factor_mode": "totp",
  "iat": 1715287200,
  "exp": 1715288100
}
```

### 3.2 Super-admin

```json
{
  "iss": "iconsai-superadmin",
  "aud": "superadmin",
  "sub": "uuid-...",
  "cpf_masked": "***.456.789-**",
  "phone_masked": "+55 11 *9999",
  "email": "fernando@example.com",
  "name": "Fernando Arbache",
  "is_super_admin": true,
  "two_factor_mode": "totp",
  "iat": 1715287200,
  "exp": 1715288100
}
```

**Validação obrigatória em apps:** `iss` esperado, `aud` esperado, `exp` futuro, assinatura HS256 com secret do hub. Use lib `jose` (já presente nos apps).

---

## 4. REDIRECT PROTOCOL

Apps que precisam autenticar usuário não-logado mandam pra hub via redirect:

### Login usuário
```
window.location = `https://scraping.iconsai.ai/identity/login?next=${encodeURIComponent(currentUrl)}`
```

### Signup usuário
```
window.location = `https://scraping.iconsai.ai/identity/onboard?next=${encodeURIComponent(currentUrl)}&empresa=${empresaSlug}`
```

`empresa` é opcional; usado pelo xray para passar contexto de empresa-tenant ao hub (ativa fluxo §5.5 do design doc — sócio detection via `fato_qsa`).

### Login super-admin
```
window.location = `https://scraping.iconsai.ai/superadmin/login?next=${encodeURIComponent(currentUrl)}`
```

Após sucesso, hub redireciona pra `next` com cookies já setados (Domain=.iconsai.ai). App detecta cookie no próximo request e libera.

---

## 5. ENDPOINTS HOSTED NO SCRAPING

Lista resumida (detalhe completo em IDENTITY_HUB_V2_DESIGN.md §10):

### Usuário comum
- `POST /api/identity/onboard/start` — email+phone OTP
- `POST /api/identity/onboard/verify` — confirma OTPs
- `POST /api/identity/onboard/resolve` — CPF + identity resolution
- `POST /api/identity/onboard/confirm` — usuário escolhe candidato
- `POST /api/identity/onboard/idwall-validate` — fallback Idwall
- `POST /api/identity/onboard/queue-review` — fallback fila manual
- `POST /api/identity/login/start` `{cpf}` → SMS
- `POST /api/identity/login/verify` `{cpf, sms_code, email_code?, totp_code?}` → JWT
- `GET  /api/identity/me`
- `POST /api/identity/logout`
- `POST /api/identity/2fa/totp/setup` `setup → verify-enable`
- `POST /api/identity/2fa/dual/enable` (SMS+email mode)
- `POST /api/identity/2fa/disable`

### Super-admin
- `POST /api/superadmin/login/start` `{cpf}` → SMS via rzgkw
- `POST /api/superadmin/login/verify` → cookie super-admin
- `GET  /api/superadmin/me`
- `POST /api/superadmin/logout`
- `POST /api/superadmin/2fa/*` (idem usuário)
- `GET  /api/superadmin/admin/reviews` — fila manual review
- `POST /api/superadmin/admin/reviews/{id}/decide`

---

## 6. ALGORITMO DE IDENTITY RESOLUTION (resumo)

Sinais (peso entre parênteses):
- CPF exato em `dim_pessoas.cpf` (+50)
- CPF parcial — últimos 4 dígitos (+20)
- Email exato (+20)
- Telefone normalizado (+20)
- UF do IP bate (+5)
- Sócio em `fato_qsa` da empresa-context (+30)
- Idwall confirma CPF+nome (+50)
- Gemini confirma associação email/phone↔nome+empresa (+25)
- PEP-positive (-20, força fila manual)
- `media_negativa_count > 5` (-10)

Decisão tier:
- Score ≥ 80 → auto-confirm
- Score 50-79 → cards UI mascarados
- Idwall valida (CPF não em dim_pessoas) → auto-create dim_pessoa
- PEP-positive ou Idwall erro → fila manual
- Score < 30 → reject hard

Mascaramento LGPD nos cards: iniciais + cidade + empresa principal + razões. Nunca nome completo, nunca CPF completo, nunca endereço street-level.

---

## 7. INTEGRAÇÕES (depend skills)

| Provider | Função | Skill canônica |
|---|---|---|
| Infobip | SMS OTP | `/skill-infobip-sms` |
| Resend | Email OTP + transacional | (template env+wrapper) |
| Idwall | Validação CPF+nome | `/skill-cpf-validation` |
| Gemini | Identity research (web search) | (em design) |
| otplib | TOTP (Google Authenticator) | (lib pura, sem skill dedicada) |
| ipapi.co / IPinfo | GeoIP do request | (env: `IPAPI_KEY`) |

---

## 8. REGRAS DURAS (não-negociáveis)

1. **Nunca apps emitem JWT próprio**. Só consomem.
2. **Nunca apps fazem OTP direto** (signInWithOtp client-side, etc). Tudo via Scraping.
3. **Cookie httpOnly + Secure + SameSite=Lax + Domain=.iconsai.ai** — não relaxar.
4. **Verificar JWT a cada request** (verify locally com `jose`, não trust cego).
5. **Mascaramento LGPD obrigatório** em qualquer lista que exponha pessoas potenciais (candidatos onboarding, fila admin, etc).
6. **Audit irrevogável** em `cpf_validations`, `identity_onboarding_attempts`, `identity_pending_reviews` — nunca delete.
7. **Rate-limit** por IP (5/h start) e por CPF hash (3/dia resolve).
8. **PEP-positive força manual review** mesmo com Idwall match.
9. **Super-admin NUNCA via Identity Hub do Scraping** — sempre via rzgkw.
10. **2FA = TOTP ou email** (nunca SMS+SMS).

---

## 9. ARQUIVOS

- `SKILL.md` — este documento (canon)
- `skill.yaml` — metadados pra registry
- `contracts/jwt-shape.md` — exemplos de claims (TODO)
- `contracts/cookie-spec.md` — atributos detalhados (TODO)
- `examples/middleware-snippet.ts` — código de exemplo do dual middleware (TODO)
- `examples/redirect-pattern.ts` — patterns de redirect cross-app (TODO)

---

## 10. DOCUMENTOS RELACIONADOS

- **Spec viva V2:** [`iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md`](../../iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md) — fonte de verdade
- **V1 (atual em produção):** [`iconsaiScraping/docs/IDENTITY_HUB_ARCHITECTURE.md`](../../iconsaiScraping/docs/IDENTITY_HUB_ARCHITECTURE.md)
- **CLAUDE.md global** — §5 (Identity Hub), §16 (Proibições absolutas)
- **Skills relacionadas:** `/skill-infobip-sms`, `/skill-cpf-validation`, `/skill-llm-prompt-safety`, `/skill-lgpd-pii-mapper`, `/skill-authz-policy-audit`

---

## 11. CHANGELOG

- **1.0 (2026-05-09)** — scaffold inicial. Documenta design V2 aprovado. Implementação por fases conforme spec.
