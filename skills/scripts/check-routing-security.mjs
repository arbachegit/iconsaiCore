import { readFileSync } from 'node:fs'

const desktop = readFileSync('components/SkillsCatalog.tsx', 'utf8')
const mobile = readFileSync('components/SkillsMobileCatalog.tsx', 'utf8')
const urlState = readFileSync('lib/client/catalog-url-state.ts', 'utf8')
const docRoute = readFileSync('app/api/skills/[id]/doc/route.ts', 'utf8')
const docHook = readFileSync('lib/use-skill-doc.ts', 'utf8')
const prompt = readFileSync('lib/recommendation/prompt.ts', 'utf8')
const nextConfig = readFileSync('next.config.js', 'utf8')
const snapshotSync = readFileSync('scripts/sync-skills-snapshot.mjs', 'utf8')

const checks = [
  ['Desktop restaura estado pela URL', desktop.includes('readCatalogUrlState(window.location.search, skills)')],
  ['Desktop grava skill no histórico', desktop.includes("buildCatalogUrl(window.location.href, { skillId })")],
  ['Desktop reage a back/forward', desktop.includes("addEventListener('popstate', applyLocationState)")],
  ['Mobile usa o mesmo contrato de URL', mobile.includes('readCatalogUrlState(window.location.search, skills)')],
  ['Mobile grava skill no histórico', mobile.includes('buildCatalogUrl(window.location.href, { skillId: skill.id })')],
  ['Mobile reutiliza o sumário canônico', mobile.includes('<SkillModal') && !mobile.includes('MobileSkillModal') && !mobile.includes('Keywords')],
  ['IDs da URL usam allowlist do catálogo', urlState.includes('knownSkillIds.has(requestedSkillId)')],
  ['Busca da URL possui limite', urlState.includes('MAX_SEARCH_QUERY_LENGTH = 120')],
  ['API valida ID com Zod', docRoute.includes('skillIdSchema.safeParse')],
  ['API bloqueia propriedades herdadas', docRoute.includes('Object.hasOwn(SKILL_DOCS, id)')],
  ['Troca de documento cancela request anterior', docHook.includes('controller.abort()')],
  ['Resposta de documento é validada', docHook.includes('skillDocResponseSchema.safeParse')],
  ['Delimitadores de prompt são escapados', prompt.includes('escapeXml(redactedSituation)')],
  ['CSP e fingerprinting protegidos', nextConfig.includes('Content-Security-Policy') && nextConfig.includes('poweredByHeader: false')],
  ['Snapshot nasce de ~/.claude/skills', snapshotSync.includes("resolve(homedir(), '.claude/skills')")],
]

console.log('\n  Routing & Security Gate')
console.log('  =======================')

let failures = 0
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'} ${label}`)
  if (!passed) failures += 1
}

console.log(`\n  Total: ${checks.length}`)
if (failures > 0) process.exit(1)
console.log('  PASS\n')
