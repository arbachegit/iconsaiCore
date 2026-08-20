import { execFileSync } from 'node:child_process'
import { realpathSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'js-yaml'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_SOURCE_DIR = resolve(homedir(), '.claude/skills')
const SOURCE_DIR = resolve(process.env.SKILLS_SOURCE_DIR || DEFAULT_SOURCE_DIR)
const TRUSTED_SOURCE_DIRS = [
  DEFAULT_SOURCE_DIR,
  resolve(APP_ROOT, '../../iconsaiConfig/skills'),
].map((directory) => realpathSync(directory))

if (!TRUSTED_SOURCE_DIRS.includes(realpathSync(SOURCE_DIR))) {
  throw new Error(`SKILLS_SOURCE_DIR fora das raízes confiáveis: ${SOURCE_DIR}`)
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end < 0) return {}

  const source = content.slice(3, end)
  try {
    const parsed = load(source)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return Object.fromEntries(
      source
        .split('\n')
        .map((line) => line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim()]),
    )
  }
}

function metadataValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, 'i'))
  return match?.[1]?.replace(/`/g, '').trim() || ''
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  return value.split(/[,|+]/).map((item) => item.trim()).filter(Boolean)
}

function sectionBullets(content, headingNames) {
  const lines = content.split('\n')
  const normalizedNames = headingNames.map((name) => name.toLocaleLowerCase('pt-BR'))
  const start = lines.findIndex((line) => {
    const heading = line.replace(/^#+\s*/, '').replace(/[*`]/g, '').trim().toLocaleLowerCase('pt-BR')
    return normalizedNames.some((name) => heading === name || heading.startsWith(`${name} `))
  })
  if (start < 0) return []

  const bullets = []
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s+/.test(line)) break
    const match = line.match(/^\s*[-*]\s+(.+)/)
    if (match) bullets.push(match[1].replace(/[*`]/g, '').trim())
    if (bullets.length === 5) break
  }
  return bullets
}

function titleFromContent(content, fallback) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]
  return title?.replace(/^Skill:\s*/i, '').replace(/[*`]/g, '').trim() || fallback
}

function latestGitDate(filePath) {
  try {
    return execFileSync('git', ['-C', SOURCE_DIR, 'log', '-1', '--format=%cs', '--', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || undefined
  } catch {
    return undefined
  }
}

function trackedSourcePath(skillDirectory) {
  const expectedDirectory = `skills/${skillDirectory}`
  try {
    const trackedFiles = execFileSync('git', ['-C', SOURCE_DIR, 'ls-files', `:(glob)${skillDirectory}/*`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split('\n')
    const skillFile = trackedFiles.find((filePath) => /\/skill\.md$/i.test(filePath))
    return skillFile ? `skills/${skillFile}` : `${expectedDirectory}/SKILL.md`
  } catch {
    return `${expectedDirectory}/SKILL.md`
  }
}

function parseSkill(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const frontmatter = parseFrontmatter(content)
  const id = String(frontmatter.name || basename(dirname(filePath))).trim()
  const description = String(frontmatter.description || metadataValue(content, 'Descrição') || '').trim()
  const technologies = metadataValue(content, 'Tecnologia') || metadataValue(content, 'Tecnologias')
  const techs = splitList(frontmatter.tags).length > 0
    ? splitList(frontmatter.tags)
    : splitList(technologies)
  const version = metadataValue(content, 'Versão') || String(frontmatter.version || '1.0.0')
  const examples = sectionBullets(content, ['Quando usar', 'Quando usar esta skill', 'Aplicável em'])
  const updatedAt = latestGitDate(filePath)
  const relativePath = trackedSourcePath(basename(dirname(filePath)))

  return {
    id,
    name: titleFromContent(content, id),
    trigger: `/${id}`,
    version,
    techs,
    description: description || `Skill canônica ${id} do ecossistema IconsAI.`,
    examples,
    commands: [`/${id}`],
    keywords: [id, description, ...techs].join(' ').toLocaleLowerCase('pt-BR'),
    updatedAt,
    sourcePath: relativePath,
    document: content,
  }
}

const skills = readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(SOURCE_DIR, entry.name, 'SKILL.md'))
  .filter((filePath) => {
    try {
      return statSync(filePath).isFile()
    } catch {
      return false
    }
  })
  .map(parseSkill)
  .sort((left, right) => left.id.localeCompare(right.id, 'pt-BR', { sensitivity: 'base' }))

const snapshot = skills.map((skill) => {
  const snapshotSkill = { ...skill }
  delete snapshotSkill.document
  return snapshotSkill
})
const docs = Object.fromEntries(skills.map((skill) => [skill.id, skill.document]))

writeFileSync(join(APP_ROOT, 'data/skill-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`)
writeFileSync(
  join(APP_ROOT, 'data/skill-docs.ts'),
  `// Generated by scripts/sync-skills-snapshot.mjs. Do not edit manually.\nexport const SKILL_DOCS: Record<string, string> = ${JSON.stringify(docs)}\n`,
)

console.log(`Synced ${snapshot.length} canonical skills from ${SOURCE_DIR}`)
