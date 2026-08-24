---
name: login
description: Implementa, refatora ou audita o único login canônico IconsAI. Use quando o pedido mencionar login, autenticação, CPF, CNPJ, escolha de canal, OTP, superadmin, tela de acesso ou remoção de cadastro local. Governa somente os fluxos CNPJ→CPF→CANAIS→OTP→CONTEÚDO e CPF→CANAIS→OTP→CONTEÚDO, com usuário comum no Identity Hub e superadmin no banco break-glass; Fiscal é a referência correta e Rotas é antipadrão.
---

# Login

Esta é a única skill que governa login no ecossistema. Skills de CPF, SMS, secrets e autorização são auxiliares; não podem definir fluxo, sessão ou tela de login.

## Entrada obrigatória

Ao receber `/login` no Claude Code ou `$login` no Codex, pergunte nesta ordem antes de implementar:

1. O fluxo começa por **CPF** ou **CNPJ**?
2. A experiência é IconsAI ou proprietária de qual empresa (por exemplo, ORBX ou Plot)?

Se a empresa for proprietária, peça ou localize nome, logo e favicon. Não invente ativos. Se não houver empresa específica, aplique a marca canônica IconsAI.

## Contrato imutável

Escolha exatamente uma máquina de estados:

- multiempresa: `CNPJ -> CPF -> CANAIS -> OTP -> CONTEÚDO`
- direta: `CPF -> CANAIS -> OTP -> CONTEÚDO`

Nenhuma etapa pode ser pulada, reordenada ou acrescentada. `CANAIS` é uma tela explícita. O conteúdo só abre depois da verificação do OTP e da emissão server-side da sessão correspondente à classe de identidade.

Há duas classes isoladas dentro do mesmo contrato:

- usuário comum: identidade, OTP, sessão opaca revogável, grants e auditoria no Identity Hub do Scraping (`redivrmeajmktenwshmn`), por `SCRAPING_SUPABASE_*`;
- superadmin: somente o break-glass de `public.super_admins`, OTP, sessão opaca revogável e auditoria no mini dedicado (`rzgkwuqvhpvqmjegckih`), por `SUPERADMIN_SUPABASE_*`.

## Sessão sem estado persistente no navegador

O servidor gera um segredo opaco aleatório, grava somente seu SHA-256 na tabela de
sessões e devolve o segredo uma única vez. O cliente o mantém exclusivamente em
memória volátil e o apresenta em `Authorization: Bearer <segredo>` enquanto o
documento estiver aberto. Cada requisição confirma hash, expiração e revogação no
banco. Fechar ou recarregar a página perde o portador e exige novo login.

É proibido usar cookie, `localStorage`, `sessionStorage`, IndexedDB, Cache API,
service worker ou qualquer cache de processo como portador, espelho, fallback,
marcador ou acelerador de sessão. Respostas de autenticação devem enviar
`Cache-Control: no-store`. Nenhum aplicativo pode emitir sessão própria.

Nunca copie usuário comum para o banco break-glass, nunca cadastre superadmin em `public.users` e nunca converta grant comum em claim `is_super_admin`.

Leia [architecture.md](references/architecture.md) antes de alterar back-end, banco ou sessão. Leia [design-and-governance.md](references/design-and-governance.md) antes de alterar interface, marca, cadastro ou área administrativa.

## Referência visual

Use a composição, sequência, densidade e comportamento responsivo do Fiscal como referência correta. Rotas é evidência do que corrigir, nunca fonte a copiar.

Selecione a cor somente do catálogo permitido. A escolha precisa ser estável: preset da empresa; caso contrário, `SHA-256(slug_da_empresa) mod quantidade_de_paletas`. `Math.random()` é proibido. Igual entrada produz igual tema em qualquer execução.

## Harness obrigatório

Antes de editar, declare qual dos dois fluxos será implantado. Depois, rode:

```bash
python3 scripts/validate_login.py --root <raiz-do-projeto> --flow cpf
# ou
python3 scripts/validate_login.py --root <raiz-do-projeto> --flow cnpj
```

O harness mede contrato, banco, ausência de aleatoriedade, inexistência de cadastro
local e ausência de estado persistente no navegador. Saídas: `0` aprovado; `1`
violação; `2` ambiente/entrada inválida. Nunca transforme ausência de evidência em verde.

### Diagnóstico de legado e memória operacional

Antes de alterar qualquer aplicação antiga, faça um diagnóstico determinístico do
login existente e grave o resultado em `https://superadmin.iconsai.ai/erros` pela
API `POST /api/erros`. O registro inclui aplicativo, arquivos/mecanismos
encontrados, consequência medida, severidade, método de correção e comando-prova.
O diagnóstico verde também é gravado: ausência de defeito é um resultado medido,
não permissão para omitir a auditoria. Se a gravação falhar, a implementação não
começa.

Toda sessão de Codex, Claude Code ou remote-control é coletada em
`https://superadmin.iconsai.ai/conversas` pela API `POST /api/conversas`. Preserve
o envelope integral depois de mascarar deterministicamente segredos, CPF, telefone
e e-mail na origem. Nunca envie `.env`, bearer, OTP, service role ou credencial em
claro. O hash deve corresponder exatamente ao envelope redigido persistido.

As pontes usam autenticação server-to-server dedicada no header
`x-iconsai-observability-token`, nunca cookie de login. Elas também enviam e exigem
`Cache-Control: no-store`.

Para validar a própria consolidação do catálogo:

```bash
python3 scripts/validate_catalog.py
```

## Resultado obrigatório

Entregue:

- fluxo escolhido e transições medidas;
- prova de isolamento entre Identity Hub comum e banco break-glass;
- prova de que o portador existe somente em memória e cada chamada consulta o banco;
- inventário de cookies, storages e caches removidos da autenticação;
- id do diagnóstico persistido em `/erros` antes da edição do legado;
- id da conversa persistida em `/conversas`, com versão de mascaramento;
- empresa e tema determinístico selecionados;
- inventário de cadastros locais removidos ou exceções permitidas;
- testes do caminho completo até conteúdo;
- lista objetiva do que fazer e do que não fazer.
