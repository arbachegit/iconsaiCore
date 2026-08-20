import type { Skill } from '@/lib/github/types'

export interface DidacticSkillSummary {
  explanation: string
  howItWorks: string[]
  whenToUse: string[]
  outcome: string | null
}

interface MarkdownSection {
  level: number
  title: string
  body: string
}

const MAX_ITEM_LENGTH = 220

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
}

function cleanInline(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, limit = MAX_ITEM_LENGTH): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit).replace(/\s+\S*$/, '')}…`
}

function parseSections(markdown: string): MarkdownSection[] {
  const content = stripFrontmatter(markdown).replace(/```[\s\S]*?```/g, '')
  const matches = [...content.matchAll(/^(#{1,4})\s+(.+)$/gm)]

  return matches.map((match, index) => ({
    level: match[1].length,
    title: cleanInline(match[2]),
    body: content.slice(
      (match.index ?? 0) + match[0].length,
      matches[index + 1]?.index ?? content.length,
    ),
  }))
}

function extractParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim()
        return trimmed
          && !trimmed.startsWith('|')
          && !/^[-=]{3,}$/.test(trimmed)
          && !/^\*{0,2}(?:id|vers[aã]o|camada|tecnologia|aplic[aá]vel|status|categoria|trigger|comando)\*{0,2}\s*:/i.test(trimmed)
          && !/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)
      })
      .join(' '))
    .map(cleanInline)
    .filter((paragraph) => paragraph.length >= 35)
}

function extractListItems(body: string): string[] {
  const items: string[] = []
  let current = ''

  for (const line of body.split('\n')) {
    if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
      if (current) items.push(current)
      current = line
      continue
    }
    if (current && line.trim() && !line.trim().startsWith('|')) {
      current += ` ${line.trim()}`
    } else if (!line.trim() && current) {
      items.push(current)
      current = ''
    }
  }
  if (current) items.push(current)

  return items
    .map(cleanInline)
    .filter((item) => item.length >= 8)
    .map((item) => truncate(item))
}

function unique(items: string[], limit: number): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, limit)
}

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function isUsefulCatalogDescription(skill: Skill): boolean {
  const description = normalizeForComparison(skill.description)
  const name = normalizeForComparison(skill.name)
  if (description.split(' ').length < 8) return false
  if (description.startsWith('system prompt')) return false
  return description !== name && !name.includes(description) && !description.includes(name)
}

function findSections(sections: MarkdownSection[], pattern: RegExp): MarkdownSection[] {
  return sections.filter((section) => pattern.test(normalizeForComparison(section.title)))
}

function itemsFromSubheadings(
  sections: MarkdownSection[],
  parentPattern: RegExp,
): string[] {
  const parentIndex = sections.findIndex((section) => parentPattern.test(normalizeForComparison(section.title)))
  if (parentIndex < 0) return []

  const parent = sections[parentIndex]
  const items: string[] = []
  for (let index = parentIndex + 1; index < sections.length; index += 1) {
    const section = sections[index]
    if (section.level <= parent.level) break
    items.push(truncate(section.title.replace(/^\d+(?:\.\d+)?[.)]?\s*/, '')))
  }
  return items
}

function fallbackExplanation(skill: Skill): string {
  const subject = skill.name.replace(/^Skill:\s*/i, '').replace(/^SYSTEM PROMPT\s*[—-]\s*/i, '')
  return `A skill ${skill.trigger} orienta a execução de ${subject}, reunindo as regras, verificações e critérios necessários para essa tarefa.`
}

function humanizeExplanation(value: string): string {
  return value.replace(/^VOC[EÊ]\s+[EÉ]\s+/i, 'Esta skill atua como ')
}

export function buildSkillSummary(skill: Skill, markdown: string | null): DidacticSkillSummary {
  const sections = markdown ? parseSections(markdown) : []
  const titleIndex = sections.findIndex((section) => section.level === 1)
  const intro = titleIndex >= 0 ? extractParagraphs(sections[titleIndex].body) : []
  const purposeSections = findSections(sections, /descricao|proposito|objetivo|o que faz|visao geral|principio|filosofia/)
  const purpose = purposeSections.flatMap((section) => extractParagraphs(section.body))

  const explanation = truncate(humanizeExplanation(
    intro[0]
      ?? purpose[0]
      ?? (isUsefulCatalogDescription(skill) ? skill.description : fallbackExplanation(skill)),
  ), 440)

  const whenSections = findSections(sections, /quando usar|quando .*ativad|aplicavel|gatilho|ativacao/)
  const whenToUse = unique([
    ...whenSections.flatMap((section) => extractListItems(section.body)),
    ...skill.examples.map((example) => truncate(cleanInline(example))),
  ], 4)

  const flowSections = findSections(sections, /como funciona|pipeline|fluxo|workflow|passo a passo|procedimento|processo/)
  const subheadingSteps = itemsFromSubheadings(sections, /passo a passo|procedimento|processo/)
  const howItWorks = unique([
    ...subheadingSteps,
    ...flowSections.flatMap((section) => extractListItems(section.body)),
  ], 4)

  const outcomeSections = findSections(sections, /saida|resultado|entrega|veredito|output/)
  const outcomeCandidates = outcomeSections.flatMap((section) => [
    ...extractParagraphs(section.body),
    ...extractListItems(section.body),
  ])

  return {
    explanation,
    howItWorks,
    whenToUse,
    outcome: outcomeCandidates[0] ? truncate(outcomeCandidates[0], 300) : null,
  }
}

export function formatSkillSummary(summary: DidacticSkillSummary): string {
  const blocks = [`Em poucas palavras\n${summary.explanation}`]
  if (summary.howItWorks.length > 0) {
    blocks.push(`Como funciona\n${summary.howItWorks.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
  }
  if (summary.whenToUse.length > 0) {
    blocks.push(`Quando usar\n${summary.whenToUse.map((item) => `- ${item}`).join('\n')}`)
  }
  if (summary.outcome) blocks.push(`O que entrega\n${summary.outcome}`)
  return blocks.join('\n\n')
}
