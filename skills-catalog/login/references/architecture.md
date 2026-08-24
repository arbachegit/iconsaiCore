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
- O mesmo fluxo visual não significa misturar identidades, cookies ou claims.
- Cliente `service_role`: somente em route handler/server module.
- Frontend: renderiza estado, captura input e chama API; não consulta Supabase.
- Entrada: Zod no Node; strings sanitizadas; CPF/CNPJ normalizados server-side.
- OTP: hash no banco, TTL explícito, limite de tentativas, consumo atômico e rate limit.
- Canal: SMS por Infobip como primeiro fator obrigatório do superadmin. E-mail via Resend ou TOTP só pode ser segundo fator opt-in. Usuário comum segue os canais liberados pelo Identity Hub.
- Sessão de usuário comum: JWT autocontido de 15 minutos e refresh token device-bound de 90 dias, ambos emitidos exclusivamente pelo Identity Hub.
- Sessão de superadmin: JWT customizado no cookie `iconsai_superadmin_jwt`, com audiência `superadmin`, claim `is_super_admin: true` e `jti` confirmado contra a sessão revogável no banco break-glass.
- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, domínio configurável `.iconsai.ai`.
- Auditoria: append-only para organização resolvida, identidade resolvida, canal escolhido, OTP emitido/validado/falho, sessão criada/revogada e acesso ao conteúdo. Nunca logar CPF, OTP, token ou destino sem máscara.
- RLS continua ativa. Superadmin é privilégio da aplicação, não bypass de banco.

## Superadmin e usuários gerenciados

O superadmin autenticável mora exclusivamente em `public.super_admins` do mini dedicado. Usuários comuns moram em `public.users` do Scraping e recebem grants de `identity.app_grants`; nunca entram em `super_admins` nem recebem claim `is_super_admin`.

O painel central pode manter catálogo de aplicativos, papéis e vínculos de usuários. Isso não cria outro mecanismo de login. Todo cadastro é iniciado pelo superadmin e auditado.

## Migração de usuários existentes

1. Inventariar cada fonte e medir contagem antes.
2. Normalizar CPF, e-mail e telefone no servidor.
3. Gerar ou reconciliar `cpf_hash` no Identity Hub.
4. Fazer upsert de `identity.app_grants` preservando usuário, origem e data original.
5. Conferir contagem e amostra mascarada.
6. Só então desativar o cadastro local; não apagar pessoa nem histórico.

Sem credencial da fonte, o estado é `pendente`, nunca `migrado`.
