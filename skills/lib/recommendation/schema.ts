import { z } from 'zod'

export const recommendationRequestSchema = z.object({
  situation: z
    .string()
    .trim()
    .min(12, 'Descreva a situação com um pouco mais de contexto.')
    .max(1200, 'A descrição deve ter no máximo 1.200 caracteres.'),
}).strict()

export const recommendationPrioritySchema = z.enum(['agora', 'depois', 'opcional'])

export const skillRecommendationSchema = z.object({
  skillId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(8).max(280),
  whenToUse: z.string().trim().min(8).max(220),
  priority: recommendationPrioritySchema,
}).strict()

export const recommendationResultSchema = z.object({
  summary: z.string().trim().min(12).max(420),
  strategy: z.string().trim().min(12).max(500),
  recommendations: z.array(skillRecommendationSchema).min(1).max(6),
  cautions: z.array(z.string().trim().min(4).max(240)).max(4),
}).strict()

export const recommendationResponseSchema = recommendationResultSchema.extend({
  requestId: z.string().uuid(),
  promptVersion: z.string().min(1),
  provider: z.enum(['anthropic', 'openai']),
}).strict()

export const recommendationErrorResponseSchema = z.object({
  error: z.string().trim().min(1).max(240),
  requestId: z.string().uuid().optional(),
}).strict()

export type RecommendationResult = z.infer<typeof recommendationResultSchema>
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>
