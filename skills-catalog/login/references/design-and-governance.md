# Design e governança

## Design

- Fiscal é a referência estrutural: uma decisão por tela, progressão visível, card contido e estados de erro no contexto.
- A ordem das telas segue a máquina de estados; não fundir CPF, canal e OTP num único formulário.
- A identidade visual padrão usa o logo e favicon canônicos IconsAI.
- Empresa proprietária usa logo e favicon fornecidos por ela, sem sobrepor o wordmark IconsAI como se fosse o mesmo ativo.
- Paleta vem de catálogo aprovado. Seleção automática é determinística por hash do slug; nunca `Math.random()`.
- Acessibilidade: labels reais, foco visível, mensagens em `role=alert`, navegação por teclado e `cursor:pointer` em todo elemento clicável.

## Área Login no Superadmin

O link antes chamado `Superadmin` passa a se chamar `Login` e abre três abas:

1. **Superadmin**: mostra o único superadmin do banco central, canais, estado e últimos acessos. Não oferece criação de outro superadmin.
2. **Aplicativos**: lista aplicação, explicação, papel, CPF, e-mail, celular e ação `Cadastrar`. A ação cria ou abre o vínculo na aba de usuários do aplicativo.
3. **Usuários**: lista aplicação com link externo, nome, papéis, data/hora de cadastro e ação `Logs`. O modal de logs mostra todas as atividades que foram efetivamente instrumentadas; se uma fonte não reporta eventos, deve declarar a lacuna.

Use o Atlas apenas como referência de formulário de cadastro, sem copiar autenticação, banco ou regras de negócio.

## Cadastro local

Regra geral: aplicativos não oferecem criação de usuários na própria plataforma. Remova UI e endpoint de criação depois da migração comprovada.

Exceções:

- Concierge pode manter o cadastro expressamente permitido pelo produto.
- Discovery Health permite ao médico cadastrar paciente. Paciente é relação clínica, não superadmin e não mecanismo alternativo de login.

## Fazer

- centralizar usuários comuns e grants no Identity Hub do Scraping;
- manter somente o superadmin break-glass no banco rzgkw;
- usar somente um contrato de login;
- preservar usuários existentes por upsert idempotente;
- desativar, em vez de apagar, quando há histórico referencial;
- abrir links de aplicação em nova aba com `noopener noreferrer`;
- mostrar no modal somente eventos medidos e indicar cobertura incompleta.

## Não fazer

- não usar Rotas como referência;
- não usar banco local do aplicativo para emitir identidade ou sessão;
- não copiar usuário comum para o banco break-glass;
- não criar outra skill, helper ou ferramenta que governe login;
- não pular a escolha de canal;
- não emitir sessão no navegador;
- não guardar CPF, OTP ou token em claro em logs;
- não usar `Math.random()` para tema;
- não criar superadmin pela tela de usuários;
- não apagar pessoas, vínculos ou logs antes de conciliar a migração;
- não alegar “100% das atividades” quando algum aplicativo ainda não envia eventos.
