import { z } from 'zod'

export const SKILL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/
export const skillIdSchema = z.string().trim().regex(SKILL_ID_PATTERN)
