import { z } from 'zod'

export const skillDocResponseSchema = z.object({
  doc: z.string().min(1),
}).passthrough()
