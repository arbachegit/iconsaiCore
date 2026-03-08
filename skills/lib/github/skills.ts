import 'server-only'

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
  if (/^openai\.ya?ml$/i.test(fileName) && segments.length >= 3) {
    return segments[segments.length - 3]
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
  }
}

function isYamlPath(path: string): boolean {
  return /\.ya?ml$/i.test(path)
}

async function fetchGitHubJson(path: string): Promise<unknown> {
  const { owner, repo, token } = getGitHubEnv()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${path}`,
    {
      headers,
      next: {
        revalidate: CACHE_REVALIDATE_SECONDS,
        tags: [CACHE_TAG],
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
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
      message = 'Repositorio ou pasta skills/ nao encontrados no GitHub.'
    } else if (response.status === 403 && rateLimitRemaining === '0') {
      code = 'RATE_LIMIT'
      message = token
        ? 'Limite de requisicoes da API do GitHub atingido ao ler as skills.'
        : 'Limite publico da API do GitHub atingido ao ler as skills. Configure GITHUB_TOKEN para ampliar a cota.'
    } else if (response.status === 403) {
      code = 'FORBIDDEN'
      message = token
        ? 'Acesso negado ao repositorio de skills. Verifique o token configurado.'
        : 'Acesso negado ao repositorio de skills. Se o repo for privado, configure GITHUB_TOKEN.'
    }

    console.error('[skills-github] api error', { path, status: response.status, message })
    throw new GitHubSkillsError(message, response.status, code)
  }

  return response.json()
}

async function listDirectory(path: string): Promise<GitHubContentItem[]> {
  const response = await fetchGitHubJson(`contents/${encodeGitHubPath(path)}`)

  if (!Array.isArray(response)) {
    throw new GitHubSkillsError(
      `A API do GitHub nao retornou uma lista para o diretorio ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  return response
    .filter(isGitHubContentItem)
    .sort((left, right) => left.path.localeCompare(right.path, 'pt-BR', { sensitivity: 'base' }))
}

async function readFile(path: string): Promise<string> {
  const response = await fetchGitHubJson(`contents/${encodeGitHubPath(path)}`)

  if (!isGitHubContentFile(response)) {
    throw new GitHubSkillsError(
      `A API do GitHub nao retornou um arquivo valido para ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  if (response.encoding !== 'base64') {
    throw new GitHubSkillsError(
      `Encoding ${response.encoding} nao suportado para ${path}.`,
      500,
      'UNKNOWN',
    )
  }

  return Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

async function walkSkillsDirectory(path: string): Promise<string[]> {
  const items = await listDirectory(path)
  const yamlFiles: string[] = []

  for (const item of items) {
    if (item.type === 'dir') {
      try {
        yamlFiles.push(...(await walkSkillsDirectory(item.path)))
      } catch (error) {
        console.error('[skills-github] failed to read nested directory', {
          path: item.path,
          error,
        })
      }
      continue
    }

    if (item.type === 'file' && isYamlPath(item.path)) {
      yamlFiles.push(item.path)
    }
  }

  return yamlFiles.sort((left, right) =>
    left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }),
  )
}

async function loadSkillFromFile(path: string): Promise<Skill | null> {
  try {
    const fileContents = await readFile(path)
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

export async function getAllSkills(): Promise<Skill[]> {
  const yamlFiles = await walkSkillsDirectory(SKILLS_ROOT)

  const results = await Promise.allSettled(yamlFiles.map((path) => loadSkillFromFile(path)))
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

  return skills.sort((a, b) => {
    const phaseA = parseInt(a.phase, 10) || 99
    const phaseB = parseInt(b.phase, 10) || 99
    if (phaseA !== phaseB) return phaseA - phaseB
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  })
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
