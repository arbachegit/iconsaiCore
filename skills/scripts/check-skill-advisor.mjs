import { readFileSync } from 'node:fs'

const files = {
  route: readFileSync('app/api/skills/recommend/route.ts', 'utf8'),
  service: readFileSync('lib/recommendation/service.ts', 'utf8'),
  prompt: readFileSync('lib/recommendation/prompt.ts', 'utf8'),
  schema: readFileSync('lib/recommendation/schema.ts', 'utf8'),
  component: readFileSync('components/SkillAdvisor.tsx', 'utf8'),
  css: readFileSync('components/skills/skills.module.css', 'utf8'),
}

const checks = [
  ['request usa Zod antes da lógica', files.route.includes('recommendationRequestSchema.safeParse(body)')],
  ['schema de entrada é estrito', files.schema.includes('}).strict()')],
  ['rota pública possui rate limit', files.route.includes('RATE_LIMIT_MAX_REQUESTS')],
  ['Anthropic é o provedor primário', /try\s*\{\s*providerResult = await callAnthropic/.test(files.service)],
  ['OpenAI é fallback explícito', files.service.includes('providerResult = await callOpenAi')],
  ['prompt possui versão rastreável', files.prompt.includes('SKILL_ADVISOR_PROMPT_VERSION')],
  ['prompt possui hash rastreável', files.prompt.includes('SKILL_ADVISOR_PROMPT_HASH')],
  ['contexto e pedido estão delimitados', files.prompt.includes('<catalogo_de_skills>') && files.prompt.includes('<situacao_do_usuario>')],
  ['PII é minimizado antes do provedor', files.prompt.includes('redactPii(situation)')],
  ['tool de saída está em allowlist', files.service.includes("name: 'recommend_skills'")],
  ['tool possui JSON Schema', files.service.includes('input_schema:') && files.service.includes('additionalProperties: false')],
  ['IDs retornados são validados contra catálogo', files.service.includes('allowedSkillIds.has(recommendation.skillId)')],
  ['frontend chama apenas API interna', files.component.includes("buildSkillsApiUrl('/api/skills/recommend')")],
  ['frontend valida o contrato de resposta', files.component.includes('recommendationResponseSchema.safeParse(payload)')],
  ['frontend trata resposta vazia sem expor erro técnico', files.component.includes('const responseText = await response.text()')],
  ['recomendação copia comando para Codex', files.component.includes('text={`$${recommendation.skillId}`}')],
  ['recomendação copia comando para Claude', files.component.includes('text={`/${recommendation.skillId}`}')],
  ['frontend não importa SDK de LLM', !/@anthropic-ai|openai\.com/.test(files.component)],
  ['resultado mantém contenção BI Density', /\.recommendationBody\s*\{[^}]*min-width:\s*0/s.test(files.css)],
]

console.log('\n  Skills Advisor Gate')
console.log('  ===================')

let failed = 0
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'} ${label}`)
  if (!passed) failed += 1
}

console.log(`\n  Total: ${checks.length}`)
if (failed > 0) {
  console.error(`  FAIL: ${failed} verificação(ões) não passaram.\n`)
  process.exit(1)
}

console.log('  PASS\n')
