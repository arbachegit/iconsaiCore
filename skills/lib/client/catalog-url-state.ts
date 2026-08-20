import { CATALOG_GROUPS } from '@/data/catalog-groups'
import { PHASES } from '@/data/phases'
import type { Skill } from '@/lib/github/types'
import { SKILL_ID_PATTERN } from '@/lib/validation/skill-id'

export const DEFAULT_CATALOG_FILTER = 'group:iniciar'
const MAX_SEARCH_QUERY_LENGTH = 120

export interface CatalogUrlState {
  activeFilter: string
  searchQuery: string
  skillId: string | null
}

export interface CatalogUrlPatch {
  activeFilter?: string
  searchQuery?: string
  skillId?: string | null
}

function isKnownFilter(filter: string): boolean {
  if (filter === 'all') return true
  if (filter.startsWith('group:')) {
    const groupId = filter.slice('group:'.length)
    return CATALOG_GROUPS.some((group) => group.id === groupId)
  }
  return PHASES.some((phase) => phase.number === filter)
}

function filterForSkill(skillId: string, skills: Skill[]): string {
  const preferredGroups = ['hubs', 'harness', 'iniciar']
  const group = preferredGroups
    .map((groupId) => CATALOG_GROUPS.find((candidate) => candidate.id === groupId))
    .find((candidate) => candidate?.skillIds.includes(skillId))
  if (group) return `group:${group.id}`
  return skills.find((skill) => skill.id === skillId)?.phase ?? DEFAULT_CATALOG_FILTER
}

export function readCatalogUrlState(search: string, skills: Skill[]): CatalogUrlState {
  const params = new URLSearchParams(search)
  const knownSkillIds = new Set(skills.map((skill) => skill.id))
  const requestedSkillId = params.get('skill')?.trim() ?? ''
  const skillId = SKILL_ID_PATTERN.test(requestedSkillId) && knownSkillIds.has(requestedSkillId)
    ? requestedSkillId
    : null

  const category = params.get('category')?.trim() ?? ''
  const phase = params.get('phase')?.trim() ?? ''
  const view = params.get('view')?.trim() ?? ''
  const requestedFilter = category
    ? `group:${category}`
    : phase
      ? phase
      : view === 'all'
        ? 'all'
        : skillId
          ? filterForSkill(skillId, skills)
          : DEFAULT_CATALOG_FILTER

  return {
    activeFilter: isKnownFilter(requestedFilter) ? requestedFilter : DEFAULT_CATALOG_FILTER,
    searchQuery: (params.get('q') ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH),
    skillId,
  }
}

export function buildCatalogUrl(currentHref: string, patch: CatalogUrlPatch): string {
  const url = new URL(currentHref)

  if (patch.skillId !== undefined) {
    if (patch.skillId && SKILL_ID_PATTERN.test(patch.skillId)) {
      url.searchParams.set('skill', patch.skillId)
    } else {
      url.searchParams.delete('skill')
    }
  }

  if (patch.searchQuery !== undefined) {
    const query = patch.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
    if (query) url.searchParams.set('q', query)
    else url.searchParams.delete('q')
  }

  if (patch.activeFilter !== undefined) {
    url.searchParams.delete('category')
    url.searchParams.delete('phase')
    url.searchParams.delete('view')

    if (patch.activeFilter.startsWith('group:')) {
      const groupId = patch.activeFilter.slice('group:'.length)
      if (groupId !== 'iniciar' && CATALOG_GROUPS.some((group) => group.id === groupId)) {
        url.searchParams.set('category', groupId)
      }
    } else if (PHASES.some((phase) => phase.number === patch.activeFilter)) {
      url.searchParams.set('phase', patch.activeFilter)
    } else if (patch.activeFilter === 'all') {
      url.searchParams.set('view', 'all')
    }
  }

  return `${url.pathname}${url.search}${url.hash}`
}
