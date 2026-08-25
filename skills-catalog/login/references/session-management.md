# Gestão canônica da sessão

## Invariantes

- Autoridade: banco canônico da classe de identidade.
- Portador: segredo opaco de 32 bytes; somente SHA-256 persistido.
- Navegador: Bearer apenas em memória do documento, `credentials: "omit"`.
- Prazo: `expires_at` server-side; contagem local apenas projeta esse instante e o relê no máximo a cada 60 segundos.
- Encerramento antecipado: somente logout explícito ou revogação administrativa auditada.
- Reload/hard reload: não altera `revoked_at`, `expires_at` ou `last_seen_at` para trás.
- Retomada: OTP faz rotação atômica de `token_hash` na mesma sessão e preserva o prazo.

## Estado no banco

Cada sessão precisa de `id`, autoridade/ator, `token_hash`, `created_at`,
`expires_at`, `revoked_at`, `last_seen_at` e metadados de auditoria. A preferência do
gestor precisa de `session_hours_enabled` e `session_hours` no cadastro canônico. Para
superadmin, esse cadastro é `public.super_admins` no projeto
`rzgkwuqvhpvqmjegckih`; sua gestão é exposta por
`https://superadmin.iconsai.ai/admins`.

O toggle nunca encurta uma sessão ativa. Desligar volta a preferência futura ao prazo
padrão; ligar ou alterar horas pode estender a sessão somente por endpoint server-side
auditado. A resposta sempre devolve o `expires_at` efetivo.

## Máquina de continuidade

`ACTIVE_MEMORY -> RELOAD_WITHOUT_BEARER -> REBIND_REQUIRED -> OTP_VERIFIED -> ACTIVE_MEMORY`

- `RELOAD_WITHOUT_BEARER` não é logout e não cria outra sessão.
- `REBIND_REQUIRED` renderiza a mesma porta CPF/CNPJ → CANAIS → OTP.
- `OTP_VERIFIED` troca o hash do portador atomicamente e preserva o identificador e o prazo.
- Bearer anterior deixa de funcionar no mesmo commit de banco.
- Falha de rede mantém a sessão no banco e permite repetir o rebind enquanto houver prazo.

## Contratos HTTP

- `GET /api/session/status`: com Bearer, retorna sessão e `expires_at`; sem Bearer,
  responde `401 rebind_required`, nunca revoga.
- `POST /api/session/preference`: grava toggle/horas após Zod e devolve preferência e
  prazo efetivo.
- `POST /api/session/rebind`: consome o desafio OTP e gira o token na mesma sessão.
- `POST /api/logout`: único caminho comum que grava `revoked_at` antes do prazo.
- Todas usam `Cache-Control: no-store`; chamadas do navegador usam
  `credentials: "omit"`.

## Harness comportamental obrigatório

1. Login válido cria uma linha e abre conteúdo.
2. Reload e hard reload perdem apenas o Bearer em memória; a linha continua ativa e o
   prazo fica bit a bit igual.
3. Rebind OTP devolve Bearer diferente, mantém `session_id`/`expires_at` e invalida o anterior.
4. Toggle e horas persistem no cadastro canônico e sobrevivem a outro processo do servidor.
5. Desligar ou reduzir a preferência não reduz a sessão corrente.
6. Um milissegundo antes de `expires_at` a sessão continua válida; em/apos `expires_at`
   expira. Não usar arredondamento que encerre cedo.
7. Logout explícito revoga imediatamente.
8. Cookie, storage, worker, URL, cache e credenciais implícitas fazem o gate ficar vermelho.
9. O fluxo de superadmin consulta `public.super_admins` e a gestão `/admins`; nunca
   aceita `public.users`, banco de app ou service-role como bypass.
10. Playwright executa Chromium e Firefox em desktop, tablet e mobile, duas matrizes
    verdes consecutivas, sem skip.

## Eventos append-only

Registrar `session_granted`, `session_rebind_required`,
`session_rebound_after_reload`, `session_preference_changed`, `browser_reload`,
`hard_reload`, `session_logout`, `session_expired` e `session_revoked_by_admin` com
`actor_sub`, `session_id`, `action`, `target`, `route`, `metadata` e `created_at`.
Falha do log de acidente não bloqueia a UI; decisão de autenticação e mutação da sessão
continuam transacionais.
