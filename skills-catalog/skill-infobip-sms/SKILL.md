---
name: skill-infobip-sms
description: Padrão canônico de envio de SMS no ecossistema IconsAI via Infobip. Define vars de ambiente globais (mesma conta Infobip em todos os apps), wrapper Node.js com retry/backoff, rate-limit por telefone E.164, templates de mensagem versionados, logging em messaging_logs, e política de aprovação de templates por país. Use quando o usuário mencionar "enviar SMS", "Infobip", "OTP por SMS", "código de verificação SMS", "notificação SMS".
version: 1.0
language: pt-BR
strict_mode: true
owner: Fernando
fase: integracao
tags: [sms, infobip, otp, messaging, integration, rate-limit]
status: design-stage
updated: 2026-05-09
---

# SKILL — Infobip SMS (canônico do ecossistema)

> **Status:** scaffold em 2026-05-09. Wrapper de implementação a ser extraído do `iconsaiDiscovery/lib/identity/sms-infobip.ts` quando a implementação for migrada para o `iconsaiScraping`.

---

## 0. PRINCÍPIO

**Uma única conta Infobip serve todo o ecossistema IconsAI.** Nenhum app contrata ou configura provider de SMS próprio. Vars são globais, custos são consolidados, templates são compartilhados.

A integração canônica vive no `iconsaiScraping` (Identity Hub V2). Outros apps que precisam mandar SMS (notificações, alertas, etc) podem:
1. **Preferencial**: chamar endpoint do Scraping que dispara o SMS (ex: `POST /api/messaging/sms`)
2. **Alternativa**: usar wrapper local `lib/infobip.ts` com as vars globais (legacy, quando Scraping não tem endpoint adequado)

---

## 1. VARS GLOBAIS

```bash
INFOBIP_API_KEY=...                # secret
INFOBIP_BASE_URL=...api.infobip.com # account-specific
INFOBIP_SENDER=IconsAI              # alphanumeric ou número (varia por país)
```

**Provisionamento:**
- GitHub repo variables/secrets em todos os apps que consomem
- `.env.local` (dev) e `.env.production` (droplet) em cada app
- Sincronizado via `/skill-sync-master`

**Origem das credenciais:** conta Infobip já contratada e em uso pelo `iconsaiDiscovery` desde 2026. Mesma conta promovida a global em 2026-05-09.

---

## 2. WRAPPER CANÔNICO (template `lib/infobip.ts`)

```typescript
// Pseudo-código, a ser materializado no iconsaiScraping
import { z } from 'zod'

const SendSmsInput = z.object({
  to: z.string().regex(/^\+\d{10,15}$/),  // E.164
  text: z.string().min(1).max(160),       // 1 SMS = 160 chars (limite do Infobip)
  reference: z.string().optional(),        // pra rastreamento em messaging_logs
  ttl_minutes: z.number().int().min(1).max(60).default(10),
})

export async function sendSms(input: z.infer<typeof SendSmsInput>) {
  const { to, text, reference, ttl_minutes } = SendSmsInput.parse(input)

  // Rate-limit local: 3 SMS por phone por hora (consultar messaging_logs)
  const sentRecently = await db.query(
    `select count(*) from public.messaging_logs 
     where channel = 'sms' and recipient = $1 
       and created_at > now() - interval '1 hour' 
       and outcome = 'sent'`,
    [to]
  )
  if (sentRecently >= 3) {
    throw new RateLimitError(`SMS rate limit excedido para ${to}`)
  }

  // Chamada Infobip com retry exponential (4s, 8s)
  let lastErr: any
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            from: process.env.INFOBIP_SENDER,
            destinations: [{ to }],
            text,
            validityPeriod: ttl_minutes,
            validityPeriodTimeUnit: 'MINUTES',
          }]
        }),
        signal: AbortSignal.timeout(10_000),
      })
      
      if (!res.ok) throw new Error(`Infobip ${res.status}`)
      const body = await res.json()
      
      await db.query(
        `insert into public.messaging_logs 
         (channel, recipient, payload, infobip_message_id, reference, outcome) 
         values ('sms', $1, $2, $3, $4, 'sent')`,
        [to, JSON.stringify({ text, ttl_minutes }), body.messages[0].messageId, reference]
      )
      return { ok: true, message_id: body.messages[0].messageId }
    } catch (err) {
      lastErr = err
      if (attempt < 2) await sleep(2 ** (attempt + 2) * 1000)  // 4s, 8s
    }
  }
  
  await db.query(
    `insert into public.messaging_logs 
     (channel, recipient, payload, reference, outcome, error) 
     values ('sms', $1, $2, $3, 'failed', $4)`,
    [to, JSON.stringify({ text }), reference, String(lastErr)]
  )
  throw lastErr
}
```

---

## 3. RATE-LIMITS

| Escopo | Limite | Janela |
|---|---|---|
| Por phone E.164 | 3 SMS | 1 hora |
| Por IP de origem (quando aplicável) | 10 SMS | 1 hora |
| Por conta Infobip | conforme plano | — |

Excedeu → throw `RateLimitError` (tratar com backoff em UI: "Aguarde X minutos").

---

## 4. TEMPLATES DE MENSAGEM (versionados)

Templates ficam em `templates/` desta skill. Cada template:
- ID único (ex: `otp-login-pt-br`)
- Idioma + país
- Texto com placeholders (ex: `{{code}}`, `{{app_name}}`)
- Approval status (Brasil aceita SMS livre; alguns países exigem aprovação prévia da operadora)

**Padrão pra OTP:**
```
{{code}} é seu código IconsAI. Não compartilhe. Expira em {{ttl}} min.
```
- Sem links (operadoras filtram)
- Código no início (autopreenchimento iOS/Android)
- Sem emojis (varia compatibilidade)

**Padrão pra notificação:**
```
IconsAI: {{message}}. Acesse {{short_url}}
```

---

## 5. LOGGING (tabela `public.messaging_logs`)

Cada send/erro grava em `public.messaging_logs`:
- `channel` ('sms' | 'email')
- `recipient` (E.164 pra SMS, email pra email)
- `payload` (JSONB — texto + metadados)
- `infobip_message_id` (pra correlation com webhook de delivery)
- `reference` (string pra rastreamento app-side)
- `outcome` ('sent' | 'failed' | 'delivered' | 'rejected')
- `error` (string se outcome=failed)
- `created_at`, `updated_at`

**Webhook de delivery (Infobip → Scraping):** atualiza `outcome` quando operadora confirma.

---

## 6. APPS QUE CONSOMEM

| App | Uso | Status |
|---|---|---|
| iconsaiDiscovery | OTP login, notificações | em produção (legacy, vai migrar pra chamar Scraping) |
| iconsaiScraping (Identity Hub V2) | OTP signup/login (usuário e super-admin) | em design |
| iconsaiXray | OTP via Identity Hub (não direto) | consumer indireto |
| Outros | sob demanda | — |

---

## 7. REGRAS DURAS

1. **Vars globais sempre.** Nenhum app tem conta Infobip separada.
2. **Wrapper sempre com retry+log.** Não chamar Infobip direto sem passar pelo wrapper.
3. **Rate-limit por phone obrigatório.** Anti-flood é compliance + custo.
4. **Templates aprovados.** SMS livre pra Brasil; outros países precisam aprovação Infobip.
5. **Texto < 160 chars.** Mais que isso vira concatenated SMS (custo 2x ou 3x).
6. **Sem PII no log do Infobip.** Texto é OK; CPF/cartão jamais.
7. **TTL alinhado com OTP.** Padrão 10min; nunca > 1h.

---

## 8. ARQUIVOS

- `SKILL.md` — este documento
- `skill.yaml` — metadados
- `templates/` — templates versionados de mensagem (TODO popular)

---

## 9. DOCUMENTOS RELACIONADOS

- **Identity Hub V2:** [`iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md`](../../iconsaiScraping/docs/IDENTITY_HUB_V2_DESIGN.md) §7.1
- **Skills relacionadas:** `/skill-identity-onboarding`, `/skill-cpf-validation`
- **CLAUDE.md global** §5 (Identity Hub) + §16 (Proibições — SMS via Infobip obrigatório)
- **Docs Infobip:** [https://www.infobip.com/docs/api/channels/sms](https://www.infobip.com/docs/api/channels/sms)

---

## 10. CHANGELOG

- **1.0 (2026-05-09)** — scaffold inicial. Wrapper de implementação será extraído do iconsaiDiscovery quando a implementação canônica migrar pro iconsaiScraping (fase 0 do Identity Hub V2).
