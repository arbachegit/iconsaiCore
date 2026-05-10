---
name: skill-supabase-secret-validation
description: Validar e setar corretamente secrets Supabase no GitHub Actions/Secrets. Distingue Project URL HTTPS de Connection String Postgres, pega service-role key sem confundir com anon/database password, e instala defesa em profundidade contra contaminação de secrets em pipeline CI.
type: backend
tags: [supabase, secrets, ci, devops, security]
---

# skill-supabase-secret-validation

## Quando aplicar

Toda vez que precisar setar GitHub Secret (ou env var de droplet) apontando pra um projeto Supabase. Em particular:

- Configurar novo app que conecta em Supabase
- Diagnosticar erro `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` em runtime
- Diagnosticar `JWSInvalidSignature` ou `JWS_NO_USER` ao tentar usar service-role
- Code review de PR que adiciona env var SUPABASE_*

## Contexto — por que essa skill existe

**Incidente 2026-05-10:** A fase 1 do Identity Hub V2 super-admin demorou 2h pra subir porque o secret `SUPABASE_SUPERADMIN_URL` foi setado com a connection string Postgres (`postgresql://postgres:6mBJcLOV...`) em vez do Project URL HTTPS (`https://rzgkwuqvhpvqmjegckih.supabase.co`). O erro chegava como `Invalid supabaseUrl` em runtime, sem diagnóstico fácil. Diagnóstico só foi possível depois de expor temporariamente o erro no JSON do response 500 (vazamento de informação).

## Os 3 endpoints diferentes que cada projeto Supabase tem

Acessível em `https://supabase.com/dashboard/project/<ref>`:

### 1. Project URL — HTTPS (Settings → API)
```
https://<ref>.supabase.co
```
**Usa em:** `@supabase/supabase-js` `createClient(url, key)` (Node.js, browser, edge functions)
**Determinístico:** sempre `https://<ref>.supabase.co` — você pode construir do project ref sem abrir o dashboard.

### 2. Connection string — Postgres (Settings → Database → Connection string)
```
postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres  (transaction pooler)
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres  (session pooler)
```
**Usa em:** `pg` (Node), `psycopg` (Python), `psql` CLI, `DATABASE_URL` em ferramentas de migration (Prisma, Drizzle).
**Não usa em:** `@supabase/supabase-js`. Confundir os dois é o bug clássico.

### 3. service_role key — JWT (Settings → API → Project API keys)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjxyZWY+Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6...
```
**Usa em:** server-side com `createClient(url, service_role_key)` — bypassa RLS.
**NUNCA** expõe pro browser. **NUNCA** confunde com a senha do banco postgres (que é diferente).

## Naming canônico de secrets/env vars

```
SUPABASE_<CONTEXT>_URL                   # Project URL HTTPS
SUPABASE_<CONTEXT>_ANON_KEY              # public anon key (RLS-protected)
SUPABASE_<CONTEXT>_SERVICE_ROLE_KEY      # bypass RLS — server only
DATABASE_<CONTEXT>_URL                    # connection string postgres (se realmente precisar)
```

Onde `<CONTEXT>` é o tenant lógico: `SCRAPING`, `SUPERADMIN`, `BRASIL_DATA_HUB`, etc.

**Variantes aceitas no ecossistema IconsAI:**
- `<CONTEXT>_SUPABASE_URL` (Identity Hub V2 super-admin usa esse — `SUPERADMIN_SUPABASE_URL`)
- `NEXT_PUBLIC_<...>_SUPABASE_URL` quando precisa estar no bundle do browser (Identity Hub V1 usa)

Seja consistente dentro de um repo. Mapeie no `docker-compose.yml` ou workflow se houver mismatch.

## Procedimento — setar um secret novo

### Pré-requisito
Tem o `<ref>` do projeto Supabase (12-letters slug em `https://supabase.com/dashboard/project/<ref>`).

### Passo 1 — confirmar URL determinística
```bash
URL="https://<ref>.supabase.co"
echo $URL
# Verifique abrindo num browser: deve dar 404 "no project found" mas o domínio resolve
```

### Passo 2 — pegar service_role key
1. Abrir `https://supabase.com/dashboard/project/<ref>/settings/api`
2. Em "Project API keys", revelar o **service_role secret** (segundo, com aviso vermelho)
3. Copiar o JWT inteiro (começa com `eyJ...`, ~400 chars)
4. **NÃO** confundir com:
   - `anon public` (primeiro, mais curto, RLS-protected)
   - Senha do postgres (em Settings → Database, é uma string aleatória curta tipo `6mBJcLOV...`)

### Passo 3 — setar no GitHub Secrets via CLI
```bash
# Via stdin (não loga o valor — preferível)
printf '%s' "$URL" | gh secret set SUPABASE_<CONTEXT>_URL --repo <org>/<repo>
printf '%s' "<service_role_jwt>" | gh secret set SUPABASE_<CONTEXT>_SERVICE_ROLE_KEY --repo <org>/<repo>

# Confirmar
gh secret list --repo <org>/<repo> | grep SUPABASE
```

### Passo 4 — defesa em profundidade no código
Toda função que cria client deve sanitizar:

```ts
function getSupabaseClient(): SupabaseClient {
  const rawUrl = process.env.SUPABASE_<CONTEXT>_URL
  const rawKey = process.env.SUPABASE_<CONTEXT>_SERVICE_ROLE_KEY
  if (!rawUrl || !rawKey) throw new Error('SUPABASE_<CONTEXT>_* env vars required')

  // Defesa: secrets de CI às vezes vêm com aspas literais ou whitespace
  const url = rawUrl.trim().replace(/^['"]|['"]$/g, '')
  const key = rawKey.trim()

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`SUPABASE_<CONTEXT>_URL inválida: precisa começar com http(s)://`)
  }

  return createClient(url, key, { auth: { persistSession: false } })
}
```

```python
# Python equivalente
from os import environ

url = environ.get("SUPABASE_CONTEXT_URL", "").strip().strip("'\"")
key = environ.get("SUPABASE_CONTEXT_SERVICE_ROLE_KEY", "").strip()
if not url.startswith(("http://", "https://")):
    raise ValueError("SUPABASE_CONTEXT_URL precisa começar com http(s)://")
```

## Diagnóstico — sintomas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` | Secret tem connection string Postgres | Resetar com Project URL HTTPS |
| `Invalid API key` | Secret tem senha do postgres ou anon key (não service_role) | Resetar com service_role JWT correto |
| Funciona local, falha em CI | Secret tem aspas literais ao invés de string limpa | `gh secret set` via stdin (sem aspas em volta) ou aplicar trim() |
| Funciona em dev, falha em prod | docker-compose não expõe env var pro container | Adicionar entry no `environment:` do serviço |
| Errado em todos ambientes | Project ref errado | Rebuilda URL: `https://<ref>.supabase.co` |

## Anti-patterns

- ❌ **Hardcodar URL** no código (`const url = 'https://abc.supabase.co'`)
- ❌ **Hardcodar service_role key** (CWE-798, blast radius máximo)
- ❌ **Logar a service_role key** mesmo em error message
- ❌ **Expor service_role key no client bundle** (qualquer var `NEXT_PUBLIC_*` é browser)
- ❌ **Misturar service_role com anon** no mesmo client (use 2 clients separados)
- ❌ **Setar URL com aspas** via UI do GitHub (`"https://..."` em vez de `https://...`)

## Defesa em profundidade

Em ordem de prioridade:

1. **Code-level sanitization** (trim + strip quotes + prefix check) — sempre que ler env vars de Supabase
2. **CI smoke test** — adicionar step que faz `curl <url>/rest/v1/?apikey=<service_role>` e espera 200, antes de aplicar deploy
3. **Health endpoint** — `/api/health` que tenta `client.from('anytable').select('').limit(1)` e expõe `db_ok: true|false`
4. **Audit log** — toda criação de client logar `console.info('[supabase] client created', { url_masked })`

## Referências

- Spec V2: `iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md`
- Memory pessoal: `~/.claude/projects/-Users-*/memory/feedback_supabase_url_vs_connection_string.md`
- CLAUDE.md global §5+§16

## Skills relacionadas

- `/skill-secrets-hygiene` — gestão geral de secrets
- `/skill-injection-defense` — defesa contra inputs maliciosos
- `/skill-superadmin-consumer-pattern` — apps consumindo cookie super-admin (não falam direto com Supabase rzgkw)
