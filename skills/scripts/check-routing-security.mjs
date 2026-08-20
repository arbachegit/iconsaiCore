import { readFileSync } from 'node:fs'

const desktop = readFileSync('components/SkillsCatalog.tsx', 'utf8')
const desktopPage = readFileSync('app/page.tsx', 'utf8')
const mobilePage = readFileSync('app/mobile/page.tsx', 'utf8')
const urlState = readFileSync('lib/client/catalog-url-state.ts', 'utf8')
const apiUrl = readFileSync('lib/client/skills-api-url.ts', 'utf8')
const docRoute = readFileSync('app/api/skills/[id]/doc/route.ts', 'utf8')
const docHook = readFileSync('lib/use-skill-doc.ts', 'utf8')
const middleware = readFileSync('middleware.ts', 'utf8')
const prompt = readFileSync('lib/recommendation/prompt.ts', 'utf8')
const nextConfig = readFileSync('next.config.js', 'utf8')
const snapshotSync = readFileSync('scripts/sync-skills-snapshot.mjs', 'utf8')

const checks = [
  ['Desktop restaura estado pela URL', desktop.includes('readCatalogUrlState(window.location.search, skills)')],
  ['Desktop grava skill no histórico', desktop.includes("buildCatalogUrl(window.location.href, { skillId })")],
  ['Desktop reage a back/forward', desktop.includes("addEventListener('popstate', applyLocationState)")],
  ['SSR inicia no estado da URL sem blink', desktop.includes('readCatalogUrlState(initialSearch, skills)') && desktopPage.includes('initialSearch={initialSearch}')],
  ['Mobile reutiliza o catálogo responsivo canônico', mobilePage.includes('<SkillsCatalog') && !mobilePage.includes('SkillsMobileCatalog')],
  ['Mobile recebe estado inicial da URL no SSR', mobilePage.includes('initialSearch={initialSearch}')],
  ['IDs da URL usam allowlist do catálogo', urlState.includes('knownSkillIds.has(requestedSkillId)')],
  ['Busca da URL possui limite', urlState.includes('MAX_SEARCH_QUERY_LENGTH = 120')],
  ['API valida ID com Zod', docRoute.includes('skillIdSchema.safeParse')],
  ['API bloqueia propriedades herdadas', docRoute.includes('Object.hasOwn(SKILL_DOCS, id)')],
  ['Troca de documento cancela request anterior', docHook.includes('controller.abort()')],
  ['Resposta de documento é validada', docHook.includes('skillDocResponseSchema.safeParse')],
  ['Delimitadores de prompt são escapados', prompt.includes('escapeXml(redactedSituation)')],
  ['CSP e fingerprinting protegidos', nextConfig.includes('Content-Security-Policy') && nextConfig.includes('poweredByHeader: false')],
  ['Snapshot nasce de ~/.claude/skills', snapshotSync.includes("resolve(homedir(), '.claude/skills')")],
  ['Middleware exige token Tools', middleware.includes('verifyToolsToken(token, request, config)')],
  ['Middleware valida slug e escopo', middleware.includes("x-tools-course-slug") && middleware.includes("x-tools-scope")],
  ['Token é trocado por cookie HttpOnly', middleware.includes('httpOnly: true')],
  ['Token sai da URL antes do primeiro paint', desktop.includes('useLayoutEffect') && desktop.includes("url.searchParams.delete('course_token')")],
  ['Webhook mantém política service:HMAC', middleware.includes("'POST /api/skills/sync'")],
  ['Cliente não propaga token pela URL', !apiUrl.includes('course_token')],
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
