import { z } from 'zod'

import type { SkillsSyncPayload } from '@/lib/github/types'

const safeText = z.string().trim().min(1).max(500)
const changedFilesSchema = z.array(safeText).max(2_000)

const repositorySchema = z.object({
  name: safeText.optional(),
  full_name: safeText.optional(),
}).passthrough()

const commitSchema = z.object({
  added: changedFilesSchema.optional(),
  modified: changedFilesSchema.optional(),
  removed: changedFilesSchema.optional(),
}).passthrough()

const githubWebhookInputSchema = z.object({
  repository: z.union([safeText, repositorySchema]).optional(),
  sha: safeText.optional(),
  after: safeText.optional(),
  ref: safeText.optional(),
  changed_files: changedFilesSchema.optional(),
  commits: z.array(commitSchema).max(1_000).optional(),
  timestamp: safeText.optional(),
  head_commit: z.object({ timestamp: safeText.optional() }).passthrough().optional(),
}).passthrough()

export const skillsSyncQuerySchema = z.object({
  currentHash: z.string().trim().regex(/^[a-f0-9]{12}$/).optional(),
}).strict()

export const skillsWebhookSignatureSchema = z.string().regex(/^sha256=[a-f0-9]{64}$/)

export const skillsSyncHealthResponseSchema = z.object({
  ok: z.boolean(),
  checks: z.object({
    secret: z.enum(['ok', 'empty', 'missing']),
    github: z.enum(['ok', 'empty', 'unreachable']),
    skillCount: z.string().regex(/^\d+$/),
    contentHash: z.string().regex(/^[a-f0-9]{12}$/).optional(),
    error: z.string().max(500).optional(),
  }).strict(),
  revalidated: z.boolean(),
  timestamp: z.string().datetime(),
}).strict()

export function normalizeSkillsSyncPayload(value: unknown): SkillsSyncPayload | null {
  const parsed = githubWebhookInputSchema.safeParse(value)
  if (!parsed.success) return null

  const changedFiles = new Set(parsed.data.changed_files ?? [])
  for (const commit of parsed.data.commits ?? []) {
    for (const path of [...(commit.added ?? []), ...(commit.modified ?? []), ...(commit.removed ?? [])]) {
      changedFiles.add(path)
    }
  }

  const repository = typeof parsed.data.repository === 'string'
    ? parsed.data.repository
    : parsed.data.repository
      ? {
          name: parsed.data.repository.name,
          full_name: parsed.data.repository.full_name,
        }
      : undefined

  return {
    repository,
    sha: parsed.data.sha ?? parsed.data.after,
    ref: parsed.data.ref,
    changed_files: [...changedFiles],
    timestamp: parsed.data.timestamp ?? parsed.data.head_commit?.timestamp,
  }
}
