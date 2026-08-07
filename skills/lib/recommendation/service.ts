import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

import type { Skill } from '@/lib/github/types'
import {
  buildSkillAdvisorPrompt,
  SKILL_ADVISOR_PROMPT_HASH,
  SKILL_ADVISOR_PROMPT_VERSION,
} from '@/lib/recommendation/prompt'
import {
  recommendationResultSchema,
  type RecommendationResponse,
  type RecommendationResult,
} from '@/lib/recommendation/schema'

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const OPENAI_MODEL = 'gpt-4.1-mini'
const REQUEST_TIMEOUT_MS = 25_000

interface ProviderResult {
  provider: RecommendationResponse['provider']
  payload: unknown
}

const RECOMMEND_SKILLS_TOOL = {
  name: 'recommend_skills',
  description: 'Retorna a sequência validada de skills recomendadas para a situação informada.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['summary', 'strategy', 'recommendations', 'cautions'],
    properties: {
      summary: { type: 'string', minLength: 12, maxLength: 420 },
      strategy: { type: 'string', minLength: 12, maxLength: 500 },
      recommendations: {
        type: 'array',
        minItems: 1,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['skillId', 'reason', 'whenToUse', 'priority'],
          properties: {
            skillId: { type: 'string', minLength: 1, maxLength: 120 },
            reason: { type: 'string', minLength: 8, maxLength: 280 },
            whenToUse: { type: 'string', minLength: 8, maxLength: 220 },
            priority: { type: 'string', enum: ['agora', 'depois', 'opcional'] },
          },
        },
      },
      cautions: {
        type: 'array',
        maxItems: 4,
        items: { type: 'string', minLength: 4, maxLength: 240 },
      },
    },
  },
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('LLM response did not contain JSON')
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
}

function validateRecommendation(
  raw: unknown,
  allowedSkillIds: Set<string>,
): RecommendationResult {
  const parsed = recommendationResultSchema.parse(raw)
  const hasUnknownSkill = parsed.recommendations.some(
    (recommendation) => !allowedSkillIds.has(recommendation.skillId),
  )

  if (hasUnknownSkill) {
    throw new Error('LLM recommended a skill outside the allowlist')
  }

  return parsed
}

async function callAnthropic(system: string, user: string): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 })
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1_400,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [RECOMMEND_SKILLS_TOOL],
    tool_choice: {
      type: 'tool',
      name: RECOMMEND_SKILLS_TOOL.name,
      disable_parallel_tool_use: true,
    },
  })
  const toolUse = response.content.find(
    (block) => block.type === 'tool_use' && block.name === RECOMMEND_SKILLS_TOOL.name,
  )
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Anthropic did not return the allowlisted tool output')
  }

  return { provider: 'anthropic', payload: toolUse.input }
}

async function callOpenAi(system: string, user: string): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        max_tokens: 1_400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`)
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const text = payload.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenAI returned an empty response')

    return { provider: 'openai', payload: extractJson(text) }
  } finally {
    clearTimeout(timeout)
  }
}

export async function recommendSkills(
  skills: Skill[],
  situation: string,
  requestId: string,
): Promise<RecommendationResponse> {
  const { system, user, allowedSkillIds } = buildSkillAdvisorPrompt(skills, situation)
  let providerResult: ProviderResult

  try {
    providerResult = await callAnthropic(system, user)
  } catch (anthropicError) {
    console.warn('[skills-advisor] primary provider unavailable', {
      requestId,
      promptVersion: SKILL_ADVISOR_PROMPT_VERSION,
      reason: anthropicError instanceof Error ? anthropicError.name : 'unknown',
    })
    providerResult = await callOpenAi(system, user)
  }

  const result = validateRecommendation(providerResult.payload, allowedSkillIds)

  console.info('[skills-advisor] recommendation completed', {
    requestId,
    promptVersion: SKILL_ADVISOR_PROMPT_VERSION,
    promptHash: SKILL_ADVISOR_PROMPT_HASH,
    provider: providerResult.provider,
    situationLength: situation.length,
    recommendations: result.recommendations.length,
  })

  return {
    ...result,
    requestId,
    promptVersion: SKILL_ADVISOR_PROMPT_VERSION,
    provider: providerResult.provider,
  }
}
