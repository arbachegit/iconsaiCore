import { readFileSync } from 'node:fs'

const files = {
  route: readFileSync('app/api/skills/sync/route.ts', 'utf8'),
  schema: readFileSync('lib/github/sync-schema.ts', 'utf8'),
  hook: readFileSync('hooks/use-new-skills-polling.ts', 'utf8'),
}

const checks = [
  ['webhook continua protegido por HMAC', files.route.includes('verifyGitHubSignature(body, signature.data, secret)')],
  ['assinatura externa é validada por Zod', files.route.includes('skillsWebhookSignatureSchema.safeParse')],
  ['payload do webhook usa Zod', files.route.includes('normalizeSkillsSyncPayload(JSON.parse(body))')],
  ['schema aceita o payload push do GitHub', files.schema.includes('commits: z.array(commitSchema)')],
  ['mudança invalida cache e página', files.route.includes("revalidateTag('skills')") && files.route.includes("revalidatePath('/')")],
  ['polling preserva course_token', files.hook.includes("buildSkillsApiUrl('/skills/api/skills/sync')")],
  ['resposta externa é validada', files.hook.includes('skillsSyncHealthResponseSchema.safeParse')],
  ['hash atual acompanha a consulta', files.hook.includes("url.searchParams.set('current_hash', renderedHash)")],
  ['catálogo atualiza automaticamente', files.hook.includes('window.location.reload(), 1_200')],
]

console.log('\n  Skills Sync Gate')
console.log('  ================')

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
