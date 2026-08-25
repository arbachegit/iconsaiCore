# NUNCA FAZER

## Login e publicação da skill

- Nunca declarar continuidade de sessão se reload ou hard reload revogam a linha antes de `expires_at`. Provar o modelo com `skills-catalog/login/scripts/test_session_model.py`.
- Nunca usar um scanner de runtime como única prova de conformidade documental. Validar `SKILL.md`, referências e harness do próprio pacote.
- Nunca publicar uma nova versão sem alinhar `SKILL.md`, `skill.yaml` e `agents/openai.yaml` no mesmo commit.
- Nunca concluir que o catálogo está sincronizado olhando apenas o snapshot. Comparar também a cópia versionada em `skills-catalog/login` com a fonte canônica e repetir harness, gates do catálogo e build.

<!-- dod-validator-v2 -->
## DoD — validação semântica e sincronização de fonte

- Nunca aceitar presença de tags como prova de conformidade. O gate deve reprovar numeração duplicada, cabeçalho ausente, afirmação sem comando/saída, footer falso e erro sem consequência, método ou referência versionada.
- Nunca manter a skill global mais nova que a fonte versionada. Comparar hashes e sincronizar `SKILL.md`, template, metadados, referências, scripts e autotestes no mesmo release.
- Nunca declarar o DoD publicado quando apenas o HTML ou apenas o banco foi concluído. Validar produção, registrar no Superadmin e reler o mesmo `head_sha`.

<!-- superadmin-hub-e2e-v2 -->
## Hub Superadmin — verde sem matriz e artefato runtime na fonte

- Nunca tratar o exit code do Playwright como prova suficiente. Um `exit 0` sem relatório JSON fresco, seis projetos executados e contagem explícita de skips é evidência inválida.
- Nunca reutilizar relatório E2E de tentativa anterior. O harness apaga o arquivo antes de executar e exige que a tentativa atual o recrie.
- Nunca sincronizar diretórios runtime (`docs/prompt-session`, artefatos, traces ou vídeos) para a fonte de uma skill. A fonte contém contrato e harness; memória de sessão permanece no portador operacional protegido.
- Nunca combinar `$prompt`, `$testes-e2e` e `$dod` copiando suas regras para uma quarta fonte. `$superadmin` apenas fixa a ordem, verifica versões e transporta provas entre as três fases.
