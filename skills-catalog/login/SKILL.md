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

- usuário comum: identidade, OTP, JWT autocontido de 15 minutos, refresh device-bound, grants e auditoria no Identity Hub do Scraping (`redivrmeajmktenwshmn`), por `SCRAPING_SUPABASE_*`;
- superadmin: somente o break-glass de `public.super_admins`, OTP, JWT customizado com audiência `superadmin`, sessão revogável e auditoria no mini dedicado (`rzgkwuqvhpvqmjegckih`), por `SUPERADMIN_SUPABASE_*`.

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

O harness mede contrato, banco, ausência de aleatoriedade e inexistência de cadastro local. Saídas: `0` aprovado; `1` violação; `2` ambiente/entrada inválida. Nunca transforme ausência de evidência em verde.

Para validar a própria consolidação do catálogo:

```bash
python3 scripts/validate_catalog.py
```

## Resultado obrigatório

Entregue:

- fluxo escolhido e transições medidas;
- prova de isolamento entre Identity Hub comum e banco break-glass;
- empresa e tema determinístico selecionados;
- inventário de cadastros locais removidos ou exceções permitidas;
- testes do caminho completo até conteúdo;
- lista objetiva do que fazer e do que não fazer.
