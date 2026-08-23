import { z } from 'zod'

const publicOriginSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), 'A origem pública deve usar HTTPS')

export function readPublicOrigin(value: string | undefined): string | null {
  const parsed = publicOriginSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
