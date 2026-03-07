import 'server-only'

import { getAllSkills } from './skills'
import { FALLBACK_SKILLS } from '@/data/skills'
import type { Skill } from './types'

function hasEnrichedFields(skills: Skill[]): boolean {
  if (skills.length === 0) return false
  const withPhase = skills.filter((s) => s.phase && s.phaseName && s.techs.length > 0)
  return withPhase.length / skills.length > 0.8
}

/** Enrich incomplete GitHub skills with FALLBACK data */
function enrichWithFallback(githubSkills: Skill[]): Skill[] {
  const fallbackMap = new Map(FALLBACK_SKILLS.map((s) => [s.id, s]))

  return githubSkills.map((skill) => {
    const fb = fallbackMap.get(skill.id)
    if (!fb) return skill

    const isIncomplete = skill.techs.length === 0 || !skill.description || skill.description.length < 20
    if (!isIncomplete) return skill

    return {
      ...skill,
      phase: fb.phase,
      phaseName: fb.phaseName,
      techs: skill.techs.length > 0 ? skill.techs : fb.techs,
      description: skill.description && skill.description.length >= 20 ? skill.description : fb.description,
      examples: skill.examples.length > 0 ? skill.examples : fb.examples,
      commands: skill.commands.length > 0 ? skill.commands : fb.commands,
      keywords: skill.keywords || fb.keywords,
      isNew: skill.isNew ?? fb.isNew,
    }
  })
}

export async function fetchSkillsWithFallback(): Promise<{ skills: Skill[]; source: 'github' | 'fallback' }> {
  try {
    const skills = await getAllSkills()

    if (skills.length === 0) {
      console.warn('[skills-fetch] GitHub returned 0 skills, using fallback')
      return { skills: FALLBACK_SKILLS, source: 'fallback' }
    }

    if (!hasEnrichedFields(skills)) {
      console.warn(`[skills-fetch] GitHub returned ${skills.length} skills but YAML files lack enriched fields (phase, phaseName, techs). Using fallback until YAMLs are updated.`)
      return { skills: FALLBACK_SKILLS, source: 'fallback' }
    }

    const enriched = enrichWithFallback(skills)
    console.info(`[skills-fetch] loaded ${enriched.length} skills from GitHub`)
    return { skills: enriched, source: 'github' }
  } catch (error) {
    console.error('[skills-fetch] GitHub fetch failed, using fallback', error)
    return { skills: FALLBACK_SKILLS, source: 'fallback' }
  }
}
