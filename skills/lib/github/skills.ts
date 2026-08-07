import 'server-only'

import { createHash } from 'node:crypto'

import { load } from 'js-yaml'

import { PHASES } from '@/data/phases'
import { getGitHubEnv } from './env'
import type { GitHubContentFile, GitHubContentItem, RawSkillYaml, Skill } from './types'

const GITHUB_API_BASE_URL = 'https://api.github.com'
const GITHUB_API_VERSION = '2022-11-28'
const FETCH_TIMEOUT_MS = 10_000
const CACHE_REVALIDATE_SECONDS = 3600
const CACHE_TAG = 'skills'
const SKILLS_ROOT = 'skills'
const GITHUB_BRANCH = 'main'

type GitHubErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMIT' | 'UNKNOWN'

export interface SkillSection {
  name: string
  skills: Skill[]
}

export class GitHubSkillsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: GitHubErrorCode,
  ) {
    super(message)
    this.name = 'GitHubSkillsError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGitTreeBlob(value: unknown): value is { type: 'blob'; path: string; sha: string } {
  return isRecord(value)
    && value.type === 'blob'
    && typeof value.path === 'string'
    && typeof value.sha === 'string'
}

function isGitHubContentItem(value: unknown): value is GitHubContentItem {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.type === 'file' || value.type === 'dir') &&
    typeof value.name === 'string' &&
    typeof value.path === 'string' &&
    typeof value.sha === 'string' &&
    typeof value.size === 'number' &&
    typeof value.url === 'string' &&
    (typeof value.html_url === 'string' || value.html_url === null) &&
    (typeof value.git_url === 'string' || value.git_url === null) &&
    (typeof value.download_url === 'string' || value.download_url === null)
  )
}

function isGitHubContentFile(value: unknown): value is GitHubContentFile {
  return (
    isGitHubContentItem(value) &&
    value.type === 'file' &&
    isRecord(value) &&
    typeof value.content === 'string' &&
    typeof value.encoding === 'string'
  )
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toNonEmptyString(item))
      .filter((item): item is string => item !== null)
  }

  const single = toNonEmptyString(value)
  return single ? [single] : []
}

function encodeGitHubPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function inferSkillIdFromPath(sourcePath: string): string | null {
  const segments = sourcePath.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const fileName = segments[segments.length - 1]

  // agents/openai.yaml → use grandparent directory name as id
  if (/^openai\.ya?ml$/i.test(fileName) && segments.length >= 3) {
    return segments[segments.length - 3]
  }

  // skill.yaml or skill.yml → use parent directory name as id
  if (/^skill\.ya?ml$/i.test(fileName) && segments.length >= 2) {
    return segments[segments.length - 2]
  }

  if (/^skill\.md$/i.test(fileName) && segments.length >= 2) {
    return segments[segments.length - 2]
  }

  return fileName.replace(/\.ya?ml$/i, '') || null
}

function normalizeSkill(rawSkill: RawSkillYaml, sourcePath: string): Skill | null {
  const nestedInterface = isRecord(rawSkill.interface) ? rawSkill.interface : undefined

  const id = toNonEmptyString(rawSkill.id) ?? inferSkillIdFromPath(sourcePath)
  if (!id) return null

  const name =
    toNonEmptyString(rawSkill.name) ??
    toNonEmptyString(rawSkill.title) ??
    toNonEmptyString(nestedInterface?.display_name) ??
    id

  const trigger = toNonEmptyString(rawSkill.trigger) ?? `/${id}`
  const phase = toNonEmptyString(rawSkill.phase) ?? '1'
  const phaseName = toNonEmptyString(rawSkill.phaseName)
    ?? PHASES.find((p) => p.number === phase)?.name.split('/')[0].trim()
    ?? ''
  const description =
    toNonEmptyString(rawSkill.description) ??
    toNonEmptyString(nestedInterface?.short_description) ??
    ''

  const techs = toStringArray(rawSkill.techs).length > 0
    ? toStringArray(rawSkill.techs)
    : toStringArray(rawSkill.tags)

  const examples = toStringArray(rawSkill.examples)
  const commands = toStringArray(rawSkill.commands)
  const version = toNonEmptyString(rawSkill.version) ?? '1.0'
  const keywords = toNonEmptyString(rawSkill.keywords) ?? ''
  const isNew = rawSkill.isNew === true || rawSkill.isNew === 'true'
  const createdAt = toNonEmptyString(rawSkill.createdAt) ?? undefined
  const updatedAt = toNonEmptyString(rawSkill.updatedAt) ?? undefined

  return {
    id,
    name,
    trigger,
    phase,
    phaseName,
    version,
    techs,
    description,
    examples,
    commands,
    isNew: isNew || undefined,
    keywords,
    createdAt,
    updatedAt,
    sourcePath,
  }
}

function isYamlPath(path: string): boolean {
  return /\.ya?ml$/i.test(path)
}

function isSkillMarkdownPath(path: string): boolean {
  return /\/skill\.md$/i.test(path)
}

function isSkillSourcePath(path: string): boolean {
  return isYamlPath(path) || isSkillMarkdownPath(path)
}

function parseFrontmatter(content: string): Record<string, unknown> {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end < 0) return {}

  const source = content.slice(3, end)
  try {
    const parsed = load(source)
    return isRecord(parsed) ? parsed : {}
  } catch {
    const entries = source
      .split('\n')
      .map((line) => line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => [match[1], match[2].trim()] as const)
    return Object.fromEntries(entries)
  }
}

function readMetadataValue(content: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`\\*\\*${escapedLabel}:\\*\\*\\s*([^\\n]+)`, 'i'))
  return match?.[1] ? match[1].replace(/`/g, '').trim() : null
}

function extractSectionBullets(content: string, names: string[]): string[] {
  const lines = content.split('\n')
  const normalizedNames = names.map((name) => name.toLocaleLowerCase('pt-BR'))
  const sectionStart = lines.findIndex((line) => {
    const heading = line
      .replace(/^#+\s*/, '')
      .replace(/[*`]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR')
    return normalizedNames.some((name) => heading === name || heading.startsWith(`${name} `))
  })
  if (sectionStart < 0) return []

  const bullets: string[] = []
  for (const line of lines.slice(sectionStart + 1)) {
    if (/^#{1,3}\s+/.test(line)) break
    const match = line.match(/^\s*[-*]\s+(.+)/)
    if (match?.[1]) bullets.push(match[1].replace(/[*`]/g, '').trim())
    if (bullets.length === 5) break
  }
  return bullets
}

function inferLifecyclePhase(skillText: string): string {
  const haystack = skillText.toLocaleLowerCase('pt-BR')
  let selectedPhase = PHASES[0]
  let selectedScore = 0

  for (const phase of PHASES) {
    const score = phase.slugs.reduce(
      (total, slug) => total + (haystack.includes(slug.toLocaleLowerCase('pt-BR')) ? 1 : 0),
      0,
    )
    if (score > selectedScore) {
      selectedPhase = phase
      selectedScore = score
    }
  }

  return selectedPhase.number
}

function normalizeMarkdownSkill(content: string, sourcePath: string): Skill | null {
  const frontmatter = parseFrontmatter(content)
  const id = toNonEmptyString(frontmatter.name) ?? inferSkillIdFromPath(sourcePath)
  if (!id) return null

  const heading = content.match(/^#\s+(.+)$/m)?.[1]
  const name = toNonEmptyString(frontmatter.title)
    ?? heading?.replace(/^Skill:\s*/i, '').replace(/[*`]/g, '').trim()
    ?? id
  const description = toNonEmptyString(frontmatter.description)
    ?? readMetadataValue(content, 'Descrição')
    ?? `Skill canônica ${id} do ecossistema IconsAI.`
  const technologyValue = readMetadataValue(content, 'Tecnologia')
    ?? readMetadataValue(content, 'Tecnologias')
  const techs = toStringArray(frontmatter.tags).length > 0
    ? toStringArray(frontmatter.tags)
    : technologyValue?.split(/[,|+]/).map((item) => item.trim()).filter(Boolean) ?? []
  const phaseNumber = toNonEmptyString(frontmatter.phase)
    ?? inferLifecyclePhase([id, name, description, techs.join(' '), content.slice(0, 4_000)].join(' '))
  const phase = PHASES.find((item) => item.number === phaseNumber) ?? PHASES[0]
  const examples = extractSectionBullets(content, ['Quando usar', 'Quando usar esta skill', 'Aplicável em'])
  const version = readMetadataValue(content, 'Versão')
    ?? toNonEmptyString(frontmatter.version)
    ?? '1.0.0'

  return {
    id,
    name,
    trigger: `/${id}`,
    phase: phase.number,
    phaseName: phase.name,
    version,
    techs,
    description,
    examples,
    commands: [`/${id}`],
    keywords: [id, name, description, ...techs].join(' ').toLocaleLowerCase('pt-BR'),
    sourcePath,
  }
}

async function fetchGitHubJson(path: string, skipCache = false): Promise<unknown> {
  const { owner, repo, token } = getGitHubEnv()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const fetchOptions: RequestInit & { next?: Record<string, unknown> } = {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }

  if (skipCache) {
    fetchOptions.cache = 'no-store'
  } else {
    fetchOptions.next = {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: [CACHE_TAG],
    }
  }

  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${path}`,
    fetchOptions,
  ).catch((error: unknown) => {
    console.error('[skills-github] request failed', { path, error })
    throw new GitHubSkillsError(
      'Falha de rede ao acessar a API do GitHub para ler as skills.',
      500,
      'UNKNOWN',
    )
  })

  if (!response.ok) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
    let message = `GitHub API returned ${response.status} while reading skills.`
    let code: GitHubErrorCode = 'UNKNOWN'

    try {
      const errorBody = await response.json()
      if (isRecord(errorBody) && typeof errorBody.message === 'string') {
        message = errorBody.message
      }
    } catch {
      const errorText = await response.text().catch(() => '')
      if (errorText) {
        message = errorText
      }
    }

    if (response.status === 404) {
      code = 'NOT_FOUND'
      message = 'Repositório ou pasta skills/ não encontrados no GitHub.'
    } else if (response.status === 403 && rateLimitRemaining === '0') {
      code = 'RATE_LIMIT'
      message = token
        ? 'Limite de requisições da API do GitHub atingido ao ler as skills.'
        : 'Limite público da API do GitHub atingido ao ler as skills. Configure GITHUB_TOKEN para ampliar a cota.'
    } else if (response.status === 403) {
      code = 'FORBIDDEN'
      message = token
        ? 'Acesso negado ao repositório de skills. Verifique o token configurado.'
        : 'Acesso negado ao repositório de skills. Se o repo for privado, configure GITHUB_TOKEN.'
    }

    console.error('[skills-github] api error', { path, status: response.status, message })
    throw new GitHubSkillsError(message, response.status, code)
  }

  return response.json()
}

async function listDirectory(path: string, skipCache = false): Promise<GitHubContentItem[]> {
  const response = await fetchGitHubJson(`contents/${encodeGitHubPath(path)}`, skipCache)

  if (!Array.isArray(response)) {
    throw new GitHubSkillsError(
      `A API do GitHub não retornou uma lista para o diretório ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  return response
    .filter(isGitHubContentItem)
    .sort((left, right) => left.path.localeCompare(right.path, 'pt-BR', { sensitivity: 'base' }))
}

async function readFile(path: string, skipCache = false): Promise<string> {
  const response = await fetchGitHubJson(`contents/${encodeGitHubPath(path)}`, skipCache)

  if (!isGitHubContentFile(response)) {
    throw new GitHubSkillsError(
      `A API do GitHub não retornou um arquivo válido para ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  if (response.encoding !== 'base64') {
    throw new GitHubSkillsError(
      `Encoding ${response.encoding} não suportado para ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  return Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

async function walkSkillsDirectory(path: string, skipCache = false): Promise<string[]> {
  const items = await listDirectory(path, skipCache)
  const sourceFiles: string[] = []

  for (const item of items) {
    if (item.type === 'dir') {
      try {
        sourceFiles.push(...(await walkSkillsDirectory(item.path, skipCache)))
      } catch (error) {
        console.error('[skills-github] failed to read nested directory', {
          path: item.path,
          error,
        })
      }
      continue
    }

    if (item.type === 'file' && isSkillSourcePath(item.path)) {
      sourceFiles.push(item.path)
    }
  }

  return sourceFiles.sort((left, right) =>
    left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }),
  )
}

async function loadSkillFromFile(path: string, skipCache = false): Promise<Skill | null> {
  try {
    const fileContents = await readFile(path, skipCache)

    if (isSkillMarkdownPath(path)) {
      return normalizeMarkdownSkill(fileContents, path)
    }

    const parsed = load(fileContents)

    if (!isRecord(parsed)) {
      console.warn('[skills-github] ignoring yaml without object root', { path })
      return null
    }

    const skill = normalizeSkill(parsed as RawSkillYaml, path)

    if (!skill) {
      console.warn('[skills-github] ignoring yaml without valid skill metadata', { path })
      return null
    }

    return skill
  } catch (error) {
    console.error('[skills-github] failed to load skill file', { path, error })
    return null
  }
}

export async function getAllSkills(skipCache = false): Promise<Skill[]> {
  const sourceFiles = await walkSkillsDirectory(SKILLS_ROOT, skipCache)

  const results = await Promise.allSettled(sourceFiles.map((path) => loadSkillFromFile(path, skipCache)))
  const skills: Skill[] = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      skills.push(result.value)
      continue
    }

    if (result.status === 'rejected') {
      console.error('[skills-github] unexpected promise rejection while loading skill', result.reason)
    }
  }

  // Deduplicate by id — when multiple YAML files share the same id
  // (e.g. skill.yaml + agents/openai.yaml), keep the most complete entry.
  const byId = new Map<string, Skill>()
  for (const skill of skills) {
    const existing = byId.get(skill.id)
    if (!existing) {
      byId.set(skill.id, skill)
      continue
    }
    // Prefer the entry with more metadata (longer description, more techs)
    const existingScore = (existing.description?.length ?? 0) + existing.techs.length * 10
    const currentScore = (skill.description?.length ?? 0) + skill.techs.length * 10
    if (currentScore > existingScore) {
      byId.set(skill.id, skill)
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const phaseA = parseInt(a.phase, 10) || 99
    const phaseB = parseInt(b.phase, 10) || 99
    if (phaseA !== phaseB) return phaseA - phaseB
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  })
}

export function computeSkillsHash(skills: Skill[]): string {
  const sorted = [...skills].sort((a, b) => a.id.localeCompare(b.id))
  const payload = sorted
    .map((skill) => [skill.id, skill.version, skill.updatedAt, skill.description].join(':'))
    .join('|')
  return createHash('sha256').update(payload).digest('hex').slice(0, 12)
}

/**
 * Compute a content hash from Git blob SHAs in the recursive repository tree.
 * @param skipCache - true for polling (fresh from GitHub), false for page render (cached)
 * Cost: one GitHub API call, independent of the number of skill directories.
 */
export async function getContentHash(skipCache = false): Promise<{ count: number; hash: string }> {
  const response = await fetchGitHubJson(
    `git/trees/${encodeURIComponent(GITHUB_BRANCH)}?recursive=1`,
    skipCache,
  )
  if (!isRecord(response) || !Array.isArray(response.tree)) {
    throw new GitHubSkillsError(
      'A API do GitHub não retornou a árvore esperada para as skills.',
      500,
      'UNKNOWN',
    )
  }

  const items = response.tree
    .filter(isGitTreeBlob)
    .filter((item) => item.path.startsWith(`${SKILLS_ROOT}/`) && isSkillSourcePath(item.path))
    .map((item) => ({ path: item.path, sha: item.sha }))
    .sort((left, right) => left.path.localeCompare(right.path, 'pt-BR', { sensitivity: 'base' }))
  const payload = items.map((item) => `${item.path}:${item.sha}`).join('|')
  return {
    count: items.length,
    hash: createHash('sha256').update(payload).digest('hex').slice(0, 12),
  }
}

export function groupSkillsBySection(skills: Skill[]): SkillSection[] {
  const groupedSkills = new Map<string, Skill[]>()

  for (const skill of skills) {
    const sectionKey = `${skill.phase}. ${skill.phaseName}`
    const sectionSkills = groupedSkills.get(sectionKey) ?? []
    sectionSkills.push(skill)
    groupedSkills.set(sectionKey, sectionSkills)
  }

  return Array.from(groupedSkills.entries())
    .sort(([left], [right]) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }))
    .map(([name, sectionSkills]) => ({
      name,
      skills: sectionSkills,
    }))
}
