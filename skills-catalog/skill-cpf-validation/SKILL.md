---
name: skill-cpf-validation
description: Padrão canônico de validação de CPF + nome no ecossistema IconsAI. Define camadas de validação (mod-11 sanity → Gemini pré-filtro → Idwall canônico), hardening anti-fraude (CPF de outra pessoa, enumeração brute-force), audit em public.cpf_validations, mascaramento LGPD, controle de custo. Use quando o usuário mencionar "validar CPF", "Idwall", "verificar identidade", "anti-fraude CPF", "datavalid", "consulta receita federal", "CPF + nome".
version: 1.0
language: pt-BR
strict_mode: true
owner: Fernando
fase: integracao
tags: [cpf, identity, validation, idwall, gemini, fraud, lgpd, audit]
status: design-stage
updated: 2026-05-09
---

# SKILL — CPF Validation (Idwall canônico)

> **Status:** scaffold em 2026-05-09. Implementação aguarda credenciais Idwall sandbox (~1-3 dias úteis após cadastro empresa em idwall.co).

---

## 0. PRINCÍPIO

**Validação de identidade humana via CPF+nome é compliance crítica.** No ecossistema IconsAI:
- **Não validamos por scraping da Receita Federal** (frágil + LGPD risk)
- **Não confiamos em mod-11 sozinho** (só confirma formato matemático, não titular)
- **Validamos via provider licenciado** (Idwall) que consulta SERPRO/Datavalid oficialmente

A validação é necessária no **signup novo** (Identity Hub V2) quando user fornece CPF que não bate com nenhum registro existente em `public.dim_pessoas`. Sem validação, qualquer um cria conta com CPF alheio (vetor de fraude trivial).

---

## 1. PIPELINE DE 3 CAMADAS

```
[User entra CPF + nome auto-declarado + (opcional) data nascimento]
        │
        ▼
[1] Mod-11 checksum (grátis, instantâneo)
   └─ inválido → reject "CPF inválido"
        │ válido
        ▼
[2] Lookup local em public.dim_pessoas WHERE cpf = $1
   └─ hit com nome similar (>80% Levenshtein) → MATCH (sem chamar provider)
        │ no hit ou nome divergente
        ▼
[3] Gemini pré-filtro (cost ~R$0.001, cache 90d)
   └─ "Existe correspondência pública entre CPF terminado em XXX 
       e nome '[nome]' em [cidade do IP]?"
   └─ resultado "claramente não" → reject (poupa Idwall)
        │ "talvez" ou "sim"
        ▼
[4] Idwall (cost ~R$0,30, cache 30d)
   POST /v3/validacoes/dados-pf { cpf, nome, nascimento? }
   ←  { cpf_match, nome_match, nascimento_match }
        │
        ├── nome_match=true → MATCH (auto-create dim_pessoa)
        ├── nome_match=false → REJEITA hard + alerta admin
        └── erro/timeout → fila manual review
```

**Decisão final retorna:**
- `match` (com `dim_pessoa_id` se já existia, ou `created=true` se foi auto-criado)
- `reject_invalid_format`
- `reject_no_match` (Idwall confirma CPF+nome divergem)
- `pending_review` (fila manual)

---

## 2. VARS

```bash
IDWALL_API_KEY=...          # secret
IDWALL_BASE_URL=https://api-v3.idwall.co  # ou sandbox URL
IDWALL_ENV=sandbox|prod
GEMINI_API_KEY=...          # já provisionado (skill compartilhada)
```

---

## 3. WRAPPER CANÔNICO (template `lib/idwall.ts`)

```typescript
// Pseudo-código, a materializar no iconsaiScraping
import { z } from 'zod'

const ValidateCpfInput = z.object({
  cpf: z.string().regex(/^\d{11}$/),  // 11 dígitos, sem máscara
  nome: z.string().min(3),
  nascimento: z.date().optional(),
  ip: z.string().optional(),
  user_id: z.number().int().optional(),
})

const ValidateCpfOutput = z.object({
  outcome: z.enum(['match','no_match','invalid_format','rate_limited','error']),
  cpf_match: z.boolean().optional(),
  nome_match: z.boolean().optional(),
  nascimento_match: z.boolean().optional(),
  cost_brl: z.number(),
  source: z.enum(['cache','idwall','gemini','dim_pessoas','mod11']),
})

export async function validateCpf(input: z.infer<typeof ValidateCpfInput>): Promise<z.infer<typeof ValidateCpfOutput>> {
  const { cpf, nome, nascimento, ip, user_id } = ValidateCpfInput.parse(input)
  const cpfHash = sha256(cpf)

  // Camada 1: mod-11
  if (!isCpfValidMod11(cpf)) {
    await logValidation({ cpfHash, outcome: 'invalid_format', source: 'mod11', cost_brl: 0 })
    return { outcome: 'invalid_format', cost_brl: 0, source: 'mod11' }
  }

  // Camada 2: cache em cpf_validations (30d Idwall, 90d Gemini)
  const cached = await db.query(
    `select outcome, cpf_match, nome_match, nascimento_match, source 
     from public.cpf_validations 
     where cpf_hash = $1 
       and source in ('idwall','dim_pessoas') 
       and created_at > now() - interval '30 days'
       and outcome = 'match'
     order by created_at desc limit 1`,
    [cpfHash]
  )
  if (cached) {
    return { ...cached, cost_brl: 0 }
  }

  // Camada 3: lookup dim_pessoas
  const dimMatch = await db.query(
    `select id, nome_completo from public.dim_pessoas 
     where regexp_replace(coalesce(cpf,''),'\\D','','g') = $1`,
    [cpf]
  )
  if (dimMatch && nameSimilarity(dimMatch.nome_completo, nome) > 0.85) {
    await logValidation({ cpfHash, outcome: 'match', source: 'dim_pessoas', resolved_dim_pessoa_id: dimMatch.id, cost_brl: 0 })
    return { outcome: 'match', cpf_match: true, nome_match: true, source: 'dim_pessoas', cost_brl: 0 }
  }

  // Camada 4: Gemini pré-filtro (só se não veio do dim)
  const gem = await geminiPreFilter({ cpf_last4: cpf.slice(-4), nome, ip })
  if (gem.confidence === 'no') {
    await logValidation({ cpfHash, outcome: 'no_match', source: 'gemini', cost_brl: gem.cost })
    return { outcome: 'no_match', source: 'gemini', cost_brl: gem.cost }
  }

  // Camada 5: Idwall
  try {
    const idw = await callIdwall({ cpf, nome, nascimento })
    await logValidation({ cpfHash, ...idw, source: 'idwall', cost_brl: idw.cost_brl })
    return { ...idw, source: 'idwall' }
  } catch (err) {
    await logValidation({ cpfHash, outcome: 'error', source: 'idwall', cost_brl: 0, outcome_detail: { error: String(err) } })
    return { outcome: 'error', source: 'idwall', cost_brl: 0 }  // caller decide se vai pra fila manual
  }
}
```

---

## 4. HARDENING ANTI-FRAUDE

### Rate-limits (por tabela `cpf_validations`)
| Escopo | Limite | Janela |
|---|---|---|
| Por `cpf_hash` | 3 tentativas | 24h |
| Por `ip` | 5 tentativas | 1h |
| Por `cpf_hash` falhando 3x | lock | 24h + alerta admin |

### Vetores de fraude e mitigação
| Vetor | Mitigação |
|---|---|
| Pessoa A com CPF de pessoa B + nome aleatório | Idwall rejeita (nome_match=false) |
| Pessoa A com CPF próprio + phone/email de outro | OTP duplo precede /resolve (precisa controlar email + phone) |
| Bot enumera CPFs aleatórios | Rate-limit por IP + Captcha (hCaptcha) após 2 tentativas |
| Pessoa real com nome incompleto | Idwall fuzzy match (tolerancia=0.8); se falhar, retry com "use nome completo" |
| CPF+nome corretos mas pessoa inativa/falecida | `pep_status` ou `media_negativa_count` em `dim_pessoas` força fila |

---

## 5. AUDIT (`public.cpf_validations`)

Schema (criar via migration fase 0):
```sql
create table public.cpf_validations (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text not null,
  nome_informado text,
  nascimento_informado date,
  ip inet,
  user_agent text,
  source text not null,           -- 'idwall','gemini','dim_pessoas','mod11'
  outcome text not null,           -- 'match','no_match','invalid_format','rate_limited','error'
  outcome_detail jsonb,            -- response cru do provider
  cost_brl numeric(10,4),
  resolved_dim_pessoa_id uuid references public.dim_pessoas(id),
  user_id integer references public.users(id),
  created_at timestamptz default now()
);
create index ix_cpf_validations_cpf_hash on public.cpf_validations (cpf_hash, created_at desc);
create index ix_cpf_validations_ip on public.cpf_validations (ip, created_at desc);
```

**Audit irrevogável**: nunca delete. Permite forense pós-incidente + controle de custo.

---

## 6. CUSTOS ESPERADOS

| Cenário | Cost por validação | A 100 onboardings/mês |
|---|---|---|
| Cache hit | R$ 0,00 | R$ 0 |
| dim_pessoas hit | R$ 0,00 | R$ 0 |
| Gemini "no" sem Idwall | ~R$ 0,001 | ~R$ 0,10 |
| Gemini "talvez" + Idwall | ~R$ 0,30 + R$ 0,001 | ~R$ 30 |
| Idwall (sem Gemini) | ~R$ 0,30 | ~R$ 30 |
| **Total estimado** (mix realista, ~50% precisa Idwall) | **~R$ 0,15-0,20** médio | **~R$ 15-20/mês** |

Linear até 10k onboardings/mês (~R$ 1.500-2.000/mês).

---

## 7. LGPD

- **Cpf nunca em log textual** — sempre `cpf_hash` (sha256 dos 11 dígitos).
- **Nome informado** fica em `nome_informado` (audit), mas SEM índice (não é campo de busca).
- **Dados Idwall (response)** ficam em `outcome_detail` jsonb por 12 meses (aderente a regulação SERPRO).
- **Direito ao esquecimento**: API permite anonimizar `nome_informado`, mantendo `cpf_hash` (necessário pra rate-limit).
- **DPA com Idwall**: contrato assinado durante cadastro empresa.
- **DPA com Google (Gemini)**: pré-requisito antes de ativar camada Gemini.

---

## 8. APPS QUE CONSOMEM

| App | Uso |
|---|---|
| iconsaiScraping (Identity Hub V2 `/api/identity/onboard/*`) | Validação primária no signup |
| iconsaiScraping (super-admin signup) | Cadastro de novo super-admin (raro) |
| Outros apps | Via endpoint do Scraping (`POST /api/identity/cpf/validate`); nunca chamar Idwall direto |

---

## 9. REGRAS DURAS

1. **Validação CPF+nome canônica = Idwall.** Nunca scraping de RF, nunca Datavalid direto, nunca outros providers sem aprovação.
2. **Pipeline 3 camadas obrigatório.** Mod-11 → cache → dim_pessoas → Gemini → Idwall. Pular camadas é desperdício de custo + risco anti-fraude.
3. **Audit em `cpf_validations` sempre.** Cada chamada loga, mesmo cache hit.
4. **Rate-limit por cpf_hash e IP.** Anti-enumeração.
5. **PEP-positive força fila manual** mesmo com Idwall match.
6. **Sem CPF cleartext em logs.** `cpf_hash` sempre.
7. **Skill é o gateway.** Apps consomem via endpoint do Scraping; nunca importam `lib/idwall.ts` localmente.

---

## 10. ARQUIVOS

- `SKILL.md` — este documento
- `skill.yaml` — metadados
- `contracts/idwall-response-shape.md` — schema do response Idwall (TODO)

---

## 11. DOCUMENTOS RELACIONADOS

- **Identity Hub V2:** [`iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md`](../../iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md) §7.3 + §11
- **Skills relacionadas:** `/skill-identity-onboarding`, `/skill-infobip-sms`, `/skill-lgpd-pii-mapper`, `/skill-llm-prompt-safety`
- **CLAUDE.md global** §5 (Identity Hub) + §16 (Proibições — validação CPF via Idwall obrigatório)
- **Docs Idwall:** [https://docs.idwall.co](https://docs.idwall.co)

---

## 12. CHANGELOG

- **1.0 (2026-05-09)** — scaffold inicial. Implementação aguarda credenciais sandbox.
