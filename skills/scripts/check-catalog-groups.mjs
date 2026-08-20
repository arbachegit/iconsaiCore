import { readFileSync } from 'node:fs'

const snapshot = JSON.parse(readFileSync('data/skill-snapshot.json', 'utf8'))
const groups = readFileSync('data/catalog-groups.ts', 'utf8')
const modal = readFileSync('components/SkillModal.tsx', 'utf8')
const card = readFileSync('components/skills/skill-card.tsx', 'utf8')
const docs = readFileSync('data/skill-docs.ts', 'utf8')
const summaryBuilder = readFileSync('lib/skill-summary.ts', 'utf8')

const skillIds = new Set(snapshot.map((skill) => skill.id))
const harnessIds = [
  'harness-inspecao',
  'harness-determinismo',
  'harness-convergencia-de-padroes',
  'harness-metricas-evolutivas',
]
const harnessBlock = groups.match(/export const HARNESS_SKILL_IDS = \[([\s\S]*?)\] as const/)?.[1] ?? ''
const declaredHarnessIds = [...harnessBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])

const checks = [
  ['Iniciar é a primeira categoria', groups.indexOf("id: 'iniciar'") < groups.indexOf("id: 'harness'")],
  ['Harness precede Hubs', groups.indexOf("id: 'harness'") < groups.indexOf("id: 'hubs'")],
  ['Harness contém somente as quatro skills canônicas', JSON.stringify(declaredHarnessIds) === JSON.stringify(harnessIds)],
  ['As quatro skills Harness existem no snapshot', harnessIds.every((id) => skillIds.has(id))],
  ['A skill iniciar existe no snapshot', skillIds.has('iniciar')],
  ['A skill projeto-novo não existe mais', !skillIds.has('projeto-novo')],
  ['Todos os cards oferecem Mostrar', card.includes('Mostrar') && card.includes('onOpenModal?.(skill.id)')],
  ['Modal abre em Sumário', modal.includes("useState<'summary' | 'complete'>('summary')")],
  ['Sumário contém explicação didática', modal.includes('Em poucas palavras') && modal.includes('Como funciona') && modal.includes('Quando usar')],
  ['Sumário é extraído do SKILL.md', modal.includes('buildSkillSummary(skill, fullDoc)') && summaryBuilder.includes('parseSections(markdown)')],
  ['Keywords não substituem a explicação', !modal.includes('Keywords')],
  ['Sumário oferece Versão completa', modal.includes('Versão completa')],
  ['Hubs expõem links para skills contidas', modal.includes('Skills contidas neste hub') && modal.includes('onNavigateSkill(member.id)')],
  ['100% das skills possuem documento completo', snapshot.every((skill) => docs.includes(`${JSON.stringify(skill.id)}:`))],
]

console.log('\n  Catalog Groups Gate')
console.log('  ===================')

let failed = 0
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'} ${label}`)
  if (!passed) failed += 1
}

console.log(`\n  Total: ${checks.length}`)
if (failed > 0) process.exit(1)
console.log('  PASS\n')
