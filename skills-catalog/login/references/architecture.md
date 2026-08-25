# Arquitetura canônica

## Fonte de verdade

O Fiscal é o processo correto. O Rotas é o processo errado porque manteve autenticação e emissão de sessão no banco do próprio aplicativo. A implantação canônica não copia código por aparência: reproduz o contrato abaixo e mede cada fronteira.

## Máquinas de estados

### Multiempresa

`organization -> identity -> channel -> otp -> content`

- `organization`: recebe CNPJ normalizado e resolve uma empresa ativa.
- `identity`: recebe CPF normalizado e resolve o vínculo da pessoa dentro da empresa.
- `channel`: devolve somente canais mascarados e disponíveis.
- `otp`: recebe um desafio opaco e código de uso único.
- `content`: exige a sessão canônica válida para a classe de identidade.

### Direta

`identity -> channel -> otp -> content`

Omitir `organization` é a única diferença permitida.

## Bancos e fronteiras

- Usuário comum: Identity Hub no Scraping `redivrmeajmktenwshmn`.
- Superadmin: mini break-glass exclusivo `rzgkwuqvhpvqmjegckih`.
- O mesmo fluxo visual não significa misturar identidades ou sessões.
- Cliente `service_role`: somente em route handler/server module.
- Frontend: renderiza estado, captura input e chama API; não consulta Supabase.
- Entrada: Zod no Node; strings sanitizadas; CPF/CNPJ normalizados server-side.
- OTP: hash no banco, TTL explícito, limite de tentativas, consumo atômico e rate limit.
- Canal: SMS por Infobip como primeiro fator obrigatório do superadmin. E-mail via Resend ou TOTP só pode ser segundo fator opt-in. Usuário comum segue os canais liberados pelo Identity Hub.
- Sessão de usuário comum: segredo opaco aleatório emitido exclusivamente pelo Identity Hub; somente o hash fica no banco.
- Sessão de superadmin: segredo opaco aleatório emitido pelo break-glass; somente o hash fica na sessão revogável do banco dedicado.
- Transporte: `Authorization: Bearer <segredo>` mantido somente em memória volátil do documento. Cada chamada confirma a sessão no banco.
- Reload, hard reload, Back, Forward, fechamento da aba e falha de rede não revogam nem encurtam a sessão. O novo documento repete a máquina canônica até OTP e faz `rebind` na mesma linha, gira o Bearer e preserva `session_id` e `expires_at`.
- Não existe refresh persistente, SSO por cookie ou restauração silenciosa. Alegar retomada transparente sem estado no navegador é falha de segurança.
- Respostas de login, sessão e logout enviam `Cache-Control: no-store`.
- Cookie, `localStorage`, `sessionStorage`, IndexedDB, Cache API, service worker, Shared Worker, `window.name`, URL/query/hash e cache de processo são proibidos em autenticação, inclusive como marcador auxiliar ou fallback.
- O cadastro central e os grants são gerenciados em `https://superadmin.iconsai.ai/admins`. Usuários comuns permanecem no Identity Hub e superadmins permanecem em `public.super_admins`; a tela de gestão não muda a autoridade de identidade.
- A sessão só é revogada antes do prazo por logout explícito ou ação administrativa auditada. `pagehide`, `beforeunload`, beacon, reload, hard reload e sweep por ausência de portador não podem revogar.
- Auditoria: append-only para organização resolvida, identidade resolvida, canal escolhido, OTP emitido/validado/falho, sessão criada/revogada e acesso ao conteúdo. Nunca logar CPF, OTP, token ou destino sem máscara.
- Diagnóstico pré-migração: antes de editar legado, registrar a medição em `superadmin.iconsai.ai/erros`; falha de persistência bloqueia a mudança.
- Conversas operacionais: registrar envelopes completos pós-mascaramento em `superadmin.iconsai.ai/conversas`; segredo e PII nunca saem da origem em claro.
- RLS continua ativa. Superadmin é privilégio da aplicação, não bypass de banco.

## Superadmin e usuários gerenciados

O superadmin autenticável mora exclusivamente em `public.super_admins` do mini dedicado. Usuários comuns moram em `public.users` do Scraping e recebem grants de `identity.app_grants`; nunca entram em `super_admins` nem recebem claim `is_super_admin`.

O painel central pode manter catálogo de aplicativos, papéis e vínculos de usuários. Isso não cria outro mecanismo de login. Todo cadastro é iniciado pelo superadmin e auditado.

## Continuidade sem mentira técnica

Sem cookie, storage, worker, URL ou cache não existe informação autenticadora que um
novo documento possa recuperar sozinho. O contrato resolve isso sem enfraquecer a
segurança: a linha no banco permanece ativa até o prazo; o navegador sem Bearer volta
ao fluxo canônico; o OTP aprovado reassocia um Bearer novo à mesma linha. O rebind:

1. exige a mesma identidade, empresa quando aplicável e canal;
2. consome OTP de uso único server-side;
3. faz update atômico do `token_hash`, nunca cria sessão paralela;
4. preserva `id`, `created_at` e `expires_at`;
5. registra `session_rebound_after_reload` com ator, sessão, rota e acidente;
6. invalida imediatamente o Bearer anterior.

Se o produto exigir retomada transparente sem OTP, precisa autorizar um autenticador
persistente externo ao app, como WebAuthn. Cookie/storage disfarçado não é alternativa.

## Migração de usuários existentes

1. Inventariar cada fonte e medir contagem antes.
2. Normalizar CPF, e-mail e telefone no servidor.
3. Gerar ou reconciliar `cpf_hash` no Identity Hub.
4. Fazer upsert de `identity.app_grants` preservando usuário, origem e data original.
5. Conferir contagem e amostra mascarada.
6. Só então desativar o cadastro local; não apagar pessoa nem histórico.

Sem credencial da fonte, o estado é `pendente`, nunca `migrado`.
